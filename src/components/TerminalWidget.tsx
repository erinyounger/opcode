import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  X,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  AlertCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'info';
  content: string;
  timestamp: number;
  command?: string;
}

interface TerminalWidgetProps {
  projectPath?: string;
  onCommandExecute?: (command: string, output: string) => void;
  className?: string;
  defaultExpanded?: boolean;
  maxHeight?: number;
}

export const TerminalWidget: React.FC<TerminalWidgetProps> = ({
  projectPath,
  onCommandExecute,
  className,
  defaultExpanded = false,
  maxHeight = 300
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentCommand, setCurrentCommand] = useState("");
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [output]);

  const addOutput = (type: TerminalOutput['type'], content: string, command?: string) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString() + Math.random().toString(36),
      type,
      content: content.trim(),
      timestamp: Date.now(),
      command
    };
    setOutput(prev => [...prev, newOutput]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim() || isExecuting) return;

    // Add command to output
    addOutput('command', `$ ${command}`, command);

    // Add to history
    setCommandHistory(prev => {
      const newHistory = [command, ...prev.filter(cmd => cmd !== command)];
      return newHistory.slice(0, 50); // Keep last 50 commands
    });

    setCurrentCommand("");
    setIsExecuting(true);

    try {
      // Execute command via Tauri
      const result = await invoke('execute_terminal_command', {
        command: command.trim(),
        workingDir: projectPath
      }) as { stdout: string; stderr: string; exitCode: number };

      if (result.stdout) {
        addOutput('output', result.stdout);
      }

      if (result.stderr) {
        addOutput('error', result.stderr);
      }

      if (result.exitCode !== 0 && !result.stderr) {
        addOutput('error', `Command exited with code ${result.exitCode}`);
      }

      // Notify parent component
      onCommandExecute?.(command, result.stdout);

    } catch (error) {
      addOutput('error', error instanceof Error ? error.message : 'Command failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? 0 : Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > -1) {
        const newIndex = historyIndex - 1;
        if (newIndex === -1) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || '');
        }
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      // Clear terminal
      e.preventDefault();
      setOutput([]);
      setCommandHistory([]);
      setHistoryIndex(-1);
    }
  };

  const clearTerminal = () => {
    setOutput([]);
  };

  const copyOutput = () => {
    const text = output.map(line => {
      if (line.type === 'command') {
        return line.content;
      }
      return line.content;
    }).join('\n');

    navigator.clipboard.writeText(text);
  };

  const getOutputColor = (type: TerminalOutput['type']) => {
    switch (type) {
      case 'command':
        return 'text-green-400 font-mono';
      case 'output':
        return 'text-foreground font-mono';
      case 'error':
        return 'text-red-400 font-mono';
      case 'info':
        return 'text-blue-400 font-mono';
      default:
        return 'text-foreground font-mono';
    }
  };

  return (
    <div className={cn(
      "bg-background border border-border rounded-lg shadow-lg overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Terminal</span>
          {projectPath && (
            <span className="text-xs text-muted-foreground font-mono">
              {projectPath.split(/[/\\]/).pop()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={copyOutput}
            className="h-7 w-7"
            title="Copy output"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearTerminal}
            className="h-7 w-7"
            title="Clear terminal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-7 w-7"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: isMaximized ? '80vh' : maxHeight, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              ref={terminalRef}
              className="flex flex-col h-full bg-background"
              style={{ height: isMaximized ? '80vh' : maxHeight }}
            >
              {/* Output Area */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
                <div className="space-y-1 font-mono text-sm">
                  {output.length === 0 ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">Terminal ready. Type a command to get started.</span>
                    </div>
                  ) : (
                    output.map((line) => (
                      <div key={line.id} className={cn("whitespace-pre-wrap break-words", getOutputColor(line.type))}>
                        {line.content}
                      </div>
                    ))
                  )}

                  {isExecuting && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full" />
                      <span className="text-xs">Executing...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Command Input */}
              <div className="border-t border-border p-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-mono text-sm">$</span>
                  <Input
                    ref={inputRef}
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command..."
                    disabled={isExecuting}
                    className="flex-1 font-mono text-sm bg-background border-border"
                  />

                  <Button
                    onClick={() => executeCommand(currentCommand)}
                    disabled={!currentCommand.trim() || isExecuting}
                    size="sm"
                    className="gap-2"
                  >
                    {isExecuting ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Run
                  </Button>
                </div>

                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Press Enter to execute</span>
                  <span>↑/↓ for history</span>
                  <span>Ctrl+C to clear</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed State */}
      {!isExpanded && output.length > 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{output.length} line(s) of output</span>
          </div>
        </div>
      )}
    </div>
  );
};
