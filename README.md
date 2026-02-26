# Markdown Backup Sync

> OpenCode插件，实现markdown文件的自动增量备份和双向同步

[![NPM Version](https://img.shields.io/npm/v/markdown-backup-sync)](https://www.npmjs.com/package/markdown-backup-sync)
[![License](https://img.shields.io/npm/l/markdown-backup-sync)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

## ⚠️ 重要提示：必须配置备份路径

**此插件没有默认备份路径！首次使用前必须完成配置。**

请仔细阅读下方的「安装与配置」章节，完成备份路径配置后才能使用。

---

## ✨ 特性

- ✅ **自动增量备份** - 只备份内容变化的文件，高效节省空间
- ✅ **智能恢复** - 支持三种冲突处理策略（覆盖、跳过、重命名）
- ✅ **完整日志** - 详细记录所有备份和恢复操作
- ✅ **路径保持** - 使用相对路径确保正确恢复到原位置
- ✅ **灵活配置** - 支持项目配置文件和环境变量两种方式
- ✅ **强制配置** - 无默认路径，避免误操作

---

## 📦 安装

```bash
npm install -g @wanggan768q/markdown-backup-sync
```

---

## ⚙️ 安装与配置（必读！）

### ⚠️ 第一步：配置备份路径（必须完成）

**插件安装后必须配置备份路径才能使用！** 以下两种方法任选其一：

---

### 📁 方法一：创建项目配置文件（推荐）

在项目根目录下创建配置文件：

**1. 创建目录和文件：**

```
项目根目录/
└── .config/
    └── backup-config.json    ← 创建此文件
└── .opencode/
    └── backup-config.json    ← 创建此文件
```

**2. 写入配置内容：**

```json
{
  "backupRoot": "D:\\MarkdownBackups\\YourProjectName\\",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}
```

**3. 配置说明：**

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|:----:|--------|------|
| `backupRoot` | string | ✅ **必填** | 无 | 备份目录的绝对路径 |
| `enabled` | boolean | 可选 | `true` | 是否启用插件 |
| `autoBackup` | boolean | 可选 | `true` | 是否自动备份Agent修改的文件 |
| `logEnabled` | boolean | 可选 | `true` | 是否记录操作日志 |

**4. 配置示例：**

```json
// Windows 路径示例
{
  "backupRoot": "D:\\MarkdownBackups\\MyAwesomeProject\\",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}

// 或使用正斜杠（Windows也支持）
{
  "backupRoot": "D:/MarkdownBackups/MyAwesomeProject/",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}

// Linux/Mac 路径示例
{
  "backupRoot": "/home/username/backups/markdown/project-name/",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}
```

**💡 提示：**
- 必须使用绝对路径
- Windows路径使用双反斜杠 `\\` 或单斜杠 `/` 都可以
- 确保备份目录路径有读写权限
- 路径末尾保留或省略分隔符都可以

---

### 🔧 方法二：使用环境变量

**Windows (PowerShell):**
```powershell
# 临时设置（仅当前会话有效）
$env:MARKDOWN_BACKUP_ROOT = "D:\MarkdownBackups\MyProject\"

# 永久设置
[System.Environment]::SetEnvironmentVariable('MARKDOWN_BACKUP_ROOT', 'D:\MarkdownBackups\MyProject\', 'User')
```

**Windows (CMD):**
```cmd
# 临时设置（仅当前会话有效）
set MARKDOWN_BACKUP_ROOT=D:\MarkdownBackups\MyProject\

# 永久设置：在"系统属性 > 环境变量"中手动添加
```

**Linux/Mac (Bash/Zsh):**
```bash
# 临时设置（仅当前会话有效）
export MARKDOWN_BACKUP_ROOT="/path/to/backup/"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export MARKDOWN_BACKUP_ROOT="/path/to/backup/"' >> ~/.bashrc
source ~/.bashrc
```

QN|**可用的环境变量：**

> 💡 **配置优先级**：项目配置文件 (`.config/backup-config.json`) > 环境变量

| 环境变量 | 说明 |
|---------|------|
| `MARKDOWN_BACKUP_ROOT` | 备份目录路径（必须设置） |
| `MARKDOWN_BACKUP_ENABLED` | 设为 `false` 禁用插件 |
| `MARKDOWN_BACKUP_AUTO` | 设为 `false` 禁用自动备份 |
| `MARKDOWN_BACKUP_LOG` | 设为 `false` 禁用日志记录 |

---

### ✅ 第二步：重启 OpenCode

配置完成后，重启 OpenCode 以加载插件。

### 🔍 第三步：验证配置

重启后，插件会自动检测配置。如果配置正确，会看到如下启动信息：

```
══════════════════════════════════════════════════════════════════
           ✅ Markdown Backup Sync 插件已成功启动
══════════════════════════════════════════════════════════════════

📁 备份目录: D:\MarkdownBackups\MyProject\
🔄 自动备份: ✅ 开启
📝 日志记录: ✅ 开启

可用工具:
  - backupMarkdown      手动备份文件
  - restoreMarkdown     恢复文件
  - viewBackupLog       查看日志
  - backupStats         统计信息
  - showConfig          查看配置
  - initPlugin          重新初始化

══════════════════════════════════════════════════════════════════
```

**如果看到配置错误提示，请按照提示重新配置。**

---

## 🚀 快速开始

### 自动备份

配置完成后，插件会自动备份 Agent 创建或修改的所有 markdown 文件。

无需手动操作，插件会在后台工作：
- ✅ 监听文件写入和编辑操作
- ✅ 只备份内容变化的文件（增量备份）
- ✅ 保持目录结构（使用相对路径）

### 手动备份

```javascript
// 备份当前会话修改的文件
backupMarkdown()

// 备份指定文件
backupMarkdown({ 
    paths: ["docs/readme.md", "CHANGELOG.md"] 
})

// 强制备份（忽略哈希检查）
backupMarkdown({ 
    paths: ["docs/readme.md"], 
    force: true 
})
```

### 恢复文件

```javascript
// 恢复所有文件（覆盖已存在文件，默认策略）
restoreMarkdown()

// 跳过已存在文件
restoreMarkdown({ strategy: "skip" })

// 重命名已存在文件（添加数字后缀）
restoreMarkdown({ strategy: "rename" })

// 只恢复特定目录
restoreMarkdown({ filter: "docs/" })
```

### 查看日志

```javascript
// 查看最近50条日志
viewBackupLog()

// 只看备份日志
viewBackupLog({ action: "backup", limit: 100 })

// 只看恢复日志
viewBackupLog({ action: "restore" })
```

### 统计信息

```javascript
// 基本统计
backupStats()

// 详细统计（包括目录列表）
backupStats({ detailed: true })
```

### 查看配置

```javascript
// 显示当前配置
showConfig()
```

### 重新初始化插件

```javascript
// 重新加载配置（配置修改后使用）
initPlugin()
```

---

## 📁 目录结构

插件会在备份目录下创建以下结构：

```
{BACKUP_ROOT}/
├── .backup-log/              # 日志和缓存目录
│   ├── backup.log            # 备份操作日志
│   ├── restore.log           # 恢复操作日志
│   └── file-hashes.json      # 文件哈希缓存（用于增量备份）
├── docs/                     # 备份的markdown文件（保持原目录结构）
│   └── readme.md
├── CHANGELOG.md
└── ...
```

---

## 🔧 工具详细说明

### backupMarkdown

手动备份 markdown 文件到备份目录。

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `paths` | string[] | 可选 | 要备份的文件路径列表（相对于工作空间） |
| `force` | boolean | 可选 | 是否强制备份（忽略哈希检查） |

**返回示例：**
```
✅ 备份完成！
   - 已备份: 2 个文件
   - 已跳过: 1 个文件
   - 失败: 0 个文件
   - 总大小: 15.23 KB

📁 备份目录: D:\MarkdownBackups\MyProject\
```

---

### restoreMarkdown

从备份目录恢复 markdown 文件到工作空间。

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `strategy` | string | 可选 | 冲突处理策略，默认 `"overwrite"` |
| `filter` | string | 可选 | 路径过滤器，例如 `"docs/"` |

**策略说明：**
| 策略 | 说明 |
|------|------|
| `"overwrite"` | 覆盖已存在的文件（默认） |
| `"skip"` | 跳过已存在的文件 |
| `"rename"` | 重命名已存在的文件（添加数字后缀，如 `readme_1.md`） |

**返回示例：**
```
✅ 恢复完成！
   - 已恢复: 5 个文件
   - 已跳过: 2 个文件
   - 失败: 0 个文件

📁 备份目录: D:\MarkdownBackups\MyProject\
🎯 恢复目标: F:\Work\trunk
```

---

### viewBackupLog

查看备份/恢复操作日志。

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `action` | string | 可选 | 日志类型：`"backup"` / `"restore"` / `"all"`（默认） |
| `limit` | number | 可选 | 显示条目数量，默认 50 |

**返回示例：**
```
📋 备份日志（最近 10 条）

✅ [2026/1/31 16:30:15] 备份: docs/readme.md
   大小: 12.34 KB
✅ [2026/1/31 16:29:22] 备份: CHANGELOG.md
   大小: 5.67 KB
⊘ [2026/1/31 16:28:10] 跳过: docs/api.md
...

📊 日志目录: D:\MarkdownBackups\MyProject\.backup-log
```

---

### backupStats

查看备份目录统计信息。

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `detailed` | boolean | 可选 | 是否显示详细信息，默认 false |

**返回示例：**
```
📊 备份统计信息

   总文件数: 15
   总大小: 2.34 MB
   目录数: 3
   哈希缓存数: 15

📁 备份目录: D:\MarkdownBackups\MyProject\
📊 日志目录: D:\MarkdownBackups\MyProject\.backup-log
```

---

### showConfig

显示当前插件配置。

**返回示例：**
```
📋 当前配置

   备份目录: D:\MarkdownBackups\MyProject\
   插件状态: ✅ 启用
   自动备份: ✅ 开启
   日志记录: ✅ 开启

📊 日志目录: D:\MarkdownBackups\MyProject\.backup-log
💾 哈希缓存: 15 个文件
```

---

### initPlugin

初始化或重新初始化插件（用于检查配置或重新加载配置）。

**使用场景：**
- 首次使用插件时检查配置
- 修改配置文件后重新加载

---

## 🔄 工作原理

### 自动备份流程

1. **监听操作** - 监听 `write` 和 `edit` 工具操作
2. **检测文件** - 识别 markdown 文件（`.md` 扩展名）
3. **计算哈希** - 计算文件 SHA256 哈希值
4. **增量备份** - 只备份哈希值不同的文件
5. **保持结构** - 使用相对路径保持目录结构

### 增量备份原理

- **哈希检测** - 使用 SHA256 哈希检测文件内容变化
- **智能跳过** - 只备份内容变化的文件
- **缓存管理** - 哈希缓存保存在 `file-hashes.json`
- **高效存储** - 大幅减少备份时间和存储空间

### 恢复机制

- **遍历备份** - 从备份目录遍历所有 markdown 文件
- **相对路径** - 使用相对路径恢复到正确位置
- **冲突处理** - 支持三种策略：覆盖、跳过、重命名

---

## 🐛 故障排除

### 插件未加载

**问题：** 安装后插件未自动加载

**解决方案：**
1. 确认已安装：`npm ls markdown-backup-sync`
2. 重启 OpenCode
3. 查看控制台输出

---

### 配置错误提示

**问题：** 看到配置错误提示

如果看到类似以下提示：
```
⚠️  未找到备份配置文件

请选择以下任一方式配置：
...
```

**解决方案：**
1. **选择配置方法：** 项目配置文件或环境变量
2. **填写配置内容：** 必须填写 `backupRoot` 路径
3. **重启 OpenCode：** 重新加载插件
4. **验证配置：** 运行 `initPlugin()` 检查配置

---

### 备份失败

**问题：** 备份操作失败

**解决方案：**
1. 检查备份目录权限：确保有读写权限
2. 查看日志：运行 `viewBackupLog()` 查看详细错误
3. 检查配置：运行 `showConfig()` 确认配置正确
4. 重新初始化：运行 `initPlugin()` 重新检查配置

---

### 文件未自动备份

**问题：** 修改文件后未自动备份

**解决方案：**
1. 检查 `autoBackup` 配置是否为 `true`
2. 确认文件扩展名是 `.md`
3. 查看日志：`viewBackupLog()` 了解详细情况
4. 手动备份：运行 `backupMarkdown()` 手动触发

---

### 备份路径无效

**问题：** 显示"备份路径无效或无访问权限"

**解决方案：**
1. 检查路径格式：确保路径格式正确（Windows 使用 `\\` 或 `/`）
2. 检查路径存在：确保备份目录存在或可创建
3. 检查权限：确保对目录有读写权限
4. 修改配置：更新 `backup-config.json` 中的路径
5. 重新初始化：运行 `initPlugin()` 重新加载配置

---

## 📝 配置示例

### 场景1：单个项目

```json
{
  "backupRoot": "D:\\Backups\\MyProject\\",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}
```

### 场景2：多个项目共享备份目录

XN|项目A (`.config/backup-config.json`):
```json
{
  "backupRoot": "D:\\Backups\\Markdown\\ProjectA\\",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}
```

YP|项目B (`.config/backup-config.json`):
```json
{
  "backupRoot": "D:\\Backups\\Markdown\\ProjectB\\",
  "enabled": true,
  "autoBackup": true,
  "logEnabled": true
}
```

### 场景3：禁用自动备份，仅手动备份

```json
{
  "backupRoot": "D:\\Backups\\Manual\\",
  "enabled": true,
  "autoBackup": false,
  "logEnabled": true
}
```

---

## ❓ 常见问题

<details>
<summary><b>1. 为什么必须配置备份路径？</b></summary>
<br>

为了安全和隐私考虑，插件不允许硬编码默认备份路径。强制要求配置可以：
- 避免误备份到错误位置
- 让用户明确知道文件备份到哪里
- 防止意外覆盖重要文件
</details>

<details>
<summary><b>2. 可以在不同项目使用不同的备份路径吗？</b></summary>
<br>

XV|可以！每个项目都有独立的 `.config/backup-config.json` 文件，可以配置不同的备份路径。
</details>

<details>
<summary><b>3. 增量备份是如何工作的？</b></summary>
<br>

插件使用 SHA256 哈希值检测文件内容变化。只有文件内容变化时才会备份，未变化的文件会被跳过。哈希缓存保存在 `file-hashes.json` 文件中。
</details>

<details>
<summary><b>4. 如何备份到网络驱动器或云存储？</b></summary>
<br>

直接配置网络驱动器或已挂载的云存储路径即可，例如：
```json
{
  "backupRoot": "Z:\\CloudStorage\\MarkdownBackup\\",
  "enabled": true
}
```
</details>

<details>
<summary><b>5. 卸载插件会删除备份文件吗？</b></summary>
<br>

不会。卸载插件只会移除插件本身，不会删除备份目录中的任何文件。如需删除备份，请手动删除备份目录。
</details>

---

## 📄 License

MIT License - 详见 [LICENSE](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- GitHub: [https://github.com/yourusername/markdown-backup-sync](https://github.com/yourusername/markdown-backup-sync)

---

⭐ 如果这个项目对你有帮助，请给个 Star！
