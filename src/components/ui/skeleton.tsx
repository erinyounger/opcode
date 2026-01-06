import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional animation variant - can be "pulse", "wave", or "none"
   */
  variant?: "pulse" | "wave" | "none";
  /**
   * Optional height override
   */
  height?: string | number;
  /**
   * Optional width override
   */
  width?: string | number;
  /**
   * Optional rounded corners variant
   */
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  /**
   * Number of skeleton items to render
   */
  count?: number;
  /**
   * Custom class name for the skeleton
   */
  className?: string;
}

/**
 * Skeleton component with multiple animation variants
 * Provides loading states for content
 */
export const Skeleton = ({
  className,
  variant = "pulse",
  height,
  width,
  rounded = "md",
  count = 1,
  ...props
}: SkeletonProps) => {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  const baseClasses = cn(
    "bg-muted",
    roundedClasses[rounded],
    className
  );

  const style: React.CSSProperties = {};
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;

  // Apply CSS animations based on variant
  const animationClass = variant === "pulse"
    ? "animate-pulse"
    : variant === "wave"
    ? "animate-[shimmer_2s_infinite]"
    : "";

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(baseClasses, animationClass)}
          style={style}
          {...props}
        />
      ))}
    </>
  );
};

Skeleton.displayName = "Skeleton";

/**
 * Skeleton text lines for loading paragraphs
 */
export const SkeletonText = ({
  lines = 3,
  className,
  ...props
}: {
  lines?: number;
  className?: string;
} & Omit<SkeletonProps, "count">) => {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          rounded="md"
          className={cn(
            index === lines - 1 && lines > 1 && "w-3/4" // Last line shorter
          )}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton avatar component
 */
export const SkeletonAvatar = ({
  size = 40,
  className,
  ...props
}: {
  size?: number;
  className?: string;
} & Omit<SkeletonProps, "height" | "width" | "rounded">) => {
  return (
    <Skeleton
      height={size}
      width={size}
      rounded="full"
      className={className}
      {...props}
    />
  );
};

/**
 * Skeleton card component for loading card content
 */
export const SkeletonCard = ({
  showAvatar = false,
  showImage = false,
  showActions = false,
  className,
  ...props
}: {
  showAvatar?: boolean;
  showImage?: boolean;
  showActions?: boolean;
  className?: string;
} & Omit<SkeletonProps, "count">) => {
  return (
    <div className={cn("p-4 space-y-4", className)} {...props}>
      {/* Header with avatar and title */}
      <div className="flex items-center gap-3">
        {showAvatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="1rem" width="40%" />
        </div>
      </div>

      {/* Image placeholder */}
      {showImage && <Skeleton height={200} rounded="md" />}

      {/* Content lines */}
      <SkeletonText lines={3} />

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <Skeleton height="2rem" width="5rem" rounded="sm" />
          <Skeleton height="2rem" width="5rem" rounded="sm" />
        </div>
      )}
    </div>
  );
};
