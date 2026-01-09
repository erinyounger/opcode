import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useAgentExecution } from "@/hooks/useAgentExecution";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useCopyOutput } from "@/hooks/useCopyOutput";
import { calculateTotalTokens, formatDuration } from "./AgentExecution.utils";
import { AgentExecutionHeader } from "./AgentExecutionHeader";
import { AgentConfigPanel } from "./AgentConfigPanel";
import { MessagesContainer } from "./MessagesContainer";
import { FullscreenModal } from "./FullscreenModal";
import { HooksDialog } from "./HooksDialog";
import { ExecutionControlBar } from "./ExecutionControlBar";
import { EmptyState, LoadingState } from "./AgentExecutionStates";
import { useTrackEvent, useComponentMetrics, useFeatureAdoptionTracking } from "@/hooks";
import type { Agent } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ClaudeStreamMessage {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    content?: any[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  [key: string]: any;
}

interface AgentExecutionProps {
  /**
   * The agent to execute
   */
  agent: Agent;
  /**
   * Optional initial project path
   */
  projectPath?: string;
  /**
   * Optional tab ID for updating tab status
   */
  tabId?: string;
  /**
   * Callback to go back to the agents list
   */
  onBack: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * AgentExecution component for running CC agents
 *
 * @example
 * <AgentExecution agent={agent} onBack={() => setView('list')} />
 */
const AgentExecutionComponent: React.FC<AgentExecutionProps> = ({
  agent,
  projectPath: initialProjectPath,
  tabId,
  onBack,
  className,
}) => {
  const [projectPath] = useState(initialProjectPath || "");
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isHooksDialogOpen, setIsHooksDialogOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const {
    task,
    setTask,
    model,
    setModel,
    isRunning,
    messages,
    error,
    execute,
    stop,
    handleBackWithConfirmation,
    cleanupListeners,
  } = useAgentExecution({
    agent,
    projectPath,
    tabId,
    onBack,
  });

  const scrollHandler = useScrollHandler({ isFullscreen: isFullscreenModalOpen });
  const copyOutput = useCopyOutput(
    agent.name || 'Custom Agent',
    task,
    model,
    messages,
    []
  );

  // Analytics tracking
  const trackEvent = useTrackEvent();
  useComponentMetrics('AgentExecution');
  const agentFeatureTracking = useFeatureAdoptionTracking(`agent_${agent.name || 'custom'}`);

  // Update elapsed time while running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 100);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning]);

  // Calculate total tokens
  const totalTokens = calculateTotalTokens(messages);

  // Track agent execution start
  useEffect(() => {
    if (isRunning) {
      trackEvent.agentStarted({
        agent_type: agent.name || 'custom',
        agent_name: agent.name,
        has_custom_prompt: task !== agent.default_task
      });
      agentFeatureTracking.trackUsage();
    }
  }, [isRunning, agent.name, task, agent.default_task, trackEvent, agentFeatureTracking]);

  // Track execution completion
  useEffect(() => {
    if (!isRunning && messages.length > 0) {
      const duration = Date.now() - Date.now(); // This would need to be tracked differently
      trackEvent.agentExecuted(agent.name || 'custom', true, agent.name, duration);
    }
  }, [isRunning, messages.length, agent.name, trackEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const handleExecute = () => {
    execute();
  };

  const handleStop = () => {
    stop();
  };

  const handleOpenHooksDialog = () => {
    setIsHooksDialogOpen(true);
  };

  const handleOpenFullscreen = () => {
    setIsFullscreenModalOpen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreenModalOpen(false);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Fixed container that takes full height */}
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <AgentExecutionHeader
          agent={agent}
          isRunning={isRunning}
          messageCount={messages.length}
          model={model}
          onBack={handleBackWithConfirmation}
          onOpenFullscreen={handleOpenFullscreen}
        />

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="px-6 py-3"
            >
              <div className="max-w-4xl mx-auto p-3 rounded-md bg-destructive/10 border border-destructive/50 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                <span className="text-caption text-destructive">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configuration Section */}
        <AgentConfigPanel
          model={model}
          task={task}
          isRunning={isRunning}
          projectPath={projectPath}
          onModelChange={setModel}
          onTaskChange={setTask}
          onExecute={isRunning ? handleStop : handleExecute}
          onOpenHooks={handleOpenHooksDialog}
        />

        {/* Scrollable Output Display */}
        <div className="flex-1 overflow-hidden">
          <div className="w-full max-w-5xl mx-auto h-full">
            <MessagesContainer
              messages={messages}
              scrollRef={scrollHandler.scrollContainerRef}
              onScroll={scrollHandler.handleScroll}
              isRunning={isRunning}
              EmptyComponent={() => <EmptyState />}
              LoadingComponent={() => <LoadingState />}
              className="h-full overflow-y-auto p-6 space-y-8"
            />
          </div>
        </div>
      </div>

      {/* Floating Execution Control Bar */}
      <ExecutionControlBar
        isExecuting={isRunning}
        onStop={handleStop}
        totalTokens={totalTokens}
        elapsedTime={elapsedTime}
      />

      {/* Fullscreen Modal */}
      <FullscreenModal
        agent={agent}
        isOpen={isFullscreenModalOpen}
        onClose={handleCloseFullscreen}
        isRunning={isRunning}
        messages={messages}
        scrollRef={scrollHandler.fullscreenScrollRef}
        onScroll={scrollHandler.handleScroll}
        copyAsJsonl={() => copyOutput.copyAsJsonl(() => {})}
        copyAsMarkdown={() => copyOutput.copyAsMarkdown(() => {})}
        copyPopoverOpen={false}
        setCopyPopoverOpen={() => {}}
      />

      {/* Hooks Configuration Dialog */}
      <HooksDialog
        isOpen={isHooksDialogOpen}
        onOpenChange={setIsHooksDialogOpen}
        projectPath={projectPath}
      />
    </div>
  );
};

// Export memoized component to prevent unnecessary re-renders
export const AgentExecution = React.memo(AgentExecutionComponent);
