import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { getEnvironmentInfo } from '@/lib/apiAdapter';
import type { ClaudeStreamMessage } from '../AgentExecution';

// Conditional import for Tauri
let tauriListen: any;
try {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    tauriListen = require('@tauri-apps/api/event').listen;
  }
} catch (e) {

}

interface UseClaudeMessagesOptions {
  onSessionInfo?: (info: { sessionId: string; projectId: string }) => void;
  onTokenUpdate?: (tokens: number) => void;
  onStreamingChange?: (isStreaming: boolean, sessionId: string | null) => void;
}

export function useClaudeMessages(options: UseClaudeMessagesOptions = {}) {
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([]);
  const [rawJsonlOutput, setRawJsonlOutput] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Constants for memory management
  const MAX_MESSAGES = 1000;
  const MAX_RAW_OUTPUT = 1000;

  const eventListenerRef = useRef<(() => void) | null>(null);
  const accumulatedContentRef = useRef<{ [key: string]: string }>({});

  const handleMessage = useCallback((message: ClaudeStreamMessage) => {
    const messageType = (message as any).type;

    if (messageType === "start") {
      // Clear accumulated content for new stream
      accumulatedContentRef.current = {};
      setIsStreaming(true);
      options.onStreamingChange?.(true, currentSessionId);
    } else if (messageType === "partial") {
      if (message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach((toolCall: any) => {
          if (toolCall.content && toolCall.partial_tool_call_index !== undefined) {
            const key = `tool-${toolCall.partial_tool_call_index}`;
            // Accumulate content with size limit
            const currentContent = accumulatedContentRef.current[key] || "";
            if (currentContent.length < 10000) { // Limit accumulation per tool call
              accumulatedContentRef.current[key] = currentContent + toolCall.content;
              toolCall.accumulated_content = accumulatedContentRef.current[key];
            }
          }
        });
      }
    } else if (messageType === "response" && message.message?.usage) {
      const totalTokens = (message.message.usage.input_tokens || 0) +
                         (message.message.usage.output_tokens || 0);

      options.onTokenUpdate?.(totalTokens);
    } else if (messageType === "error" || messageType === "response") {
      setIsStreaming(false);
      options.onStreamingChange?.(false, currentSessionId);
    }

    // Use functional updates to avoid stale state
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Maintain memory limit by keeping only the most recent messages
      if (newMessages.length > MAX_MESSAGES) {
        return newMessages.slice(-MAX_MESSAGES);
      }
      return newMessages;
    });

    setRawJsonlOutput(prev => {
      const newRawOutput = [...prev, JSON.stringify(message)];
      // Maintain memory limit for raw output
      if (newRawOutput.length > MAX_RAW_OUTPUT) {
        return newRawOutput.slice(-MAX_RAW_OUTPUT);
      }
      return newRawOutput;
    });

    // Extract session info
    if (messageType === "session_info" && (message as any).session_id && (message as any).project_id) {
      options.onSessionInfo?.({
        sessionId: (message as any).session_id,
        projectId: (message as any).project_id
      });
      setCurrentSessionId((message as any).session_id);
    }
  }, [currentSessionId, options, MAX_MESSAGES, MAX_RAW_OUTPUT]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setRawJsonlOutput([]);
    // Clean up accumulated content to prevent memory leaks
    accumulatedContentRef.current = {};
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const output = await api.getSessionOutput(parseInt(sessionId));
      // Note: API returns a string, not an array of outputs
      const outputs = [{ jsonl: output }];
      const loadedMessages: ClaudeStreamMessage[] = [];
      const loadedRawJsonl: string[] = [];

      outputs.forEach(output => {
        if (output.jsonl) {
          const lines = output.jsonl.split('\n').filter(line => line.trim());
          lines.forEach(line => {
            try {
              const msg = JSON.parse(line);
              loadedMessages.push(msg);
              loadedRawJsonl.push(line);
            } catch (e) {
              console.error("Failed to parse JSONL:", e);
            }
          });
        }
      });

      // Apply memory limits when loading messages
      setMessages(loadedMessages.slice(-MAX_MESSAGES));
      setRawJsonlOutput(loadedRawJsonl.slice(-MAX_RAW_OUTPUT));
    } catch (error) {
      console.error("Failed to load session outputs:", error);
      throw error;
    }
  }, [MAX_MESSAGES, MAX_RAW_OUTPUT]);

  // Set up event listener
  useEffect(() => {
    const setupListener = async () => {
      // Clean up previous listener
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }

      const envInfo = getEnvironmentInfo();

      if (envInfo.isTauri && tauriListen) {
        // Tauri mode - use Tauri's event system
        eventListenerRef.current = await tauriListen("claude-stream", (event: any) => {
          try {
            const message = JSON.parse(event.payload) as ClaudeStreamMessage;
            handleMessage(message);
          } catch (error) {
            console.error("[TRACE] Failed to parse Claude stream message:", error);
          }
        });
      } else {
        // Web mode - use DOM events (these are dispatched by our WebSocket handler)
        const webEventHandler = (event: any) => {
          try {
            const message = event.detail as ClaudeStreamMessage;
            handleMessage(message);
          } catch (error) {
            console.error("[TRACE] Failed to parse Claude stream message:", error);
          }
        };

        window.addEventListener('claude-output', webEventHandler);

        // Test if event listener is working
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('claude-output', {
            detail: { type: 'test', message: 'test event' }
          }));
        }, 1000);

        eventListenerRef.current = () => {
          window.removeEventListener('claude-output', webEventHandler);
        };
      }
    };

    setupListener();

    // Cleanup function
    return () => {
      if (eventListenerRef.current) {
        eventListenerRef.current();
        eventListenerRef.current = null;
      }
    };
  }, [handleMessage]);

  return {
    messages,
    rawJsonlOutput,
    isStreaming,
    currentSessionId,
    clearMessages,
    loadMessages,
    handleMessage
  };
}