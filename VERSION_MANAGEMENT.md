# 版本号管理文档

本文档描述了 opcode 项目的简化版本号管理系统。

## 概述

版本号管理功能实现了以下特性：

1. **单一数据源**: 版本号仅在 `package.json` 中管理
2. **自动递增**: 每次构建时自动递增修订版本号（z部分）
3. **自动同步**: 版本号自动同步到所有配置文件
4. **简单编辑**: 手工发布时只需编辑 `package.json`
5. **动态显示**: NFO 页面实时显示当前版本号
6. **版本化构建**: 可执行文件名包含版本号（如：opcode-v0.2.1.exe）

## 版本号格式

遵循语义化版本规范（SemVer）：`x.y.z`

- **x (Major)**: 主版本号 - 不兼容的API修改
- **y (Minor)**: 次版本号 - 向下兼容的功能性新增
- **z (Patch)**: 修订版本号 - 向下兼容的问题修正

## 核心原则

### 版本号存储位置

**唯一数据源**: `package.json`
```json
{
  "name": "opcode",
  "version": "0.2.1",
  ...
}
```

**自动同步文件**:
- `src-tauri/Cargo.toml` - Rust crate 版本
- `src-tauri/tauri.conf.json` - Tauri 应用版本

### 版本号变更方式

#### 1. 手工发布版本（推荐方式）

**步骤 1**: 编辑 `package.json` 中的版本号
```json
{
  "version": "1.5.0"
}
```

**步骤 2**: 同步版本到其他文件
```bash
npm run sync:version
```

**步骤 3**: 构建（会自动递增 patch）
```bash
bun run build
# 版本从 1.5.0 → 1.5.1
```

**示例工作流**:
```bash
# 1. 手工编辑 package.json: "version": "2.0.0"
# 2. 同步版本
npm run sync:version

# 3. 构建发布
bun run build:executables:windows
# 版本自动递增: 2.0.0 → 2.0.1
# 生成文件: opcode-2.0.1.exe
```

#### 2. 自动递增构建

每次执行构建命令时，patch 版本自动递增：

```bash
# 构建前端（自动递增patch版本）
bun run build
# 版本: 0.2.1 → 0.2.2

# 构建可执行文件（自动递增patch版本）
bun run build:executables:windows
# 版本: 0.2.2 → 0.2.3
```

## 使用场景

### 场景 1: 日常开发构建

```bash
# 开发完成，直接构建
bun run build
# 版本自动从 1.5.2 递增到 1.5.3
```

### 场景 2: 发布新功能版本

```bash
# 步骤 1: 手工编辑 package.json
# 将 "version": "1.5.3" 改为 "version": "1.6.0"

# 步骤 2: 同步版本到其他文件
npm run sync:version

# 步骤 3: 构建发布版本
bun run build:executables:windows
# 版本自动递增到 1.6.1
```

### 场景 3: 发布重大版本

```bash
# 步骤 1: 手工编辑 package.json
# 将 "version": "1.9.5" 改为 "version": "2.0.0"

# 步骤 2: 同步版本
npm run sync:version

# 步骤 3: 构建发布
bun run build:executables
# 版本自动递增到 2.0.1
```

### 场景 4: 紧急修复版本

```bash
# 步骤 1: 手工编辑 package.json
# 将 "version": "1.6.8" 改为 "version": "1.6.9"

# 步骤 2: 同步版本
npm run sync:version

# 步骤 3: 构建
bun run build:executables
# 版本自动递增到 1.6.10
```

## 脚本命令

### 版本同步脚本

```bash
# 同步 package.json 中的版本到其他配置文件
npm run sync:version
```

### 版本递增脚本（手动控制）

```bash
# 递增 patch 版本（自动递增）
npm run bump:patch

# 递增 minor 版本（手工控制）
npm run bump:minor

# 递增 major 版本（手工控制）
npm run bump:major
```

**注意**: 这些命令会直接修改 `package.json` 中的版本，然后同步到其他文件。

## 构建命令

### 自动递增的构建

所有 `build:*` 命令都会在构建前自动递增 patch 版本：

```bash
bun run build                    # 前端构建 + 递增
bun run build:executables        # 可执行文件构建 + 递增
bun run build:executables:windows # Windows 构建 + 递增
```

### 同步但不递增

```bash
# 只同步版本，不递增（用于手工编辑后）
npm run sync:version

# 或使用 prebuild:no-increment
bun run build:executables -- --config.targetEnv=web
```

## 版本号显示

### NFO 页面版本显示

在应用的 Info 页面（NFO Credits）中查看版本号：

1. 点击标题栏的 **"i"** 图标
2. 在 NFO 窗口标题栏中显示：`opcode.NFO v0.2.1`
3. 在 NFO 页面顶部也显示版本号：`opcode v0.2.1`

### API 调用

前端可以通过 API 获取版本号：

```typescript
import { api } from '@/lib/api';

// 获取版本号
const version = await api.getAppVersion(); // "0.2.1"
```

## 构建输出

### 可执行文件命名

构建后的可执行文件会自动包含版本号后缀：

```bash
npm run tauri:build
```

**输出文件**:
- `src-tauri/target/release/opcode-v0.2.1.exe`
- `src-tauri/target/release/bundle/msi/opcode-v0.2.1.msi`

**命名规则**: `{productName}-v{version}.{ext}`

### 构建流程

1. **版本同步**: 从 `package.json` 读取版本号
2. **构建应用**: 执行 Tauri 构建
3. **文件重命名**: 自动添加版本后缀
4. **完成**: 生成带版本号的可执行文件

## Tauri 命令

后端提供以下命令：

- `get_app_version`: 获取应用版本号字符串
- `get_version_info`: 获取详细版本信息

## 工作流示例

### 完整发布流程

```bash
# 1. 开发完成，准备发布 2.0.0 版本

# 2. 手工编辑 package.json
#    将 "version": "1.9.8" 改为 "version": "2.0.0"

# 3. 同步版本到所有文件
npm run sync:version

# 4. 构建发布版本（自动递增到 2.0.1）
bun run build:executables:windows

# 5. 提交更改
git add .
git commit -m "chore: release v2.0.1"
git tag -a v2.0.1 -m "Release v2.0.1"

# 6. 推送
git push && git push --tags
```

### 连续构建流程

```bash
# 第一次构建
bun run build
# 版本: 2.0.0 → 2.0.1

# 第二次构建
bun run build
# 版本: 2.0.1 → 2.0.2

# 第三次构建
bun run build
# 版本: 2.0.2 → 2.0.3
```

## 注意事项

1. **唯一数据源**: 版本号只管理在 `package.json` 中
2. **手工编辑**: 发布时直接编辑 `package.json` 中的版本号
3. **自动同步**: 运行 `npm run sync:version` 将版本同步到其他文件
4. **构建递增**: 每次构建时 patch 版本自动递增
5. **无自动归零**: 当手工修改 x.y 时，z 需要手动设置为 0

## 文件结构

```
opcode/
├── package.json                    # 版本号唯一数据源 ⭐
├── src-tauri/
│   ├── Cargo.toml                  # 自动同步版本
│   └── tauri.conf.json            # 自动同步版本
├── scripts/
│   ├── sync-version.js            # 版本同步脚本
│   └── increment-version.js       # 版本递增脚本
└── VERSION_MANAGEMENT.md          # 本文档
```

## 最佳实践

1. **手工发布**: 使用手工编辑 `package.json` 的方式发布新版本
2. **同步版本**: 手工编辑后记得运行 `npm run sync:version`
3. **构建递增**: 让构建自动处理 patch 版本递增
4. **版本标签**: 发布时创建 Git 标签
5. **文档更新**: 更新 CHANGELOG.md 记录版本变更

## 故障排除

### 版本号不同步

如果发现版本号在不同文件中不一致，运行：

```bash
npm run sync:version
```

### 构建失败

检查 `package.json` 中的版本号格式是否正确：

```bash
# 必须是 x.y.z 格式
grep '"version"' package.json
```

### 脚本权限问题

确保脚本有执行权限：

```bash
chmod +x scripts/sync-version.js
chmod +x scripts/increment-version.js
```

## 总结

**核心优势**:
- ✅ **简单直接**: 版本号只在一个地方管理
- ✅ **手工控制**: 发布时直接编辑 `package.json`
- ✅ **自动递增**: 构建时自动处理 patch 递增
- ✅ **自动同步**: 版本自动同步到所有配置文件
- ✅ **无复杂逻辑**: 不需要复杂的脚本和归零规则

**工作流程**:
1. 手工编辑 `package.json` 设置版本（如：2.0.0）
2. 运行 `npm run sync:version` 同步版本
3. 构建（自动递增到 2.0.1）
4. 发布 `opcode-2.0.1.exe`
