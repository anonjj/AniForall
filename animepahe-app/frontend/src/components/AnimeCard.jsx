import { Link } from 'react-router-dom';

function proxyImg(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function AnimeCard({ anime }) {
  const { session, title, poster, image, snapshot, type, episodes, status } = anime;
  const displayPoster = proxyImg(poster || image || snapshot);

  let episodeLabel = null;
  if (episodes) {
    episodeLabel = `${episodes} eps`;
  } else if (status) {
    const match = status.match(/Episode\s+(\d+)/i);
    if (match) episodeLabel = `EP ${match[1]}`;
  }

  return (
    <Link to={`/series/${session}`} className="group relative flex flex-col w-full animate-fadeIn">
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-brandSurfaceMuted shadow-md group-hover:shadow-xl group-hover:shadow-black/50 transition-all duration-300">
        <img
          src={displayPoster || 'https://placehold.co/300x450/15161e/ffffff?text=?'}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
        />

        {/* Bottom gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Type badge — top-left, only for real type values */}
        {type && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-extrabold bg-red-600 text-white rounded-[3px] leading-none tracking-wider uppercase shadow">
            {type.toUpperCase()}
          </span>
        )}

        {/* Episode label — bottom center */}
        {episodeLabel && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-black/80 text-zinc-100 rounded backdrop-blur-[2px] border border-white/10">
            <svg className="w-2.5 h-2.5 fill-zinc-400 shrink-0" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {episodeLabel}
          </div>
        )}
      </div>

      {/* Title below poster */}
      <div className="mt-2">
        <h3 className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors leading-snug line-clamp-2">
          {title}
        </h3>
      </div>
    </Link>
  );
}
