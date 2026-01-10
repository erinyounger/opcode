import React, { useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import { motion } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  /**
   * Callback to go back to the main view
   */
  onBack: () => void;
  /**
   * Optional project path - if provided, edits project-specific CLAUDE.md
   * If not provided, edits the global system prompt (~/.claude/CLAUDE.md)
   */
  projectPath?: string;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * MarkdownEditor component for editing the CLAUDE.md system prompt
 * 
 * @example
 * <MarkdownEditor onBack={() => setView('main')} />
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  projectPath,
  className,
}) => {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [claudeMdFilePath, setClaudeMdFilePath] = useState<string | null>(null);
  
  const hasChanges = content !== originalContent;
  const isProjectMode = !!projectPath;
  
  // Load the system prompt on mount or when projectPath changes
  useEffect(() => {
    loadSystemPrompt();
  }, [projectPath]);
  
  const loadSystemPrompt = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we're in web mode (no Tauri)
      const isWebMode = !window.__TAURI__;

      if (isProjectMode) {
        // In web mode, project CLAUDE.md is not accessible due to browser security restrictions
        if (isWebMode) {
          setError("Project CLAUDE.md editing is not available in web mode. Please use the desktop app (Tauri) to edit project files.");
          setContent("");
          setOriginalContent("");
          return;
        }

        // Tauri mode - access project files directly
        const files = await api.findClaudeMdFiles(projectPath);
        const rootClaudeMd = files.find(f => f.relative_path === "CLAUDE.md" || f.relative_path === ".\\CLAUDE.md" || f.relative_path === "./CLAUDE.md");

        if (rootClaudeMd) {
          const fileContent = await api.readClaudeMdFile(rootClaudeMd.absolute_path);
          setClaudeMdFilePath(rootClaudeMd.absolute_path);
          setContent(fileContent);
          setOriginalContent(fileContent);
        } else {
          const separator = projectPath.includes('\\') ? '\\' : '/';
          const newFilePath = `${projectPath}${separator}CLAUDE.md`;
          setClaudeMdFilePath(newFilePath);
          setContent("");
          setOriginalContent("");
        }
      } else {
        // Global mode - works in both web and Tauri mode
        const prompt = await api.getSystemPrompt();
        setContent(prompt);
        setOriginalContent(prompt);
      }
    } catch (err) {
      console.error("Failed to load CLAUDE.md:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes('Failed to parse server response') ||
          errorMessage.includes('Unexpected token') ||
          errorMessage.includes('HTML instead of JSON') ||
          errorMessage.includes('Failed to parse server response as JSON')) {
        setError(`Unable to load CLAUDE.md: Server communication error. This may indicate a server-side issue. Please try again later.`);
      } else if (errorMessage.includes('Network error') ||
                 errorMessage.includes('Unable to connect to the server')) {
        setError(`Unable to load CLAUDE.md: Network connection error. Please check your connection and ensure the web server is running.`);
      } else if (errorMessage.includes('not found') ||
                 errorMessage.includes('ENOENT') ||
                 errorMessage.includes('does not exist')) {
        console.log("CLAUDE.md file doesn't exist, starting with empty content");
        if (isProjectMode && projectPath) {
          const separator = projectPath.includes('\\') ? '\\' : '/';
          setClaudeMdFilePath(`${projectPath}${separator}CLAUDE.md`);
        }
        setContent("");
        setOriginalContent("");
      } else {
        setError(`Failed to load ${isProjectMode ? 'project' : 'global'} CLAUDE.md file: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setToast(null);

      // Check if we're in web mode
      const isWebMode = !window.__TAURI__;

      if (isProjectMode) {
        if (isWebMode) {
          throw new Error("Project CLAUDE.md editing is not available in web mode. Please use the desktop app (Tauri) to edit project files.");
        }

        if (!claudeMdFilePath) {
          throw new Error("File path not set");
        }
        await api.saveClaudeMdFile(claudeMdFilePath, content);
      } else {
        await api.saveSystemPrompt(content);
      }

      setOriginalContent(content);
      setToast({ message: "CLAUDE.md saved successfully", type: "success" });
    } catch (err) {
      console.error("Failed to save CLAUDE.md:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setToast({ message: "Failed to save CLAUDE.md", type: "error" });
    } finally {
      setSaving(false);
    }
  };
  
  
  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isProjectMode ? 'Project CLAUDE.md' : 'CLAUDE.md'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isProjectMode 
                  ? 'Edit your project-specific Claude instructions'
                  : 'Edit your Claude Code system prompt'}
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="default"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-6 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-full rounded-lg border border-border overflow-hidden shadow-sm" data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || "")}
                preview="edit"
                height="100%"
                visibleDragbar={false}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>
    </div>
  );
}; 