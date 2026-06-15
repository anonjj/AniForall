import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EpisodeGrid from '../components/EpisodeGrid';
import WatchlistButton from '../components/WatchlistButton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useSeries from '../hooks/useSeries';
import useProgress from '../hooks/useProgress';
import { 
  getWatchlist, 
  addToWatchlist, 
  updateWatchlistStatus, 
  removeFromWatchlist 
} from '../api/client';
import { CalendarIcon, TvIcon, StarIcon, PlayIcon } from '@heroicons/react/24/solid';

export default function SeriesPage() {
  const { session } = useParams();
  const navigate = useNavigate();

  const { 
    seriesInfo, 
    episodesData, 
    loading, 
    error, 
    page, 
    setPage, 
    sort, 
    setSort 
  } = useSeries(session);

  const { progressList, saveProgress } = useProgress(session);

  const [watchlistStatus, setWatchlistStatus] = useState(null);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  // Load watchlist item status on mount
  useEffect(() => {
    async function checkWatchlist() {
      try {
        const response = await getWatchlist();
        const item = response.data.find(w => w.session === session);
        setWatchlistStatus(item ? item.status : null);
      } catch (err) {
        console.error('Failed to fetch watchlist status:', err);
      } finally {
        setLoadingWatchlist(false);
      }
    }
    checkWatchlist();
  }, [session]);

  const handleStatusChange = async (newStatus) => {
    if (!seriesInfo) return;
    try {
      if (watchlistStatus) {
        await updateWatchlistStatus(session, newStatus);
      } else {
        await addToWatchlist({
          session,
          title: seriesInfo.title,
          poster: seriesInfo.poster,
          status: newStatus
        });
      }
      setWatchlistStatus(newStatus);
    } catch (err) {
      console.error('Failed to update watchlist:', err);
    }
  };

  const handleRemoveWatchlist = async () => {
    try {
      await removeFromWatchlist(session);
      setWatchlistStatus(null);
    } catch (err) {
      console.error('Failed to remove from watchlist:', err);
    }
  };

  // Logic to find next episode for "Continue Watching"
  const getContinueEpisode = () => {
    // 1. Look for latest incomplete episode in progressList
    const incomplete = progressList.filter(p => p.completed === 0);
    if (incomplete.length > 0) {
      incomplete.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
      const targetEp = incomplete[0];
      return { episode: targetEp.episode_num, session: targetEp.ep_session };
    }

    // 2. Look for the next episode after highest completed
    const completed = progressList.filter(p => p.completed === 1);
    if (completed.length > 0) {
      completed.sort((a, b) => b.episode_num - a.episode_num);
      const nextEpNum = completed[0].episode_num + 1;
      
      if (episodesData && episodesData.data) {
        const nextMatch = episodesData.data.find(r => r.episode === nextEpNum);
        if (nextMatch) return { episode: nextMatch.episode, session: nextMatch.session };
      }
      return null;
    }

    // Default to first episode on the list if loaded
    if (episodesData && episodesData.data && episodesData.data.length > 0) {
      const sortedReleases = [...episodesData.data].sort((a, b) => a.episode - b.episode);
      return { episode: sortedReleases[0].episode, session: sortedReleases[0].session };
    }

    return null;
  };

  const continueEpisode = getContinueEpisode();

  const handleContinueWatching = () => {
    if (!continueEpisode) return;
    navigate(`/watch/${session}/${continueEpisode.session}/${continueEpisode.episode}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-brandBg pb-12">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 mt-12">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brandBg pb-16">
      <Navbar />

      {/* Banner & Information */}
      <section className="relative w-full overflow-hidden border-b border-white/5 bg-brandSurface">
        {/* Banner Backdrop Blur */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none scale-105 select-none">
          <img
            src={seriesInfo?.poster}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover blur-[80px]"
          />
        </div>
        
        {/* Dark linear gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-brandBg via-brandBg/60 to-transparent z-1" />

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Container */}
          {loading ? (
            <div className="w-56 aspect-[3/4] rounded-2xl bg-brandSurfaceMuted animate-pulse shadow-2xl border border-white/5" />
          ) : (
            <div className="w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 self-center md:self-start">
              <img
                src={seriesInfo?.poster}
                alt={seriesInfo?.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Metadata content */}
          <div className="flex-1 space-y-6">
            {loading ? (
              <div className="space-y-4 w-full">
                <div className="h-8 bg-brandSurfaceMuted rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-brandSurfaceMuted rounded w-1/4 animate-pulse" />
                <div className="h-20 bg-brandSurfaceMuted rounded w-full animate-pulse" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                    {seriesInfo?.title}
                  </h1>
                  
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-400">
                    <span className="flex items-center gap-1.5 bg-brandPurple/10 text-brandPurple px-2.5 py-1 rounded-md border border-brandPurple/10">
                      <TvIcon className="w-4 h-4" />
                      {seriesInfo?.type}
                    </span>
                    <span className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-white/5">
                      <CalendarIcon className="w-4 h-4 text-zinc-500" />
                      {seriesInfo?.year}
                    </span>
                    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-md border border-amber-500/10">
                      <StarIcon className="w-4 h-4" />
                      {seriesInfo?.score || '0.00'}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="capitalize">{seriesInfo?.status}</span>
                  </div>
                </div>

                {/* Synopsis */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-500">Synopsis</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">
                    {seriesInfo?.description || 'No description available.'}
                  </p>
                </div>

                {/* Genre Badges */}
                {seriesInfo?.genres && seriesInfo.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seriesInfo.genres.map((genre) => (
                      <span 
                        key={genre} 
                        className="text-xs font-semibold text-zinc-400 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 hover:text-white transition-colors"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {continueEpisode && (
                    <button
                      onClick={handleContinueWatching}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-accent hover:opacity-95 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-brandPurple/20 active:scale-95"
                    >
                      <PlayIcon className="w-5 h-5" />
                      {progressList.some(p => p.episode_num === continueEpisode.episode && p.completed === 0) 
                        ? `Resume Episode ${continueEpisode.episode}`
                        : `Watch Episode ${continueEpisode.episode}`
                      }
                    </button>
                  )}

                  {!loadingWatchlist && (
                    <WatchlistButton 
                      currentStatus={watchlistStatus}
                      onStatusChange={handleStatusChange}
                      onRemove={handleRemoveWatchlist}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Episodes Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mt-12 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-tight">Episodes</h2>
          
          {/* Sorting control */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="bg-brandSurface border border-white/5 text-zinc-300 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none hover:border-white/10 transition-colors"
          >
            <option value="episode_asc">Oldest First</option>
            <option value="episode_desc">Newest First</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-video bg-brandSurfaceMuted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : episodesData && episodesData.data && episodesData.data.length > 0 ? (
          <EpisodeGrid 
            episodes={episodesData.data}
            progressList={progressList}
            currentPage={page}
            lastPage={episodesData.paginationInfo?.lastPage || 1}
            onPageChange={setPage}
            animeSession={session}
          />
        ) : (
          <EmptyState 
            message="No episodes found" 
            description="We couldn't retrieve any releases for this series." 
          />
        )}
      </section>
    </div>
  );
}
