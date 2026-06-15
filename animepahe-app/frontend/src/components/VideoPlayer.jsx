import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

const VideoPlayer = forwardRef(({ streamUrl, startAt = 0, onTimeUpdate, onEnded }, ref) => {
  const domRef   = useRef(null);
  const mediaRef = useRef(null);
  const hlsRef   = useRef(null);
  const plyrRef  = useRef(null);
  const startAtRef  = useRef(startAt);
  const onEndedRef  = useRef(onEnded);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { startAtRef.current = startAt; }, [startAt]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Expose getCurrentTime / getDuration to WatchPage via ref
  useImperativeHandle(ref, () => ({
    getVideoElement: () => mediaRef.current,
    getCurrentTime: () => mediaRef.current?.currentTime ?? 0,
    getDuration:    () => mediaRef.current?.duration    ?? 0,
    play:           () => plyrRef.current?.play(),
    pause:          () => plyrRef.current?.pause(),
    togglePlay:     () => plyrRef.current?.togglePlay(),
    rewind:         () => plyrRef.current?.rewind(),
    forward:        () => plyrRef.current?.forward(),
  }));

  useEffect(() => {
    if (!streamUrl) return;

    let cancelled = false;

    async function setup() {
      // Always start from the original DOM element — it survives Plyr.destroy()
      const domVideo = domRef.current;
      if (!domVideo) return;

      const { default: Plyr } = await import('plyr');
      if (cancelled) return;

      // ── 1. Build Plyr around the original <video> ──────────────────────────
      const player = new Plyr(domVideo, {
        controls: [
          // 'play-large' removed to use our custom center controls
          'play',          // Play/pause on bar
          'rewind',        // Rewind 10s
          'fast-forward',  // Fast forward 10s
          'progress',      // Scrubber
          'current-time',  // Current time
          'duration',      // Total time
          'mute',          // Mute
          'volume',        // Volume
          'settings',      // Settings
          'fullscreen',    // Fullscreen
        ],
        seekTime: 10,
        settings: ['speed', 'quality'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
        keyboard: { focused: true, global: true },
        autoplay: false,
      });
      plyrRef.current = player;

      // ── 2. Get the live video element Plyr is actually rendering ───────────
      const plyrVideo = player.media ?? domVideo;
      mediaRef.current = plyrVideo;

      // ── 3. Attach HLS.js to Plyr's media element ──────────────────────────
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 30,
          enableWorker: true,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(plyrVideo);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          if (startAtRef.current > 0) plyrVideo.currentTime = startAtRef.current;
          plyrVideo.play().catch(err => console.log('Autoplay blocked:', err));
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) console.error('HLS fatal error:', data.type, data.details);
        });
      } else if (plyrVideo.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        plyrVideo.src = streamUrl;
        plyrVideo.currentTime = startAtRef.current;
        plyrVideo.play().catch(err => console.log('Autoplay blocked:', err));
      }

      // ── 4. Progress / end events ───────────────────────────────────────────
      const handleTimeUpdate = () => onTimeUpdate?.(plyrVideo.currentTime, plyrVideo.duration);
      const handleEnded      = () => onEndedRef.current?.();
      
      const onPlay  = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      plyrVideo.addEventListener('timeupdate', handleTimeUpdate);
      plyrVideo.addEventListener('ended',      handleEnded);
      plyrVideo.addEventListener('play',       onPlay);
      plyrVideo.addEventListener('pause',      onPause);

      // Store event cleanup on the hls ref for teardown
      hlsRef._evCleanup = () => {
        plyrVideo.removeEventListener('timeupdate', handleTimeUpdate);
        plyrVideo.removeEventListener('ended',      handleEnded);
        plyrVideo.removeEventListener('play',       onPlay);
        plyrVideo.removeEventListener('pause',      onPause);
      };
    }

    setup();

    return () => {
      cancelled = true;

      if (hlsRef._evCleanup) { hlsRef._evCleanup(); hlsRef._evCleanup = null; }
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (plyrRef.current) {
        try { plyrRef.current.destroy(); } catch (_) {}
        plyrRef.current = null;
      }
      mediaRef.current = null;
    };
  }, [streamUrl]);

  return (
    <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-black relative group/player">
      <video
        ref={domRef}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />

      {/* Center Controls Overlay */}
      <div className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${!isPlaying ? 'opacity-100' : 'opacity-0 group-hover/player:opacity-100'}`}>
        <div className="flex items-center gap-10 sm:gap-16 pointer-events-auto">
          {/* Rewind */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.rewind(); }}
            className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-brandPurple/80 text-white transition-all transform hover:scale-110 group/btn"
            title="Rewind 10s"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 fill-current">
              <path d="M12.5 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.59 2.91-6.5 6.5-6.5S19 8.41 19 12s-2.91 6.5-6.5 6.5c-1.59 0-3.05-.57-4.18-1.51l-1.42 1.42C8.36 19.66 10.3 20.5 12.5 20.5c4.67 0 8.5-3.83 8.5-8.5S17.17 3 12.5 3z" />
              <text x="12.5" y="15.5" fontSize="6" fontWeight="bold" textAnchor="middle" fill="currentColor">10</text>
            </svg>
          </button>

          {/* Play/Pause */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.togglePlay(); }}
            className="p-6 sm:p-8 rounded-full bg-brandPurple/90 hover:bg-brandPurple text-white shadow-xl shadow-brandPurple/40 transition-all transform hover:scale-110"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 fill-current">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.forward(); }}
            className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-brandPurple/80 text-white transition-all transform hover:scale-110 group/btn"
            title="Forward 10s"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 fill-current">
              <path d="M11.5 3c4.97 0 9 4.03 9 9h2.5L19.11 15.89l-.07.14L15 12h3c0-3.59-2.91-6.5-6.5-6.5S5 8.41 5 12s2.91 6.5 6.5 6.5c1.59 0 3.05-.57 4.18-1.51l1.42 1.42C15.64 19.66 13.7 20.5 11.5 20.5c-4.67 0-8.5-3.83-8.5-8.5S6.83 3 11.5 3z" />
              <text x="11.5" y="15.5" fontSize="6" fontWeight="bold" textAnchor="middle" fill="currentColor">10</text>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
