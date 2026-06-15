import { Link } from 'react-router-dom';
import { CalendarIcon, TvIcon } from '@heroicons/react/24/outline';

export default function AnimeCard({ anime }) {
  const { session, title, poster, type, episodes, status, year } = anime;

  // Status indicator colors
  const statusColors = {
    Airing: 'bg-emerald-500 shadow-emerald-500/20',
    Completed: 'bg-blue-500 shadow-blue-500/20',
    default: 'bg-zinc-500 shadow-zinc-500/20'
  };

  const statusColor = statusColors[status] || statusColors.default;

  return (
    <Link 
      to={`/series/${session}`}
      className="group relative flex flex-col bg-brandSurface border border-white/5 rounded-2xl overflow-hidden hover:border-brandPurple/30 hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-brandPurple/5 animate-fadeIn"
    >
      {/* Poster Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-brandSurfaceMuted">
        <img
          src={poster || 'https://placehold.co/300x400/15161e/ffffff?text=No+Poster'}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Floating Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {episodes && (
            <span className="px-2.5 py-1 text-xs font-bold bg-black/70 text-zinc-100 rounded-lg backdrop-blur-md border border-white/10">
              {episodes} {episodes === 1 ? 'EP' : 'EPS'}
            </span>
          )}
          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-black/70 text-zinc-100 rounded-lg backdrop-blur-md border border-white/10`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse`} />
            {status}
          </span>
        </div>
      </div>

      {/* Info Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="font-semibold text-white group-hover:text-brandPurple transition-colors line-clamp-2 text-sm leading-snug">
          {title}
        </h3>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          {type && (
            <span className="flex items-center gap-1">
              <TvIcon className="w-3.5 h-3.5" />
              {type}
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {year}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
