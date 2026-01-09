import { useState, useCallback, useRef } from "react";

interface UseScrollHandlerOptions {
  isFullscreen: boolean;
}

export function useScrollHandler({ isFullscreen }: UseScrollHandlerOptions) {
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);

  const isAtBottom = useCallback(() => {
    const container = isFullscreen ? fullscreenScrollRef.current : scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 1;
    }
    return true;
  }, [isFullscreen]);

  const handleScroll = useCallback(() => {
    // Mark that user has scrolled manually
    if (!hasUserScrolled) {
      setHasUserScrolled(true);
    }

    // If user scrolls back to bottom, re-enable auto-scroll
    if (isAtBottom()) {
      setHasUserScrolled(false);
    }
  }, [hasUserScrolled, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    const container = isFullscreen ? fullscreenScrollRef.current : scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [isFullscreen]);

  return {
    hasUserScrolled,
    setHasUserScrolled,
    scrollContainerRef,
    fullscreenScrollRef,
    isAtBottom,
    handleScroll,
    scrollToBottom,
  };
}
