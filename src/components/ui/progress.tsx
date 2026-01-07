import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressProps {
  /**
   * Current value (0-100)
   */
  value?: number;
  /**
   * Maximum value (default: 100)
   */
  max?: number;
  /**
   * Size of the progress bar
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Variant of the progress bar
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  /**
   * Whether to show the progress percentage
   */
  showValue?: boolean;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Animation duration in milliseconds
   */
  duration?: number;
  /**
   * Whether the progress is indeterminate
   */
  indeterminate?: boolean;
}

/**
 * Modern Progress Component with smooth animations
 */
export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'default',
  showValue = false,
  className,
  duration = 1000,
  indeterminate = false,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500',
    gradient: 'bg-gradient-to-r from-primary to-purple-500',
  };

  if (indeterminate) {
    return (
      <div className={cn('relative', className)}>
        <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizeClasses[size])}>
          <motion.div
            className={cn('h-full rounded-full', variantClasses[variant])}
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '30%',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div className={cn('w-full rounded-full bg-muted/50 overflow-hidden', sizeClasses[size])}>
        <motion.div
          className={cn('h-full rounded-full', variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
        />
      </div>
      {showValue && (
        <motion.div
          className="mt-1 text-xs text-muted-foreground text-right"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(percentage)}%
        </motion.div>
      )}
    </div>
  );
};

/**
 * Circular Progress Component
 */
interface CircularProgressProps {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  showValue?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value = 0,
  max = 100,
  size = 40,
  strokeWidth = 4,
  variant = 'default',
  showValue = true,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const variantClasses = {
    default: 'stroke-primary',
    success: 'stroke-green-500',
    warning: 'stroke-orange-500',
    error: 'stroke-red-500',
    gradient: 'stroke-primary',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          className={variantClasses[variant]}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {showValue && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-xs font-medium">{Math.round(percentage)}%</span>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Loading Progress Component with Steps
 */
interface StepsProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  className?: string;
}

export const StepsProgress: React.FC<StepsProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground shadow-md',
                    isCurrent && 'bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/30',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCompleted ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    stepNumber
                  )}
                </motion.div>
                {steps && steps[index] && (
                  <span className="mt-2 text-xs text-muted-foreground max-w-[100px] text-center">
                    {steps[index]}
                  </span>
                )}
              </div>
              {index < totalSteps - 1 && (
                <div className="flex-1 mt-4">
                  <div className="h-0.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: stepNumber < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Progress;
