import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ClaudeStreamMessage } from "./AgentExecution";
import { getDisplayableMessages } from "./AgentExecution.utils";
import { StreamMessage } from "./StreamMessage";
import { ErrorBoundary } from "./ErrorBoundary";

interface MessagesContainerProps {
  messages: ClaudeStreamMessage[];
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  isRunning: boolean;
  EmptyComponent?: React.ComponentType;
  LoadingComponent?: React.ComponentType;
  className?: string;
}

export const MessagesContainer: React.FC<MessagesContainerProps> = ({
  messages,
  scrollRef,
  onScroll,
  isRunning,
  EmptyComponent,
  LoadingComponent,
  className,
}) => {
  const displayableMessages = getDisplayableMessages(messages);

  const rowVirtualizer = useVirtualizer({
    count: displayableMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  useEffect(() => {
    if (displayableMessages.length === 0) return;

    // Auto-scroll to bottom when new messages arrive
    rowVirtualizer.scrollToIndex(displayableMessages.length - 1, {
      align: "end",
      behavior: "smooth"
    });
  }, [displayableMessages.length, rowVirtualizer]);

  return (
    <div
      ref={scrollRef}
      className={className || "h-full overflow-y-auto p-6 space-y-8"}
      onScroll={onScroll}
    >
      {messages.length === 0 && !isRunning && EmptyComponent && (
        <EmptyComponent />
      )}

      {isRunning && messages.length === 0 && LoadingComponent && (
        <LoadingComponent />
      )}

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
  );
};
