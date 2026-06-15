import { useState, useEffect } from 'react';
import { getSeries, getEpisodes } from '../api/client';

export default function useSeries(session) {
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [episodesData, setEpisodesData] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('episode_asc');

  // Fetch series details once
  useEffect(() => {
    if (!session) return;

    async function fetchInfo() {
      setLoadingInfo(true);
      setError(null);
      try {
        const response = await getSeries(session);
        setSeriesInfo(response.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to fetch series info');
      } finally {
        setLoadingInfo(false);
      }
    }

    fetchInfo();
    // Reset page and data when session changes
    setPage(1);
    setEpisodesData(null);
  }, [session]);

  // Fetch episodes whenever page or sort changes
  useEffect(() => {
    if (!session) return;

    async function fetchEpisodes() {
      setLoadingEpisodes(true);
      try {
        const response = await getEpisodes(session, sort, page);
        setEpisodesData(response.data);
      } catch (err) {
        // Only set error if info request didn't already error
        setError(prev => prev || err.response?.data?.error || err.message || 'Failed to fetch episodes');
      } finally {
        setLoadingEpisodes(false);
      }
    }

    fetchEpisodes();
  }, [session, sort, page]);

  return {
    seriesInfo,
    episodesData,
    loading: loadingInfo || loadingEpisodes,
    loadingInfo,
    loadingEpisodes,
    error,
    page,
    setPage,
    sort,
    setSort
  };
}
