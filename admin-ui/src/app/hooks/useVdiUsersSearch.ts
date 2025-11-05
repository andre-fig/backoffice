import { useState, useEffect } from 'react';
import { UserOption } from '@backoffice-monorepo/shared-types';

export interface UseVdiUsersSearchOptions {
  debounceMs?: number;
  perPage?: number;
}

export interface UseVdiUsersSearchResult {
  users: UserOption[];
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
}

export function useVdiUsersSearch(
  options: UseVdiUsersSearchOptions = {}
): UseVdiUsersSearchResult {
  const { debounceMs = 500, perPage = 50 } = options;
  const [users, setUsers] = useState<UserOption[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let debounce: NodeJS.Timeout | null = null;

    const fetchUsers = async (filter?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter) params.set('filter', filter);
        params.set('direction', 'next');
        params.set('perPage', String(perPage));

        const res = await fetch(`/api/vdi/users?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const list: UserOption[] = (body?.data || []).map((u: unknown) => {
          const obj = u as { id?: string; name?: string };
          return { id: String(obj.id ?? ''), name: String(obj.name ?? '') };
        });
        if (mounted) setUsers(list);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    debounce = setTimeout(
      () => fetchUsers(search || undefined),
      search ? debounceMs : 300
    );

    return () => {
      mounted = false;
      if (debounce) clearTimeout(debounce);
    };
  }, [search, debounceMs, perPage]);

  return {
    users,
    loading,
    search,
    setSearch,
  };
}
