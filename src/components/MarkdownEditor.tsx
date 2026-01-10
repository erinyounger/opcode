import React, { useState, useEffect, useCallback, useMemo } from "react";
import MDEditor from "@uiw/react-md-editor";
import { motion } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// Types
interface MarkdownEditorProps {
  onBack: () => void;
  projectPath?: string;
  className?: string;
}

type ToastMessage = {
  message: string;
  type: "success" | "error";
};

type EditorMode = "project" | "global";

interface EditorState {
  content: string;
  originalContent: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  toast: ToastMessage | null;
  claudeMdFilePath: string | null;
}

interface ErrorClassification {
  type: "server" | "network" | "not_found" | "unknown";
  message: string;
}

// Constants
const DEFAULT_PROMPT = "";
const SEPARATOR = {
  WINDOWS: "\\",
  UNIX: "/",
};

// Utility functions
const getFileSeparator = (path: string): string => {
  return path.includes(SEPARATOR.WINDOWS) ? SEPARATOR.WINDOWS : SEPARATOR.UNIX;
};

const buildClaudeMdPath = (projectPath: string): string => {
  const separator = getFileSeparator(projectPath);
  return `${projectPath}${separator}CLAUDE.md`;
};

const classifyError = (errorMessage: string, isProjectMode: boolean): ErrorClassification => {
  const serverErrorPatterns = [
    "Failed to parse server response",
    "Unexpected token",
    "HTML instead of JSON",
    "Failed to parse server response as JSON",
  ];

  const networkErrorPatterns = [
    "Network error",
    "Unable to connect to the server",
  ];

  const notFoundPatterns = [
    "not found",
    "ENOENT",
    "does not exist",
  ];

  if (serverErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
    return {
      type: "server",
      message: "Unable to load CLAUDE.md: Server communication error. This may indicate a server-side issue. Please try again later."
    };
  }

  if (networkErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
    return {
      type: "network",
      message: "Unable to load CLAUDE.md: Network connection error. Please check your connection and ensure the web server is running."
    };
  }

  if (notFoundPatterns.some(pattern => errorMessage.includes(pattern))) {
    return {
      type: "not_found",
      message: ""
    };
  }

  return {
    type: "unknown",
    message: `Failed to load ${isProjectMode ? 'project' : 'global'} CLAUDE.md file: ${errorMessage}`
  };
};

// Custom hook for editor logic
const useMarkdownEditor = (projectPath?: string) => {
  const [state, setState] = useState<EditorState>({
    content: DEFAULT_PROMPT,
    originalContent: DEFAULT_PROMPT,
    loading: true,
    saving: false,
    error: null,
    toast: null,
    claudeMdFilePath: null,
  });

  const isProjectMode = useMemo(() => !!projectPath, [projectPath]);
  const hasChanges = useMemo(() => state.content !== state.originalContent, [state.content, state.originalContent]);

  const showToast = useCallback((toast: ToastMessage | null) => {
    setState(prev => ({ ...prev, toast }));
  }, []);

  const showError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const loadSystemPrompt = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      showToast(null);

      let prompt: string;
      let filePath: string | null = null;

      if (isProjectMode && projectPath) {
        prompt = await api.getProjectPrompt(projectPath);
        filePath = buildClaudeMdPath(projectPath);
      } else {
        prompt = await api.getSystemPrompt();
      }

      setState(prev => ({
        ...prev,
        content: prompt,
        originalContent: prompt,
        claudeMdFilePath: filePath,
      }));
    } catch (err) {
      console.error("Failed to load CLAUDE.md:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorClassification = classifyError(errorMessage, isProjectMode);

      if (errorClassification.type === "not_found") {
        console.log("CLAUDE.md file doesn't exist, starting with empty content");
        const filePath = isProjectMode && projectPath ? buildClaudeMdPath(projectPath) : null;

        setState(prev => ({
          ...prev,
          content: DEFAULT_PROMPT,
          originalContent: DEFAULT_PROMPT,
          claudeMdFilePath: filePath,
        }));
      } else {
        showError(errorClassification.message);
      }
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [projectPath, isProjectMode, showError, showToast]);

  const saveContent = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      showToast(null);

      if (isProjectMode) {
        if (!state.claudeMdFilePath) {
          throw new Error("File path not set");
        }
        await api.saveClaudeMdFile(state.claudeMdFilePath, state.content);
      } else {
        await api.saveSystemPrompt(state.content);
      }

      setState(prev => ({ ...prev, originalContent: prev.content }));
      showToast({ message: "CLAUDE.md saved successfully", type: "success" });
    } catch (err) {
      console.error("Failed to save CLAUDE.md:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      showError(errorMessage);
      showToast({ message: "Failed to save CLAUDE.md", type: "error" });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [state.content, state.claudeMdFilePath, isProjectMode, showError, showToast]);

  const updateContent = useCallback((newContent: string) => {
    setState(prev => ({ ...prev, content: newContent }));
  }, []);

  const dismissToast = useCallback(() => {
    showToast(null);
  }, [showToast]);

  // Load content on mount and when projectPath changes
  useEffect(() => {
    loadSystemPrompt();
  }, [loadSystemPrompt]);

  return {
    ...state,
    isProjectMode,
    hasChanges,
    actions: {
      saveContent,
      updateContent,
      dismissToast,
      reload: loadSystemPrompt,
    },
  };
};

// Sub-components
interface HeaderProps {
  isProjectMode: boolean;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
}

const EditorHeader: React.FC<HeaderProps> = ({ isProjectMode, hasChanges, saving, onSave }) => {
  return (
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
          onClick={onSave}
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
  );
};

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-6 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-sm text-destructive"
    >
      {error}
    </motion.div>
  );
};

interface ContentAreaProps {
  loading: boolean;
  content: string;
  onContentChange: (content: string) => void;
}

const ContentArea: React.FC<ContentAreaProps> = ({ loading, content, onContentChange }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-border overflow-hidden shadow-sm" data-color-mode="dark">
      <MDEditor
        value={content}
        onChange={(val) => onContentChange(val || "")}
        preview="edit"
        height="100%"
        visibleDragbar={false}
      />
    </div>
  );
};

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      onDismiss={onDismiss}
    />
  );
};

// Main component
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  projectPath,
  className,
}) => {
  const {
    content,
    loading,
    saving,
    error,
    toast,
    isProjectMode,
    hasChanges,
    actions: { saveContent, updateContent, dismissToast },
  } = useMarkdownEditor(projectPath);

  const handleSave = useCallback(() => {
    saveContent();
  }, [saveContent]);

  const handleContentChange = useCallback((newContent: string) => {
    updateContent(newContent);
  }, [updateContent]);

  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        <EditorHeader
          isProjectMode={isProjectMode}
          hasChanges={hasChanges}
          saving={saving}
          onSave={handleSave}
        />

        <ErrorDisplay error={error} />

        <div className="flex-1 overflow-hidden p-6">
          <ContentArea
            loading={loading}
            content={content}
            onContentChange={handleContentChange}
          />
        </div>
      </div>

      <ToastContainer>
        <ToastNotification
          toast={toast}
          onDismiss={dismissToast}
        />
      </ToastContainer>
    </div>
  );
}; 