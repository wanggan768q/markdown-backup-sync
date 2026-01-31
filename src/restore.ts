import * as path from "path"
import * as fs from "fs/promises"
import { Dirent } from "fs"
import type { BackupConfig } from "./utils"
import { getFileStats, ensureDir, fileExists } from "./utils"
import { addLogEntry } from "./logger"

// ========== 类型定义 ==========

export type ConflictStrategy = 'overwrite' | 'skip' | 'rename'

export interface RestoreResult {
    restored: number
    skipped: number
    errors: number
    errorsList: string[]
}

export interface BackupStats {
    fileCount: number
    totalSize: number
    directories: string[]
}

// ========== 文件恢复 ==========

/**
 * 从备份目录恢复markdown文件到工作空间
 */
export async function restoreMarkdownFiles(
    config: BackupConfig,
    worktree: string,
    strategy: ConflictStrategy,
    filter: string | undefined,
    sessionId: string
): Promise<RestoreResult> {
    let restored = 0
    let skipped = 0
    let errors = 0
    const errorsList: string[] = []
    
    // 递归遍历备份目录
    async function traverseBackup(dir: string, relativePath: string = ''): Promise<void> {
        let entries: Dirent[]
        try {
            entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
            // 目录不存在或无法读取
            return
        }
        
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name)
            const entryRelativePath = relativePath 
                ? path.join(relativePath, entry.name) 
                : entry.name
            
            // 跳过日志目录
            if (entry.name === '.backup-log') {
                continue
            }
            
            // 应用过滤器
            if (filter) {
                const normalizedFilter = filter.replace(/\\/g, '/')
                const normalizedPath = entryRelativePath.replace(/\\/g, '/')
                if (!normalizedPath.startsWith(normalizedFilter)) {
                    continue
                }
            }
            
            if (entry.isDirectory()) {
                // 递归处理子目录
                await traverseBackup(entryPath, entryRelativePath)
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                // 恢复markdown文件
                try {
                    const backupPath = entryPath
                    const targetPath = path.join(worktree, entryRelativePath)
                    
                    // 检查目标文件是否存在
                    const targetExists = await fileExists(targetPath)
                    
                    // 如果跳过策略且文件已存在，跳过
                    if (strategy === 'skip' && targetExists) {
                        await addLogEntry({
                            timestamp: new Date().toISOString(),
                            sessionId,
                            action: 'restore',
                            relativePath: entryRelativePath,
                            targetPath,
                            strategy,
                            status: 'skipped'
                        })
                        skipped++
                        continue
                    }
                    
                    // 如果重命名策略且文件已存在，修改目标路径
                    let finalTargetPath = targetPath
                    if (strategy === 'rename' && targetExists) {
                        let counter = 1
                        while (true) {
                            const ext = path.extname(targetPath)
                            const base = path.basename(targetPath, ext)
                            const newPath = path.join(
                                path.dirname(targetPath),
                                `${base}_${counter}${ext}`
                            )
                            if (!(await fileExists(newPath))) {
                                finalTargetPath = newPath
                                break
                            }
                            counter++
                            // 防止无限循环
                            if (counter > 1000) {
                                throw new Error('无法生成唯一的文件名')
                            }
                        }
                    }
                    
                    // 确保目标目录存在
                    await ensureDir(path.dirname(finalTargetPath))
                    
                    // 复制文件
                    await fs.copyFile(backupPath, finalTargetPath)
                    
                    // 获取文件信息
                    const stats = await getFileStats(backupPath)
                    
                    // 记录日志
                    await addLogEntry({
                        timestamp: new Date().toISOString(),
                        sessionId,
                        action: 'restore',
                        relativePath: entryRelativePath,
                        sourcePath: backupPath,
                        targetPath: finalTargetPath,
                        fileSize: stats.size,
                        strategy,
                        status: 'success'
                    })
                    
                    restored++
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    errorsList.push(`${entryRelativePath}: ${errorMessage}`)
                    
                    await addLogEntry({
                        timestamp: new Date().toISOString(),
                        sessionId,
                        action: 'restore',
                        relativePath: entryRelativePath,
                        status: 'error',
                        error: errorMessage
                    })
                    errors++
                }
            }
        }
    }
    
    await traverseBackup(config.backupRoot)
    
    return { restored, skipped, errors, errorsList }
}

// ========== 备份目录扫描 ==========

/**
 * 扫描备份目录获取统计信息
 */
export async function scanBackupDirectory(
    config: BackupConfig
): Promise<BackupStats> {
    let fileCount = 0
    let totalSize = 0
    const directories: string[] = []
    
    async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
        let entries: Dirent[]
        try {
            entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
            // 目录不存在或无法读取
            return
        }
        
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name)
            const entryRelativePath = relativePath 
                ? path.join(relativePath, entry.name) 
                : entry.name
            
            // 跳过日志目录
            if (entry.name === '.backup-log') {
                continue
            }
            
            if (entry.isDirectory()) {
                directories.push(entryRelativePath)
                await scanDir(entryPath, entryRelativePath)
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                fileCount++
                try {
                    const stats = await getFileStats(entryPath)
                    totalSize += stats.size
                } catch {
                    // 无法获取文件信息，忽略
                }
            }
        }
    }
    
    await scanDir(config.backupRoot)
    
    return { fileCount, totalSize, directories }
}

/**
 * 列出备份目录中的所有markdown文件
 */
export async function listBackupFiles(
    config: BackupConfig,
    filter?: string
): Promise<string[]> {
    const files: string[] = []
    
    async function scanDir(dir: string, relativePath: string = ''): Promise<void> {
        let entries: Dirent[]
        try {
            entries = await fs.readdir(dir, { withFileTypes: true })
        } catch {
            return
        }
        
        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name)
            const entryRelativePath = relativePath 
                ? path.join(relativePath, entry.name) 
                : entry.name
            
            if (entry.name === '.backup-log') {
                continue
            }
            
            if (entry.isDirectory()) {
                await scanDir(entryPath, entryRelativePath)
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                // 应用过滤器
                if (filter) {
                    const normalizedFilter = filter.replace(/\\/g, '/')
                    const normalizedPath = entryRelativePath.replace(/\\/g, '/')
                    if (!normalizedPath.startsWith(normalizedFilter)) {
                        continue
                    }
                }
                files.push(entryRelativePath)
            }
        }
    }
    
    await scanDir(config.backupRoot)
    
    return files
}
