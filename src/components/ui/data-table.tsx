import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Badge } from './badge';
import { ChevronUp, ChevronDown, ArrowUpDown, Search } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  /**
   * Unique identifier for the column
   */
  id: string;
  /**
   * Header label
   */
  header: string;
  /**
   * Accessor function to get the cell value
   */
  accessor: (row: T) => React.ReactNode;
  /**
   * Optional sort function
   */
  sortable?: boolean;
  /**
   * Optional class name for the cell
   */
  className?: string;
}

interface DataTableProps<T> {
  /**
   * Data to display
   */
  data: T[];
  /**
   * Column definitions
   */
  columns: Column<T>[];
  /**
   * Key function to get unique row identifier
   */
  getRowId: (row: T) => string;
  /**
   * Whether the table is loading
   */
  loading?: boolean;
  /**
   * Empty state message
   */
  emptyMessage?: string;
  /**
   * Whether to show zebra striping
   */
  striped?: boolean;
  /**
   * Whether to show hover effects
   */
  hoverable?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Modern Data Table Component with sorting and animations
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading = false,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find((col) => col.id === sortColumn);
    if (!column || !column.sortable) return data;

    return [...data].sort((a, b) => {
      const valueA = column.accessor(a);
      const valueB = column.accessor(b);

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      const strA = String(valueA);
      const strB = String(valueB);

      return sortDirection === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [data, columns, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="spinner" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border/50 bg-background', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'px-6 py-4 text-left text-sm font-semibold text-foreground',
                    column.sortable && 'cursor-pointer select-none',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && (
                      <div className="flex flex-col">
                        {sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedData.map((row, index) => (
                <motion.tr
                  key={getRowId(row)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={cn(
                    'border-b border-border/30 last:border-b-0',
                    striped && index % 2 === 1 && 'bg-muted/20',
                    hoverable && 'hover:bg-accent/50 transition-colors'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn('px-6 py-4 text-sm text-foreground', column.className)}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Data Table Cell Components
 */
interface DataTableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const DataTableCell: React.FC<DataTableCellProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

interface DataTableBadgeCellProps extends DataTableCellProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' | 'soft';
  value?: string | number;
}

export const DataTableBadgeCell: React.FC<DataTableBadgeCellProps> = ({
  children,
  variant = 'default',
  value,
  className,
}) => {
  return (
    <div className={className}>
      <Badge variant={variant} className="text-xs">
        {value || children}
      </Badge>
    </div>
  );
};

interface DataTableActionCellProps extends DataTableCellProps {
  actions: React.ReactNode;
}

export const DataTableActionCell: React.FC<DataTableActionCellProps> = ({
  children,
  actions,
  className,
}) => {
  return (
    <td className={cn('px-6 py-4 text-sm', className)}>
      <div className="flex items-center justify-end gap-2">
        {children}
        {actions}
      </div>
    </td>
  );
};

export default DataTable;
