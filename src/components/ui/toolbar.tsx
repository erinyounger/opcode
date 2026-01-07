import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show a border
   */
  showBorder?: boolean;
  /**
   * Size of the toolbar
   */
  size?: 'sm' | 'md' | 'lg';
}

interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Alignment of the group
   */
  align?: 'left' | 'center' | 'right';
}

/**
 * Modern Toolbar Component
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className,
  showBorder = true,
  size = 'md',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-1 rounded-xl p-1',
        showBorder && 'border border-border/50 bg-background/80 backdrop-blur-sm',
        sizeClasses[size],
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
};

export const ToolbarGroup: React.FC<ToolbarGroupProps> = ({
  children,
  className,
  align = 'left',
  ...props
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Whether the button is active
   */
  isActive?: boolean;
  /**
   * Size of the button
   */
  size?: 'sm' | 'md' | 'lg';
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, variant = 'default', isActive, size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-6 w-6 p-1',
      md: 'h-8 w-8 p-1.5',
      lg: 'h-10 w-10 p-2',
    };

    const variantClasses = {
      default: isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'hover:bg-accent/50 text-foreground',
      outline: 'border border-border hover:bg-accent/50',
      ghost: 'hover:bg-accent/50',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';

interface ToolbarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Orientation of the separator
   */
  orientation?: 'horizontal' | 'vertical';
}

export const ToolbarSeparator: React.FC<ToolbarSeparatorProps> = ({
  className,
  orientation = 'horizontal',
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-border/50',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className
      )}
      {...props}
    />
  );
};

interface ToolbarToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The controlled value
   */
  value?: string;
  /**
   * Callback when value changes
   */
  onValueChange?: (value: string) => void;
  /**
   * The type of toggle group
   */
  type?: 'single' | 'multiple';
}

export const ToolbarToggleGroup: React.FC<ToolbarToggleGroupProps> = ({
  children,
  className,
  value,
  onValueChange,
  type = 'single',
  ...props
}) => {
  const handleChildClick = (childValue: string) => {
    if (type === 'single') {
      onValueChange?.(childValue === value ? '' : childValue);
    } else {
      // For multiple type, you would implement multi-selection logic here
    }
  };

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onClick: () => handleChildClick(child.props.value),
            isActive: child.props.value === value,
          });
        }
        return child;
      })}
    </div>
  );
};

export default Toolbar;
