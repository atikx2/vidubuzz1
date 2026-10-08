"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Maximize,
  Pause,
  Play,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { VideoSource } from "@/lib/video-sources";
import { recordAnalyticsEvent } from "@/lib/analytics-client";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${remaining}` : `${minutes}:${remaining}`;
}

type VideoPlayerProps = {
  poster: string;
  sources: VideoSource[];
  title: string;
  videoId: number;
};

export function VideoPlayer({ poster, sources, title, videoId }: VideoPlayerProps) {
  const videoTracked = useRef<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingQualitySwitch = useRef<{ time: number; resume: boolean } | null>(null);
  const [qualityIndex, setQualityIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState("");
  const [error, setError] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const source = sources[qualityIndex];

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || !source) return;
    if (video.paused) {
      void video.play().catch(() => setError(true));
    } else {
      video.pause();
    }
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video || !source) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    setSeekFeedback(seconds < 0 ? "−15 sec" : "+15 sec");
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setSeekFeedback(""), 800);
  }

  function chooseQuality(index: number) {
    const video = videoRef.current;
    if (!video || index === qualityIndex) {
      setQualityMenuOpen(false);
      return;
    }
    pendingQualitySwitch.current = { time: video.currentTime, resume: !video.paused };
    setError(false);
    setQualityIndex(index);
    setQualityMenuOpen(false);
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const pending = pendingQualitySwitch.current;
    if (pending) {
      video.currentTime = Math.min(pending.time, video.duration || pending.time);
      pendingQualitySwitch.current = null;
      if (pending.resume) void video.play().catch(() => setError(true));
    }
  }

  async function toggleFullscreen() {
    const target = playerRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!target) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else {
        video?.webkitEnterFullscreen?.();
      }
    } catch {
      video?.webkitEnterFullscreen?.();
    }
  }

  return (
    <div
      className={`video-player ${fullscreen ? "video-player-fullscreen" : ""} ${playing ? "video-player-playing" : ""}`}
      ref={playerRef}
      aria-label={`Video player: ${title}`}
    >
      {source ? (
        <video
          ref={videoRef}
          className="video-player-media"
          src={source.url}
          poster={poster}
          preload="metadata"
          playsInline
          muted={muted}
          onPlay={() => setPlaying(true)}
          onPlaying={() => {
            if (videoTracked.current !== videoId) {
              videoTracked.current = videoId;
              recordAnalyticsEvent("video_view", window.location.pathname, videoId);
            }
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(true)}
          onClick={togglePlayback}
          aria-label={title}
        />
      ) : (
        <div className="video-player-poster" style={{ backgroundImage: `url("${poster}")` }} />
      )}

      {source && (
        <div className="video-player-seek-zones" aria-hidden="false">
          <button className="video-seek-zone video-seek-left" type="button" aria-label="Double click to rewind 15 seconds" onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); skip(-15); }} />
          <button className="video-seek-zone video-seek-right" type="button" aria-label="Double click to skip forward 15 seconds" onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); skip(15); }} />
        </div>
      )}

      {!playing && source && (
        <button className="video-player-big-play" type="button" onClick={togglePlayback} aria-label="Play video">
          <Play size={28} fill="currentColor" />
        </button>
      )}
      {!source && <div className="video-player-no-source">Video stream link is not connected yet</div>}

      {seekFeedback && <div className={`video-seek-feedback ${seekFeedback.startsWith("−") ? "seek-feedback-left" : "seek-feedback-right"}`}>{seekFeedback}</div>}

      {error && source && (
        <div className="video-player-error" role="status">
          Video load hoyni. Provider-er stream link expire hoyeche kina ba playback allow ache kina check korun.
        </div>
      )}

      <div className="video-player-controls">
        <button className="player-control-button" type="button" onClick={togglePlayback} aria-label={playing ? "Pause video" : "Play video"} disabled={!source}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
        </button>
        <span className="player-time">{formatTime(currentTime)} <i>/</i> {formatTime(duration)}</span>
        <input
          className="player-progress"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = Number(event.target.value);
          }}
          aria-label="Video progress"
          disabled={!source || duration === 0}
          style={{ "--progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
        />
        <button className="player-control-button player-volume-button" type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute video" : "Mute video"} disabled={!source}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        {sources.length > 1 && (
          <div className="player-quality-wrap">
            <button
              className="player-control-button"
              type="button"
              onClick={() => setQualityMenuOpen((open) => !open)}
              aria-label="Video quality settings"
              aria-expanded={qualityMenuOpen}
            >
              <Settings2 size={18} />
            </button>
            {qualityMenuOpen && (
              <div className="player-quality-menu" role="menu" aria-label="Video quality">
                <strong>Quality</strong>
                {sources.map((item, index) => (
                  <button type="button" role="menuitemradio" aria-checked={index === qualityIndex} onClick={() => chooseQuality(index)} key={`${item.label}-${index}`}>
                    <span>{item.label}</span>
                    {index === qualityIndex && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="player-control-button" type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} disabled={!source}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}
