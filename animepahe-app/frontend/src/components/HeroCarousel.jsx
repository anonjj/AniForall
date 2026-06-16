import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PlayIcon, PlusIcon } from '@heroicons/react/24/solid';
import { addToWatchlist } from '../api/client';
import useAnimeMetadata from '../hooks/useAnimeMetadata';
import useReducedMotion from '../hooks/useReducedMotion';

function proxyImg(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function SlideContent({ anime, onResolvedImage, reducedMotion }) {
  const { metadata } = useAnimeMetadata(anime.session, anime.title);

  const bannerImg = metadata?.banner_image || proxyImg(anime.image);
  const score = metadata?.score;
  const genreList = metadata?.genres
    ? (Array.isArray(metadata.genres) ? metadata.genres : metadata.genres.split(',')).slice(0, 3)
    : [];

  useEffect(() => {
    if (onResolvedImage) onResolvedImage(proxyImg(anime.image));
  }, [anime.image, onResolvedImage]);

  const handleWatchlist = async (e) => {
    e.preventDefault();
    try {
      await addToWatchlist({ session: anime.session, title: anime.title, poster: proxyImg(anime.image) });
    } catch {
      // non-critical
    }
  };

  return (
    <motion.div
      key={anime.session}
      initial={{ opacity: reducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reducedMotion ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.6 }}
      className="absolute inset-0"
    >
      {bannerImg && (
        <img
          src={bannerImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-brandBg via-black/20 to-transparent" />

      <div className="relative z-10 h-full flex flex-col justify-end pb-14 md:pb-20 px-6 md:px-12 max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-widest text-brandPurple mb-2">
          Now Airing
        </span>

        <h2
          className="font-black text-white leading-none mb-3"
          style={{
            fontFamily: "'Bricolage Grotesque', 'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            letterSpacing: '-0.03em',
          }}
        >
          {anime.title}
        </h2>

        {(score || genreList.length > 0) && (
          <div className="flex items-center flex-wrap gap-2 mb-4">
            {score && (
              <span className="flex items-center gap-1 text-sm font-bold text-brandAmber">
                <svg className="w-4 h-4 fill-brandAmber" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {(score / 10).toFixed(1)}
              </span>
            )}
            {genreList.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-zinc-300 rounded-full border border-white/10 backdrop-blur-sm"
              >
                {g.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Link
            to={`/series/${anime.session}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-brandPurple hover:bg-brandPurple/90 text-white font-bold rounded-lg transition-colors shadow-lg shadow-brandPurple/20 text-sm focus-visible:ring-2 focus-visible:ring-brandPurple focus-visible:ring-offset-2 focus-visible:ring-offset-brandBg outline-none"
          >
            <PlayIcon className="w-4 h-4" />
            Watch Now
          </Link>
          <button
            onClick={handleWatchlist}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg transition-colors backdrop-blur-sm border border-white/10 text-sm focus-visible:ring-2 focus-visible:ring-white/40 outline-none"
          >
            <PlusIcon className="w-4 h-4" />
            Watchlist
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeroCarousel({ anime = [], onActiveImageChange }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const count = Math.min(anime.length, 5);
  const current = anime[idx] || null;

  const advance = useCallback(() => {
    setIdx((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1 || reducedMotion) return;
    const id = setInterval(advance, 6000);
    return () => clearInterval(id);
  }, [paused, advance, count, reducedMotion]);

  if (!current) return null;

  return (
    <div
      className="relative w-full h-[380px] md:h-[500px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <SlideContent
          key={current.session}
          anime={current}
          onResolvedImage={onActiveImageChange}
          reducedMotion={reducedMotion}
        />
      </AnimatePresence>

      {count > 1 && (
        <div className="absolute bottom-5 right-6 flex items-center gap-1.5 z-20">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white/60 outline-none ${
                i === idx ? 'w-6 h-2 bg-brandPurple' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
