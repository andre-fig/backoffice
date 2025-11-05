import { useState, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc';

export type ColumnType = 'string' | 'number' | 'date' | 'enum';

export interface ColumnDescriptor<T> {
  accessor: (item: T) => string | number | Date | null | undefined;
  type?: ColumnType;
  orderMap?: Record<string | number, number>;
}

export interface UseSortableOptions<T, K extends string> {
  initialColumn: K;
  initialOrder?: SortOrder;
  columns: Record<K, ColumnDescriptor<T>>;
}

export interface UseSortableResult<T, K extends string> {
  sortBy: K;
  sortOrder: SortOrder;
  handleSort: (column: K) => void;
  sortedData: T[];
}

export function useSortable<T, K extends string>(
  data: T[],
  options: UseSortableOptions<T, K>
): UseSortableResult<T, K> {
  const { initialColumn, initialOrder = 'asc', columns } = options;
  const [sortBy, setSortBy] = useState<K>(initialColumn);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSort = (column: K) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    const descriptor = columns[sortBy];
    const { accessor, type = 'string', orderMap } = descriptor;

    const compareValues = (a: T, b: T): number => {
      const aValue = accessor(a);
      const bValue = accessor(b);

      if (type === 'enum' && orderMap) {
        const aKey = String(aValue ?? '');
        const bKey = String(bValue ?? '');
        const aOrder = orderMap[aKey] ?? -1;
        const bOrder = orderMap[bKey] ?? -1;
        const cmp = aOrder - bOrder;
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (type === 'date') {
        const aTime = aValue ? new Date(aValue as string | Date).getTime() : 0;
        const bTime = bValue ? new Date(bValue as string | Date).getTime() : 0;
        const cmp = aTime - bTime;
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (type === 'number') {
        const aNum = Number(aValue ?? 0);
        const bNum = Number(bValue ?? 0);
        const cmp = aNum - bNum;
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      const aStr = String(aValue ?? '');
      const bStr = String(bValue ?? '');
      const cmp = aStr.localeCompare(bStr, 'pt-BR', { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    };

    return [...data].sort(compareValues);
  }, [data, sortBy, sortOrder, columns]);

  return {
    sortBy,
    sortOrder,
    handleSort,
    sortedData,
  };
}
