// ========== 全局状态 ==========
let currentWorkspaceRoot: string = ''

export function setWorkspaceRoot(root: string): void {
    currentWorkspaceRoot = root
}

export function getWorkspaceRoot(): string {
    return currentWorkspaceRoot
}

import * as path from "path"
import * as fs from "fs/promises"
import { createHash } from "crypto"

// ========== 类型定义 ==========

export interface BackupConfig {
    backupRoot: string
    enabled: boolean
    autoBackup: boolean
    logEnabled: boolean
}

export interface FileHashCache {
    [relativePath: string]: string
}

export interface FileStats {
    size: number
    modified: Date
}

// ========== 配置错误类 ==========

/**
 * 配置错误类，包含用户友好的配置引导信息
 */
export class ConfigError extends Error {
    constructor(message: string, public readonly guide: string) {
        super(message)
        this.name = 'ConfigError'
    }
}

// ========== 配置引导生成 ==========

/**
 * 生成详细的配置引导信息
 * @param workspaceRoot 工作空间根目录
 */
function getConfigurationGuide(workspaceRoot: string): string {
    const projectName = path.basename(workspaceRoot)
    
    return `
══════════════════════════════════════════════════════════════════
                  📋 Markdown Backup Sync 配置指南
══════════════════════════════════════════════════════════════════

⚠️  必须配置备份路径才能使用此插件！

请选择以下任一方式配置：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 方法 1: 创建项目配置文件（推荐）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

在项目根目录下创建配置文件：

  文件路径: .config/backup-config.json

  配置内容:
  {
    "backupRoot": "D:\\\\MarkdownBackups\\\\${projectName}\\\\",
    "enabled": true,
    "autoBackup": true,
    "logEnabled": true
  }

  配置说明:
  ┌─────────────┬──────────┬────────┬─────────────────────────────┐
  │ 配置项      │ 类型     │ 必填   │ 说明                        │
  ├─────────────┼──────────┼────────┼─────────────────────────────┤
  │ backupRoot  │ string   │ ✅必填 │ 备份目录的绝对路径          │
  │ enabled     │ boolean  │ 可选   │ 是否启用插件 (默认: true)   │
  │ autoBackup  │ boolean  │ 可选   │ 是否自动备份 (默认: true)   │
  │ logEnabled  │ boolean  │ 可选   │ 是否记录日志 (默认: true)   │
  └─────────────┴──────────┴────────┴─────────────────────────────┘

  💡 提示: 
  - 必须使用绝对路径
  - Windows路径使用双反斜杠 \\\\ 或单斜杠 /
  - 确保备份目录有读写权限

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 方法 2: 使用环境变量
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Windows (PowerShell):
  $env:MARKDOWN_BACKUP_ROOT = "D:\\\\MarkdownBackups\\\\MyProject\\\\"

Windows (CMD):
  set MARKDOWN_BACKUP_ROOT=D:\\MarkdownBackups\\MyProject\\

Linux/Mac (Bash):
  export MARKDOWN_BACKUP_ROOT="/path/to/backup/"

💡 永久设置环境变量:
  - Windows: 在"系统属性 > 环境变量"中添加
  - Linux/Mac: 在 ~/.bashrc 或 ~/.zshrc 中添加

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 详细文档
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

查看完整配置说明: https://www.npmjs.com/package/markdown-backup-sync

══════════════════════════════════════════════════════════════════
`
}

// ========== 配置加载 ==========

/**
 * 获取备份配置（强制要求配置backupRoot）
 * @param workspaceRoot 工作空间根目录，用于定位配置文件
 * @throws {ConfigError} 如果配置不存在或无效
 */
export async function getBackupConfig(workspaceRoot: string): Promise<BackupConfig> {
    // 1. 检查项目配置文件 (.config/ 优先级最高)
    const configPath = path.join(workspaceRoot, '.config', 'backup-config.json')
    let configFileExists = false
    try {
        await fs.access(configPath)
        configFileExists = true
    } catch {
        configFileExists = false
    }
    
    if (configFileExists) {
        try {
            const configContent = await fs.readFile(configPath, 'utf-8')
            const config = JSON.parse(configContent)
            
            // 验证必须的配置项
            if (!config.backupRoot || typeof config.backupRoot !== 'string' || config.backupRoot.trim() === '') {
                throw new ConfigError(
                    '配置文件中缺少或无效的 backupRoot 配置',
                    getConfigurationGuide(workspaceRoot)
                )
            }
            
            return {
                backupRoot: config.backupRoot.trim(),
                enabled: config.enabled !== false,
                autoBackup: config.autoBackup !== false,
                logEnabled: config.logEnabled !== false
            }
        } catch (error) {
            if (error instanceof ConfigError) {
                throw error
            }
            
            if (error instanceof SyntaxError) {
                throw new ConfigError(
                    '配置文件 JSON 格式错误',
                    getConfigurationGuide(workspaceRoot)
                )
            }
            
            // 配置文件读取失败，继续检查环境变量
        }
    }
    
    // 2. 检查环境变量
    if (process.env.MARKDOWN_BACKUP_ROOT) {
        const backupRoot = process.env.MARKDOWN_BACKUP_ROOT
        if (!backupRoot || backupRoot.trim() === '') {
            throw new ConfigError(
                '环境变量 MARKDOWN_BACKUP_ROOT 为空',
                getConfigurationGuide(workspaceRoot)
            )
        }
        return {
            backupRoot: backupRoot.trim(),
            enabled: process.env.MARKDOWN_BACKUP_ENABLED !== 'false',
            autoBackup: process.env.MARKDOWN_BACKUP_AUTO !== 'false',
            logEnabled: process.env.MARKDOWN_BACKUP_LOG !== 'false'
        }
    }
    
    // 3. 未找到配置
    throw new ConfigError(
        '未找到备份配置文件',
        getConfigurationGuide(workspaceRoot)
    )
}

// ========== 路径验证 ==========

// ========== 路径验证 ==========

/**
 * 验证备份路径是否有效（可写入）
 */
export async function validateBackupPath(backupRoot: string): Promise<boolean> {
    try {
        // 尝试创建目录（如果不存在）
        await fs.mkdir(backupRoot, { recursive: true })
        
        // 尝试写入测试文件
        const testFile = path.join(backupRoot, '.backup-test-' + Date.now())
        await fs.writeFile(testFile, 'test')
        await fs.unlink(testFile)
        
        return true
    } catch {
        return false
    }
}

// ========== 文件操作工具 ==========

/**
 * 计算文件内容的SHA256哈希值
 */
export async function computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8')
    return createHash('sha256').update(content).digest('hex')
}

/**
 * 获取文件统计信息
 */
export async function getFileStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath)
    return {
        size: stats.size,
        modified: stats.mtime
    }
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}
