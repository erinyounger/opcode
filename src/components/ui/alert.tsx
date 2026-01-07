import * as React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of the alert
   */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /**
   * Whether to show an icon
   */
  showIcon?: boolean;
  /**
   * Whether the alert can be dismissed
   */
  dismissible?: boolean;
  /**
   * Callback when alert is dismissed
   */
  onDismiss?: () => void;
  /**
   * Title of the alert
   */
  title?: string;
}

/**
 * Modern Alert Component with animations
 */
export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  showIcon = true,
  dismissible = false,
  onDismiss,
  title,
  className,
  ...props
}) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = icons[variant];

  const variantStyles = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
      icon: 'text-blue-500',
      title: 'text-blue-500',
    },
    success: {
      container: 'bg-green-500/10 border-green-500/20 text-green-500',
      icon: 'text-green-500',
      title: 'text-green-500',
    },
    warning: {
      container: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
      icon: 'text-orange-500',
      title: 'text-orange-500',
    },
    error: {
      container: 'bg-red-500/10 border-red-500/20 text-red-500',
      icon: 'text-red-500',
      title: 'text-red-500',
    },
  };

  const style = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative rounded-xl border p-4 shadow-lg backdrop-blur-sm',
        'hover:shadow-xl transition-all duration-200',
        style.container,
        className
      )}
      {...(props as any)}
    >
      <div className="flex gap-3">
        {showIcon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          >
            <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.icon)} />
          </motion.div>
        )}
        <div className="flex-1">
          {title && (
            <motion.h5
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={cn('font-semibold mb-1 text-sm', style.title)}
            >
              {title}
            </motion.h5>
          )}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: title ? 0.3 : 0.2 }}
            className="text-sm"
          >
            {children}
          </motion.div>
        </div>
        {dismissible && onDismiss && (
          <motion.button
            onClick={onDismiss}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex-shrink-0 p-1 rounded-full',
              'hover:bg-black/5 transition-colors',
              style.icon
            )}
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Alert Description Component
 */
export const AlertDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('text-sm opacity-90', className)} {...props}>
      {children}
    </div>
  );
};

/**
 * Alert Title Component
 */
export const AlertTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <h5 className={cn('font-semibold mb-1', className)} {...props}>
      {children}
    </h5>
  );
};

export default Alert;
