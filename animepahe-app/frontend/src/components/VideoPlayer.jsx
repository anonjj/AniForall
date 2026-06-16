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
  const onTimeUpdateRef = useRef(onTimeUpdate);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { startAtRef.current = startAt; }, [startAt]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);

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
      const handleTimeUpdate = () => onTimeUpdateRef.current?.(plyrVideo.currentTime, plyrVideo.duration);
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
        <div className="flex items-center gap-8 sm:gap-12 pointer-events-auto">
          {/* Rewind */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.rewind(); }}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-brandPurple/80 text-white/90 transition-all active:scale-90"
            title="Rewind 10s"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.togglePlay(); }}
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-brandPurple/90 hover:bg-brandPurple text-white shadow-xl transition-all transform hover:scale-105 active:scale-95"
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
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-brandPurple/80 text-white/90 transition-all active:scale-90"
            title="Forward 10s"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
