import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Color variant
   */
  variant?: "primary" | "secondary" | "muted";
  /**
   * Whether to show text
   */
  text?: string;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Full screen overlay
   */
  overlay?: boolean;
}

/**
 * Animated loading spinner component with multiple variants
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  variant = "primary",
  text,
  className,
  overlay = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const colorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    muted: "text-muted-foreground",
  };

  const spinnerContent = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <motion.div
        className={cn(
          "relative",
          sizeClasses[size]
        )}
      >
        {/* Outer ring */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-current opacity-20",
            variant === "muted" && "border-dashed"
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner spinning dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            className={cn(
              "h-2 w-2 rounded-full",
              colorClasses[variant]
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5 + i * 0.2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.1,
            }}
          >
            <motion.div
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full",
                colorClasses[variant]
              )}
              animate={{
                y: [-2, -8, -2],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "text-sm font-medium",
            colorClasses[variant]
          )}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {spinnerContent}
        </motion.div>
      </div>
    );
  }

  return spinnerContent;
};

/**
 * Inline spinner for buttons and small spaces
 */
export const InlineSpinner: React.FC<{ size?: "sm" | "md"; className?: string }> = ({
  size = "sm",
  className,
}) => {
  return (
    <motion.div
      className={cn(
        "inline-block rounded-full border-2 border-current border-t-transparent",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};

/**
 * Dots loading animation
 */
export const DotsLoader: React.FC<{
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}> = ({ size = "md", text, className }) => {
  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-3 w-3",
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "rounded-full bg-primary",
              sizeClasses[size]
            )}
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

/**
 * Pulse loading animation - Modern glass morphism style
 */
export const PulseLoader: React.FC<{
  text?: string;
  className?: string;
}> = ({ text, className }) => {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        {/* Background blur */}
        <motion.div
          className="absolute inset-0 h-16 w-16 rounded-full bg-primary/20 blur-xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Main pulse circle */}
        <motion.div
          className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 backdrop-blur-sm flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Inner ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-primary/30"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          {/* Center dot */}
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground font-medium"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};
