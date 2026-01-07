import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the sidebar is collapsed
   */
  collapsed?: boolean;
  /**
   * Callback when collapsed state changes
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Width of the sidebar
   */
  width?: number;
  /**
   * Width when collapsed
   */
  collapsedWidth?: number;
  /**
   * Position of the sidebar
   */
  position?: 'left' | 'right';
  /**
   * Whether to show a toggle button
   */
  showToggle?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  className,
  collapsed = false,
  onCollapsedChange,
  width = 256,
  collapsedWidth = 64,
  position = 'left',
  showToggle = true,
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  const toggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange?.(newState);
  };

  return (
    <SidebarContext.Provider value={{ collapsed: isCollapsed, setCollapsed: setIsCollapsed }}>
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? collapsedWidth : width }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'relative flex flex-col border-r border-border/50 bg-background/80 backdrop-blur-sm',
          position === 'right' && 'border-l border-r-0',
          className
        )}
        {...(props as any)}
      >
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto overflow-x-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {showToggle && (
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'absolute top-4 flex h-8 w-8 items-center justify-center rounded-full',
              'bg-background border border-border/50 shadow-md hover:shadow-lg',
              'transition-all duration-200',
              position === 'left' ? '-right-4' : '-left-4'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </motion.button>
        )}
      </motion.div>
    </SidebarContext.Provider>
  );
};

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show padding
   */
  padded?: boolean;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  children,
  className,
  padded = true,
  ...props
}) => {
  const { collapsed } = React.useContext(SidebarContext)!;

  if (collapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border/50',
        padded && 'px-6 py-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show padding
   */
  padded?: boolean;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  children,
  className,
  padded = true,
  ...props
}) => {
  const { collapsed } = React.useContext(SidebarContext)!;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 p-2">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              collapsed: true,
            });
          }
          return child;
        })}
      </div>
    );
  }

  return (
    <div className={cn(padded && 'px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
};

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show padding
   */
  padded?: boolean;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  children,
  className,
  padded = true,
  ...props
}) => {
  const { collapsed } = React.useContext(SidebarContext)!;

  if (collapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        'mt-auto border-t border-border/50',
        padded && 'px-6 py-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Icon to display
   */
  icon?: React.ReactNode;
  /**
   * Whether the item is active
   */
  active?: boolean;
  /**
   * Badge or notification count
   */
  badge?: string | number;
  /**
   * Whether the item is collapsed
   */
  collapsed?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  children,
  className,
  icon,
  active,
  badge,
  collapsed: propCollapsed,
  ...props
}) => {
  const { collapsed: contextCollapsed } = React.useContext(SidebarContext)!;
  const isCollapsed = propCollapsed || contextCollapsed;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200',
        'hover:bg-accent/50',
        active && 'bg-primary/10 text-primary hover:bg-primary/20',
        isCollapsed && 'justify-center px-2',
        className
      )}
      {...(props as any)}
    >
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate"
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      {!isCollapsed && badge && (
        <motion.span
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
        >
          {badge}
        </motion.span>
      )}
    </motion.button>
  );
};

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Title of the group
   */
  title?: string;
  /**
   * Whether to show padding
   */
  padded?: boolean;
}

export const SidebarGroup: React.FC<SidebarGroupProps> = ({
  children,
  className,
  title,
  padded = true,
  ...props
}) => {
  const { collapsed } = React.useContext(SidebarContext)!;

  if (collapsed) {
    return (
      <div className="mb-2 flex flex-col items-center gap-1 p-2">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              collapsed: true,
            });
          }
          return child;
        })}
      </div>
    );
  }

  return (
    <div className={cn(padded && 'px-6 py-2', className)} {...props}>
      {title && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
