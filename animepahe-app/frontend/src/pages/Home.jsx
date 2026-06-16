import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import AnimeCard from '../components/AnimeCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useSearch from '../hooks/useSearch';
import { getWatchlist, getProgressSummary, getAiring } from '../api/client';
import { BookmarkIcon, PlayCircleIcon, FireIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/solid';

function proxyImg(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function ShelfSection({ title, icon: Icon, iconColor, children, empty }) {
  return (
    <section className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/5">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { query, setQuery, results, loading, error, retry } = useSearch();

  const [watchlist, setWatchlist] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(true);
  const [shelfError, setShelfError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoadingShelves(true);
      setShelfError(null);
      try {
        const [wlRes, progRes, airRes] = await Promise.allSettled([
          getWatchlist(),
          getProgressSummary(),
          getAiring(1),
        ]);

        if (wlRes.status === 'fulfilled') setWatchlist(wlRes.value.data);
        if (progRes.status === 'fulfilled') setContinueWatching(progRes.value.data);
        if (airRes.status === 'fulfilled') {
          setAiringAnime(airRes.value.data.data || []);
        } else {
          setShelfError(airRes.reason?.response?.data?.error || airRes.reason?.message || 'Failed to load latest releases');
        }

        const history = JSON.parse(localStorage.getItem('search_history') || '[]');
        setSearchHistory(history);
      } catch (err) {
        console.error('Failed to load home shelves:', err);
      } finally {
        setLoadingShelves(false);
      }
    }
    loadData();
  }, []);

  const removeHistoryItem = (item) => {
    const next = searchHistory.filter(h => h !== item);
    localStorage.setItem('search_history', JSON.stringify(next));
    setSearchHistory(next);
  };

  const clearHistory = () => {
    localStorage.removeItem('search_history');
    setSearchHistory([]);
  };

  // Build hero background from first few airing items
  const heroBg = airingAnime.slice(0, 5);

  return (
    <div className="min-h-screen bg-brandBg pb-16">
      <Navbar />

      {/* ── Hero Banner ── */}
      <section className="relative w-full h-[280px] md:h-[360px] overflow-hidden">
        {/* Background collage */}
        {heroBg.length > 0 ? (
          <div className="absolute inset-0 flex">
            {heroBg.map((anime, i) => (
              <img
                key={i}
                src={proxyImg(anime.image)}
                alt=""
                className="flex-1 h-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brandSurface to-brandBg" />
        )}

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-brandBg/10 via-transparent to-brandBg" />

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-5">
          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
              Your Anime, Your <span className="text-gradient">Way</span>
            </h1>
            <p className="text-zinc-300 text-sm mt-2 drop-shadow">
              Search, stream, and track your collection.
            </p>
          </div>

          <div className="w-full max-w-2xl">
            <SearchBar query={query} setQuery={setQuery} loading={loading} />
          </div>

          {/* Search history pills */}
          {!query && searchHistory.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Recent:</span>
              </div>
              {searchHistory.slice(0, 6).map((item) => (
                <div key={item} className="flex items-center bg-black/40 border border-white/10 rounded-full pl-3 pr-1 py-1 backdrop-blur-sm hover:border-brandPurple/40 transition-all">
                  <button
                    onClick={() => setQuery(item)}
                    className="text-xs font-medium text-zinc-200 hover:text-white mr-1.5"
                  >
                    {item}
                  </button>
                  <button
                    onClick={() => removeHistoryItem(item)}
                    className="p-0.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {searchHistory.length > 1 && (
                <button
                  onClick={clearHistory}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-10 space-y-12">
        {!query.trim() ? (
          <div className="space-y-12">

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <ShelfSection title="Continue Watching" icon={PlayCircleIcon} iconColor="text-brandPurple">
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
                  {continueWatching.map((item) => (
                    <div key={item.series_session} className="shrink-0 w-36 md:w-40">
                      <AnimeCard
                        anime={{
                          session: item.series_session,
                          title: item.title,
                          poster: item.poster,
                          status: `Episode ${item.episode_num}`,
                          episodes: null,
                          type: null,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </ShelfSection>
            )}

            {/* Latest Releases */}
            <ShelfSection title="Latest Releases" icon={FireIcon} iconColor="text-orange-500">
              {shelfError ? (
                <ErrorState message={shelfError} onRetry={() => window.location.reload()} />
              ) : loadingShelves ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="shrink-0 w-36 md:w-40">
                      <SkeletonCard />
                    </div>
                  ))}
                </div>
              ) : airingAnime.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
                  {airingAnime.map((anime) => (
                    <div key={anime.session} className="shrink-0 w-36 md:w-40">
                      <AnimeCard
                        anime={{
                          session: anime.session,
                          title: anime.title,
                          poster: anime.image,
                          status: `Episode ${anime.episode}`,
                          episodes: null,
                          type: null,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No releases found" description="Could not load latest episode data." />
              )}
            </ShelfSection>

            {/* Watchlist */}
            <ShelfSection title="Your Watchlist" icon={BookmarkIcon} iconColor="text-brandPurple">
              {loadingShelves ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="shrink-0 w-36 md:w-40">
                      <SkeletonCard />
                    </div>
                  ))}
                </div>
              ) : watchlist.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 md:-mx-12 md:px-12 scrollbar-hide">
                  {watchlist.map((anime) => (
                    <div key={anime.session} className="shrink-0 w-36 md:w-40">
                      <AnimeCard
                        anime={{
                          session: anime.session,
                          title: anime.title,
                          poster: anime.poster,
                          status: anime.status.replace(/_/g, ' '),
                          episodes: null,
                          type: null,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  message="Your watchlist is empty"
                  description="Search for anime above and add them to your watchlist."
                  icon={BookmarkIcon}
                />
              )}
            </ShelfSection>
          </div>
        ) : (
          /* Search Results */
          <section className="space-y-6 min-h-[50vh]">
            <div className="pb-2.5 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Results for{' '}
                <span className="text-gradient font-black">"{query}"</span>
              </h2>
              <button
                onClick={() => setQuery('')}
                className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>

            {error ? (
              <ErrorState message={error} onRetry={retry} />
            ) : loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {[...Array(14)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : results?.data?.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {results.data.map((anime) => (
                  <AnimeCard key={anime.session} anime={anime} />
                ))}
              </div>
            ) : (
              <EmptyState message="No results found" description="Try a different keyword." />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
