import React, { useEffect, useMemo } from "react";
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

// Memoized virtual item component to prevent unnecessary re-renders
const VirtualizedItem = React.memo<{
  message: ClaudeStreamMessage;
  allMessages: ClaudeStreamMessage[];
  virtualItem: any;
  measureElement: (el: HTMLElement | null) => void;
}>(({ message, allMessages, virtualItem, measureElement }) => {
  return (
    <motion.div
      key={virtualItem.key}
      ref={(el) => el && measureElement(el)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }} // Reduced duration for faster animations
      className="absolute inset-x-4 pb-4"
      style={{ top: virtualItem.start }}
    >
      <ErrorBoundary>
        <StreamMessage message={message} streamMessages={allMessages} />
      </ErrorBoundary>
    </motion.div>
  );
});

const MessagesContainerComponent: React.FC<MessagesContainerProps> = ({
  messages,
  scrollRef,
  onScroll,
  isRunning,
  EmptyComponent,
  LoadingComponent,
  className,
}) => {
  // Memoize displayable messages to prevent unnecessary recalculations
  const displayableMessages = useMemo(
    () => getDisplayableMessages(messages),
    [messages]
  );

  // Optimize virtualizer with reduced overscan for better performance
  const rowVirtualizer = useVirtualizer({
    count: displayableMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 150,
    overscan: 2, // Reduced from 5 to 2 for better performance
  });

  useEffect(() => {
    if (displayableMessages.length === 0) return;

    // Auto-scroll to bottom when new messages arrive
    rowVirtualizer.scrollToIndex(displayableMessages.length - 1, {
      align: "end",
      behavior: "smooth"
    });
  }, [displayableMessages.length, rowVirtualizer]);

  const virtualItems = rowVirtualizer.getVirtualItems();

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
          {virtualItems.map((virtualItem) => {
            const message = displayableMessages[virtualItem.index];
            return (
              <VirtualizedItem
                key={virtualItem.key}
                message={message}
                allMessages={messages}
                virtualItem={virtualItem}
                measureElement={rowVirtualizer.measureElement}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Export memoized component
export const MessagesContainer = React.memo(MessagesContainerComponent);
