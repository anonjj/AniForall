import { useState, useEffect, useCallback } from 'react';
import { getProgress, updateProgress } from '../api/client';

export default function useProgress(seriesSession) {
  const [progressList, setProgressList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!seriesSession) return;
    setLoading(true);
    try {
      const response = await getProgress(seriesSession);
      setProgressList(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  }, [seriesSession]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const saveProgress = useCallback(async (data) => {
    try {
      await updateProgress(data);
      
      // Update local state to avoid refetching
      setProgressList(prev => {
        const index = prev.findIndex(item => 
          item.series_session === data.series_session && 
          item.episode_num === Number(data.episode_num)
        );

        const newRecord = {
          series_session: data.series_session,
          episode_num: Number(data.episode_num),
          ep_session: data.ep_session,
          anime_session: data.anime_session,
          position_sec: data.position_sec,
          completed: data.completed,
          watched_at: new Date().toISOString()
        };

        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...newRecord };
          return updated;
        } else {
          return [...prev, newRecord];
        }
      });
    } catch (err) {
      console.error('Failed to save watch progress:', err);
    }
  }, []);

  return {
    progressList,
    loading,
    error,
    saveProgress,
    refetchProgress: fetchProgress
  };
}
