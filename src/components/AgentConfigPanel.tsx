import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Settings2, Play, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AgentConfigPanelProps {
  model: string;
  task: string;
  isRunning: boolean;
  projectPath?: string;
  onModelChange: (model: string) => void;
  onTaskChange: (task: string) => void;
  onExecute: () => void;
  onOpenHooks: () => void;
  className?: string;
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  model,
  task,
  isRunning,
  projectPath,
  onModelChange,
  onTaskChange,
  onExecute,
  onOpenHooks,
  className,
}) => {
  const isIMEComposingRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isRunning && projectPath && task.trim()) {
      if (e.nativeEvent.isComposing || isIMEComposingRef.current) {
        return;
      }
      onExecute();
    }
  };

  const handleCompositionStart = () => {
    isIMEComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    setTimeout(() => {
      isIMEComposingRef.current = false;
    }, 0);
  };

  return (
    <div className={cn("p-6 border-b border-border", className)}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Model Selection */}
        <div className="space-y-3">
          <Label className="text-caption text-muted-foreground">Model Selection</Label>
          <div className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => !isRunning && onModelChange("sonnet")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex-1 px-4 py-3 rounded-md border transition-all",
                model === "sonnet"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
              disabled={isRunning}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    model === "sonnet" ? "border-primary" : "border-muted-foreground"
                  )}
                >
                  {model === "sonnet" && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="text-left">
                  <div className="text-body-small font-medium">Claude 4 Sonnet</div>
                  <div className="text-caption text-muted-foreground">Faster, efficient</div>
                </div>
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => !isRunning && onModelChange("opus")}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex-1 px-4 py-3 rounded-md border transition-all",
                model === "opus"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
              disabled={isRunning}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    model === "opus" ? "border-primary" : "border-muted-foreground"
                  )}
                >
                  {model === "opus" && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="text-left">
                  <div className="text-body-small font-medium">Claude 4 Opus</div>
                  <div className="text-caption text-muted-foreground">More capable</div>
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Task Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-caption text-muted-foreground">Task Description</Label>
            {projectPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenHooks}
                disabled={isRunning}
                className="h-8 -mr-2"
              >
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-caption">Configure Hooks</span>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="What would you like the agent to do?"
              disabled={isRunning}
              className="flex-1 h-9"
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
            />
            <motion.div whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }}>
              <Button
                onClick={onExecute}
                disabled={!projectPath || !task.trim()}
                variant={isRunning ? "destructive" : "default"}
                size="default"
              >
                {isRunning ? (
                  <>
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
            </motion.div>
          </div>
          {projectPath && (
            <p className="text-caption text-muted-foreground">
              Working in: <span className="font-mono">{projectPath.split('/').pop() || projectPath}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
