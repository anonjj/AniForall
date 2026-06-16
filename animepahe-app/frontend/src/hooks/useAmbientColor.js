import { useState, useEffect } from 'react';

const cache = new Map();

function sampleColor(src) {
  return new Promise((resolve) => {
    if (cache.has(src)) { resolve(cache.get(src)); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        cache.set(src, hex);
        resolve(hex);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function useAmbientColor(imageUrl) {
  const [color, setColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      sampleColor(imageUrl).then((c) => { if (!cancelled) setColor(c); });
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [imageUrl]);

  return color;
}
