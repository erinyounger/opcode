# CLAUDE.md - opcode 项目开发规范

本文件为 Claude Code 提供 opcode 项目的完整开发指导和规范标准。**强烈建议开发者在开始任何开发工作前仔细阅读此文档**。

---

## 📋 目录

1. [项目概述](#项目概述)
2. [核心开发原则](#核心开发原则)
3. [代码质量标准](#代码质量标准)
4. [开发环境配置](#开发环境配置)
5. [技术栈](#技术栈)
6. [项目架构](#项目架构)
7. [开发工作流](#开发工作流)
8. [编码规范](#编码规范)
9. [性能优化指南](#性能优化指南)
10. [测试与质量保证](#测试与质量保证)
11. [安全与最佳实践](#安全与最佳实践)
12. [故障排除](#故障排除)
13. [附录](#附录)

---

## 项目概述

**opcode** 是一个基于 Tauri 2 构建的桌面应用程序，为 Claude Code 提供强大的 GUI 界面和管理工具。项目采用 Rust 后端 + React 前端的架构，支持项目管理、自定义代理创建、使用分析和 MCP 服务器管理等功能。

### 核心特性

- 🦀 **Rust 后端**: 高性能、内存安全的 Tauri 2 应用
- ⚛️ **React 前端**: 现代化的 TypeScript + Vite 构建
- 📊 **数据分析**: 完整的使用统计和成本跟踪
- 🔧 **代理系统**: 自定义 Claude 代理创建和管理
- 🗄️ **本地存储**: SQLite 数据库保证数据安全

---

## 核心开发原则

### 🎯 核心价值观

1. **性能优先** - 所有代码必须考虑内存使用和执行效率
2. **类型安全** - 充分利用 Rust 和 TypeScript 的类型系统
3. **错误可观测** - 所有错误必须可追踪、可诊断、可恢复
4. **代码简洁** - 优先选择清晰、简单的解决方案
5. **测试覆盖** - 新功能必须有对应的测试用例

### ⚡ 性能原则

- **内存管理**: 所有动态数据结构必须有大小限制
- **异步优先**: I/O 操作必须使用异步 API
- **数据库优化**: 所有查询必须考虑索引和性能
- **前端优化**: 避免不必要的重渲染，优化大列表渲染

### 🛡️ 质量原则

- **零警告**: 代码编译和运行不能有任何警告
- **测试通过**: 所有测试用例必须通过
- **类型检查**: TypeScript 严格模式，无 `any` 类型
- **静态分析**: 必须通过 clippy、ESLint 等工具检查

### 📝 文档原则

- **自解释代码**: 代码应该易于理解，减少注释依赖
- **必要注释**: 仅对复杂逻辑、非直观代码添加注释
- **文档同步**: 代码修改必须同步更新相关文档

---

## 代码质量标准

### ✅ 强制性检查清单

每次提交前，开发者必须确认以下检查项：

#### Rust 代码
```bash
# 1. 编译检查 - 必须无错误无警告
cargo check --all-targets --all-features

# 2. 代码规范检查 - 必须无警告
cargo clippy --all-targets --all-features -- -D warnings

# 3. 格式化检查 - 必须通过
cargo fmt -- --check

# 4. 测试通过 - 所有测试必须通过
cargo test --all-targets --all-features

# 5. 安全审计 - 检查依赖漏洞
cargo audit
```

#### TypeScript/React 代码
```bash
# 1. 类型检查 - 必须无错误
bunx tsc --noEmit

# 2. 代码规范检查 - 必须通过
bun run lint

# 3. 格式化检查 - 必须通过
bun run format:check

# 4. 测试通过 - 所有测试必须通过
bun test
```

#### 综合检查
```bash
# 预提交钩子 - 所有检查
just pre-commit
```

### 📊 质量指标

| 指标类别 | 最低要求 | 目标值 |
|---------|---------|--------|
| **测试覆盖率** | 80% | 90%+ |
| **TypeScript 严格性** | 100% | 100% |
| **Rust 编译警告** | 0 | 0 |
| **ESLint 错误** | 0 | 0 |
| **性能回归** | 基准测试通过 | 持续优化 |

### 🔍 代码审查标准

#### 必须检查项
- [ ] 内存安全（Rust borrow checker）
- [ ] 类型安全（TypeScript strict）
- [ ] 性能影响（复杂度分析）
- [ ] 错误处理（全面覆盖）
- [ ] 测试覆盖（功能测试 + 边界测试）
- [ ] 文档更新（API 文档、CHANGELOG）

#### 强制要求
- **PR 必须通过所有自动化检查**
- **至少一名 reviewer 批准**
- **所有讨论必须解决**
- **新功能必须有测试用例**

---

## 开发环境配置

### 🔧 环境要求

#### 基础工具
```bash
# Rust 工具链 - 最新稳定版
rustup update stable
rustup default stable

# Node.js - v18+
node --version  # >= 18.0.0

# Bun - 最新版本
bun --version   # 最新稳定版

# Git - 最新版本
git --version   # >= 2.30.0
```

#### 开发工具
```bash
# Rust 开发工具
cargo install cargo-watch cargo-audit cargo-edit

# 前端开发工具
npm install -g @typescript-eslint/eslint-plugin

# 项目特定工具
just --version  # Just 命令 runner
```

### 📦 依赖安装

```bash
# 1. 安装前端依赖
bun install

# 2. 安装 Rust 依赖
cd src-tauri && cargo fetch

# 3. 验证环境
just doctor
```

### ⚙️ IDE 配置

#### VS Code 推荐扩展
```json
{
  "recommendations": [
    "rust-analyzer.rust-analyzer",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

#### 配置设置 (`.vscode/settings.json`)
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## 技术栈

### 前端技术
- **框架**: React 18 + TypeScript 5+
- **构建工具**: Vite 6+
- **UI 框架**: Tailwind CSS v4 + shadcn/ui
- **状态管理**: Zustand
- **路由**: React Router v6
- **测试**: Vitest + Testing Library + Playwright

### 后端技术
- **运行时**: Rust 1.75+ (Tauri 2)
- **数据库**: SQLite (rusqlite)
- **异步运行时**: Tokio
- **Web 框架**: Axum (Web 模式)
- **进程管理**: tokio::process

### 开发工具
- **构建系统**: Just
- **包管理**: Bun (前端) + Cargo (后端)

---

## 项目架构

### 📁 目录结构

```
opcode/
├── src/                          # React 前端源码
│   ├── components/               # UI 组件
│   │   ├── ui/                   # 基础 UI 组件
│   │   ├── claude-code-session/  # Claude 会话组件
│   │   └── *.tsx                 # 功能组件
│   ├── lib/                      # 工具库和 API
│   │   ├── api.ts                # Tauri API
│   │   ├── apiAdapter.ts         # API 适配器
│   │   └── analytics/            # 分析模块
│   ├── stores/                   # Zustand 状态
│   ├── services/                 # 业务逻辑
│   ├── hooks/                    # 自定义 Hooks
│   └── types/                    # TypeScript 类型
│
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── commands/             # Tauri 命令
│   │   ├── checkpoint/           # 检查点系统
│   │   ├── process/              # 进程管理
│   │   ├── web_server.rs         # Web 服务器
│   │   └── main.rs               # 主入口
│   ├── capabilities/             # 权限配置
│   └── tauri.conf.json           # Tauri 配置
│
├── cc_agents/                    # CC 代理配置
├── public/                       # 静态资源
├── justfile                      # 构建任务
└── *.config.ts                   # 配置文件
```

### 🏗️ 架构原则

1. **前后端分离**: React 前端通过 Tauri API 与 Rust 后端通信
2. **单向数据流**: 状态管理遵循 Flux 架构思想
3. **模块化设计**: 功能模块独立，依赖最小化
4. **事件驱动**: 使用自定义事件处理组件间通信

### 🔄 数据流

```
用户操作 (React)
    ↓
API 调用 (Tauri)
    ↓
Rust 命令 (Commands)
    ↓
业务逻辑 (Services)
    ↓
数据持久化 (SQLite)
```

---

## 开发工作流

### 🚀 日常开发

```bash
# 1. 启动开发环境
just dev

# 2. 开发代码（热重载）

# 3. 运行检查
just check

# 4. 运行测试
just test:all

# 5. 构建验证
just build
```

### 📝 代码提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 格式
<type>[optional scope]: <description>

# 示例
feat(session): add session persistence
fix(api): handle null response from claude
docs(readme): update installation guide
style(components): fix linting errors
refactor(agents): simplify agent creation logic
test(claude): add unit tests for message parsing
perf(claude): optimize message parsing performance
```

#### 类型说明
- **feat**: 新功能
- **fix**: 修复
- **docs**: 文档更新
- **style**: 代码格式化（不影响功能）
- **refactor**: 重构（既不修复也不添加功能）
- **perf**: 性能优化
- **test**: 添加或修改测试
- **chore**: 构建流程或辅助工具变动

---

## 编码规范

### 🦀 Rust 规范

#### 错误处理
```rust
// ✅ 标准错误处理模式
fn process_data() -> Result<Data, String> {
    // 1. 参数验证
    validate_input()?;

    // 2. 执行操作
    let result = perform_operation()?;

    // 3. 记录成功日志
    info!("Operation completed successfully");

    Ok(result)
}

// ❌ 避免错误处理模式
fn process_data() -> Data {
    // 不返回错误信息
    // 可能在 panic
}
```

#### 异步编程
```rust
// ✅ 异步函数标准模式
async fn handle_request(req: Request) -> Result<Response, String> {
    // 1. 验证参数
    validate_request(&req)?;

    // 2. 异步执行
    let result = tokio::spawn(async move {
        process_async(req).await
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?;

    Ok(result)
}

// ❌ 避免阻塞操作
async fn handle_request(req: Request) -> Result<Response, String> {
    let data = std::fs::read_to_string("file.txt")?; // 阻塞！
    Ok(Response::new(data))
}
```

#### 日志记录
```rust
// ✅ 结构化日志
info!(
    "Agent execution started: id={}, agent={}",
    agent_id,
    agent_name
);

// ✅ 调试日志
debug!("Processing files: count={}, path={}", count, path);

// ✅ 错误日志
error!("Database operation failed: {}", error);
```

### ⚛️ TypeScript/React 规范

#### 组件设计
```typescript
// ✅ 标准函数式组件
interface ComponentProps {
  /** 必需的属性 */
  id: string;
  /** 可选属性 */
  title?: string;
  /** 回调函数 */
  onSubmit: (data: Data) => void;
}

/**
 * 组件功能描述
 * @example <Component id="test" onSubmit={handleSubmit} />
 */
export const Component: React.FC<ComponentProps> = ({
  id,
  title = '默认标题',
  onSubmit,
}) => {
  // Hooks
  const [state, setState] = useState<Data>(initialData);
  const handleSubmit = useCallback((data: Data) => {
    onSubmit(data);
  }, [onSubmit]);

  // 渲染
  return (
    <div className="component-wrapper">
      {title && <h2>{title}</h2>}
      {/* 内容 */}
    </div>
  );
};
```

#### 状态管理
```typescript
// ✅ 使用 Zustand
interface AppState {
  agents: Agent[];
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
}

const useAgentStore = create<AppState>((set) => ({
  agents: [],
  addAgent: (agent) => set((state) => ({
    agents: [...state.agents, agent]
  })),
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter(a => a.id !== id)
  })),
}));

// ✅ 组件内状态
const [count, setCount] = useState<number>(0);
const handleIncrement = useCallback(() => {
  setCount((prev) => prev + 1);
}, []);
```

#### 内存管理
```typescript
// ✅ 数组大小限制
const MAX_ITEMS = 100;

const addItem = useCallback((item: Item) => {
  setItems((prev) => {
    const newItems = [...prev, item];
    // 保持固定大小
    if (newItems.length > MAX_ITEMS) {
      return newItems.slice(-MAX_ITEMS);
    }
    return newItems;
  });
}, [MAX_ITEMS]);

// ✅ 大对象使用 Ref
const largeDataRef = useRef<LargeData[]>([]);
```

### 🗄️ 数据库规范

#### SQLite 优化
```rust
// ✅ 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_runs_status
ON agent_runs(status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at
ON agent_runs(created_at DESC);

// ✅ 事务管理
fn batch_insert(conn: &Connection, items: &[Item]) -> SqliteResult<()> {
    // 开始事务
    conn.execute("BEGIN IMMEDIATE TRANSACTION", [])?;

    // 批量插入
    for item in items {
        insert_item(conn, item)?;
    }

    // 提交
    conn.execute("COMMIT", [])?;
    Ok(())
}
```

#### 查询优化
```rust
// ✅ 分页查询
fn get_items_paginated(
    conn: &Connection,
    page: u32,
    page_size: u32,
) -> SqliteResult<Vec<Item>> {
    let offset = (page - 1) * page_size;

    let mut stmt = conn.prepare_cached(
        "SELECT * FROM items LIMIT ? OFFSET ?"
    )?;

    let mut items = Vec::new();
    let mut rows = stmt.query(rusqlite::params![page_size, offset])?;

    while let Some(row) = rows.next()? {
        items.push(Item::from_row(row)?);
    }

    Ok(items)
}
```

---

## 性能优化指南

### 🎯 性能优化原则

1. **测量优先**: 在优化前先测量性能
2. **针对性优化**: 优化热点，而非猜测
3. **权衡取舍**: 性能、可读性、维护性的平衡
4. **持续监控**: 建立性能监控机制

### 💾 内存优化

#### Rust: 环形缓冲区
```rust
// ✅ 高效的环形缓冲区
pub struct CircularBuffer<T> {
    buffer: VecDeque<T>,
    max_size: usize,
}

impl<T> CircularBuffer<T> {
    pub fn new(max_size: usize) -> Self {
        Self {
            buffer: VecDeque::with_capacity(max_size),
            max_size,
        }
    }

    pub fn push(&mut self, item: T) {
        if self.buffer.len() == self.max_size {
            self.buffer.pop_front();
        }
        self.buffer.push_back(item);
    }
}
```

#### TypeScript: 数组限制
```typescript
// ✅ 内存安全的数组管理
function useBoundedArray<T>(maxSize: number) {
  const [array, setArray] = useState<T[]>([]);

  const addItem = useCallback((item: T) => {
    setArray(prev => {
      const newArray = [...prev, item];
      return newArray.slice(-maxSize); // 保持固定大小
    });
  }, [maxSize]);

  return { array, addItem };
}
```

### ⚡ 异步优化

#### Rust: 异步 I/O
```rust
// ✅ 高性能异步文件扫描
async fn scan_files(path: &Path) -> Result<Vec<PathBuf>, String> {
    let mut files = Vec::new();

    let mut entries = tokio::fs::read_dir(path).await
        .map_err(|e| format!("Failed to read dir: {}", e))?;

    while let Some(entry) = entries.next_entry().await
        .map_err(|e| format!("Failed to read entry: {}", e))? {

        let path = entry.path();

        if path.is_dir() {
            // 并行扫描子目录
            let child_files = tokio::spawn(async move {
                scan_files(&path).await
            });

            if let Ok(mut child_files) = child_files.await {
                files.append(&mut child_files);
            }
        } else {
            files.push(path);
        }
    }

    Ok(files)
}
```

#### TypeScript: 事件处理
```typescript
// ✅ 防抖处理
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}
```

### 🗄️ 数据库优化

#### 索引策略
```rust
// ✅ 复合索引优化
fn optimize_database(conn: &Connection) -> SqliteResult<()> {
    // 查询频繁字段索引
    let indexes = [
        ("idx_runs_agent_status",
         "CREATE INDEX IF NOT EXISTS idx_runs_agent_status
          ON agent_runs(agent_id, status, created_at DESC)"),

        ("idx_sessions_project",
         "CREATE INDEX IF NOT EXISTS idx_sessions_project
          ON sessions(project_path, updated_at DESC)"),
    ];

    for (name, sql) in indexes {
        if let Err(e) = conn.execute(sql, []) {
            warn!("Failed to create index {}: {}", name, e);
        }
    }

    Ok(())
}
```

### 🎨 前端渲染优化

#### 虚拟化列表
```typescript
// ✅ 大列表虚拟化
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
}: VirtualizedListProps<T>) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <List
      height={400}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

#### 组件优化
```typescript
// ✅ React.memo 防止不必要的重渲染
interface ListItemProps {
  id: string;
  title: string;
  onClick: (id: string) => void;
}

const ListItem = React.memo<ListItemProps>(({ id, title, onClick }) => {
  return (
    <div onClick={() => onClick(id)}>
      {title}
    </div>
  );
});

// ✅ useMemo 缓存计算结果
function ComplexComponent({ data }: { data: Data[] }) {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now(),
    }));
  }, [data]);

  return <div>{/* 使用 processedData */}</div>;
}
```

### 📊 性能监控

#### Rust: 性能度量
```rust
// ✅ 性能监控宏
macro_rules! measure_async {
    ($future:expr, $label:literal) => {{
        let start = Instant::now();
        let result = $future;
        let elapsed = start.elapsed();

        debug!("{} took {:?}", $label, elapsed);

        if elapsed > Duration::from_millis(100) {
            warn!("{} took longer than expected: {:?}", $label, elapsed);
        }

        result
    }};
}

// 使用示例
let files = measure_async!(
    scan_project_files(&project_path).await,
    "project_file_scan"
);
```

#### TypeScript: 渲染性能
```typescript
// ✅ 渲染次数追踪
function useRenderCount(componentName: string) {
  const countRef = useRef(0);

  useEffect(() => {
    countRef.current += 1;
    console.log(`${componentName} rendered ${countRef.current} times`);
  });

  return countRef.current;
}

// ✅ 性能监控
function usePerformanceMonitor(name: string) {
  const startRef = useRef<number>();

  useEffect(() => {
    startRef.current = performance.now();

    return () => {
      const end = performance.now();
      console.log(`${name} took ${end - startRef.current}ms`);
    };
  }, [name]);
}
```

---

## 测试与质量保证

### 🧪 测试策略

#### 测试金字塔
```
       /\
      /  \    少量 E2E 测试 (Playwright)
     /____\
    /      \
   /        \  适量集成测试 (Vitest + Testing Library)
  /__________\
 /            \
/______________\ 大量单元测试 (Jest + Rust Cargo Test)
```

### 🦀 Rust 测试

#### 单元测试
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_async_operation() {
        // Arrange
        let input = create_test_input();
        let expected = create_expected_output();

        // Act
        let result = process_async(input).await.unwrap();

        // Assert
        assert_eq!(result, expected);
    }

    #[test]
    fn test_synchronous_operation() {
        // Arrange
        let data = vec![1, 2, 3, 4, 5];

        // Act
        let result = sum(data);

        // Assert
        assert_eq!(result, 15);
    }
}
```

#### 集成测试
```rust
#[tokio::test]
async fn test_database_operations() {
    let conn = Connection::open_in_memory().unwrap();
    init_database(&conn).unwrap();

    // Test insert
    let agent = create_test_agent();
    insert_agent(&conn, &agent).unwrap();

    // Test retrieve
    let retrieved = get_agent(&conn, agent.id).unwrap();
    assert_eq!(retrieved.name, agent.name);
}
```

### ⚛️ TypeScript 测试

#### 单元测试
```typescript
// ✅ 组件单元测试
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    const mockOnSubmit = jest.fn();

    render(<Component id="test" onSubmit={mockOnSubmit} />);

    expect(screen.getByText('标题')).toBeInTheDocument();
  });

  it('handles submit correctly', () => {
    const mockOnSubmit = jest.fn();

    render(<Component id="test" onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByText('提交'));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });
});
```

#### 集成测试
```typescript
// ✅ API 集成测试
import { apiClient } from '@/lib/api';

describe('API Client', () => {
  it('fetches agents correctly', async () => {
    const agents = await apiClient.listAgents();

    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });
});
```

#### E2E 测试
```typescript
// ✅ Playwright E2E 测试
import { test, expect } from '@playwright/test';

test('complete user workflow', async ({ page }) => {
  // 导航到应用
  await page.goto('/');

  // 创建代理
  await page.click('[data-testid="create-agent"]');
  await page.fill('[data-testid="agent-name"]', 'Test Agent');
  await page.click('[data-testid="save-agent"]');

  // 验证创建成功
  await expect(
    page.locator('[data-testid="agent-list"]')
  ).toContainText('Test Agent');
});
```

### 📊 测试覆盖率要求

| 类型 | 最低覆盖率 | 目标覆盖率 |
|------|-----------|-----------|
| **单元测试** | 85% | 95% |
| **集成测试** | 70% | 85% |
| **E2E 测试** | 50% | 70% |
| **总体覆盖率** | 80% | 90% |

### 🚨 测试命令

```bash
# 运行所有测试
just test

# Rust 测试
cd src-tauri && cargo test
cd src-tauri && cargo test -- --nocapture  # 显示输出

# TypeScript 测试
bun test
bun test --coverage  # 生成覆盖率报告

# E2E 测试
bun test:e2e

# 性能测试
bun test:perf
```

---

## 安全与最佳实践

### 🔒 安全原则

1. **最小权限**: 组件只能访问必要的资源
2. **输入验证**: 所有用户输入必须验证和清理
3. **错误隐藏**: 生产环境不暴露敏感错误信息
4. **依赖审计**: 定期检查依赖漏洞

### 🛡️ Rust 安全实践

#### 内存安全
```rust
// ✅ 使用安全指针
fn safe_process_data(data: &str) -> Result<String, String> {
    // 借用检查器保证内存安全
    let processed = data.trim().to_string();
    Ok(processed)
}

// ❌ 避免不安全代码
unsafe {
    // 仅在必要时使用
    let ptr = data.as_ptr();
    // 复杂操作
}
```

#### 错误边界
```rust
// ✅ 全面的错误处理
fn robust_operation() -> Result<Data, Box<dyn std::error::Error>> {
    match operation() {
        Ok(data) => {
            info!("Operation succeeded");
            Ok(data)
        }
        Err(e) => {
            error!("Operation failed: {}", e);
            Err(e.into())
        }
    }
}
```

### 🔐 TypeScript 安全实践

#### 输入验证
```typescript
// ✅ 类型守卫
interface UserInput {
  name: string;
  age: number;
}

function validateInput(input: unknown): input is UserInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as UserInput).name === 'string' &&
    typeof (input as UserInput).age === 'number'
  );
}

// ✅ 安全的 API 调用
async function fetchData(id: string): Promise<Data> {
  try {
    const response = await apiClient.get(`/data/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
}
```

#### XSS 防护
```typescript
// ✅ 安全地渲染用户输入
import DOMPurify from 'dompurify';

function SafeRender({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ 避免 innerHTML
function UserInput({ text }: { text: string }) {
  return <span>{text}</span>; // 自动转义
}
```

### 🔍 安全审计

#### 依赖漏洞检查
```bash
# Rust 依赖审计
cargo audit

# NPM 依赖审计
bun audit

# 自动化检查
just security:check
```

#### 代码安全扫描
```bash
# CodeQL 分析
codeql database create --language=rust
codeql database analyze opcode.so database --format=sarif --output=security.sarif
```

### 📊 性能监控

#### 实时性能指标
```rust
// ✅ 性能监控结构体
struct PerformanceMetrics {
    start_time: Instant,
    operation_count: AtomicU64,
    error_count: AtomicU64,
}

impl PerformanceMetrics {
    fn new() -> Self {
        Self {
            start_time: Instant::now(),
            operation_count: AtomicU64::new(0),
            error_count: AtomicU64::new(0),
        }
    }

    fn record_operation(&self) {
        self.operation_count.fetch_add(1, Ordering::Relaxed);
    }
}
```

#### TypeScript 性能追踪
```typescript
// ✅ 性能监控 Hook
function usePerformanceTracking(operationName: string) {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime.current!;

      if (duration > 100) {
        console.warn(`Slow operation: ${operationName} took ${duration}ms`);
      }
    };
  }, [operationName]);
}
```

---

## 故障排除

### 🔧 常见问题

#### 构建问题

**Rust 编译失败**
```bash
# 解决方案
rustup update stable
rustup default stable
cargo clean
cd src-tauri && cargo fetch

# 检查版本
rustc --version  # >= 1.75
cargo --version  # 最新
```

**前端依赖问题**
```bash
# 解决方案
rm -rf node_modules bun.lockb
bun install

# 检查版本
node --version  # >= 18
bun --version   # 最新
```

**Tauri 构建错误**
```bash
# 解决方案
# Windows 需要 WebView2
# macOS 需要 Xcode Command Line Tools
# Linux 需要 WebKit2GTK

just doctor  # 检查环境
```

#### 运行时问题

**数据库锁定**
```rust
// 解决方案：使用事务重试
fn retry_operation<T>(
    operation: fn() -> Result<T, SqliteError>,
    max_retries: usize,
) -> Result<T, SqliteError> {
    for i in 0..max_retries {
        match operation() {
            Ok(result) => return Ok(result),
            Err(e) if i == max_retries - 1 => return Err(e),
            Err(_) => std::thread::sleep(std::time::Duration::from_millis(100)),
        }
    }
    unreachable!()
}
```

**内存泄漏**
```typescript
// 解决方案：清理事件监听器
useEffect(() => {
  const handler = (event: Event) => {
    // 处理事件
  };

  window.addEventListener('event', handler);

  // 清理函数
  return () => {
    window.removeEventListener('event', handler);
  };
}, []);
```

### 🐛 调试技巧

#### Rust 调试
```rust
// 启用详细日志
fn main() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("debug")
    ).init();

    // 调试代码
    debug!("Debug info: {:?}", debug_data);
}

// 性能分析
fn profile_function<F, T>(f: F) -> T
where
    F: FnOnce() -> T,
{
    let start = Instant::now();
    let result = f();
    let duration = start.elapsed();

    debug!("Function took {:?}", duration);
    result
}
```

#### TypeScript 调试
```typescript
// 开发环境调试
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// 性能调试
function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();

    console.log(`${name} took ${end - start}ms`);
    return result;
  }) as T;
}
```

### 📊 日志分析

#### 结构化日志
```rust
// JSON 格式日志
use serde_json::json;

fn log_structured(
    level: log::Level,
    event: &str,
    data: serde_json::Value,
) {
    let log_entry = json!({
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "level": level.to_string(),
        "event": event,
        "data": data,
    });

    log::log!(level, "{}", log_entry.to_string());
}
```

#### 前端日志
```typescript
// 集中式日志
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: unknown;
}

function createLogger(component: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${component}] ${message}`, data);
      }
    },
    error: (message: string, error?: Error) => {
      console.error(`[${component}] ${message}`, error);
      // 发送到错误跟踪服务
    },
  };
}
```

---

## 附录

### 📚 常用命令

#### 开发命令
```bash
# 启动开发环境
just dev              # 前端 + 后端热重载
bun run dev           # 仅前端
just web              # Web 服务器模式

# 代码检查
just check            # 运行所有检查
just fmt              # 格式化代码
just lint             # 运行 Linter
just test             # 运行测试

# 构建
just build            # 构建应用
just build:debug      # 调试构建
just build:release    # 发布构建

# 清理
just clean            # 清理所有构建产物
just reset            # 重置开发环境
```

#### 调试命令
```bash
# Rust 调试
cd src-tauri
cargo test --nocapture     # 显示测试输出
RUST_BACKTRACE=1 cargo run  # 详细堆栈跟踪
cargo expand                # 查看宏展开

# 前端调试
bun run dev --debug        # 调试模式
open chrome://inspect      # 打开 Chrome DevTools
```

### 🔗 相关链接

#### 官方文档
- [Tauri 2 文档](https://tauri.app/v2/guides/)
- [React 文档](https://react.dev/)
- [Rust 程序设计语言](https://doc.rust-lang.org/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

#### 工具链
- [Rustup](https://rustup.rs/)
- [Bun](https://bun.sh/)
- [Just](https://github.com/casey/just)
- [Vite](https://vitejs.dev/)

### 🤝 贡献指南

1. 遵循项目编码规范
2. 确保所有测试通过
3. 更新相关文档
4. 提交代码前运行 `just check`

### 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

**最后更新**: 2026-01-10
**维护者**: opcode 开发团队
