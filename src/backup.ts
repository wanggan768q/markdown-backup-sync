import * as path from "path"
import * as fs from "fs/promises"
import type { BackupConfig, FileHashCache } from "./utils"
import { computeFileHash, getFileStats, ensureDir } from "./utils"
import { addLogEntry } from "./logger"

// ========== 类型定义 ==========

export interface BackupResult {
    success: boolean
    changed: boolean
    fileSize?: number
    error?: string
}

export interface BatchBackupResult {
    success: number
    skipped: number
    failed: number
    totalSize: number
    errors: string[]
}

// ========== 单文件备份 ==========

/**
 * 执行单个文件的增量备份
 * 只有文件内容变化时才会备份
 */
export async function backupMarkdownFile(
    sourcePath: string,
    relativePath: string,
    config: BackupConfig,
    hashCache: FileHashCache,
    sessionId: string
): Promise<BackupResult> {
    try {
        // 检查源文件是否存在
        try {
            await fs.access(sourcePath)
        } catch {
            return {
                success: false,
                changed: false,
                error: `源文件不存在: ${sourcePath}`
            }
        }
        
        // 计算源文件哈希
        const currentHash = await computeFileHash(sourcePath)
        const cachedHash = hashCache[relativePath]
        
        // 检查是否需要备份（哈希是否变化）
        if (cachedHash === currentHash) {
            await addLogEntry({
                timestamp: new Date().toISOString(),
                sessionId,
                action: 'skip',
                relativePath,
                status: 'skipped'
            })
            return { success: true, changed: false }
        }
        
        // 计算备份路径
        const backupPath = path.join(config.backupRoot, relativePath)
        const backupDir = path.dirname(backupPath)
        
        // 创建备份目录结构
        await ensureDir(backupDir)
        
        // 复制文件
        await fs.copyFile(sourcePath, backupPath)
        
        // 获取文件统计信息
        const stats = await getFileStats(sourcePath)
        
        // 更新哈希缓存
        hashCache[relativePath] = currentHash
        
        // 记录日志
        await addLogEntry({
            timestamp: new Date().toISOString(),
            sessionId,
            action: 'backup',
            relativePath,
            sourcePath,
            fileSize: stats.size,
            status: 'success'
        })
        
        return { success: true, changed: true, fileSize: stats.size }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        await addLogEntry({
            timestamp: new Date().toISOString(),
            sessionId,
            action: 'backup',
            relativePath,
            sourcePath,
            status: 'error',
            error: errorMessage
        })
        
        return { success: false, changed: false, error: errorMessage }
    }
}

// ========== 批量备份 ==========

/**
 * 批量备份多个文件
 */
export async function backupMultipleFiles(
    files: Array<{ sourcePath: string; relativePath: string }>,
    config: BackupConfig,
    hashCache: FileHashCache,
    sessionId: string
): Promise<BatchBackupResult> {
    let success = 0
    let skipped = 0
    let failed = 0
    let totalSize = 0
    const errors: string[] = []
    
    for (const file of files) {
        const result = await backupMarkdownFile(
            file.sourcePath,
            file.relativePath,
            config,
            hashCache,
            sessionId
        )
        
        if (result.success) {
            if (result.changed) {
                success++
                totalSize += result.fileSize || 0
            } else {
                skipped++
            }
        } else {
            failed++
            if (result.error) {
                errors.push(`${file.relativePath}: ${result.error}`)
            }
        }
    }
    
    return { success, skipped, failed, totalSize, errors }
}

// ========== 强制备份 ==========

/**
 * 强制备份文件（忽略哈希检查）
 */
export async function forceBackupFiles(
    files: Array<{ sourcePath: string; relativePath: string }>,
    config: BackupConfig,
    hashCache: FileHashCache,
    sessionId: string
): Promise<BatchBackupResult> {
    // 临时清除哈希缓存
    const oldHashes: { [key: string]: string } = {}
    for (const file of files) {
        if (hashCache[file.relativePath]) {
            oldHashes[file.relativePath] = hashCache[file.relativePath]
            delete hashCache[file.relativePath]
        }
    }
    
    // 执行备份
    const result = await backupMultipleFiles(files, config, hashCache, sessionId)
    
    // 对于失败的文件，恢复原有哈希
    for (const file of files) {
        const wasSuccessful = !result.errors.some(e => e.startsWith(file.relativePath))
        if (!wasSuccessful && oldHashes[file.relativePath]) {
            hashCache[file.relativePath] = oldHashes[file.relativePath]
        }
    }
    
    return result
}
