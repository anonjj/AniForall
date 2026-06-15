import { Link } from 'react-router-dom';
import { PlayIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

export default function EpisodeGrid({ 
  episodes, 
  progressList = [], 
  currentPage, 
  lastPage, 
  onPageChange,
  animeSession 
}) {

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseDuration = (dur) => {
    if (!dur) return 0;
    if (typeof dur === 'number') return dur;
    if (typeof dur === 'string') {
      const parts = dur.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return Number(dur) || 0;
    }
    return 0;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Episodes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {episodes.map((ep) => {
          // Find progress record for this episode
          const progress = progressList.find(p => p.episode_num === ep.episode);
          const isCompleted = progress?.completed === 1;
          const hasProgress = progress && progress.position_sec > 0 && !isCompleted;
          
          const totalDuration = parseDuration(ep.duration);
          const progressPercent = (hasProgress && totalDuration > 0)
            ? Math.min((progress.position_sec / totalDuration) * 100, 100) 
            : 0;

          return (
            <Link
              key={ep.id}
              to={`/watch/${animeSession}/${ep.session}/${ep.episode}`}
              className="group relative flex flex-col bg-brandSurface border border-white/5 hover:border-brandPurple/30 rounded-xl overflow-hidden shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              {/* Snapshot Thumbnail */}
              <div className="relative aspect-video w-full bg-brandSurfaceMuted overflow-hidden">
                <img
                  src={ep.snapshot || 'https://placehold.co/300x169/1f202c/ffffff?text=No+Image'}
                  alt={`Episode ${ep.episode}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Dark Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-brandPurple text-white flex items-center justify-center shadow-lg shadow-brandPurple/30 scale-90 group-hover:scale-100 transition-transform">
                    <PlayIcon className="w-5 h-5 ml-0.5" />
                  </div>
                </div>

                {/* Watched / Progress Badges */}
                {isCompleted && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm shadow border border-emerald-400/20">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    WATCHED
                  </div>
                )}
                {hasProgress && (
                  <div className="absolute bottom-2 left-2 bg-brandPurple/95 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow border border-brandPurple/20">
                    RESUME @ {formatTime(progress.position_sec)}
                  </div>
                )}

                {/* Bottom Progress Bar Indicator */}
                {hasProgress && progressPercent > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
                    <div 
                      className="h-full bg-brandPurple animate-pulse" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                )}
                {isCompleted && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-emerald-500" />
                )}
              </div>

              {/* Text info */}
              <div className="p-3">
                <div className="font-bold text-white text-sm group-hover:text-brandPurple transition-colors">
                  Episode {ep.episode}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            Prev
          </button>
          
          <span className="text-sm font-semibold text-zinc-400">
            Page <span className="text-white">{currentPage}</span> of <span className="text-zinc-500">{lastPage}</span>
          </span>

          <button
            disabled={currentPage === lastPage}
            onClick={() => onPageChange(currentPage + 1)}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
