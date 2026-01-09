import React from "react";
import { X, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import type { Agent } from "@/lib/api";
import type { ClaudeStreamMessage } from "./AgentExecution";
import { getDisplayableMessages } from "./AgentExecution.utils";
import { StreamMessage } from "./StreamMessage";
import { ErrorBoundary } from "./ErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";

interface FullscreenModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  messages: ClaudeStreamMessage[];
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  copyAsJsonl: () => void;
  copyAsMarkdown: () => void;
  copyPopoverOpen: boolean;
  setCopyPopoverOpen: (open: boolean) => void;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  agent,
  isOpen,
  onClose,
  isRunning,
  messages,
  scrollRef,
  onScroll,
  copyAsJsonl,
  copyAsMarkdown,
  copyPopoverOpen,
  setCopyPopoverOpen,
}) => {
  if (!isOpen) return null;

  const displayableMessages = getDisplayableMessages(messages);

  const rowVirtualizer = useVirtualizer({
    count: displayableMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Modal Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{agent.name} - Output</h2>
          {isRunning && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Running</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Popover
            trigger={
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copy Output
                <ChevronDown className="h-3 w-3" />
              </Button>
            }
            content={
              <div className="w-44 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={copyAsJsonl}
                >
                  Copy as JSONL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={copyAsMarkdown}
                >
                  Copy as Markdown
                </Button>
              </div>
            }
            open={copyPopoverOpen}
            onOpenChange={setCopyPopoverOpen}
            align="end"
          />
          <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      {/* Modal Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full overflow-y-auto space-y-8">
          {messages.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="h-16 w-16 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Ready to Execute</h3>
              <p className="text-sm text-muted-foreground">
                Enter a task to run the agent
              </p>
            </div>
          )}

          {isRunning && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-muted-foreground">Initializing agent...</span>
              </div>
            </div>
          )}

          <div className="relative w-full max-w-5xl mx-auto">
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              <AnimatePresence>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const message = displayableMessages[virtualItem.index];
                  return (
                    <motion.div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={(el) => el && rowVirtualizer.measureElement(el)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-x-4 pb-4"
                      style={{ top: virtualItem.start }}
                    >
                      <ErrorBoundary>
                        <StreamMessage message={message} streamMessages={messages} />
                      </ErrorBoundary>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
