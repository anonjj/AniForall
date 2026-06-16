import { useState, useEffect, useRef } from 'react';
import { getAnimeMetadata } from '../api/client';

export default function useAnimeMetadata(session, title) {
  const [metadata, setMetadata] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!session || !title) return;
    let cancelled = false;

    const load = () => {
      getAnimeMetadata(session, title)
        .then((res) => {
          if (!cancelled && res.data && !res.data.fallback) {
            setMetadata(res.data);
          }
        })
        .catch(() => {});
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '200px' }
    );

    const el = ref.current;
    if (el) {
      observer.observe(el);
    } else {
      // No ref target — load immediately (e.g. hero slide)
      load();
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [session, title]);

  return { metadata, ref };
}
