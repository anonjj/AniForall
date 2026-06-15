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
      <div className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-500 pointer-events-none ${!isPlaying ? 'opacity-100 backdrop-blur-[2px] bg-black/10' : 'opacity-0 group-hover/player:opacity-100 group-hover/player:backdrop-blur-[1px] group-hover/player:bg-black/5'}`}>
        <div className="flex items-center gap-6 sm:gap-10 p-8 rounded-[40px] glass-panel-heavy shadow-2xl scale-90 group-hover/player:scale-100 transition-transform duration-500 pointer-events-auto">
          {/* Rewind */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.rewind(); }}
            className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all transform hover:-translate-x-1 active:scale-90 group/btn"
            title="Rewind 10s"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 fill-none stroke-current stroke-[1.5] transition-transform group-hover/btn:-rotate-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              <text x="13" y="14" fontSize="5" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none" className="font-sans italic">10</text>
            </svg>
          </button>

          {/* Play/Pause Button - Premium Glow Effect */}
          <div className="relative group/playbtn">
            {/* Glow backdrop */}
            <div className="absolute inset-0 bg-brandPurple/30 blur-2xl rounded-full scale-110 opacity-0 group-hover/playbtn:opacity-100 transition-opacity duration-500" />
            
            <button 
              onClick={(e) => { e.stopPropagation(); plyrRef.current?.togglePlay(); }}
              className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center rounded-full bg-gradient-accent text-white shadow-2xl transition-all transform hover:scale-105 active:scale-95 z-10"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-14 sm:h-14 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-14 sm:h-14 fill-current ml-2">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Forward */}
          <button 
            onClick={(e) => { e.stopPropagation(); plyrRef.current?.forward(); }}
            className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all transform hover:translate-x-1 active:scale-90 group/btn"
            title="Forward 10s"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-10 sm:h-10 fill-none stroke-current stroke-[1.5] transition-transform group-hover/btn:rotate-12">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              <text x="11" y="14" fontSize="5" fontWeight="900" textAnchor="middle" fill="currentColor" stroke="none" className="font-sans italic">10</text>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
