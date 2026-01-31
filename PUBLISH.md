# 发布到 NPM 指南

本文档介绍如何将 `markdown-backup-sync` 插件发布到 npm。

## 📋 发布前准备

### 1. 注册 npm 账号

如果还没有 npm 账号，请前往 [https://www.npmjs.com/signup](https://www.npmjs.com/signup) 注册。

### 2. 登录 npm

在终端中执行：

```bash
npm login
```

按提示输入用户名、密码和邮箱。

### 3. 验证登录状态

```bash
npm whoami
```

应该显示您的 npm 用户名。

---

## 🔧 修改包信息

发布前，请修改 `package.json` 中的以下信息：

```json
{
  "name": "markdown-backup-sync",           // 可改为您的包名，如 "@yourusername/markdown-backup-sync"
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/markdown-backup-sync.git"
  },
  "homepage": "https://github.com/yourusername/markdown-backup-sync#readme",
  "bugs": {
    "url": "https://github.com/yourusername/markdown-backup-sync/issues"
  }
}
```

同时修改 `LICENSE` 文件中的版权信息：

```
Copyright (c) 2026 Your Name
```

---

## 🚀 发布步骤

### 方法一：手动发布

```bash
# 1. 进入项目目录
cd C:\Users\Ambition\Projects\markdown-backup-sync

# 2. 确保代码已编译
npm run build

# 3. 检查将要发布的文件
npm pack --dry-run

# 4. 发布到 npm
npm publish

# 如果是 scoped package（如 @yourusername/markdown-backup-sync）
npm publish --access public
```

### 方法二：使用发布脚本

```bash
# 发布补丁版本 (1.0.0 -> 1.0.1)
npm run release:patch

# 发布次版本 (1.0.0 -> 1.1.0)
npm run release:minor

# 发布主版本 (1.0.0 -> 2.0.0)
npm run release:major

# 发布测试版本
npm run release:beta
```

---

## 📦 验证发布

发布后，可以通过以下方式验证：

```bash
# 查看包信息
npm view markdown-backup-sync

# 在新项目中安装测试
npm install markdown-backup-sync
```

访问 npm 页面：`https://www.npmjs.com/package/markdown-backup-sync`

---

## 🔄 更新版本

当需要发布新版本时：

```bash
# 1. 修改代码

# 2. 编译
npm run build

# 3. 更新版本号（会自动创建 git tag）
npm version patch  # 或 minor, major

# 4. 发布
npm publish

# 5. 推送到 GitHub（可选）
git push && git push --tags
```

---

## 📝 版本号说明

遵循语义化版本（Semantic Versioning）：

| 版本类型 | 说明 | 示例 |
|---------|------|------|
| `patch` | 修复 bug，向后兼容 | 1.0.0 → 1.0.1 |
| `minor` | 新增功能，向后兼容 | 1.0.0 → 1.1.0 |
| `major` | 破坏性变更，不兼容 | 1.0.0 → 2.0.0 |
| `prerelease` | 预发布版本 | 1.0.0 → 1.0.1-beta.0 |

---

## 🔗 创建 GitHub 仓库（可选但推荐）

### 1. 初始化 Git 仓库

```bash
cd C:\Users\Ambition\Projects\markdown-backup-sync

git init
git add .
git commit -m "Initial commit: markdown-backup-sync v1.0.0"
```

### 2. 创建 GitHub 仓库

前往 [https://github.com/new](https://github.com/new) 创建新仓库。

### 3. 推送代码

```bash
git remote add origin https://github.com/yourusername/markdown-backup-sync.git
git branch -M main
git push -u origin main
```

---

## ❓ 常见问题

### 包名已被占用

如果 `markdown-backup-sync` 已被占用，可以：

1. 使用 scoped name：`@yourusername/markdown-backup-sync`
2. 或使用其他名称：`md-backup-sync`、`opencode-markdown-backup` 等

修改 `package.json` 中的 `name` 字段后重新发布。

### 发布失败：403 Forbidden

可能原因：
- 包名已被占用
- 未登录或登录过期
- 需要验证邮箱

解决方法：
```bash
npm login  # 重新登录
npm whoami # 验证登录状态
```

### 发布失败：402 Payment Required

Scoped package 默认是私有的，需要付费或使用 `--access public`：

```bash
npm publish --access public
```

---

## 📁 项目文件结构

```
markdown-backup-sync/
├── dist/                    # 编译输出（发布到 npm）
│   ├── index.js
│   ├── index.d.ts
│   ├── backup.js
│   ├── backup.d.ts
│   ├── restore.js
│   ├── restore.d.ts
│   ├── logger.js
│   ├── logger.d.ts
│   ├── utils.js
│   └── utils.d.ts
├── src/                     # 源代码（不发布）
│   ├── index.ts
│   ├── backup.ts
│   ├── restore.ts
│   ├── logger.ts
│   └── utils.ts
├── node_modules/            # 依赖（不发布）
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── PUBLISH.md              # 本文件
├── .gitignore
└── .npmignore
```

---

## 🎉 发布成功后

发布成功后，用户可以通过以下方式安装：

```bash
npm install markdown-backup-sync
```

然后按照 README.md 中的说明配置备份路径即可使用！
