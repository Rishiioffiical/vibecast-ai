import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Share2,
  Check,
  MoreHorizontal,
  ChevronDown,
  Repeat,
  FileText,
  Headphones,
  Loader2,
  FileAudio,
} from 'lucide-react';
import {
  formatTime,
  AudioExportFormat,
  EXPORT_FORMAT_OPTIONS,
  exportAudioInFormat,
} from '../utils/audioSynthesis';

interface AudioPlayerProps {
  audioUrl: string;
  voiceName: string;
  emotionLabel: string;
  speedMultiplier: number;
  engine: 'gemini' | 'browser-fallback';
  scriptSnippet: string;
  onSpeedChange?: (speed: number) => void;
  onResynthesize?: (text: string) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  voiceName,
  emotionLabel,
  speedMultiplier,
  scriptSnippet,
  onSpeedChange,
  onResynthesize,
  onPlayingChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'audio' | 'script'>('audio');
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<AudioExportFormat>('mp3');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedBadge, setExportedBadge] = useState<string | null>(null);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Deterministic acoustic waveform bar heights derived from script text
  const waveformBars = useMemo(() => {
    const count = 48;
    const bars: number[] = [];
    const seedStr = scriptSnippet || 'VibeCastStudio24kHz';
    for (let i = 0; i < count; i++) {
      const charCode = seedStr.charCodeAt(i % seedStr.length) || 72;
      const env = Math.sin((i / count) * Math.PI);
      const harmonic =
        0.35 +
        0.45 * Math.abs(Math.sin(i * 0.65 + charCode * 0.17)) +
        0.2 * Math.abs(Math.cos(i * 1.3 - charCode * 0.09));
      bars.push(Math.max(0.16, Math.min(1, harmonic * (0.45 + 0.55 * env))));
    }
    return bars;
  }, [scriptSnippet]);

  useEffect(() => {
    setIsPlaying(false);
    onPlayingChange?.(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioLoadError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speedMultiplier;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speedMultiplier;
    }
  }, [speedMultiplier]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || audioLoadError) return;
    if (el.paused) {
      el.play().catch((err) => {
        console.warn('Audio play error:', err);
        setAudioLoadError('Saved audio session expired. Click Re-Synthesize to regenerate fresh 24kHz audio.');
      });
    } else {
      el.pause();
    }
  };

  const handleRestart = () => {
    const el = audioRef.current;
    if (!el || audioLoadError) return;
    el.currentTime = 0;
    setCurrentTime(0);
    el.play().catch((err) => {
      console.warn('Audio restart error:', err);
      setAudioLoadError('Saved audio session expired. Click Re-Synthesize to regenerate fresh 24kHz audio.');
    });
  };

  const handleSkipTime = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const maxDur = Number.isFinite(el.duration) ? el.duration : duration;
    const newTime = Math.max(0, Math.min(maxDur || 0, el.currentTime + seconds));
    el.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekBarClick = (index: number) => {
    if (!audioRef.current || duration <= 0) return;
    const ratio = index / Math.max(1, waveformBars.length - 1);
    const targetTime = ratio * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeToggle = () => {
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleDownload = async (formatOverride?: AudioExportFormat) => {
    const targetFormat = formatOverride || selectedFormat;
    if (formatOverride) {
      setSelectedFormat(formatOverride);
    }
    setShowExportMenu(false);
    setShowOptions(false);
    if (audioLoadError) return;
    setIsExporting(true);
    try {
      await exportAudioInFormat(audioUrl, targetFormat, scriptSnippet, speedMultiplier);
      setExportedBadge(targetFormat.toUpperCase());
      setTimeout(() => setExportedBadge(null), 2500);
    } catch (err) {
      console.warn('Export error:', err);
      setAudioLoadError('Temporary audio link expired. Re-synthesize to export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptSnippet);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn(e);
    }
  };

  const remainingSeconds = Math.max(0, duration - currentTime);
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://vibecast.studio';
  const cleanSnippet = scriptSnippet ? `"${scriptSnippet.slice(0, 140).trim()}..."` : 'Studio Audio Take';
  const audioRefText =
    audioUrl && audioUrl.startsWith('http') && !audioUrl.startsWith('blob:')
      ? `\nDirect Audio Link: ${audioUrl}`
      : '';

  const shareMessage = `*VibeCast Studio Master Take*\nVoice: ${voiceName}\nCadence: ${emotionLabel}\nScript: ${cleanSnippet}${audioRefText}\n\nOpen in VibeCast Studio: ${appUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="w-full rounded-[28px] spatial-glass border border-white/15 shadow-2xl overflow-hidden transition-all text-[var(--text-primary)] relative">
      {/* Hidden Native Audio Engine */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          onPlayingChange?.(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          onPlayingChange?.(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          onPlayingChange?.(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setAudioLoadError(null);
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur)) {
            setDuration(dur);
          }
          e.currentTarget.playbackRate = speedMultiplier;
          e.currentTarget.volume = isMuted ? 0 : volume;
        }}
        onError={() => {
          setIsPlaying(false);
          onPlayingChange?.(false);
          setAudioLoadError('Temporary audio link from a past browser session expired. Re-synthesize to play or export.');
        }}
      />

      {/* Top Deck Header: Mode Switcher & Actions */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60 font-mono-numbers">
          <span className="text-white font-semibold">{voiceName.split('(')[0].trim()}</span>
          <span aria-hidden="true">·</span>
          <span>24kHz PCM</span>
        </div>

        {/* Segmented Control [ Audio ] [ Script ] */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/12">
          <button
            type="button"
            onClick={() => setViewMode('audio')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'audio'
                ? 'bg-[var(--accent-color)] text-white shadow-xs'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Master Deck</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('script')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'script'
                ? 'bg-[var(--accent-color)] text-white shadow-xs'
                : 'text-white/65 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script View</span>
          </button>
        </div>

        {/* Share & More Options */}
        <div className="flex items-center gap-2">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Share Audio on WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-[#38D9A9]" />
            <span>Share</span>
          </a>

          <div className="relative" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-white/[0.07] text-white border border-white/12 flex items-center justify-center hover:bg-white/[0.14] transition-colors cursor-pointer"
              title="Options & Export Formats"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showOptions && (
              <div className="absolute right-0 top-10 w-60 spatial-glass border border-white/20 rounded-2xl shadow-2xl p-2 z-40 space-y-1 text-white">
                <div className="px-3 py-1.5 text-[11px] font-mono-numbers text-white/50 font-semibold border-b border-white/10">
                  Export Audio Format
                </div>
                {EXPORT_FORMAT_OPTIONS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => handleDownload(fmt.id)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/12 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                      <span>Export as {fmt.label}</span>
                    </span>
                    <span className="text-[11px] font-mono-numbers text-white/55">
                      .{fmt.extension}
                    </span>
                  </button>
                ))}
                <div className="border-t border-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    handleCopy();
                    setShowOptions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/12 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-white/70" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Script Text'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Deck Content */}
      <div className="px-6 py-5">
        {viewMode === 'audio' ? (
          <div className="space-y-4">
            {/* Title & Unboxed Metadata */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 font-mono-numbers">
                <span>Master Take</span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--soundstage-color)]">{emotionLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{speedMultiplier.toFixed(2)}x Tempo</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold-italic text-white leading-snug line-clamp-2">
                {scriptSnippet.slice(0, 80).trim() + (scriptSnippet.length > 80 ? '...' : '')}
              </h2>
            </div>

            {/* Interactive Harmonic Spectrum Bar Visualizer (Click to Seek) */}
            <div className="rounded-2xl bg-black/45 border border-white/10 px-4 py-4 space-y-3">
              <div
                className="h-20 flex items-end justify-between gap-1 cursor-pointer select-none"
                title="Click any bar to seek along the audio timeline"
              >
                {waveformBars.map((barHeight, idx) => {
                  const barRatio = idx / Math.max(1, waveformBars.length - 1);
                  const isPassed = barRatio <= progressRatio;
                  const activeWave = isPlaying
                    ? Math.max(0.18, Math.min(1, barHeight * (0.78 + 0.28 * Math.sin(currentTime * 9 + idx * 0.5))))
                    : barHeight;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSeekBarClick(idx)}
                      className="flex-1 h-full flex items-end justify-center group focus:outline-none cursor-pointer"
                      aria-label={`Seek to ${Math.round(barRatio * 100)}%`}
                    >
                      <span
                        className="w-full rounded-full transition-all duration-150"
                        style={{
                          height: `${Math.round(activeWave * 100)}%`,
                          backgroundColor: isPassed
                            ? 'var(--accent-color)'
                            : 'rgba(255, 255, 255, 0.18)',
                          opacity: isPassed ? 1 : 0.65,
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Fine Range Scrubber & Tabular Time Indicators */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.05}
                  value={duration > 0 ? Math.min(currentTime, duration) : 0}
                  onChange={handleSeekChange}
                  className="w-full h-1.5 rounded-full cursor-pointer accent-[var(--accent-color)]"
                />

                <div className="flex justify-between items-center text-xs font-mono-numbers text-white/65 px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>-{formatTime(remainingSeconds)}</span>
                </div>
              </div>
            </div>

            {audioLoadError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-100 flex flex-wrap items-center justify-between gap-2">
                <span>{audioLoadError}</span>
                {onResynthesize && (
                  <button
                    type="button"
                    onClick={() => onResynthesize(scriptSnippet)}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--accent-color)] hover:opacity-90 text-white font-semibold text-xs cursor-pointer transition-opacity whitespace-nowrap shrink-0"
                  >
                    Re-Synthesize Take
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Script View Mode */
          <div className="py-1 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/12">
              <span className="text-xs font-mono-numbers text-white/60">
                Voiceover Script Transcript
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-[var(--accent-color)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto pr-2">
              <p className="text-base font-serif-display leading-relaxed text-white/95 whitespace-pre-wrap">
                {scriptSnippet}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transport & Multi-Format Export Deck */}
      <div className="bg-black/45 border-t border-white/12 text-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Transport Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl bg-[var(--accent-color)] hover:opacity-95 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current stroke-none" />
              ) : (
                <Play className="w-5 h-5 fill-current stroke-none ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSkipTime(-10)}
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/85 hover:text-white transition-colors cursor-pointer relative"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/85 hover:text-white transition-colors cursor-pointer"
              title="Restart clip"
            >
              <Repeat className="w-4 h-4" />
            </button>

            {onSpeedChange && (
              <button
                type="button"
                onClick={() => {
                  const speeds = [0.75, 1.0, 1.15, 1.25, 1.5];
                  const currentIndex = speeds.findIndex((s) => Math.abs(s - speedMultiplier) < 0.08);
                  const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                  onSpeedChange(nextSpeed);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 text-white text-xs font-semibold font-mono-numbers transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Cycle playback speed"
              >
                {speedMultiplier.toFixed(2)}x
              </button>
            )}
          </div>

          {/* Center: Volume */}
          <div className="hidden sm:flex items-center gap-2 text-white/75">
            <button onClick={handleVolumeToggle} className="hover:text-white cursor-pointer" title="Mute / Unmute">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1"
              aria-label="Volume"
            />
          </div>

          {/* Right: Multi-Format Export Split Button & Dropdown */}
          <div className="relative flex items-center" ref={exportMenuRef}>
            <div className="inline-flex items-center rounded-xl bg-white/[0.08] border border-white/15 shadow-xs overflow-hidden">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleDownload(selectedFormat)}
                className="inline-flex items-center gap-1.5 pl-3.5 pr-3 py-2 hover:bg-white/[0.12] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                title={`Export audio as .${selectedFormat.toUpperCase()}`}
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-color)]" />
                ) : exportedBadge ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                )}
                <span>
                  {exportedBadge
                    ? `Saved ${exportedBadge}`
                    : `Export ${selectedFormat.toUpperCase()}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="px-2.5 py-2 border-l border-white/15 hover:bg-white/[0.16] text-white/90 hover:text-white transition-colors cursor-pointer flex items-center"
                title="Choose audio export format (MP3, OGG, AAC, WAV)"
                aria-label="Choose audio export format"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    showExportMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-64 spatial-glass border border-white/20 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-white">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/10">
                  <span className="text-[11px] font-mono-numbers text-white/60 font-semibold flex items-center gap-1.5">
                    <FileAudio className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    <span>Select Export Format</span>
                  </span>
                  <span className="text-[11px] font-mono-numbers text-white/45">24kHz</span>
                </div>

                {EXPORT_FORMAT_OPTIONS.map((fmt) => {
                  const isSelected = selectedFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleDownload(fmt.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/45 text-white'
                          : 'hover:bg-white/10 text-white/90 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-numbers font-bold text-xs">
                            {fmt.label}
                          </span>
                          <span className="text-[11px] text-white/60 font-mono-numbers">
                            · {fmt.qualityBadge}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 mt-0.5">{fmt.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono-numbers text-white/50">
                          .{fmt.extension}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-color)]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
