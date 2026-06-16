import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import AnimeCard from '../components/AnimeCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import HeroCarousel from '../components/HeroCarousel';
import SectionRail from '../components/SectionRail';
import AmbientBackground from '../components/AmbientBackground';
import useSearch from '../hooks/useSearch';
import useAmbientColor from '../hooks/useAmbientColor';
import { getWatchlist, getProgressSummary, getAiring } from '../api/client';
import { BookmarkIcon, PlayCircleIcon, FireIcon, ClockIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid';

function proxyImg(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function Home() {
  const { query, setQuery, results, loading, error, retry } = useSearch();

  const [watchlist, setWatchlist] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loadingShelves, setLoadingShelves] = useState(true);
  const [shelfError, setShelfError] = useState(null);
  const [activeHeroImage, setActiveHeroImage] = useState(null);

  // Ambient bloom driven by the active hero image (same-origin via proxy = canvas-safe)
  const ambientColor = useAmbientColor(activeHeroImage);

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

  const handleSurpriseMe = useCallback(() => {
    if (!airingAnime.length) return;
    const pick = airingAnime[Math.floor(Math.random() * airingAnime.length)];
    window.location.href = `/series/${pick.session}`;
  }, [airingAnime]);

  const cardWidth = 'shrink-0 w-36 md:w-40';

  return (
    <div className="min-h-screen bg-brandBg pb-16 bg-noise">
      {/* Ambient bloom — fixed full-page color tint driven by active hero */}
      <AmbientBackground color={ambientColor} />

      <Navbar />

      {/* ── Hero Carousel ── */}
      {!query.trim() && (
        <>
          {airingAnime.length > 0 ? (
            <HeroCarousel
              anime={airingAnime.slice(0, 5)}
              onActiveImageChange={setActiveHeroImage}
            />
          ) : (
            <div className="w-full h-[380px] md:h-[500px] bg-gradient-to-br from-brandSurface to-brandBg flex flex-col items-center justify-center gap-5 px-6">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg text-center">
                Your Anime, Your <span className="text-gradient">Way</span>
              </h1>
              <p className="text-zinc-300 text-sm drop-shadow text-center">
                Search, stream, and track your collection.
              </p>
              <div className="w-full max-w-2xl">
                <SearchBar query={query} setQuery={setQuery} loading={loading} />
              </div>
            </div>
          )}

          {/* Search bar below hero */}
          {airingAnime.length > 0 && (
            <div className="max-w-2xl mx-auto px-6 -mt-6 relative z-10">
              <SearchBar query={query} setQuery={setQuery} loading={loading} />
            </div>
          )}

          {/* Search history pills */}
          {!query && searchHistory.length > 0 && (
            <div className="max-w-2xl mx-auto px-6 mt-3 flex flex-wrap items-center justify-center gap-2 animate-fadeIn">
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
        </>
      )}

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-10 space-y-12">
        {!query.trim() ? (
          <div className="space-y-12">

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <SectionRail title="Continue Watching" icon={PlayCircleIcon} iconColor="text-brandPurple">
                {continueWatching.map((item) => (
                  <div key={item.series_session} className={cardWidth}>
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
              </SectionRail>
            )}

            {/* Latest Releases */}
            <SectionRail
              title="Latest Releases"
              icon={FireIcon}
              iconColor="text-orange-500"
              action={
                airingAnime.length > 0 ? (
                  <button
                    onClick={handleSurpriseMe}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/8 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brandPurple outline-none"
                    title="Go to a random airing anime"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Surprise Me
                  </button>
                ) : null
              }
              empty={
                shelfError ? (
                  <ErrorState message={shelfError} onRetry={() => window.location.reload()} />
                ) : airingAnime.length === 0 && !loadingShelves ? (
                  <EmptyState message="No releases found" description="Could not load latest episode data." />
                ) : null
              }
            >
              {loadingShelves
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className={cardWidth}><SkeletonCard /></div>
                  ))
                : airingAnime.map((anime) => (
                    <div key={anime.session} className={cardWidth}>
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
            </SectionRail>

            {/* Your Watchlist */}
            <SectionRail
              title="Your Watchlist"
              icon={BookmarkIcon}
              iconColor="text-brandPurple"
              empty={
                !loadingShelves && watchlist.length === 0 ? (
                  <EmptyState
                    message="Your watchlist is empty"
                    description="Search for anime above and add them to your watchlist."
                    icon={BookmarkIcon}
                  />
                ) : null
              }
            >
              {loadingShelves
                ? [...Array(6)].map((_, i) => (
                    <div key={i} className={cardWidth}><SkeletonCard /></div>
                  ))
                : watchlist.map((anime) => (
                    <div key={anime.session} className={cardWidth}>
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
            </SectionRail>
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
