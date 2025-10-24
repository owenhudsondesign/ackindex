import useSWR from 'swr';
import { CivicEntry, Category } from '@/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch entries');
  }
  return res.json();
};

export function useFetchEntries(category?: Category) {
  const url = category ? `/api/entries?category=${category}` : '/api/entries';
  
  const { data, error, isLoading, mutate } = useSWR<CivicEntry[]>(url, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });

  return {
    entries: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useSearchEntries(searchQuery: string) {
  const { entries, isLoading, isError, refresh } = useFetchEntries();

  const filteredEntries = entries?.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.summary.toLowerCase().includes(query) ||
      entry.source.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query)
    );
  });

  return {
    entries: filteredEntries,
    isLoading,
    isError,
    refresh,
  };
}
