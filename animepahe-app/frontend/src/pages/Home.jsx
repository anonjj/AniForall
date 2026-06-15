import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import AnimeCard from '../components/AnimeCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useSearch from '../hooks/useSearch';
import { getWatchlist } from '../api/client';
import { BookmarkIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const { query, setQuery, results, loading, error, retry } = useSearch();
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  // Load watchlist on mount
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const response = await getWatchlist();
        setWatchlist(response.data);
      } catch (err) {
        console.error('Failed to load watchlist:', err);
      } finally {
        setLoadingWatchlist(false);
      }
    }
    loadWatchlist();
  }, []);

  return (
    <div className="min-h-screen bg-brandBg pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-12 mt-12 space-y-12">
        {/* Hero Banner Section */}
        <section className="text-center space-y-4 max-w-2xl mx-auto pt-4 pb-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Your Anime, Your <span className="text-gradient">Way</span>
          </h1>
          <p className="text-zinc-400 text-base">
            Search, stream, track, and curate your personalized anime collection without any clutter.
          </p>
        </section>

        {/* Search Bar */}
        <section>
          <SearchBar query={query} setQuery={setQuery} loading={loading} />
        </section>

        {/* Search Results / Watchlist Shelf */}
        {!query.trim() ? (
          /* Watchlist Shelf */
          <section className="space-y-6 pt-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <BookmarkIcon className="w-5 h-5 text-brandPurple" />
              <h2 className="text-xl font-bold text-white tracking-tight">Your Watchlist</h2>
            </div>

            {loadingWatchlist ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {watchlist.map((anime) => (
                  // Map database watchlist object to Card schema
                  <AnimeCard 
                    key={anime.session} 
                    anime={{
                      session: anime.session,
                      title: anime.title,
                      poster: anime.poster,
                      status: anime.status.replace(/_/g, ' '),
                      episodes: null,
                      type: null,
                      year: null
                    }} 
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                message="Your watchlist is empty" 
                description="Search for anime above and add them to your watchlist to start tracking progress."
                icon={BookmarkIcon}
              />
            )}
          </section>
        ) : (
          /* Search Results */
          <section className="space-y-6">
            <div className="pb-2 border-b border-white/5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Search Results for <span className="text-gradient font-black">"{query}"</span>
              </h2>
            </div>

            {error ? (
              <ErrorState message={error} onRetry={retry} />
            ) : loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : results && results.data && results.data.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {results.data.map((anime) => (
                  <AnimeCard key={anime.session} anime={anime} />
                ))}
              </div>
            ) : (
              <EmptyState 
                message="No results found" 
                description="Try checking for spelling errors or search using a different keyword." 
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
