import { useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Agent } from "@/lib/api";
import type { ClaudeStreamMessage } from "@/components/AgentExecution";
import { useTabState } from "./useTabState";

interface UseAgentExecutionOptions {
  agent: Agent;
  projectPath?: string;
  tabId?: string;
  onBack: () => void;
}

export function useAgentExecution({ agent, projectPath, tabId, onBack }: UseAgentExecutionOptions) {
  const [task, setTask] = useState(agent.default_task || "");
  const [model, setModel] = useState(agent.model || "sonnet");
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([]);
  const [rawJsonlOutput, setRawJsonlOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);

  const unlistenRefs = useRef<UnlistenFn[]>([]);
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { updateTabStatus } = useTabState();

  const cleanupListeners = useCallback(() => {
    unlistenRefs.current.forEach(unlisten => unlisten());
    unlistenRefs.current = [];
  }, []);

  const startElapsedTimer = useCallback(() => {
    elapsedTimeIntervalRef.current = setInterval(() => {
      // Timer is handled by the component using this hook
    }, 100);
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimeIntervalRef.current) {
      clearInterval(elapsedTimeIntervalRef.current);
      elapsedTimeIntervalRef.current = null;
    }
  }, []);

  const execute = useCallback(async () => {
    try {
      setIsRunning(true);
      setError(null);

      // Update tab status to running
      if (tabId) {
        updateTabStatus(tabId, 'running');
      }

      setExecutionStartTime(Date.now());
      setMessages([]);
      setRawJsonlOutput([]);
      setRunId(null);

      // Clear any existing listeners
      cleanupListeners();

      // Execute the agent and get the run ID
      const executionRunId = await api.executeAgent(agent.id!, projectPath || "", task, model);
      setRunId(executionRunId);

      // Set up event listeners with run ID isolation
      const outputUnlisten = await listen<string>(`agent-output:${executionRunId}`, (event) => {
        try {
          // Store raw JSONL
          setRawJsonlOutput(prev => [...prev, event.payload]);

          // Parse and display
          const message = JSON.parse(event.payload) as ClaudeStreamMessage;
          setMessages(prev => [...prev, message]);
        } catch (err) {
          console.error("Failed to parse message:", err, event.payload);
        }
      });

      const errorUnlisten = await listen<string>(`agent-error:${executionRunId}`, (event) => {
        console.error("Agent error:", event.payload);
        setError(event.payload);
      });

      const completeUnlisten = await listen<boolean>(`agent-complete:${executionRunId}`, (event) => {
        setIsRunning(false);
        setExecutionStartTime(null);

        if (!event.payload) {
          setError("Agent execution failed");
          if (tabId) {
            updateTabStatus(tabId, 'error');
          }
        } else {
          if (tabId) {
            updateTabStatus(tabId, 'complete');
          }
        }
      });

      const cancelUnlisten = await listen<boolean>(`agent-cancelled:${executionRunId}`, () => {
        setIsRunning(false);
        setExecutionStartTime(null);
        setError("Agent execution was cancelled");
        if (tabId) {
          updateTabStatus(tabId, 'idle');
        }
      });

      unlistenRefs.current = [outputUnlisten, errorUnlisten, completeUnlisten, cancelUnlisten];
    } catch (err) {
      console.error("Failed to execute agent:", err);
      setIsRunning(false);
      setExecutionStartTime(null);
      setRunId(null);
      setError(`Failed to execute agent: ${err instanceof Error ? err.message : 'Unknown error'}`);

      if (tabId) {
        updateTabStatus(tabId, 'error');
      }

      // Show error in messages
      setMessages(prev => [...prev, {
        type: "result",
        subtype: "error",
        is_error: true,
        result: `Failed to execute agent: ${err instanceof Error ? err.message : 'Unknown error'}`,
        duration_ms: 0,
        usage: {
          input_tokens: 0,
          output_tokens: 0
        }
      }]);
    }
  }, [agent, projectPath, task, model, tabId, updateTabStatus, cleanupListeners]);

  const stop = useCallback(async () => {
    try {
      if (!runId) {
        console.error("No run ID available to stop");
        return;
      }

      const success = await api.killAgentSession(runId);

      if (!success) {
        console.warn(`Failed to stop agent session ${runId} - it may have already finished`);
      }

      setIsRunning(false);
      setExecutionStartTime(null);
    } catch (err) {
      console.error("Failed to stop agent:", err);
    }
  }, [runId]);

  const handleBackWithConfirmation = useCallback(() => {
    if (isRunning) {
      const shouldLeave = window.confirm(
        "An agent is currently running. If you navigate away, the agent will continue running in the background. You can view running sessions in the 'Running Sessions' tab within CC Agents.\n\nDo you want to continue?"
      );
      if (!shouldLeave) {
        return;
      }
    }

    // Clean up listeners but don't stop the actual agent process
    cleanupListeners();

    // Navigate back
    onBack();
  }, [isRunning, cleanupListeners, onBack]);

  const handleCompositionStart = useCallback(() => {
    // This is handled by a ref in the component
  }, []);

  const handleCompositionEnd = useCallback(() => {
    // This is handled by a ref in the component with setTimeout
  }, []);

  return {
    // State
    task,
    setTask,
    model,
    setModel,
    isRunning,
    messages,
    rawJsonlOutput,
    error,
    executionStartTime,
    runId,
    copyPopoverOpen,
    setCopyPopoverOpen,

    // Actions
    execute,
    stop,
    handleBackWithConfirmation,
    handleCompositionStart,
    handleCompositionEnd,

    // Cleanup
    cleanupListeners,
    startElapsedTimer,
    stopElapsedTimer,
  };
}
