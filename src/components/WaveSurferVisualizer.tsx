import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Loader2 } from 'lucide-react';

interface WaveSurferVisualizerProps {
  audioUrl: string;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onWaveSurferReady?: (ws: WaveSurfer) => void;
}

export const WaveSurferVisualizer: React.FC<WaveSurferVisualizerProps> = ({
  audioUrl,
  isPlaying,
  playbackRate,
  volume,
  isMuted,
  onPlayStateChange,
  onTimeUpdate,
  onDurationChange,
  onWaveSurferReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    setIsLoading(true);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#D8D0C2', // unplayed vintage muted beige
      progressColor: '#B83848', // played terracotta / wine crimson
      cursorColor: '#8E2835',
      cursorWidth: 2,
      barWidth: 4,
      barGap: 3,
      barRadius: 2,
      height: 72,
      normalize: true,
      url: audioUrl,
    });

    waveSurferRef.current = ws;

    ws.on('ready', () => {
      setIsLoading(false);
      const dur = ws.getDuration();
      onDurationChange(dur);
      ws.setPlaybackRate(playbackRate);
      ws.setVolume(isMuted ? 0 : volume);
      if (onWaveSurferReady) {
        onWaveSurferReady(ws);
      }
    });

    ws.on('play', () => onPlayStateChange(true));
    ws.on('pause', () => onPlayStateChange(false));
    ws.on('finish', () => {
      onPlayStateChange(false);
      onTimeUpdate(0);
    });
    ws.on('timeupdate', (time) => {
      onTimeUpdate(time);
    });

    return () => {
      ws.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl]);

  // Sync isPlaying
  useEffect(() => {
    const ws = waveSurferRef.current;
    if (!ws) return;

    if (isPlaying && !ws.isPlaying()) {
      ws.play().catch((err) => console.warn('WaveSurfer play error:', err));
    } else if (!isPlaying && ws.isPlaying()) {
      ws.pause();
    }
  }, [isPlaying]);

  // Sync playback rate
  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  // Sync volume / mute
  useEffect(() => {
    if (waveSurferRef.current) {
      waveSurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setHoverPosition(ratio);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div
      className="relative w-full rounded-2xl bg-[#F4EFE6] border border-[#E2DAD0] p-4 group cursor-pointer overflow-hidden shadow-inner transition-colors"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading state indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#F4EFE6]/90 z-10 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-[#B83848]">
            <Loader2 className="w-4 h-4 animate-spin text-[#B83848]" />
            <span>Rendering Acoustic Waveform...</span>
          </div>
        </div>
      )}

      {/* WaveSurfer rendering container */}
      <div ref={containerRef} className="w-full h-[72px]" />

      {/* Hover tooltip for exact timestamp seeking */}
      {hoverPosition !== null && (
        <div
          className="absolute top-2 pointer-events-none -translate-x-1/2 z-20"
          style={{ left: `${hoverPosition * 100}%` }}
        >
          <span className="text-[10px] font-mono font-bold bg-[#1C221D] text-[#FAF7EF] px-2 py-0.5 rounded shadow">
            Seek
          </span>
        </div>
      )}
    </div>
  );
};
