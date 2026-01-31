import * as path from "path"
import * as fs from "fs/promises"
import type { BackupConfig } from "./utils"
import { ensureDir } from "./utils"

// ========== 类型定义 ==========

export type LogAction = 'backup' | 'restore' | 'skip'

export interface LogEntry {
    timestamp: string
    sessionId: string
    action: LogAction
    relativePath: string
    sourcePath?: string
    targetPath?: string
    fileSize?: number
    strategy?: string
    status: 'success' | 'error' | 'skipped'
    error?: string
}

// ========== 模块状态 ==========

let config: BackupConfig | null = null
let logDir: string = ''
let logFileBackup: string = ''
let logFileRestore: string = ''

// ========== 初始化 ==========

/**
 * 初始化日志系统
 */
export async function initLogger(backupConfig: BackupConfig): Promise<void> {
    config = backupConfig
    logDir = path.join(config.backupRoot, ".backup-log")
    logFileBackup = path.join(logDir, "backup.log")
    logFileRestore = path.join(logDir, "restore.log")
    
    // 确保日志目录存在
    await ensureDir(logDir)
}

/**
 * 获取日志目录路径
 */
export function getLogDir(): string {
    return logDir
}

// ========== 日志操作 ==========

/**
 * 添加日志条目
 */
export async function addLogEntry(entry: LogEntry): Promise<void> {
    if (!config || !config.logEnabled) {
        return
    }
    
    // 确保日志目录存在
    await ensureDir(logDir)
    
    // 选择日志文件
    const logFile = entry.action === 'restore' 
        ? logFileRestore 
        : logFileBackup
    
    // 格式化日志条目
    const logLine = JSON.stringify(entry) + '\n'
    
    // 追加到日志文件
    await fs.appendFile(logFile, logLine, 'utf-8')
}

/**
 * 读取日志条目
 */
export async function readLogEntries(
    action: 'backup' | 'restore' | 'all' = 'all',
    limit: number = 50
): Promise<LogEntry[]> {
    const logFiles: string[] = []
    
    if (action === 'backup' || action === 'all') {
        logFiles.push(logFileBackup)
    }
    if (action === 'restore' || action === 'all') {
        logFiles.push(logFileRestore)
    }
    
    const allEntries: LogEntry[] = []
    
    for (const logFile of logFiles) {
        try {
            const content = await fs.readFile(logFile, 'utf-8')
            const lines = content.trim().split('\n')
            for (const line of lines) {
                if (line) {
                    try {
                        allEntries.push(JSON.parse(line))
                    } catch {
                        // 跳过无法解析的行
                    }
                }
            }
        } catch {
            // 日志文件不存在或为空，忽略
        }
    }
    
    // 按时间戳倒序排序
    allEntries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    return allEntries.slice(0, limit)
}

/**
 * 格式化日志为可读文本
 */
export function formatLogEntries(entries: LogEntry[]): string {
    if (entries.length === 0) {
        return `📋 备份日志\n\n暂无日志记录。`
    }
    
    let output = `📋 备份日志（最近 ${entries.length} 条）\n\n`
    
    for (const entry of entries) {
        const time = new Date(entry.timestamp).toLocaleString('zh-CN')
        const statusIcon = entry.status === 'success' ? '✅' : 
                          entry.status === 'skipped' ? '⊘' : '❌'
        const actionText = entry.action === 'backup' ? '备份' : 
                          entry.action === 'restore' ? '恢复' : '跳过'
        
        output += `${statusIcon} [${time}] ${actionText}: ${entry.relativePath}\n`
        if (entry.status === 'error' && entry.error) {
            output += `   错误: ${entry.error}\n`
        }
        if (entry.fileSize) {
            output += `   大小: ${(entry.fileSize / 1024).toFixed(2)} KB\n`
        }
    }
    
    return output
}

/**
 * 清除日志
 */
export async function clearLogs(action: 'backup' | 'restore' | 'all' = 'all'): Promise<void> {
    if (action === 'backup' || action === 'all') {
        try {
            await fs.unlink(logFileBackup)
        } catch {
            // 文件不存在，忽略
        }
    }
    if (action === 'restore' || action === 'all') {
        try {
            await fs.unlink(logFileRestore)
        } catch {
            // 文件不存在，忽略
        }
    }
}
