import { useState, useMemo } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface UseSortableOptions<T, K extends keyof T> {
  initialColumn: K;
  initialOrder?: SortOrder;
  accessors: Record<K, (item: T) => string | number>;
}

export interface UseSortableResult<T, K extends keyof T> {
  sortBy: K;
  sortOrder: SortOrder;
  handleSort: (column: K) => void;
  sortedData: T[];
}

export function useSortable<T, K extends keyof T>(
  data: T[],
  options: UseSortableOptions<T, K>
): UseSortableResult<T, K> {
  const { initialColumn, initialOrder = 'asc', accessors } = options;
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
    const accessor = accessors[sortBy];

    const compareValues = (x: string | number, y: string | number) => {
      if (typeof x === 'string' && typeof y === 'string') {
        const cmp = x.localeCompare(y, 'pt-BR', { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (x < y) return sortOrder === 'asc' ? -1 : 1;
      if (x > y) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    };

    return [...data].sort((a, b) => compareValues(accessor(a), accessor(b)));
  }, [data, sortBy, sortOrder, accessors]);

  return {
    sortBy,
    sortOrder,
    handleSort,
    sortedData,
  };
}
