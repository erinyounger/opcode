import type { ClaudeStreamMessage } from "./AgentExecution";

/**
 * Tools that have built-in widgets and should be skipped in display
 */
const TOOLS_WITH_WIDGETS = [
  'task', 'edit', 'multiedit', 'todowrite', 'ls', 'read',
  'glob', 'bash', 'write', 'grep'
];

/**
 * Check if a message should be skipped based on its content and context
 */
export function shouldSkipMessage(
  message: ClaudeStreamMessage,
  messages: ClaudeStreamMessage[],
  index: number
): boolean {
  // Skip meta messages that don't have meaningful content
  if (message.isMeta && !message.leafUuid && !message.summary) {
    return true;
  }

  // Skip empty user messages
  if (message.type === "user" && message.message) {
    if (message.isMeta) return true;

    const msg = message.message;
    if (!msg.content || (Array.isArray(msg.content) && msg.content.length === 0)) {
      return true;
    }

    // Check if user message has visible content by checking its parts
    if (Array.isArray(msg.content)) {
      let hasVisibleContent = false;
      for (const content of msg.content) {
        if (content.type === "text") {
          hasVisibleContent = true;
          break;
        } else if (content.type === "tool_result") {
          // Check if this tool result will be skipped by a widget
          let willBeSkipped = false;
          if (content.tool_use_id) {
            // Look for the matching tool_use in previous assistant messages
            for (let i = index - 1; i >= 0; i--) {
              const prevMsg = messages[i];
              if (prevMsg.type === 'assistant' && prevMsg.message?.content && Array.isArray(prevMsg.message.content)) {
                const toolUse = prevMsg.message.content.find((c: any) =>
                  c.type === 'tool_use' && c.id === content.tool_use_id
                );
                if (toolUse) {
                  const toolName = toolUse.name?.toLowerCase();
                  if (TOOLS_WITH_WIDGETS.includes(toolName) || toolUse.name?.startsWith('mcp__')) {
                    willBeSkipped = true;
                  }
                  break;
                }
              }
            }
          }

          if (!willBeSkipped) {
            hasVisibleContent = true;
            break;
          }
        }
      }

      if (!hasVisibleContent) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filter messages to only show displayable ones
 */
export function getDisplayableMessages(messages: ClaudeStreamMessage[]): ClaudeStreamMessage[] {
  return messages.filter((message, index) => {
    return !shouldSkipMessage(message, messages, index);
  });
}

/**
 * Convert messages to Markdown format
 */
export function convertToMarkdown(agentName: string, task: string, model: string, messages: ClaudeStreamMessage[]): string {
  let markdown = `# Agent Execution: ${agentName}\n\n`;
  markdown += `**Task:** ${task}\n`;
  markdown += `**Model:** ${model === 'opus' ? 'Claude 4 Opus' : 'Claude 4 Sonnet'}\n`;
  markdown += `**Date:** ${new Date().toISOString()}\n\n`;
  markdown += `---\n\n`;

  for (const msg of messages) {
    if (msg.type === "system" && msg.subtype === "init") {
      markdown += `## System Initialization\n\n`;
      markdown += `- Session ID: \`${msg.session_id || 'N/A'}\`\n`;
      markdown += `- Model: \`${msg.model || 'default'}\`\n`;
      if (msg.cwd) markdown += `- Working Directory: \`${msg.cwd}\`\n`;
      if (msg.tools?.length) markdown += `- Tools: ${msg.tools.join(', ')}\n`;
      markdown += `\n`;
    } else if (msg.type === "assistant" && msg.message) {
      markdown += `## Assistant\n\n`;
      for (const content of msg.message.content || []) {
        if (content.type === "text") {
          markdown += `${content.text}\n\n`;
        } else if (content.type === "tool_use") {
          markdown += `### Tool: ${content.name}\n\n`;
          markdown += `\`\`\`json\n${JSON.stringify(content.input, null, 2)}\n\`\`\`\n\n`;
        }
      }
      if (msg.message.usage) {
        markdown += `*Tokens: ${msg.message.usage.input_tokens} in, ${msg.message.usage.output_tokens} out*\n\n`;
      }
    } else if (msg.type === "user" && msg.message) {
      markdown += `## User\n\n`;
      for (const content of msg.message.content || []) {
        if (content.type === "text") {
          markdown += `${content.text}\n\n`;
        } else if (content.type === "tool_result") {
          markdown += `### Tool Result\n\n`;
          markdown += `\`\`\`\n${content.content}\n\`\`\`\n\n`;
        }
      }
    } else if (msg.type === "result") {
      markdown += `## Execution Result\n\n`;
      if (msg.result) {
        markdown += `${msg.result}\n\n`;
      }
      if (msg.error) {
        markdown += `**Error:** ${msg.error}\n\n`;
      }
      if (msg.cost_usd !== undefined) {
        markdown += `- **Cost:** $${msg.cost_usd.toFixed(4)} USD\n`;
      }
      if (msg.duration_ms !== undefined) {
        markdown += `- **Duration:** ${(msg.duration_ms / 1000).toFixed(2)}s\n`;
      }
      if (msg.num_turns !== undefined) {
        markdown += `- **Turns:** ${msg.num_turns}\n`;
      }
      if (msg.usage) {
        const total = msg.usage.input_tokens + msg.usage.output_tokens;
        markdown += `- **Total Tokens:** ${total} (${msg.usage.input_tokens} in, ${msg.usage.output_tokens} out)\n`;
      }
    }
  }

  return markdown;
}

/**
 * Calculate total tokens from messages
 */
export function calculateTotalTokens(messages: ClaudeStreamMessage[]): number {
  return messages.reduce((total, msg) => {
    if (msg.message?.usage) {
      return total + msg.message.usage.input_tokens + msg.message.usage.output_tokens;
    }
    if (msg.usage) {
      return total + msg.usage.input_tokens + msg.usage.output_tokens;
    }
    return total;
  }, 0);
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get status text based on execution state
 */
export function getStatusText(isRunning: boolean, messageCount: number): string {
  if (isRunning) return 'Running';
  if (messageCount > 0) return 'Complete';
  return 'Ready';
}

/**
 * Check if user is at the bottom of a scrollable container
 */
export function isScrolledToBottom(container: HTMLElement | null): boolean {
  if (!container) return true;
  const { scrollTop, scrollHeight, clientHeight } = container;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom < 1;
}
