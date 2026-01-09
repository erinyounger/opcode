import { useCallback } from "react";
import type { ClaudeStreamMessage } from "@/components/AgentExecution";
import { convertToMarkdown } from "@/components/AgentExecution.utils";

export function useCopyOutput(
  agentName: string,
  task: string,
  model: string,
  messages: ClaudeStreamMessage[],
  rawJsonlOutput: string[]
) {
  const copyAsJsonl = useCallback(async (setOpen?: (open: boolean) => void) => {
    const jsonl = rawJsonlOutput.join('\n');
    await navigator.clipboard.writeText(jsonl);
    setOpen?.(false);
  }, [rawJsonlOutput]);

  const copyAsMarkdown = useCallback(async (setOpen?: (open: boolean) => void) => {
    const markdown = convertToMarkdown(agentName, task, model, messages);
    await navigator.clipboard.writeText(markdown);
    setOpen?.(false);
  }, [agentName, task, model, messages]);

  return {
    copyAsJsonl,
    copyAsMarkdown,
  };
}
