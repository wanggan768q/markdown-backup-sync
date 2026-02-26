import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import * as path from "path"
import * as fs from "fs/promises"
import type { BackupConfig, FileHashCache } from "./utils"
import { 
    getBackupConfig, 
    ensureDir, 
    validateBackupPath,
    ConfigError
} from "./utils"
import { initLogger, readLogEntries, formatLogEntries, getLogDir } from "./logger"
import { backupMarkdownFile, backupMultipleFiles, forceBackupFiles } from "./backup"
import { restoreMarkdownFiles, scanBackupDirectory } from "./restore"

// ========== 状态管理 ==========

interface SessionState {
    modifiedFiles: string[]
    backupCount: number
}

const sessionStates = new Map<string, SessionState>()
let config: BackupConfig | null = null
let hashCache: FileHashCache = {}
let hashCacheDirty = false
let initialized = false
let worktreeRoot = ''

// ========== 常量 ==========

const HASH_CACHE_FILE = "file-hashes.json"

// ========== 哈希缓存管理 ==========

async function loadHashCache(): Promise<void> {
    if (!config) return
    
    const cacheFilePath = path.join(config.backupRoot, ".backup-log", HASH_CACHE_FILE)
    try {
        const content = await fs.readFile(cacheFilePath, 'utf-8')
        hashCache = JSON.parse(content)
        console.log(`✅ 加载哈希缓存: ${Object.keys(hashCache).length} 个文件`)
    } catch {
        hashCache = {}
        console.log("📝 初始化新的哈希缓存")
    }
    hashCacheDirty = false
}

async function saveHashCache(): Promise<void> {
    if (!config || !hashCacheDirty) return
    
    const cacheFilePath = path.join(config.backupRoot, ".backup-log", HASH_CACHE_FILE)
    await ensureDir(path.dirname(cacheFilePath))
    await fs.writeFile(cacheFilePath, JSON.stringify(hashCache, null, 2))
    console.log(`💾 保存哈希缓存: ${Object.keys(hashCache).length} 个文件`)
    hashCacheDirty = false
}

// ========== 会话状态管理 ==========

function getSessionState(sessionId: string): SessionState {
    let state = sessionStates.get(sessionId)
    if (!state) {
        state = { modifiedFiles: [], backupCount: 0 }
        sessionStates.set(sessionId, state)
    }
    return state
}

// ========== 初始化函数 ==========

async function initializePlugin(): Promise<{ success: boolean; message: string }> {
    if (initialized && config) {
        return { success: true, message: "插件已初始化" }
    }
    
    try {
        // 1. 加载配置
        config = await getBackupConfig(worktreeRoot)
        
        // 2. 验证备份路径
        const backupRoot = config.backupRoot
        const pathValid = await validateBackupPath(backupRoot)
        if (!pathValid) {
            config = null
            return {
                success: false,
                message: `❌ 备份路径无效或无访问权限: ${backupRoot}\n\n请检查路径是否正确，并确保有读写权限。`
            }
        }
        
        // 3. 检查是否启用
        if (!config.enabled) {
            return {
                success: false,
                message: "⚠️ Markdown备份插件已禁用\n\n在配置文件中设置 enabled: true 启用插件。"
            }
        }
        
        // 4. 初始化日志系统
        await initLogger(config)
        
        // 5. 加载哈希缓存
        await loadHashCache()
        
        // 6. 设置清理处理
        const cleanup = () => {
            saveHashCache().catch(console.error)
        }
        process.on('exit', cleanup)
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
        
        initialized = true
        
        return {
            success: true,
            message: `
══════════════════════════════════════════════════════════════════
           ✅ Markdown Backup Sync 插件已成功启动
══════════════════════════════════════════════════════════════════

📁 备份目录: ${config.backupRoot}
🔄 自动备份: ${config.autoBackup ? '✅ 开启' : '❌ 关闭'}
📝 日志记录: ${config.logEnabled ? '✅ 开启' : '❌ 关闭'}

可用工具:
  - backupMarkdown      手动备份文件
  - restoreMarkdown     恢复文件
  - viewBackupLog       查看日志
  - backupStats         统计信息
  - showConfig          查看配置
  - initPlugin          重新初始化

══════════════════════════════════════════════════════════════════
`
        }
    } catch (error) {
        config = null
        initialized = false
        
        if (error instanceof ConfigError) {
            return {
                success: false,
                message: error.guide
            }
        }
        
        return {
            success: false,
            message: `❌ 插件初始化失败: ${error instanceof Error ? error.message : String(error)}`
        }
    }
}

// ========== 插件主函数 ==========

export const MarkdownBackupSync: Plugin = async ({ 
    worktree
}) => {
    // 保存worktree路径
    worktreeRoot = worktree
    
    // 初始化插件
    const initResult = await initializePlugin()
    
    if (!initResult.success) {
        console.log(initResult.message)
        // 配置错误时返回空对象，用户需要配置后重启
        return {}
    }
    
    console.log(initResult.message)
    
    return {
        // ========== 自动备份钩子 ==========
        "tool.execute.after": async (input) => {
            if (!config || !config.autoBackup) return
            
            // 检查是否是markdown文件的写入/编辑操作
            if (input.tool === "write" || input.tool === "edit") {
                const filePath = (input as { args?: { filePath?: string } }).args?.filePath
                if (filePath?.toLowerCase().endsWith('.md')) {
                    // 计算相对路径
                    const relativePath = path.relative(worktreeRoot, filePath)
                    
                    // 跳过备份目录外的文件
                    if (relativePath.startsWith('..')) {
                        return
                    }
                    
                    try {
                        // 执行增量备份
                        const result = await backupMarkdownFile(
                            filePath,
                            relativePath,
                            config,
                            hashCache,
                            input.sessionID
                        )
                        
                        if (result.success) {
                            const sessionState = getSessionState(input.sessionID)
                            if (result.changed) {
                                sessionState.backupCount++
                                if (!sessionState.modifiedFiles.includes(relativePath)) {
                                    sessionState.modifiedFiles.push(relativePath)
                                }
                                hashCacheDirty = true
                                // 保存哈希缓存
                                await saveHashCache()
                            }
                        }
                    } catch (error) {
                        console.error(`❌ 备份失败: ${relativePath}`, error)
                    }
                }
            }
        },
        
        // ========== 自定义工具 ==========
        tool: {
            // 初始化/重新初始化工具
            initPlugin: tool({
                description: "初始化或重新初始化插件（用于检查配置）",
                args: {},
                async execute() {
                    initialized = false
                    config = null
                    const result = await initializePlugin()
                    return result.message
                }
            }),
            
            // 手动备份工具
            backupMarkdown: tool({
                description: "手动备份markdown文件到备份目录（支持增量备份）",
                args: {
                    paths: tool.schema.array(tool.schema.string())
                        .optional()
                        .describe("要备份的文件路径列表（相对于工作空间），如果不提供则备份当前会话修改的文件"),
                    force: tool.schema.boolean().optional()
                        .describe("是否强制备份（忽略哈希检查）")
                },
                async execute(args, ctx) {
                    // 确保插件已初始化
                    if (!initialized || !config) {
                        const result = await initializePlugin()
                        if (!result.success) {
                            return result.message
                        }
                    }
                    
                    if (!config) {
                        return "❌ 插件未初始化，请先配置备份路径"
                    }
                    
                    const filesToBackup: Array<{ sourcePath: string; relativePath: string }> = []
                    
                    if (args.paths && args.paths.length > 0) {
                        // 备份指定文件
                        for (const relativePath of args.paths) {
                            filesToBackup.push({
                                sourcePath: path.join(ctx.worktree, relativePath),
                                relativePath
                            })
                        }
                    } else {
                        // 备份当前会话修改过的文件
                        const sessionState = getSessionState(ctx.sessionID)
                        if (sessionState.modifiedFiles.length > 0) {
                            for (const relativePath of sessionState.modifiedFiles) {
                                filesToBackup.push({
                                    sourcePath: path.join(ctx.worktree, relativePath),
                                    relativePath
                                })
                            }
                        } else {
                            return "⚠️ 没有需要备份的文件\n\n当前会话未修改任何markdown文件。\n\n💡 提示: 可以指定文件路径进行备份:\n   backupMarkdown({ paths: [\"docs/readme.md\"] })"
                        }
                    }
                    
                    let result;
                    if (args.force) {
                        result = await forceBackupFiles(
                            filesToBackup,
                            config,
                            hashCache,
                            ctx.sessionID
                        )
                    } else {
                        result = await backupMultipleFiles(
                            filesToBackup,
                            config,
                            hashCache,
                            ctx.sessionID
                        )
                    }
                    
                    // 保存哈希缓存
                    if (result.success > 0) {
                        hashCacheDirty = true
                        await saveHashCache()
                    }
                    
                    let output = args.force 
                        ? `✅ 强制备份完成！\n`
                        : `✅ 备份完成！\n`
                    output += `   - 已备份: ${result.success} 个文件\n`
                    output += `   - 已跳过: ${result.skipped} 个文件\n`
                    output += `   - 失败: ${result.failed} 个文件\n`
                    output += `   - 总大小: ${(result.totalSize / 1024).toFixed(2)} KB\n`
                    output += `\n📁 备份目录: ${config.backupRoot}`
                    
                    if (result.errors.length > 0) {
                        output += `\n\n❌ 错误列表:\n`
                        for (const error of result.errors) {
                            output += `   - ${error}\n`
                        }
                    }
                    
                    return output
                }
            }),
            
            // 恢复工具
            restoreMarkdown: tool({
                description: "从备份目录恢复markdown文件到工作空间",
                args: {
                    strategy: tool.schema.enum(['overwrite', 'skip', 'rename'])
                        .describe("文件冲突处理策略: overwrite=覆盖(默认), skip=跳过, rename=重命名")
                        .default('overwrite'),
                    filter: tool.schema.string().optional()
                        .describe("可选的路径过滤器，例如 'docs/' 只恢复docs目录下的文件")
                },
                async execute(args, ctx) {
                    // 确保插件已初始化
                    if (!initialized || !config) {
                        const result = await initializePlugin()
                        if (!result.success) {
                            return result.message
                        }
                    }
                    
                    if (!config) {
                        return "❌ 插件未初始化，请先配置备份路径"
                    }
                    
                    const result = await restoreMarkdownFiles(
                        config,
                        ctx.worktree,
                        args.strategy || 'overwrite',
                        args.filter,
                        ctx.sessionID
                    )
                    
                    let output = `✅ 恢复完成！\n` +
                                `   - 已恢复: ${result.restored} 个文件\n` +
                                `   - 已跳过: ${result.skipped} 个文件\n` +
                                `   - 失败: ${result.errors} 个文件\n`
                    
                    output += `\n📁 备份目录: ${config.backupRoot}`
                    output += `\n🎯 恢复目标: ${ctx.worktree}`
                    
                    if (result.errorsList.length > 0) {
                        output += `\n\n❌ 错误列表:\n`
                        for (const error of result.errorsList) {
                            output += `   - ${error}\n`
                        }
                    }
                    
                    return output
                }
            }),
            
            // 查看备份日志工具
            viewBackupLog: tool({
                description: "查看备份/恢复日志",
                args: {
                    action: tool.schema.enum(['backup', 'restore', 'all'])
                        .describe("日志类型: backup=备份日志, restore=恢复日志, all=全部日志")
                        .default('all'),
                    limit: tool.schema.number().optional()
                        .describe("显示最近的日志条目数量，默认50条")
                        .default(50)
                },
                async execute(args) {
                    // 确保插件已初始化
                    if (!initialized || !config) {
                        const result = await initializePlugin()
                        if (!result.success) {
                            return result.message
                        }
                    }
                    
                    if (!config) {
                        return "❌ 插件未初始化，请先配置备份路径"
                    }
                    
                    const entries = await readLogEntries(
                        args.action || 'all',
                        args.limit || 50
                    )
                    
                    let output = formatLogEntries(entries)
                    output += `\n\n📊 日志目录: ${getLogDir()}`
                    
                    return output
                }
            }),
            
            // 统计工具
            backupStats: tool({
                description: "查看备份统计信息",
                args: {
                    detailed: tool.schema.boolean().optional()
                        .describe("是否显示详细统计信息（包括目录列表）")
                        .default(false)
                },
                async execute(args) {
                    // 确保插件已初始化
                    if (!initialized || !config) {
                        const result = await initializePlugin()
                        if (!result.success) {
                            return result.message
                        }
                    }
                    
                    if (!config) {
                        return "❌ 插件未初始化，请先配置备份路径"
                    }
                    
                    const stats = await scanBackupDirectory(config)
                    
                    let output = `📊 备份统计信息\n\n` +
                                 `   总文件数: ${stats.fileCount}\n` +
                                 `   总大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB\n` +
                                 `   目录数: ${stats.directories.length}\n` +
                                 `   哈希缓存数: ${Object.keys(hashCache).length}\n`
                    
                    if (args.detailed && stats.directories.length > 0) {
                        output += `\n📁 目录列表:\n`
                        for (const dir of stats.directories.slice(0, 20)) {
                            output += `   - ${dir}\n`
                        }
                        if (stats.directories.length > 20) {
                            output += `   ... 还有 ${stats.directories.length - 20} 个目录\n`
                        }
                    }
                    
                    output += `\n📁 备份目录: ${config.backupRoot}\n` +
                              `📊 日志目录: ${getLogDir()}`
                    
                    return output
                }
            }),
            
            // 配置管理工具
            showConfig: tool({
                description: "显示当前插件配置",
                args: {},
                async execute() {
                    // 确保插件已初始化
                    if (!initialized || !config) {
                        const result = await initializePlugin()
                        if (!result.success) {
                            return result.message
                        }
                    }
                    
                    if (!config) {
                        return "❌ 插件未初始化，请先配置备份路径"
                    }
                    
                    return `📋 当前配置\n\n` +
                           `   备份目录: ${config.backupRoot}\n` +
                           `   插件状态: ${config.enabled ? '✅ 启用' : '❌ 禁用'}\n` +
                           `   自动备份: ${config.autoBackup ? '✅ 开启' : '❌ 关闭'}\n` +
                           `   日志记录: ${config.logEnabled ? '✅ 开启' : '❌ 关闭'}\n` +
                           `\n📊 日志目录: ${getLogDir()}\n` +
                           `💾 哈希缓存: ${Object.keys(hashCache).length} 个文件`
                }
            })
        }
    }
}

// 导出插件
export default MarkdownBackupSync
