import { useState, useEffect, useRef } from 'react';
import { searchAnime } from '../api/client';

export default function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const [retryTrigger, setRetryTrigger] = useState(0);

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchAnime(query, page);
        setResults(response.data);

        // Save to history if results found
        if (response.data?.data?.length > 0) {
          const history = JSON.parse(localStorage.getItem('search_history') || '[]');
          const filtered = [query, ...history.filter(h => h.toLowerCase() !== query.toLowerCase())].slice(0, 10);
          localStorage.setItem('search_history', JSON.stringify(filtered));
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to search anime');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, page, retryTrigger]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    page,
    setPage,
    retry: () => setRetryTrigger(prev => prev + 1)
  };
}
