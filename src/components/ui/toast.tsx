import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  /**
   * The message to display
   */
  message: string;
  /**
   * The type of toast
   */
  type?: ToastType;
  /**
   * Duration in milliseconds before auto-dismiss
   */
  duration?: number;
  /**
   * Callback when the toast is dismissed
   */
  onDismiss?: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Toast component for showing temporary notifications
 * 
 * @example
 * <Toast
 *   message="File saved successfully"
 *   type="success"
 *   duration={3000}
 *   onDismiss={() => setShowToast(false)}
 * />
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onDismiss,
  className,
}) => {
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    if (duration && duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const decrement = 100 / (duration / 50);
          return Math.max(0, prev - decrement);
        });
      }, 50);

      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [duration, onDismiss]);

  const icons = {
    success: (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <CheckCircle className="h-5 w-5" />
      </motion.div>
    ),
    error: (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <AlertCircle className="h-5 w-5" />
      </motion.div>
    ),
    info: (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Info className="h-5 w-5" />
      </motion.div>
    ),
  };

  const colorStyles = {
    success: {
      icon: "text-green-500",
      progress: "bg-green-500",
      border: "border-green-500/20",
      bg: "bg-gradient-to-r from-green-500/10 to-transparent",
    },
    error: {
      icon: "text-red-500",
      progress: "bg-red-500",
      border: "border-red-500/20",
      bg: "bg-gradient-to-r from-red-500/10 to-transparent",
    },
    info: {
      icon: "text-primary",
      progress: "bg-primary",
      border: "border-primary/20",
      bg: "bg-gradient-to-r from-primary/10 to-transparent",
    },
  };

  const style = colorStyles[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "flex items-center space-x-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm",
        "hover:shadow-3xl transition-all duration-300",
        style.border,
        style.bg,
        className
      )}
    >
      <motion.span
        className={cn("flex-shrink-0", style.icon)}
        whileHover={{ rotate: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        {icons[type]}
      </motion.span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onDismiss && (
        <motion.button
          onClick={onDismiss}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-black/5"
        >
          <X className="h-4 w-4" />
        </motion.button>
      )}

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-full overflow-hidden"
          style={{ width: "100%" }}
        >
          <motion.div
            className={cn("h-full", style.progress)}
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

// Toast container for positioning
interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 50 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-2 pointer-events-auto max-w-[420px] w-full"
      >
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}; 