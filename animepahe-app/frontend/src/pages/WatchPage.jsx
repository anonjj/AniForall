import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import ErrorState from '../components/ErrorState';
import { getStream, getEpisodes, getProgress, updateProgress, getSeries } from '../api/client';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ForwardIcon } from '@heroicons/react/24/outline';

export default function WatchPage() {
  const { animeSession, epSession, episodeNum } = useParams();
  const currentEpNum = Number(episodeNum);
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [streamSources, setStreamSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [loadingStream, setLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState(null);

  const [seriesInfo, setSeriesInfo] = useState(null);
  const [startPosition, setStartPosition] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const [adjacentEpisodes, setAdjacentEpisodes] = useState({ prev: null, next: null });
  const [episodesList, setEpisodesList] = useState([]);

  // Auto-save tracking ref to avoid writing progress too frequently
  const lastSavedTimeRef = useRef(0);

  // 1. Fetch direct stream URLs
  useEffect(() => {
    async function fetchStream() {
      setLoadingStream(true);
      setStreamError(null);
      try {
        const response = await getStream(animeSession, epSession);
        const rawSources = response.data.sources || [];
        const sources = rawSources.map(s => ({
          ...s,
          url: s.url ? `/api/stream/proxy?url=${encodeURIComponent(s.url)}` : ''
        })).filter(s => s.url);
        
        setStreamSources(sources);
        if (sources.length > 0) {
          // Select 720 or 1080 first, otherwise the first available
          const preferred = sources.find(s => s.resolution === '720') || 
                            sources.find(s => s.resolution === '1080') || 
                            sources[0];
          setSelectedSource(preferred);
        } else {
          setStreamError('No direct streaming sources returned. This episode might be currently unavailable.');
        }
      } catch (err) {
        setStreamError(err.response?.data?.error || err.message || 'Failed to fetch streaming links');
      } finally {
        setLoadingStream(false);
      }
    }

    fetchStream();
    // Reset state on episode change
    setStreamSources([]);
    setSelectedSource(null);
    lastSavedTimeRef.current = 0;
  }, [animeSession, epSession]);

  // 2. Fetch watch progress and series info to resume
  useEffect(() => {
    async function loadInitialData() {
      setLoadingProgress(true);
      try {
        // Fetch series info for title/poster
        const seriesRes = await getSeries(animeSession);
        setSeriesInfo(seriesRes.data);

        // Fetch progress
        const response = await getProgress(animeSession);
        const match = response.data.find(p => p.episode_num === currentEpNum);
        if (match && match.completed === 0 && match.position_sec > 5) {
          setStartPosition(match.position_sec);
        } else {
          setStartPosition(0);
        }
      } catch (err) {
        console.error('Failed to load initial watch data:', err);
        setStartPosition(0);
      } finally {
        setLoadingProgress(false);
      }
    }

    loadInitialData();
  }, [animeSession, currentEpNum]);

  // 3. Fetch episodes list to identify adjacent prev/next navigation
  useEffect(() => {
    async function loadAdjacent() {
      try {
        let currentPageNum = 1;
        let found = false;
        let releases = [];
        
        // Fetch page 1 first to check
        const response = await getEpisodes(animeSession, 'episode_asc', 1);
        const data = response.data;
        releases = data.data || [];
        
        found = releases.some(r => r.episode === currentEpNum || r.session === epSession);
        
        // If not found, and there are multiple pages, guess and load the target page
        if (!found && data.paginationInfo && data.paginationInfo.lastPage > 1) {
          const totalPages = data.paginationInfo.lastPage;
          
          if (releases.length > 0) {
            const firstEp = releases[0].episode;
            const lastEp = releases[releases.length - 1].episode;
            const avgPerPage = releases.length;
            
            let guessedPage = Math.max(1, Math.min(totalPages, Math.ceil((currentEpNum - firstEp + 1) / avgPerPage)));
            if (guessedPage === 1) guessedPage = 2; // already checked page 1
            
            const guessResponse = await getEpisodes(animeSession, 'episode_asc', guessedPage);
            releases = guessResponse.data.data || [];
            found = releases.some(r => r.episode === currentEpNum || r.session === epSession);
            currentPageNum = guessedPage;
            
            if (!found) {
              // Fallback to page 1
              releases = data.data || [];
              currentPageNum = 1;
            }
          }
        }
        
        // Handle boundaries: fetch previous page if at the beginning of the loaded page
        const sorted = [...releases].sort((a, b) => a.episode - b.episode);
        const currentIndex = sorted.findIndex(e => e.episode === currentEpNum || e.session === epSession);

        if (currentIndex === 0 && currentPageNum > 1) {
          try {
            const prevPageResponse = await getEpisodes(animeSession, 'episode_asc', currentPageNum - 1);
            releases = [...(prevPageResponse.data.data || []), ...releases];
          } catch (e) {
            console.error(e);
          }
        }
        // Handle boundaries: fetch next page if at the end of the loaded page
        if (currentIndex === sorted.length - 1 && data.paginationInfo && currentPageNum < data.paginationInfo.lastPage) {
          try {
            const nextPageResponse = await getEpisodes(animeSession, 'episode_asc', currentPageNum + 1);
            releases = [...releases, ...(nextPageResponse.data.data || [])];
          } catch (e) {
            console.error(e);
          }
        }

        setEpisodesList(releases);
      } catch (err) {
        console.error('Failed to load adjacent episodes:', err);
      }
    }
    loadAdjacent();
  }, [animeSession, currentEpNum, epSession]);

  // Find adjacent episodes from current episodes list
  useEffect(() => {
    if (episodesList.length === 0) return;
    
    // Sort ascending
    const sorted = [...episodesList].sort((a, b) => a.episode - b.episode);
    const currentIndex = sorted.findIndex(e => e.episode === currentEpNum);

    setAdjacentEpisodes({
      prev: currentIndex > 0 ? sorted[currentIndex - 1] : null,
      next: currentIndex > -1 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null
    });
  }, [episodesList, currentEpNum]);

  // Handle saving progress
  const saveWatchProgress = useCallback(async (currentTime, duration, isFinished = false) => {
    try {
      const position = Math.floor(currentTime);
      const isCompleted = isFinished || (duration > 0 && currentTime / duration > 0.85);

      await updateProgress({
        series_session: animeSession,
        episode_num: currentEpNum,
        ep_session: epSession,
        anime_session: epSession, // Store episode session in anime_session per Issue #4
        title: seriesInfo?.title,
        poster: seriesInfo?.poster,
        position_sec: position,
        completed: isCompleted ? 1 : 0
      });
      
      lastSavedTimeRef.current = position;
    } catch (err) {
      console.error('Failed to auto-save watch progress:', err);
    }
  }, [animeSession, epSession, currentEpNum, seriesInfo]);

  // Time update progress callback (throttled to every 10 seconds)
  const handleTimeUpdate = (currentTime, duration) => {
    const position = Math.floor(currentTime);
    if (position > 0 && position % 10 === 0 && position !== lastSavedTimeRef.current) {
      saveWatchProgress(currentTime, duration, false);
    }
  };

  // Skip Intro Handler (85 seconds)
  const handleSkipIntro = () => {
    if (playerRef.current) {
      const video = playerRef.current.getVideoElement?.() || playerRef.current;
      const current = playerRef.current.getCurrentTime();
      const newTime = current + 85;
      if (video) video.currentTime = newTime;
    }
  };

  // Ended callback
  const handlePlayerEnded = () => {
    const duration = playerRef.current?.getDuration() || 0;
    saveWatchProgress(duration, duration, true); // Save exact end position
    
    // Auto play next episode if available
    if (adjacentEpisodes.next) {
      setTimeout(() => {
        navigate(`/watch/${animeSession}/${adjacentEpisodes.next.session}/${adjacentEpisodes.next.episode}`);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white pb-16">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to={`/series/${animeSession}`}
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white font-semibold text-sm transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Series Details
          </Link>

          {/* Episode Info Banner */}
          <div className="text-right">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Currently Watching</span>
            <span className="text-sm font-bold text-white block">Episode {currentEpNum}</span>
          </div>
        </div>

        {/* Video Player Display */}
        {streamError ? (
          <div className="aspect-video glass-panel rounded-2xl flex items-center justify-center p-6 text-center">
            <ErrorState 
              message={streamError} 
              onRetry={() => window.location.reload()} 
              directLink={`https://animepahe.pw/play/${animeSession}/${epSession}`}
            />
          </div>
        ) : loadingStream || loadingProgress ? (
          <div className="aspect-video bg-black/80 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 border-4 border-brandPurple border-t-transparent rounded-full animate-spin shadow-lg shadow-brandPurple/20" />
            <span className="text-sm font-bold text-zinc-400 animate-pulseSlow">Resolving secure video stream...</span>
          </div>
        ) : selectedSource ? (
          <div className="space-y-4">
            <VideoPlayer
              ref={playerRef}
              streamUrl={selectedSource.url}
              startAt={startPosition}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handlePlayerEnded}
            />

            {/* Video Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 glass-panel rounded-2xl border border-white/5 shadow-xl">
              {/* Quality & Skip Buttons */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Quality:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {streamSources.map((source) => (
                      <button
                        key={source.resolution}
                        onClick={() => {
                          // Save current progress before switching stream quality
                          const currentTime = playerRef.current?.getCurrentTime() || 0;
                          const duration = playerRef.current?.getDuration() || 0;
                          setStartPosition(Math.floor(currentTime));
                          saveWatchProgress(currentTime, duration, false);
                          setSelectedSource(source);
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                          selectedSource.resolution === source.resolution
                            ? 'bg-brandPurple/15 text-brandPurple border-brandPurple/30 shadow'
                            : 'bg-white/5 text-zinc-400 border-transparent hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {source.resolution}p
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-6 w-px bg-white/10 mx-1" />

                <button
                  onClick={handleSkipIntro}
                  className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white transition-all group"
                >
                  <ForwardIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Skip Intro (85s)
                </button>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  disabled={!adjacentEpisodes.prev}
                  onClick={() => {
                    const currentTime = playerRef.current?.getCurrentTime() || 0;
                    const duration = playerRef.current?.getDuration() || 0;
                    saveWatchProgress(currentTime, duration, false);
                    navigate(`/watch/${animeSession}/${adjacentEpisodes.prev.session}/${adjacentEpisodes.prev.episode}`);
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-20 disabled:pointer-events-none"
                  aria-label="Previous Episode"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>

                <span className="text-xs font-semibold text-zinc-400 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                  Episode {currentEpNum}
                </span>

                <button
                  disabled={!adjacentEpisodes.next}
                  onClick={() => {
                    const currentTime = playerRef.current?.getCurrentTime() || 0;
                    const duration = playerRef.current?.getDuration() || 0;
                    saveWatchProgress(currentTime, duration, false);
                    navigate(`/watch/${animeSession}/${adjacentEpisodes.next.session}/${adjacentEpisodes.next.episode}`);
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all disabled:opacity-20 disabled:pointer-events-none"
                  aria-label="Next Episode"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video glass-panel rounded-2xl flex items-center justify-center p-6 text-center">
            <ErrorState message="No streaming source was found." onRetry={() => window.location.reload()} />
          </div>
        )}
      </main>
    </div>
  );
}
