import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Feed video player with a clean custom control bar: play/pause, mute,
 * scrubbable progress and fullscreen. Autoplays muted while in view.
 */
export function VideoPlayer({ src, className }: { src: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);

  // Autoplay (muted) while at least 40% of the player is on screen.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void wrap.requestFullscreen?.().catch(() => {});
  }, []);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "group relative mt-3.5 w-full overflow-hidden rounded-2xl border border-border/60 bg-black shadow-md",
        fullscreen && "flex items-center justify-center rounded-none border-0",
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted
        loop
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setReady(true);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
        className={cn(
          "block w-full cursor-pointer object-contain",
          fullscreen ? "max-h-screen" : "max-h-[540px]",
        )}
      />

      {/* Centre play affordance while paused */}
      {!playing && ready && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 shadow-lift backdrop-blur-sm transition-transform hover:scale-105 active:scale-95">
            <Play className="ml-0.5 h-6 w-6 fill-current text-foreground" />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
        <div
          onClick={seek}
          role="presentation"
          className="pointer-events-auto mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/25"
        >
          <div
            style={{ width: `${progress}%` }}
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-pink transition-[width] duration-150"
          />
        </div>

        <div className="pointer-events-auto flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause video" : "Play video"}
            className="rounded-full p-1.5 transition-colors hover:bg-white/15"
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="rounded-full p-1.5 transition-colors hover:bg-white/15"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <span className="ml-0.5 text-[11px] font-semibold tabular-nums text-white/90">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="ml-auto rounded-full p-1.5 transition-colors hover:bg-white/15"
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
