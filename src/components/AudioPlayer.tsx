import React, { useRef, useState, useEffect } from 'react';
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
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  voiceName,
  emotionLabel,
  speedMultiplier,
  scriptSnippet,
  onSpeedChange,
  onResynthesize,
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

  useEffect(() => {
    setIsPlaying(false);
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

  // Predefined WhatsApp Share URL for VibeCast
  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://vibecast.studio';
  const cleanSnippet = scriptSnippet ? `"${scriptSnippet.slice(0, 140).trim()}..."` : 'Studio Audio Take';
  const audioRefText =
    audioUrl && audioUrl.startsWith('http') && !audioUrl.startsWith('blob:')
      ? `\n🔗 *Direct Audio Link:* ${audioUrl}`
      : '';

  const shareMessage = `🎙️ *Listen to this VibeCast Voiceover Master Take!*\n\n🎭 *Voice:* ${voiceName}\n✨ *Emotion:* ${emotionLabel}\n📝 *Script:* ${cleanSnippet}${audioRefText}\n\n🎧 *Open in VibeCast Studio:* ${appUrl}\n\n⚡ Created with VibeCast - Studio AI Audio & Hindi Voiceover Generator`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="w-full max-w-xl mx-auto rounded-[36px] spatial-glass border border-white/20 shadow-2xl overflow-hidden transition-all text-[var(--text-primary)] relative">
      {/* Hidden Native Audio Engine */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
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
          setAudioLoadError('Temporary audio link from a past browser session expired. Re-synthesize to play or export.');
        }}
      />

      {/* Top Bar with Dropdown Icon, Audio/Script Segmented Control, and Options */}
      <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-white/10">
        <button
          type="button"
          onClick={() => handleSkipTime(-5)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm border border-white/15 active:scale-95"
          title="Rewind 5s"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Segmented Control [ Audio ] [ Script ] */}
        <div className="flex items-center bg-black/30 p-1 rounded-full border border-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode('audio')}
            className={`inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'audio'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('script')}
            className={`inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'script'
                ? 'bg-[var(--accent-color)] text-white shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script</span>
          </button>
        </div>

        {/* Share Button & More Options */}
        <div className="flex items-center gap-2">
          {/* WhatsApp Share Button */}
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
            title="Share Audio on WhatsApp"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span className="font-semibold">Share</span>
          </a>

          {/* More Options / Quick Format Export menu */}
          <div className="relative" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-white/10 text-white border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              title="Options & Export Formats"
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
            </button>

            {showOptions && (
              <div className="absolute right-0 top-12 w-60 spatial-glass border border-white/20 rounded-2xl shadow-2xl p-2 z-40 space-y-1 text-white">
                <div className="px-3 py-1.5 text-[10px] font-mono-numbers uppercase tracking-wider text-white/50 font-bold border-b border-white/10">
                  Export Audio Format
                </div>
                {EXPORT_FORMAT_OPTIONS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => handleDownload(fmt.id)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/15 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                      <span>Export as {fmt.label}</span>
                    </span>
                    <span className="text-[10px] font-mono-numbers text-white/60">
                      .{fmt.extension}
                    </span>
                  </button>
                ))}
                <div className="border-t border-white/10 my-1" />
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowOptions(false)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/15 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Share on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    handleCopy();
                    setShowOptions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/15 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-white/70" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Script Text'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="px-6 sm:px-8 pb-6">
        {viewMode === 'audio' ? (
          <div>
            {/* Pop-art Vintage Album Illustration */}
            <div className="relative w-full h-44 sm:h-52 rounded-2xl bg-gradient-to-br from-[#8EA893] to-[#5C7E64] flex items-center justify-center overflow-hidden border border-[#7D9E83] shadow-inner mb-6">
              {/* Retro Graphic Circles */}
              <div className="absolute w-64 h-64 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute w-44 h-44 rounded-full border border-white/30 pointer-events-none" />

              <div className="relative flex flex-col items-center gap-2 text-center p-4">
                <div className={`w-24 h-24 rounded-full bg-[#1C201C] border-4 border-[#FAF7EF] shadow-xl flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                  <div className="w-9 h-9 rounded-full bg-[#B83848] border-2 border-[#FAF7EF] flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-wider font-syne">
                    VIBE
                  </div>
                </div>

                <div className="bg-[#FAF7EF]/90 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/40 shadow-sm mt-1">
                  <span className="text-[11px] font-bold-italic text-[#1F261F] tracking-wide">
                    {voiceName.split(' ')[0]} · VibeCast Master
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Metadata with Bold Italic Mashup */}
            <div className="space-y-1 mb-5">
              <p className="text-xs uppercase tracking-widest font-semibold text-white/60 font-mono-numbers">
                VibeCast Master Session • {emotionLabel}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold-italic text-white leading-tight line-clamp-2">
                {scriptSnippet.slice(0, 52).trim() + (scriptSnippet.length > 52 ? '...' : '')}
              </h2>
            </div>

            {/* Clean Spatial Progress Scrubber & Time Indicators */}
            <div className="space-y-2 mb-2">
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.05}
                value={duration > 0 ? Math.min(currentTime, duration) : 0}
                onChange={handleSeekChange}
                className="w-full h-1.5 rounded-full cursor-pointer accent-[var(--accent-color)]"
              />

              {/* Time Indicators */}
              <div className="flex justify-between items-center text-xs font-mono-numbers text-white/70 px-1 font-semibold">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remainingSeconds)}</span>
              </div>
            </div>

            {audioLoadError && (
              <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-100 flex flex-wrap items-center justify-between gap-2">
                <span>{audioLoadError}</span>
                {onResynthesize && (
                  <button
                    type="button"
                    onClick={() => onResynthesize(scriptSnippet)}
                    className="px-3 py-1 rounded-full bg-[#B83848] hover:bg-[#9E2A3B] text-white font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Re-Synthesize Take
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Script Mode */
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/15">
              <span className="text-xs uppercase font-mono tracking-wider font-bold text-white/65">
                Script Transcribed Text
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-[#FF8A98] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto pr-2">
              <p className="text-base sm:text-lg font-serif-display leading-relaxed text-white/95 whitespace-pre-wrap">
                {scriptSnippet}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spatial Acrylic Deck Player Controls */}
      <div className="bg-black/40 backdrop-blur-xl border-t border-white/15 text-white px-6 sm:px-8 py-5">
        <div className="flex items-center justify-between gap-3">
          {/* Rewind 10s */}
          <button
            type="button"
            onClick={() => handleSkipTime(-10)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-5 h-5 stroke-[2]" />
            <span className="absolute text-[8px] font-bold font-mono-numbers top-[13px]">10</span>
          </button>

          {/* Speed Indicator / Cycle Button */}
          {onSpeedChange && (
            <button
              type="button"
              onClick={() => {
                const speeds = [0.75, 1.0, 1.25, 1.5];
                const currentIndex = speeds.findIndex((s) => Math.abs(s - speedMultiplier) < 0.1);
                const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                onSpeedChange(nextSpeed);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold font-mono-numbers transition-colors cursor-pointer"
              title="Click to cycle playback speed"
            >
              {speedMultiplier.toFixed(2)}x
            </button>
          )}

          {/* Central Circular Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#FAF7EF] text-[#B83848] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current stroke-none" />
            ) : (
              <Play className="w-7 h-7 fill-current stroke-none ml-1" />
            )}
          </button>

          {/* Restart from beginning */}
          <button
            type="button"
            onClick={handleRestart}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Restart clip"
          >
            <Repeat className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            onClick={() => handleSkipTime(10)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative"
            title="Fast forward 10 seconds"
          >
            <RotateCcw className="w-5 h-5 stroke-[2] -scale-x-100" />
            <span className="absolute text-[8px] font-bold font-mono-numbers top-[13px]">10</span>
          </button>
        </div>

        {/* Bottom deck micro controls (Volume & Multi-Format Export Dropdown) */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/80">
          <div className="flex items-center gap-2">
            <button onClick={handleVolumeToggle} className="hover:text-white cursor-pointer">
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
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold transition-all shadow-sm cursor-pointer"
              title="Share take on WhatsApp"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Multi-Format Export Split Button & Dropdown */}
            <div className="relative flex items-center" ref={exportMenuRef}>
              <div className="inline-flex items-center rounded-full bg-white/15 border border-white/20 shadow-sm overflow-hidden">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleDownload(selectedFormat)}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer disabled:opacity-60"
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
                  className="px-2 py-1.5 border-l border-white/15 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center"
                  title="Choose audio export format (MP3, OGG, AAC, WAV)"
                  aria-label="Choose audio export format"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showExportMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Format Selection Dropdown Menu */}
              {showExportMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-64 spatial-glass border border-white/25 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-white animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/10">
                    <span className="text-[10px] font-mono-numbers uppercase tracking-wider text-white/60 font-bold flex items-center gap-1.5">
                      <FileAudio className="w-3 h-3 text-[var(--accent-color)]" />
                      <span>Select Export Format</span>
                    </span>
                    <span className="text-[10px] font-mono-numbers text-white/40">24kHz</span>
                  </div>

                  {EXPORT_FORMAT_OPTIONS.map((fmt) => {
                    const isSelected = selectedFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleDownload(fmt.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[var(--accent-color)]/25 border border-[var(--accent-color)]/50 text-white'
                            : 'hover:bg-white/10 text-white/90 border border-transparent'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-numbers font-bold text-xs">
                              {fmt.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/80 font-mono-numbers">
                              {fmt.qualityBadge}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/55 mt-0.5">{fmt.description}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono-numbers text-white/50">
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
    </div>
  );
};

