import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api, type FileEntry } from "@/lib/api";
import { openUrl } from "@tauri-apps/plugin-opener";

interface FileBrowserProps {
  projectPath: string;
  onFileSelect?: (file: FileEntry, previewUrl: string) => void;
  className?: string;
}

interface FileTreeNode {
  entry: FileEntry;
  children: Map<string, FileTreeNode>;
  parent?: FileTreeNode;
}

/**
 * FileBrowser component - Displays project file tree with HTML preview support
 */
export const FileBrowser: React.FC<FileBrowserProps> = ({
  projectPath,
  onFileSelect: _onFileSelect,
  className,
}) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // Build file tree from flat list
  const fileTree = useMemo(() => {
    const root: FileTreeNode = {
      entry: {
        name: "",
        path: "",
        is_directory: true,
        size: 0,
      },
      children: new Map(),
    };

    for (const file of files) {
      const parts = file.path.split(/[/\\]/).filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (!current.children.has(part)) {
          const fullPath = parts.slice(0, i + 1).join("/");
          current.children.set(part, {
            entry: {
              name: part,
              path: fullPath,
              is_directory: !isLast || file.is_directory,
              size: isLast ? file.size : 0,
              extension: isLast ? file.extension : undefined,
            },
            children: new Map(),
            parent: current,
          });
        }

        current = current.children.get(part)!;
      }
    }

    return root;
  }, [files]);

  // Filter files based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) {
      return fileTree;
    }

    const query = searchQuery.toLowerCase();
    const filteredFiles = files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
    );

    const root: FileTreeNode = {
      entry: {
        name: "",
        path: "",
        is_directory: true,
        size: 0,
      },
      children: new Map(),
    };

    for (const file of filteredFiles) {
      const parts = file.path.split(/[/\\]/).filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (!current.children.has(part)) {
          const fullPath = parts.slice(0, i + 1).join("/");
          current.children.set(part, {
            entry: {
              name: part,
              path: fullPath,
              is_directory: !isLast || file.is_directory,
              size: isLast ? file.size : 0,
              extension: isLast ? file.extension : undefined,
            },
            children: new Map(),
            parent: current,
          });
        }

        current = current.children.get(part)!;
      }
    }

    // Auto-expand all nodes when searching
    const expandAll = (node: FileTreeNode, path: string = "") => {
      if (node.children.size > 0) {
        setExpandedPaths((prev) => new Set(prev).add(path || "/"));
        node.children.forEach((child, name) => {
          expandAll(child, path ? `${path}/${name}` : name);
        });
      }
    };
    expandAll(root);

    return root;
  }, [fileTree, searchQuery, files]);

  // Load files on mount and when project path changes
  useEffect(() => {
    if (projectPath) {
      loadFiles();
      checkServerStatus();
      // Auto-expand root directory
      setExpandedPaths(new Set([""]));
    }
  }, [projectPath]);

  // Check if server is already running
  const checkServerStatus = async () => {
    try {
      const url = await api.getFileServerUrl();
      setServerUrl(url);
    } catch (err) {
      console.error("Failed to check server status:", err);
    }
  };

  const loadFiles = async () => {
    if (!projectPath) return;

    try {
      setIsLoading(true);
      setError(null);
      const fileList = await api.listProjectFiles(projectPath);
      setFiles(fileList);
    } catch (err) {
      console.error("Failed to load files:", err);
      setError("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = async (file: FileEntry) => {
    // Only handle HTML files - open in system browser
    if (file.extension?.toLowerCase() === "html" || file.extension?.toLowerCase() === "htm") {
      // Validate file path
      if (!file.path || file.path.trim() === '') {
        setError("Invalid file path");
        return;
      }

      try {
        // Ensure server is running
        let url = serverUrl;
        if (!url) {
          const serverInfo = await api.startFileServer(projectPath);
          url = serverInfo.url;
          setServerUrl(url);
        }

        // Construct preview URL
        // Normalize path: convert backslashes to forward slashes
        let normalizedPath = file.path.replace(/\\/g, '/');
        
        // Remove leading slash if present (ServeDir expects relative paths)
        if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }
        
        // Ensure path is not empty
        if (!normalizedPath || normalizedPath.trim() === '') {
          setError("File path is empty");
          return;
        }
        
        // URL encode the path (but preserve slashes)
        const encodedPath = normalizedPath
          .split('/')
          .map(segment => segment ? encodeURIComponent(segment) : '')
          .filter(segment => segment !== '') // Remove empty segments
          .join('/');
        
        const previewUrl = `${url}/${encodedPath}`;
        
        console.log('Opening HTML file:', {
          originalPath: file.path,
          normalizedPath,
          encodedPath,
          previewUrl,
          fileName: file.name
        });
        
        // Open in system browser (Chrome, etc.)
        await openUrl(previewUrl);
      } catch (err) {
        console.error("Failed to start file server or open URL:", err);
        setError(`Failed to open file in browser: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const renderTreeNode = (node: FileTreeNode, level: number = 0): React.ReactNode => {
    const children = Array.from(node.children.values()).sort((a, b) => {
      if (a.entry.is_directory !== b.entry.is_directory) {
        return a.entry.is_directory ? -1 : 1;
      }
      return a.entry.name.localeCompare(b.entry.name);
    });

    if (level === 0 && children.length === 0) {
      return null;
    }

    return (
      <>
        {children.map((child) => {
          const isExpanded = expandedPaths.has(child.entry.path);
          const hasChildren = child.children.size > 0;
          const isHtml = child.entry.extension?.toLowerCase() === "html" ||
                        child.entry.extension?.toLowerCase() === "htm";

          return (
            <div key={child.entry.path}>
              <div
                className="flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ paddingLeft: `${level * 16 + 8}px` }}
              >
                {child.entry.is_directory ? (
                  <>
                    <button
                      onClick={() => toggleExpand(child.entry.path)}
                      className="flex items-center justify-center w-4 h-4"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded ? (
                      <FolderOpen className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Folder className="h-4 w-4 text-blue-500" />
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-4" /> {/* Spacer for alignment */}
                    {isHtml ? (
                      <FileCode className="h-4 w-4 text-orange-500" />
                    ) : (
                      <File className="h-4 w-4 text-muted-foreground" />
                    )}
                  </>
                )}
                <span
                  className={cn(
                    "flex-1 text-sm truncate",
                    isHtml && "font-medium text-orange-600 dark:text-orange-400"
                  )}
                  onClick={() => {
                    if (!child.entry.is_directory) {
                      handleFileClick(child.entry);
                    } else {
                      toggleExpand(child.entry.path);
                    }
                  }}
                >
                  {child.entry.name}
                </span>
                {isHtml && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClick(child.entry);
                    }}
                    title="Preview HTML file"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {child.entry.is_directory && isExpanded && hasChildren && (
                <div>{renderTreeNode(child, level + 1)}</div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Project Files</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadFiles}
            className="h-8 w-8"
            title="Refresh file list"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-8"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive p-4">{error}</div>
        ) : files.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No files found
          </div>
        ) : (
          <div className="space-y-1">{renderTreeNode(filteredTree)}</div>
        )}
      </div>
    </div>
  );
};

