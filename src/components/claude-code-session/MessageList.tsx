import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StreamMessage } from '../StreamMessage';
import { Terminal, Sparkles, Code2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClaudeStreamMessage } from '../AgentExecution';

interface MessageListProps {
  messages: ClaudeStreamMessage[];
  projectPath: string;
  isStreaming: boolean;
  onLinkDetected?: (url: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = React.memo(({
  messages,
  projectPath,
  isStreaming,
  onLinkDetected,
  className
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const userHasScrolledRef = useRef(false);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100, // Estimated height of each message
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      const scrollElement = scrollContainerRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  // Handle scroll events to detect user scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const scrollElement = scrollContainerRef.current;
    const isAtBottom = 
      Math.abs(scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight) < 50;
    
    if (!isAtBottom) {
      userHasScrolledRef.current = true;
      shouldAutoScrollRef.current = false;
    } else if (userHasScrolledRef.current) {
      shouldAutoScrollRef.current = true;
      userHasScrolledRef.current = false;
    }
  };

  // Reset auto-scroll when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      shouldAutoScrollRef.current = true;
      userHasScrolledRef.current = false;
    }
  }, [isStreaming]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center space-y-8 max-w-lg px-6"
        >
          {/* Animated Icon Container */}
          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 18,
                delay: 0.1
              }}
              className="relative h-28 w-28 mx-auto"
            >
              {/* Outer ring animation */}
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
              />

              {/* Background glow - enhanced */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-2xl"
              />

              {/* Main icon container - glass morphism style */}
              <div className="relative h-full w-full bg-gradient-to-br from-background/80 to-muted/50 rounded-3xl flex items-center justify-center border border-primary/20 backdrop-blur-xl shadow-xl shadow-primary/5">
                <motion.div
                  animate={{
                    y: [-2, 2, -2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Terminal className="h-12 w-12 text-primary" />
                </motion.div>
              </div>

              {/* Floating sparkles - improved animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="absolute -top-2 -right-2"
              >
                <motion.div
                  animate={{
                    y: [-4, 4, -4],
                    x: [-2, 2, -2],
                    rotate: [0, 15, -15, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="p-1.5 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-2 -left-2"
              >
                <motion.div
                  animate={{
                    y: [4, -4, 4],
                    x: [2, -2, 2],
                    rotate: [0, -15, 15, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                >
                  <div className="p-1.5 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
                    <Code2 className="h-4 w-4 text-primary" />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-4"
          >
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-semibold tracking-tight"
            >
              {projectPath ? "Ready to code together" : "Welcome to Claude Code"}
            </motion.h3>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                {projectPath
                  ? "Your AI-powered development assistant is ready. Describe what you'd like to build or ask any coding question."
                  : "Select a project folder to begin your coding journey with AI assistance."}
              </p>

              {projectPath && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-muted-foreground font-mono">
                    {projectPath.split('/').pop() || 'current'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Quick Tips - Card style */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-3"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-default">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                Type <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">@</kbd> for files
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-default">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                Type <kbd className="px-1 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">/</kbd> for commands
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={cn("flex-1 overflow-y-auto scroll-smooth", className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="popLayout">
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            const key = `msg-${virtualItem.index}-${message.type}`;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="px-3 py-1.5">
                  <StreamMessage 
                    message={message}
                    streamMessages={messages}
                    onLinkDetected={onLinkDetected}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="sticky bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background via-background/95 to-transparent"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 shadow-lg max-w-fit mx-auto">
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="h-2 w-2 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="h-2 w-2 bg-primary rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="h-2 w-2 bg-primary rounded-full"
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Claude is thinking...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
});