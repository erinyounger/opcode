import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Globe,
  Terminal,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  FolderOpen,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, type MCPServer, type MCPConfigPaths } from "@/lib/api";
import { useTrackEvent } from "@/hooks";
import { MCPEditServer } from "./MCPEditServer";

// 缓存常量
const SERVER_TOOLS_CACHE_KEY = 'mcp_server_tools_v2';
const CACHE_VERSION = '2';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时
const BATCH_SIZE = 5; // 批处理大小
const AUTO_REFRESH_INTERVAL = 30000; // 30秒

interface CachedServerTools {
  version: string;
  timestamp: number;
  data: Record<string, string[]>;
}

interface MCPServerListProps {
  servers: MCPServer[];
  loading: boolean;
  onServerRemoved: (name: string) => void;
  onRefresh: () => void;
}

/**
 * 获取带TTL的缓存
 */
function getCachedServerTools(): Record<string, string[]> {
  try {
    const cached = localStorage.getItem(SERVER_TOOLS_CACHE_KEY);
    if (!cached) return {};

    const parsed: CachedServerTools = JSON.parse(cached);

    if (parsed.version !== CACHE_VERSION || Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(SERVER_TOOLS_CACHE_KEY);
      return {};
    }

    return parsed.data || {};
  } catch {
    localStorage.removeItem(SERVER_TOOLS_CACHE_KEY);
    return {};
  }
}

/**
 * 设置带TTL的缓存
 */
function setCachedServerTools(data: Record<string, string[]>): void {
  try {
    const cache: CachedServerTools = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(SERVER_TOOLS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      localStorage.removeItem(SERVER_TOOLS_CACHE_KEY);
    }
  }
}

/**
 * 根据服务器名称推断工具列表
 */
function inferToolsFromServerName(serverName: string): string[] {
  const nameLower = serverName.toLowerCase();

  if (nameLower.includes('postgres') || nameLower.includes('db') || nameLower.includes('database')) {
    return ['query', 'connect', 'list_tables', 'describe'];
  }
  if (nameLower.includes('git') || nameLower.includes('version')) {
    return ['status', 'commit', 'push', 'pull', 'branch'];
  }
  if (nameLower.includes('fs') || nameLower.includes('file') || nameLower.includes('storage')) {
    return ['read', 'write', 'delete', 'list', 'search'];
  }
  if (nameLower.includes('http') || nameLower.includes('web') || nameLower.includes('api')) {
    return ['get', 'post', 'put', 'delete', 'list'];
  }
  if (nameLower.includes('search') || nameLower.includes('vector')) {
    return ['search', 'index', 'query', 'upsert'];
  }

  // 无法识别时返回空数组
  return [];
}

/**
 * Component for displaying a list of MCP servers
 */
export const MCPServerList: React.FC<MCPServerListProps> = ({
  servers,
  loading,
  onServerRemoved,
  onRefresh,
}) => {
  const [removingServer, setRemovingServer] = useState<string | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, string[]>>({});
  const [configPaths, setConfigPaths] = useState<MCPConfigPaths | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const trackEvent = useTrackEvent();

  // 初始化加载缓存
  useEffect(() => {
    const cachedTools = getCachedServerTools();
    if (Object.keys(cachedTools).length > 0) {
      setServerTools(cachedTools);
    }
  }, []);

  /**
   * 更新服务器工具缓存
   */
  const updateServerTools = useCallback((newTools: Record<string, string[]>): void => {
    setServerTools(newTools);
    setCachedServerTools(newTools);
  }, []);

  /**
   * 刷新所有服务器状态
   */
  const handleRefreshAllStatuses = useCallback(async (): Promise<void> => {
    if (refreshingAll || servers.length === 0) return;

    setRefreshingAll(true);
    const newTools: Record<string, string[]> = {};

    try {
      for (let i = 0; i < servers.length; i += BATCH_SIZE) {
        const batch = servers.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map(async (server) => {
            const details = await api.mcpGet(server.name);
            const tools = details.status?.running ? inferToolsFromServerName(server.name) : [];
            return { name: server.name, tools };
          })
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            newTools[result.value.name] = result.value.tools;
          }
        }
      }

      updateServerTools(newTools);
    } finally {
      setRefreshingAll(false);
    }
  }, [servers, refreshingAll, updateServerTools]);

  // 自动刷新机制
  useEffect(() => {
    if (servers.length === 0) return;

    const interval = setInterval(handleRefreshAllStatuses, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [servers.length, handleRefreshAllStatuses]);

  // 按 scope 分组服务器 (memoized)
  const serversByScope = useMemo(() => {
    return servers.reduce<Record<string, MCPServer[]>>((acc, server) => {
      const scope = server.scope || "local";
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(server);
      return acc;
    }, {});
  }, [servers]);

  /**
   * Toggles expanded state for a server
   */
  const toggleExpanded = useCallback((serverName: string): void => {
    setExpandedServers(prev => {
      const next = new Set(prev);
      if (next.has(serverName)) {
        next.delete(serverName);
      } else {
        next.add(serverName);
      }
      return next;
    });
  }, []);

  /**
   * Copies command to clipboard
   */
  const copyCommand = useCallback(async (command: string, serverName: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedServer(serverName);
      setTimeout(() => setCopiedServer(null), 2000);
    } catch {
      // 静默失败
    }
  }, []);

  /**
   * Removes a server
   */
  const handleRemoveServer = useCallback(async (name: string): Promise<void> => {
    try {
      setRemovingServer(name);

      const wasConnected = serverTools[name]?.length > 0;

      await api.mcpRemove(name);

      // 清除本地工具缓存
      setServerTools(prev => {
        const newTools = { ...prev };
        delete newTools[name];
        setCachedServerTools(newTools);
        return newTools;
      });

      trackEvent.mcpServerRemoved({
        server_name: name,
        was_connected: wasConnected
      });

      onServerRemoved(name);
    } catch (error) {
      console.error("Failed to remove server:", error);
    } finally {
      setRemovingServer(null);
    }
  }, [serverTools, trackEvent, onServerRemoved]);

  /**
   * Tests connection to a server
   */
  const handleTestConnection = useCallback(async (name: string): Promise<void> => {
    try {
      setTestingServer(name);

      const details = await api.mcpGet(name);
      const tools = details.status?.running ? inferToolsFromServerName(name) : [];

      updateServerTools({ ...serverTools, [name]: tools });

      const server = servers.find(s => s.name === name);
      trackEvent.mcpServerConnected(name, details.status?.running || false, server?.transport || 'unknown');
    } catch {
      updateServerTools({ ...serverTools, [name]: [] });

      trackEvent.mcpConnectionError({
        server_name: name,
        error_type: 'test_failed',
        retry_attempt: 0
      });
    } finally {
      setTestingServer(null);
    }
  }, [serverTools, servers, trackEvent, updateServerTools]);

  /**
   * Gets icon for transport type
   */
  const getTransportIcon = useCallback((transport: string): React.ReactNode => {
    switch (transport.toLowerCase()) {
      case "stdio":
        return <Terminal className="h-4 w-4 text-amber-500" />;
      case "http":
        return <Globe className="h-4 w-4 text-emerald-500" />;
      case "sse":
        return <Globe className="h-4 w-4 text-orange-500" />;
      case "websocket":
        return <Network className="h-4 w-4 text-blue-500" />;
      default:
        return <Network className="h-4 w-4 text-slate-500" />;
    }
  }, []);

  /**
   * Gets icon for scope
   */
  const getScopeIcon = useCallback((scope: string): React.ReactNode => {
    switch (scope) {
      case "local":
        return <User className="h-3 w-3 text-slate-500" />;
      case "project":
        return <FolderOpen className="h-3 w-3 text-orange-500" />;
      case "user":
        return <FileText className="h-3 w-3 text-purple-500" />;
      default:
        return null;
    }
  }, []);

  /**
   * Gets scope display name
   */
  const getScopeDisplayName = useCallback((scope: string): string => {
    switch (scope) {
      case "local":
        return "Local (Project-specific)";
      case "project":
        return "Project (Shared via .mcp.json)";
      case "user":
        return "User (All projects)";
      default:
        return scope;
    }
  }, []);

  /**
   * Renders a single server item
   */
  const renderServerItem = (server: MCPServer) => {
    const isExpanded = expandedServers.has(server.name);
    const isCopied = copiedServer === server.name;
    
    return (
      <motion.div
        key={server.name}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group p-4 rounded-lg border border-border bg-card hover:bg-accent/5 hover:border-primary/20 transition-all overflow-hidden"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded">
                  {getTransportIcon(server.transport)}
                </div>
                <h4 className="font-medium truncate">{server.name}</h4>
                {server.status?.running && (
                  <Badge variant="outline" className="gap-1 flex-shrink-0 border-green-500/50 text-green-600 bg-green-500/10">
                    <CheckCircle className="h-3 w-3" />
                    Running
                  </Badge>
                )}
              </div>
              
              {server.command && !isExpanded && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground font-mono truncate pl-9 flex-1" title={server.command}>
                    {server.command}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(server.name)}
                    className="h-6 px-2 text-xs hover:bg-primary/10"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show full
                  </Button>
                </div>
              )}
              
              {server.transport === "sse" && server.url && !isExpanded && (
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground font-mono truncate pl-9" title={server.url}>
                    {server.url}
                  </p>
                </div>
              )}
              
              {Object.keys(server.env).length > 0 && !isExpanded && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pl-9">
                  <span>Environment variables: {Object.keys(server.env).length}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingServer(server)}
                className="hover:bg-blue-500/10 hover:text-blue-600"
                title="Edit server"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestConnection(server.name)}
                disabled={testingServer === server.name}
                className="hover:bg-green-500/10 hover:text-green-600"
              >
                {testingServer === server.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveServer(server.name)}
                disabled={removingServer === server.name}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                {removingServer === server.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Expanded Details */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-9 space-y-3 pt-2 border-t border-border/50"
            >
              {server.command && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Command</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCommand(server.command!, server.name)}
                        className="h-6 px-2 text-xs hover:bg-primary/10"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {isCopied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(server.name)}
                        className="h-6 px-2 text-xs hover:bg-primary/10"
                      >
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
                    {server.command}
                  </p>
                </div>
              )}
              
              {server.args && server.args.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Arguments</p>
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded space-y-1">
                    {server.args.map((arg, idx) => (
                      <div key={idx} className="break-all">
                        <span className="text-muted-foreground mr-2">[{idx}]</span>
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {server.transport === "sse" && server.url && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">URL</p>
                  <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
                    {server.url}
                  </p>
                </div>
              )}
              
              {Object.keys(server.env).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Environment Variables</p>
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded space-y-1">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div key={key} className="break-all">
                        <span className="text-primary">{key}</span>
                        <span className="text-muted-foreground mx-1">=</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tools and Connection Status */}
          {serverTools[server.name] && (
            <div className="pl-9 mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                {serverTools[server.name].length > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">
                      ✓ {server.name} is connected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-600 font-medium">
                      ✗ {server.name} failed to connect
                    </span>
                  </>
                )}
              </div>

              {serverTools[server.name].length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {serverTools[server.name].map(tool => (
                    <span
                      key={tool}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold">Configured Servers</h3>
          <p className="text-sm text-muted-foreground">
            {servers.length} server{servers.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAllStatuses}
            disabled={refreshingAll}
            className="gap-2 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/50"
          >
            {refreshingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {refreshingAll ? 'Checking...' : 'Check All'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Network className="h-12 w-12 text-primary" />
          </div>
          <p className="text-muted-foreground mb-2 font-medium">No MCP servers configured</p>
          <p className="text-sm text-muted-foreground">
            Add a server to get started with Model Context Protocol
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(serversByScope).map(([scope, scopeServers]) => (
            <div key={scope} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getScopeIcon(scope)}
                <span className="font-medium">{getScopeDisplayName(scope)}</span>
                <span className="text-muted-foreground/60">({scopeServers.length})</span>
              </div>
              <AnimatePresence>
                <div className="space-y-2">
                  {scopeServers.map(renderServerItem)}
                </div>
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Edit Server Dialog */}
      {editingServer && (
        <MCPEditServer
          server={editingServer}
          open={!!editingServer}
          onClose={() => {
            setEditingServer(null);
            setEditError(null);
          }}
          onServerUpdated={() => {
            onRefresh();
            setEditingServer(null);
            setEditError(null);
          }}
          onError={(msg) => {
            setEditError(msg);
            console.error("Edit server error:", msg);
          }}
        />
      )}

      {/* Configuration File Paths */}
      <div className="mt-8 p-4 border border-border rounded-lg bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Configuration File Paths</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              // Use current working directory or a reasonable default
              const currentPath = window.location.pathname || '/';
              const projectPath = currentPath.startsWith('/') ? currentPath : '/';
              const paths = await api.mcpGetConfigPaths(projectPath);
              setConfigPaths(paths);
            }}
            className="h-6 px-2 text-xs hover:bg-primary/10"
          >
            Load Paths
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/30 rounded">
            <p className="text-xs font-medium text-muted-foreground mb-2">Local</p>
            <p className="text-xs font-mono break-all">
              {configPaths?.local || '.claude/settings.local.json'}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded">
            <p className="text-xs font-medium text-muted-foreground mb-2">Project (.mcp.json)</p>
            <p className="text-xs font-mono break-all">
              {configPaths?.project || '.mcp.json'}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded">
            <p className="text-xs font-medium text-muted-foreground mb-2">User</p>
            <p className="text-xs font-mono break-all">
              {configPaths?.user || '~/.claude.json'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Error Toast */}
      {editError && (
        <div className="fixed bottom-4 right-4 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg">
          {editError}
          <button
            onClick={() => setEditError(null)}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}; 