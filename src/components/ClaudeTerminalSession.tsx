import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  FolderOpen,
  Hash,
  Copy,
  GitBranch,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Popover } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TerminalWidget } from "./TerminalWidget";
import { FloatingPromptInput } from "./FloatingPromptInput";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface SessionMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tool_results?: Array<{
    name: string;
    content: string;
    success: boolean;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeTerminalSessionProps {
  onBack: () => void;
  className?: string;
}

type Model = "sonnet" | "opus";

const MODELS: Array<{ id: Model; name: string; description: string }> = [
  { id: "sonnet", name: "Claude 4 Sonnet", description: "Faster, efficient for most tasks" },
  { id: "opus", name: "Claude 4 Opus", description: "More capable, better for complex tasks" }
];

export const ClaudeTerminalSession: React.FC<ClaudeTerminalSessionProps> = ({
  onBack,
  className
}) => {
  const [projectPath, setProjectPath] = useState<string>("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>("sonnet");
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set current path when project path changes
  useEffect(() => {
    if (projectPath) {
      setCurrentPath(projectPath);
    }
  }, [projectPath]);

  const handleSendPrompt = async (prompt: string, model: "sonnet" | "opus") => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: SessionMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call Claude API via backend
      const result = await api.sendClaudeMessage({
        prompt,
        model,
        project_path: projectPath,
        session_id: sessionId
      }) as {
        response: string;
        session_id?: string;
        usage?: { input_tokens: number; output_tokens: number };
        tool_results?: Array<{ name: string; content: string; success: boolean }>;
      };

      // Update session ID if new
      if (result.session_id && result.session_id !== sessionId) {
        setSessionId(result.session_id);
      }

      const assistantMessage: SessionMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        tool_results: result.tool_results,
        usage: result.usage
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update total tokens
      if (result.usage) {
        setTotalTokens(prev => prev + result.usage!.input_tokens + result.usage!.output_tokens);
      }

    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: SessionMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandExecute = (command: string, output: string) => {
    // Log command execution for analytics
    console.log(`Command executed: ${command}`, output);
  };

  const copyAsMarkdown = () => {
    const md = messages.map(msg => {
      const role = msg.type === 'user' ? 'User' : 'Claude';
      return `**${role}** (${new Date(msg.timestamp).toLocaleTimeString()}):\n${msg.content}\n`;
    }).join('\n');

    navigator.clipboard.writeText(md);
    setCopyPopoverOpen(false);
  };

  const copyAsJsonl = () => {
    const jsonl = messages.map(msg => JSON.stringify({
      role: msg.type,
      content: msg.content,
      timestamp: msg.timestamp
    })).join('\n');

    navigator.clipboard.writeText(jsonl);
    setCopyPopoverOpen(false);
  };

  const getModelDisplay = () => {
    return MODELS.find(m => m.id === selectedModel) || MODELS[0];
  };

  return (
    <div className={cn("flex flex-col h-screen bg-background", className)}>
      {/* Header - Minimal terminal-style */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          <Terminal className="h-5 w-5 text-green-400 flex-shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-semibold text-green-400">
              claude@
            </span>
            <span className="font-mono text-sm text-muted-foreground truncate">
              {currentPath.split(/[/\\]/).pop() || '~'}
            </span>
            <span className="font-mono text-sm text-green-400">$</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionId && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                <Hash className="h-3 w-3 mr-1" />
                {sessionId.slice(0, 8)}
              </Badge>
              {totalTokens > 0 && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {totalTokens.toLocaleString()} tokens
                </Badge>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Zap className="h-4 w-4" />
                {getModelDisplay().name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MODELS.map(model => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "flex flex-col items-start gap-1",
                    selectedModel === model.id && "bg-accent"
                  )}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
            className="h-8 w-8"
          >
            {isTerminalExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTimeline(!showTimeline)}>
                <GitBranch className="h-4 w-4 mr-2" />
                {showTimeline ? "Hide" : "Show"} Timeline
              </DropdownMenuItem>
              {messages.length > 0 && (
                <DropdownMenuItem onClick={() => setCopyPopoverOpen(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Session
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Selector - Only show if no project */}
      {!projectPath && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <Terminal className="h-16 w-16 text-green-400 mx-auto" />
            <h2 className="text-xl font-semibold">Select a Project</h2>
            <p className="text-sm text-muted-foreground">
              Choose a project directory to start working with Claude Code
            </p>
            <Button
              onClick={async () => {
                try {
                  // For now, just use a simple prompt or default path
                  // In a real implementation, this would use Tauri dialog API
                  const defaultPath = await api.getHomeDirectory();
                  setProjectPath(defaultPath);
                } catch (error) {
                  console.error("Failed to select directory:", error);
                }
              }}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Select Project Directory
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {projectPath && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Terminal className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Welcome to Claude Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by describing what you'd like to build or fix
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "flex gap-3",
                        message.type === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2 font-mono text-sm",
                        message.type === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}>
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        {message.tool_results && message.tool_results.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/20 space-y-2">
                            {message.tool_results.map((result, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="flex items-center gap-1 mb-1">
                                  {result.success ? (
                                    <Play className="h-3 w-3 text-green-400" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-400" />
                                  )}
                                  <span className="font-medium">{result.name}</span>
                                </div>
                                <div className="pl-4 text-muted-foreground whitespace-pre-wrap">
                                  {result.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 text-xs opacity-60 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {new Date(message.timestamp).toLocaleTimeString()}
                          {message.usage && (
                            <>
                              <span>•</span>
                              <span>{message.usage.input_tokens + message.usage.output_tokens} tokens</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="bg-muted rounded-lg px-4 py-2 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Claude is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Terminal Widget */}
          <AnimatePresence>
            {isTerminalExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border bg-muted/20"
              >
                <TerminalWidget
                  projectPath={projectPath}
                  onCommandExecute={handleCommandExecute}
                  defaultExpanded={true}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt Input */}
          <div className="border-t border-border bg-background">
            <div className="max-w-4xl mx-auto p-4">
              <FloatingPromptInput
                ref={promptInputRef}
                onSend={handleSendPrompt}
                isLoading={isLoading}
                disabled={!projectPath}
                defaultModel={selectedModel}
                projectPath={projectPath}
              />
            </div>
          </div>
        </div>
      )}

      {/* Copy Popover */}
      <Popover
        open={copyPopoverOpen}
        onOpenChange={setCopyPopoverOpen}
        trigger={<div />}
        content={
          <div className="w-48 p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={copyAsMarkdown}
            >
              Copy as Markdown
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={copyAsJsonl}
            >
              Copy as JSONL
            </Button>
          </div>
        }
      />
    </div>
  );
};
