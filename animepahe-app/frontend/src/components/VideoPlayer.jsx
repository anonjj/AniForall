import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';
import 'plyr/dist/plyr.css';

const VideoPlayer = forwardRef(({ streamUrl, startAt = 0, onTimeUpdate, onEnded }, ref) => {
  // domRef  → always points to the real <video> element in the JSX (never reassigned)
  // mediaRef → points to Plyr's internal media element after init (may differ)
  const domRef   = useRef(null);
  const mediaRef = useRef(null);
  const hlsRef   = useRef(null);
  const plyrRef  = useRef(null);
  const startAtRef  = useRef(startAt);
  const onEndedRef  = useRef(onEnded);

  useEffect(() => { startAtRef.current = startAt; }, [startAt]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  // Expose getCurrentTime / getDuration to WatchPage via ref
  useImperativeHandle(ref, () => ({
    getVideoElement: () => mediaRef.current,
    getCurrentTime: () => mediaRef.current?.currentTime ?? 0,
    getDuration:    () => mediaRef.current?.duration    ?? 0,
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
          'play-large',    // Big play button in center
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
      // player.media is the element Plyr owns; it's the same as domVideo in
      // most cases but guaranteed correct even when Plyr wraps it.
      const plyrVideo = player.media ?? domVideo;
      mediaRef.current = plyrVideo;

      // ── 3. Attach HLS.js to Plyr's media element ──────────────────────────
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 30,
          // Ensure TS segments with wrong MIME are still treated as video
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
      plyrVideo.addEventListener('timeupdate', handleTimeUpdate);
      plyrVideo.addEventListener('ended',      handleEnded);

      // Store event cleanup on the hls ref for teardown
      hlsRef._evCleanup = () => {
        plyrVideo.removeEventListener('timeupdate', handleTimeUpdate);
        plyrVideo.removeEventListener('ended',      handleEnded);
      };
    }

    setup();

    return () => {
      cancelled = true;

      // Remove event listeners
      if (hlsRef._evCleanup) { hlsRef._evCleanup(); hlsRef._evCleanup = null; }

      // Destroy HLS first so it stops feeding the detaching media element
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

      // Destroy Plyr — this restores domRef.current to the original <video>
      // so the next setup() call gets a clean slate
      if (plyrRef.current) {
        try { plyrRef.current.destroy(); } catch (_) {}
        plyrRef.current = null;
      }

      mediaRef.current = null;
    };
  }, [streamUrl]); // Re-run whenever quality URL changes

  return (
    <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-black">
      {/*
        domRef is permanently bound to this element.
        Plyr wraps it but Plyr.destroy() restores it, so domRef stays valid
        across quality switches.
      */}
      <video
        ref={domRef}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
