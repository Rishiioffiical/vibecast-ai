import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  currentTime,
  duration,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Generate realistic voice formant bar heights
  const barsRef = useRef<number[]>([]);
  if (barsRef.current.length === 0) {
    const count = 72;
    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      const p = i / count;
      // Speech curve: gentle intro, peaks around vowel formants, gentle trail
      const bell = Math.sin(p * Math.PI);
      const harmonics =
        Math.sin(i * 0.45) * 0.25 +
        Math.cos(i * 0.9) * 0.2 +
        Math.sin(i * 1.8) * 0.15;
      const h = Math.max(0.08, Math.min(0.96, (0.4 + harmonics) * bell + 0.1));
      heights.push(h);
    }
    barsRef.current = heights;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const render = () => {
      tick += 0.06;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = barsRef.current;
      const barCount = bars.length;
      const gap = 3;
      const barWidth = (w - gap * (barCount - 1)) / barCount;
      const progress = duration > 0 ? currentTime / duration : 0;
      const currentIdx = Math.floor(progress * barCount);

      // Draw center baseline guide
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      bars.forEach((baseH, i) => {
        const x = i * (barWidth + gap);
        let dynamicScale = 1;

        if (isPlaying) {
          // Dynamic pulsing with organic voice modulation
          const wave1 = Math.sin(tick * 3.8 + i * 0.3) * 0.3;
          const wave2 = Math.cos(tick * 6.2 + i * 0.7) * 0.18;
          dynamicScale = Math.max(0.15, 1 + wave1 + wave2);
        }

        const barHeight = Math.max(6, baseH * h * 0.82 * dynamicScale);
        const y = (h - barHeight) / 2;
        const radius = Math.min(barWidth / 2, 2.5);

        const isPast = i <= currentIdx;
        const isCurrent = i === currentIdx;

        // Studio amber/gold gradient for active playback
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isCurrent && isPlaying) {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#fde68a');
          grad.addColorStop(0.6, '#f59e0b');
          grad.addColorStop(1, '#ea580c');
        } else if (isPast) {
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.5, '#f59e0b');
          grad.addColorStop(1, '#b45309');
        } else {
          grad.addColorStop(0, 'rgba(148, 163, 184, 0.35)');
          grad.addColorStop(1, 'rgba(51, 65, 85, 0.15)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();

        // High-gloss glow on playing head
        if (isCurrent && isPlaying) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTime, duration]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!onSeek || duration <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div
      className="w-full relative group cursor-pointer select-none py-1"
      onClick={handleCanvasClick}
      title="Click anywhere to jump to audio position"
    >
      <canvas
        ref={canvasRef}
        width={760}
        height={76}
        className="w-full h-18 rounded-lg transition-all duration-200 group-hover:brightness-110"
      />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex justify-center pb-1">
        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/30 shadow-lg">
          Seek Audio
        </span>
      </div>
    </div>
  );
};
