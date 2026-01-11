import {
  LucideIcon,
  Wrench,
  CheckSquare,
  Terminal,
  FolderSearch,
  Search,
  List,
  LogOut,
  FileText,
  Edit3,
  FilePlus,
  Book,
  BookOpen,
  Globe,
  ListChecks,
  ListPlus,
  Globe2
} from "lucide-react";

// ============================================================================
// 类型定义
// ============================================================================

/** MCP工具信息 */
export interface McpToolInfo {
  provider: string;
  method: string;
}

/** 工具分离结果 */
export interface ToolSeparationResult {
  regularTools: string[];
  mcpTools: string[];
}

/** MCP工具分组结果 */
export interface McpToolGroup {
  [provider: string]: string[];
}

// ============================================================================
// 常量定义
// ============================================================================

/** 工具图标映射 */
const TOOL_ICONS: Record<string, LucideIcon> = {
  'task': CheckSquare,
  'bash': Terminal,
  'glob': FolderSearch,
  'grep': Search,
  'ls': List,
  'exit_plan_mode': LogOut,
  'read': FileText,
  'edit': Edit3,
  'multiedit': Edit3,
  'write': FilePlus,
  'notebookread': Book,
  'notebookedit': BookOpen,
  'webfetch': Globe,
  'todoread': ListChecks,
  'todowrite': ListPlus,
  'websearch': Globe2,
} as const;

/** 最大工具名称长度限制 */
const MAX_TOOL_NAME_LENGTH = 128;

/** MCP前缀标识 */
const MCP_PREFIX = 'mcp__';

/** 危险字符模式 */
const DANGEROUS_CHARS = /[;|`$()<>{}[\]~!#%^&*+=\\\s]/g;

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取工具图标，如果不存在则返回默认图标
 * @param toolName - 工具名称
 * @returns 对应的Lucide图标组件
 * @throws 当工具名称无效时抛出错误
 */
export function getToolIcon(toolName: string): LucideIcon {
  // 输入验证
  if (!toolName || typeof toolName !== 'string') {
    return Wrench;
  }

  // 长度检查
  if (toolName.length > MAX_TOOL_NAME_LENGTH) {
    return Wrench;
  }

  // 标准化名称
  const normalizedName = toolName.trim().toLowerCase();

  // 返回对应的图标或默认图标
  return TOOL_ICONS[normalizedName] ?? Wrench;
}

/**
 * 格式化MCP工具名称（移除mcp__前缀并格式化下划线）
 * @param toolName - 工具名称
 * @returns 包含provider和method的格式化信息
 * @throws 当工具名称无效时抛出错误
 */
export function formatMcpToolName(toolName: string): McpToolInfo {
  // 输入验证
  if (!toolName || typeof toolName !== 'string') {
    return {
      provider: 'Unknown',
      method: 'Invalid Tool'
    };
  }

  // 长度检查
  if (toolName.length > MAX_TOOL_NAME_LENGTH) {
    return {
      provider: 'MCP',
      method: 'Tool Name Too Long'
    };
  }

  // 检查是否包含危险字符
  if (DANGEROUS_CHARS.test(toolName)) {
    return {
      provider: 'MCP',
      method: 'Invalid Tool Name'
    };
  }

  try {
    // 移除mcp__前缀
    const withoutPrefix = toolName.replace(/^mcp__/, '').trim();

    // 检查是否为空
    if (!withoutPrefix) {
      return {
        provider: 'MCP',
        method: 'Empty Tool'
      };
    }

    // 按双下划线分割（提供者分隔符）
    const parts = withoutPrefix.split('__');

    if (parts.length >= 2) {
      // 格式化提供者名称和方法名称
      const provider = formatName(parts[0]);
      const method = formatName(parts.slice(1).join('__'));

      return { provider, method };
    }

    // 回退格式化
    return {
      provider: 'MCP',
      method: formatName(withoutPrefix)
    };
  } catch (error) {
    // 发生错误时的安全回退
    return {
      provider: 'MCP',
      method: 'Format Error'
    };
  }
}

/**
 * 格式化名称（将下划线替换为空格并首字母大写）
 * @param name - 原始名称
 * @returns 格式化后的名称
 */
function formatName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => {
      const trimmed = word.trim();
      if (trimmed.length === 0) return '';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .filter(word => word.length > 0)
    .join(' ');
}

/**
 * 分离常规工具和MCP工具
 * @param tools - 工具数组
 * @returns 包含常规工具和MCP工具的分离结果
 */
export function separateTools(tools: string[]): ToolSeparationResult {
  // 输入验证
  if (!Array.isArray(tools)) {
    return {
      regularTools: [],
      mcpTools: []
    };
  }

  // 安全处理：过滤无效工具名称
  const validTools = tools.filter(tool =>
    typeof tool === 'string' &&
    tool.length > 0 &&
    tool.length <= MAX_TOOL_NAME_LENGTH
  );

  // 分离工具
  const regularTools = validTools.filter(tool => !tool.startsWith(MCP_PREFIX));
  const mcpTools = validTools.filter(tool => tool.startsWith(MCP_PREFIX));

  return {
    regularTools,
    mcpTools
  };
}

/**
 * 按提供者分组MCP工具
 * @param mcpTools - MCP工具数组
 * @returns 按提供者分组的工具映射
 */
export function groupMcpToolsByProvider(mcpTools: string[]): McpToolGroup {
  // 输入验证
  if (!Array.isArray(mcpTools)) {
    return {};
  }

  // 安全处理：过滤无效工具名称
  const validTools = mcpTools.filter(tool =>
    typeof tool === 'string' &&
    tool.startsWith(MCP_PREFIX) &&
    tool.length > MCP_PREFIX.length &&
    tool.length <= MAX_TOOL_NAME_LENGTH
  );

  // 使用Map进行分组以提高性能
  const providerMap = new Map<string, string[]>();

  for (const tool of validTools) {
    try {
      const { provider } = formatMcpToolName(tool);

      if (!providerMap.has(provider)) {
        providerMap.set(provider, []);
      }

      providerMap.get(provider)!.push(tool);
    } catch (error) {
      // 跳过格式错误的工具，但继续处理其他工具
      console.warn(`Failed to format tool name: ${tool}`, error);
      continue;
    }
  }

  // 转换为普通对象
  const result: McpToolGroup = {};
  for (const [provider, tools] of providerMap) {
    result[provider] = tools;
  }

  return result;
}

/**
 * 提取MCP工具方法名（格式化后的显示名称）
 * @param mcpTools - MCP工具数组
 * @returns 格式化后的方法名数组
 */
export function extractMcpToolMethods(mcpTools: string[]): string[] {
  // 输入验证
  if (!Array.isArray(mcpTools)) {
    return [];
  }

  // 安全处理：过滤无效工具名称
  const validTools = mcpTools.filter(tool =>
    typeof tool === 'string' &&
    tool.startsWith(MCP_PREFIX) &&
    tool.length > MCP_PREFIX.length &&
    tool.length <= MAX_TOOL_NAME_LENGTH
  );

  // 提取方法名，使用Promise.allSettled确保一个错误不会影响整个处理
  return validTools.map(tool => {
    try {
      const { method } = formatMcpToolName(tool);
      return method || 'Unknown Method';
    } catch (error) {
      // 返回安全的默认值
      return 'Format Error';
    }
  });
}

/**
 * 检查工具名称是否符合MCP命名约定
 * @param toolName - 工具名称
 * @returns 是否为MCP工具
 */
export function isMcpTool(toolName: string): boolean {
  // 输入验证
  if (!toolName || typeof toolName !== 'string') {
    return false;
  }

  // 长度检查
  if (toolName.length > MAX_TOOL_NAME_LENGTH) {
    return false;
  }

  // 检查MCP前缀
  return toolName.startsWith(MCP_PREFIX);
}