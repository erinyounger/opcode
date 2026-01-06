import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Enhanced button variants with micro-interactions
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90 active:shadow-inner",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:bg-destructive/90 active:shadow-inner",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent active:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
        glass:
          "bg-background/50 backdrop-blur-md border border-border/50 text-foreground shadow-sm hover:bg-background/80 hover:border-border active:bg-background/70",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
      },
      animated: {
        true: "active:scale-[0.98]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animated: true,
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

/**
 * Enhanced Button component with micro-interactions
 * Features:
 * - Ripple effect on click
 * - Hover animations
 * - Loading state
 * - Scale transitions
 *
 * @example
 * <EnhancedButton variant="outline" size="lg" loading={isLoading}>
 *   Click me
 * </EnhancedButton>
 */
const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, animated, loading, loadingText, children, disabled, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple = {
        id: Date.now(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      // Call original onClick if provided
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, animated, className }))}
        disabled={disabled || loading}
        onClick={handleClick}
        whileHover={disabled || loading ? {} : { scale: 1.02 }}
        whileTap={disabled || loading ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...(props as any)}
      >
        {/* Ripple effect overlay */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute bg-white/20 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
            }}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}

        {/* Shimmer effect for hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full"
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Loading spinner */}
        {loading && (
          <motion.div
            className="mr-2 h-4 w-4"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.div>
        )}

        {/* Button content */}
        <span className="relative z-10 flex items-center justify-center">
          {loading && loadingText ? loadingText : children}
        </span>
      </motion.button>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, buttonVariants };

/**
 * IconButton - A circular button with an icon
 */
interface IconButtonProps extends Omit<EnhancedButtonProps, 'children'> {
  icon: React.ReactNode;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, className, size = "icon", ...props }, ref) => {
    return (
      <motion.div
        whileHover={{ scale: props.disabled ? 1 : 1.05 }}
        whileTap={{ scale: props.disabled ? 1 : 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <EnhancedButton
          ref={ref}
          size={size}
          className={cn("rounded-full", className)}
          title={tooltip}
          {...props}
        >
          {icon}
        </EnhancedButton>
      </motion.div>
    );
  }
);

IconButton.displayName = "IconButton";

/**
 * GradientButton - Button with gradient background
 */
interface GradientButtonProps extends Omit<EnhancedButtonProps, 'variant'> {
  gradient?: string;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ gradient = "from-primary to-primary/80", children, className, ...props }, ref) => {
    return (
      <EnhancedButton
        ref={ref}
        className={cn(
          "bg-gradient-to-r text-primary-foreground shadow-lg hover:shadow-xl",
          gradient,
          className
        )}
        {...props}
      >
        {children}
      </EnhancedButton>
    );
  }
);

GradientButton.displayName = "GradientButton";
