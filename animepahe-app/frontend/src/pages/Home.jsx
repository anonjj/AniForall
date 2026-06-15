import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import AnimeCard from '../components/AnimeCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useSearch from '../hooks/useSearch';
import { getWatchlist, getProgressSummary, getAiring } from '../api/client';
import { BookmarkIcon, PlayCircleIcon, FireIcon, HistoryIcon, XMarkIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const { query, setQuery, results, loading, error, retry } = useSearch();
  
  const [watchlist, setWatchlist] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [airingAnime, setAiringAnime] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  
  const [loadingShelves, setLoadingShelves] = useState(true);

  // Load all shelves data on mount
  useEffect(() => {
    async function loadData() {
      setLoadingShelves(true);
      try {
        const [wlRes, progRes, airRes] = await Promise.all([
          getWatchlist(),
          getProgressSummary(),
          getAiring(1)
        ]);
        
        setWatchlist(wlRes.data);
        setContinueWatching(progRes.data);
        setAiringAnime(airRes.data.data || []);
        
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
    const newHistory = searchHistory.filter(h => h !== item);
    localStorage.setItem('search_history', JSON.stringify(newHistory));
    setSearchHistory(newHistory);
  };

  const clearHistory = () => {
    localStorage.removeItem('search_history');
    setSearchHistory([]);
  };

  return (
    <div className="min-h-screen bg-brandBg pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-2xl mx-auto pt-4 pb-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Your Anime, Your <span className="text-gradient">Way</span>
          </h1>
          <p className="text-zinc-400 text-base">
            Search, stream, and track your collection without any clutter.
          </p>
        </section>

        {/* Search Bar & History */}
        <section className="space-y-4">
          <SearchBar query={query} setQuery={setQuery} loading={loading} />
          
          {!query && searchHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-zinc-500 mr-2">
                <HistoryIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Recent:</span>
              </div>
              {searchHistory.map((item) => (
                <div key={item} className="group flex items-center bg-white/5 border border-white/5 rounded-full pl-3 pr-1 py-1 hover:border-brandPurple/30 transition-all">
                  <button 
                    onClick={() => setQuery(item)}
                    className="text-xs font-medium text-zinc-300 hover:text-white mr-2"
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
              <button 
                onClick={clearHistory}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </section>

        {!query.trim() ? (
          /* Feature Shelves */
          <div className="space-y-16 pt-4">
            
            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <section className="space-y-6 animate-slideInLeft">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <PlayCircleIcon className="w-5 h-5 text-brandPurple" />
                  <h2 className="text-xl font-bold text-white tracking-tight">Continue Watching</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {continueWatching.map((item) => (
                    <AnimeCard 
                      key={item.series_session} 
                      anime={{
                        session: item.series_session,
                        title: item.title,
                        poster: item.poster,
                        status: `Episode ${item.episode_num}`,
                        episodes: null, type: null, year: null
                      }} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Currently Airing */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <FireIcon className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-white tracking-tight">Latest Releases</h2>
              </div>
              {loadingShelves ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {airingAnime.map((anime) => (
                    <AnimeCard 
                      key={anime.anime_session} 
                      anime={{
                        session: anime.anime_session,
                        title: anime.anime_title,
                        poster: anime.snapshot, // airing api uses snapshot as poster sometimes
                        status: `Episode ${anime.episode}`,
                        episodes: null, type: null, year: null
                      }} 
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Watchlist */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <BookmarkIcon className="w-5 h-5 text-brandPurple" />
                <h2 className="text-xl font-bold text-white tracking-tight">Your Watchlist</h2>
              </div>

              {loadingShelves ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : watchlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {watchlist.map((anime) => (
                    <AnimeCard 
                      key={anime.session} 
                      anime={{
                        session: anime.session,
                        title: anime.title,
                        poster: anime.poster,
                        status: anime.status.replace(/_/g, ' '),
                        episodes: null, type: null, year: null
                      }} 
                    />
                  ))}
                </div>
              ) : (
                <EmptyState 
                  message="Your watchlist is empty" 
                  description="Search for anime above and add them to your watchlist."
                  icon={BookmarkIcon}
                />
              )}
            </section>
          </div>
        ) : (
          /* Search Results */
          <section className="space-y-6 min-h-[50vh]">
            <div className="pb-2 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Search Results for <span className="text-gradient font-black">"{query}"</span>
              </h2>
              <button onClick={() => setQuery('')} className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest">Clear</button>
            </div>

            {error ? (
              <ErrorState message={error} onRetry={retry} />
            ) : loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : results && results.data && results.data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {results.data.map((anime) => <AnimeCard key={anime.session} anime={anime} />)}
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
