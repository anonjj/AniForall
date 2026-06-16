import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import useAnimeMetadata from '../hooks/useAnimeMetadata';
import useReducedMotion from '../hooks/useReducedMotion';

function proxyImg(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function AnimeCard({ anime, rank, onRemove }) {
  const { session, title, poster, image, snapshot, type, episodes, status } = anime;
  const displayPoster = proxyImg(poster || image || snapshot);
  const [hovered, setHovered] = useState(false);

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  const { metadata, ref } = useAnimeMetadata(session, title);
  const reducedMotion = useReducedMotion();
  const score = metadata?.score;
  const anilistCover = metadata?.cover_image || null;
  const [coverLoaded, setCoverLoaded] = useState(false);
  const genreList = metadata?.genres
    ? (Array.isArray(metadata.genres) ? metadata.genres : metadata.genres.split(',')).slice(0, 2)
    : [];

  let episodeLabel = null;
  if (episodes) {
    episodeLabel = `${episodes} eps`;
  } else if (status) {
    const match = status.match(/Episode\s+(\d+)/i);
    if (match) episodeLabel = `EP ${match[1]}`;
  }

  return (
    <Link
      ref={ref}
      to={`/series/${session}`}
      className="group relative flex flex-col w-full animate-fadeIn outline-none focus-visible:ring-2 focus-visible:ring-brandPurple focus-visible:ring-offset-2 focus-visible:ring-offset-brandBg rounded-lg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      <motion.div
        animate={{ scale: !reducedMotion && hovered ? 1.04 : 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-brandSurfaceMuted shadow-md"
        style={{
          boxShadow: hovered
            ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.4)'
            : undefined,
        }}
      >
        {/* Base: AnimePahe snapshot, shown until AniList cover loads */}
        <img
          src={displayPoster || 'https://placehold.co/300x450/15161e/ffffff?text=?'}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* AniList vertical cover art — crossfades in once loaded */}
        {anilistCover && (
          <img
            key={anilistCover}
            src={anilistCover}
            alt=""
            aria-hidden="true"
            onLoad={() => setCoverLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${coverLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Resting gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Type badge */}
        {type && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-extrabold bg-red-600 text-white rounded-[3px] leading-none tracking-wider uppercase shadow z-10">
            {type.toUpperCase()}
          </span>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-zinc-300 hover:text-white rounded-full backdrop-blur-sm shadow z-20 transition-colors duration-200 cursor-pointer"
            title="Remove from Continue Watching"
            aria-label="Remove from Continue Watching"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Rank numeral */}
        {rank != null && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1 leading-none select-none pointer-events-none"
            style={{
              fontFamily: "'Bricolage Grotesque', 'Space Grotesk', sans-serif",
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.12)',
              lineHeight: 1,
            }}
          >
            {String(rank).padStart(2, '0')}
          </span>
        )}

        {/* Hover reveal panel */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent"
            >
              {score && (
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-3 h-3 fill-brandAmber shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-[10px] font-bold text-brandAmber">{(score / 10).toFixed(1)}</span>
                </div>
              )}
              {episodeLabel && (
                <div className="flex items-center gap-1 mb-1.5">
                  <svg className="w-2.5 h-2.5 fill-zinc-400 shrink-0" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span className="text-[10px] font-bold text-zinc-200">{episodeLabel}</span>
                </div>
              )}
              {genreList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {genreList.map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 text-[8px] font-semibold bg-brandPurple/20 text-brandPurple rounded-full border border-brandPurple/20 leading-none"
                    >
                      {g.trim()}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Episode label when not hovered */}
        {!hovered && episodeLabel && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-black/80 text-zinc-100 rounded backdrop-blur-[2px] border border-white/10">
            <svg className="w-2.5 h-2.5 fill-zinc-400 shrink-0" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {episodeLabel}
          </div>
        )}
      </motion.div>

      {/* Title below poster */}
      <div className="mt-2">
        <h3 className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors leading-snug line-clamp-2">
          {title}
        </h3>
      </div>
    </Link>
  );
}
