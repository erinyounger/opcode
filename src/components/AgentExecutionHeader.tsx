import React from "react";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getStatusText } from "./AgentExecution.utils";

interface AgentExecutionHeaderProps {
  agent: Agent;
  isRunning: boolean;
  messageCount: number;
  model: string;
  onBack: () => void;
  onOpenFullscreen: () => void;
  className?: string;
}

export const AgentExecutionHeader: React.FC<AgentExecutionHeaderProps> = ({
  agent,
  isRunning,
  messageCount,
  model,
  onBack,
  onOpenFullscreen,
  className,
}) => {
  return (
    <div className={cn("p-6 border-b border-border", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 -ml-2"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-heading-1">{agent.name}</h1>
            <p className="mt-1 text-body-small text-muted-foreground">
              {getStatusText(isRunning, messageCount)} • {model === 'opus' ? 'Claude 4 Opus' : 'Claude 4 Sonnet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messageCount > 0 && (
            <Button
              variant="outline"
              size="default"
              onClick={onOpenFullscreen}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
