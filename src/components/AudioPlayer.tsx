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
  Disc,
  MoreHorizontal,
  ArrowDownLeft,
  ChevronDown,
  Repeat,
  Shuffle,
  FileText,
  Headphones,
} from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { WaveSurferVisualizer } from './WaveSurferVisualizer';
import { formatTime } from '../utils/audioSynthesis';

interface AudioPlayerProps {
  audioUrl: string;
  voiceName: string;
  emotionLabel: string;
  speedMultiplier: number;
  engine: 'gemini' | 'browser-fallback';
  scriptSnippet: string;
  onSpeedChange?: (speed: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  voiceName,
  emotionLabel,
  speedMultiplier,
  engine,
  scriptSnippet,
  onSpeedChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'audio' | 'script'>('audio');
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const waveSurferInstanceRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (waveSurferInstanceRef.current) {
      waveSurferInstanceRef.current.playPause();
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleRestart = () => {
    if (waveSurferInstanceRef.current) {
      waveSurferInstanceRef.current.seekTo(0);
      waveSurferInstanceRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSkipTime = (seconds: number) => {
    if (waveSurferInstanceRef.current) {
      const current = waveSurferInstanceRef.current.getCurrentTime();
      const newTime = Math.max(0, Math.min(duration, current + seconds));
      waveSurferInstanceRef.current.setTime(newTime);
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

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    const cleanSnippet = (scriptSnippet || 'vibecast_audio')
      .slice(0, 24)
      .replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `vibecast_take_${cleanSnippet}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    <div className="w-full max-w-xl mx-auto rounded-[36px] bg-[#FAF7EF] border-2 border-[#E5DECf] shadow-[0_25px_60px_-15px_rgba(25,40,28,0.45)] overflow-hidden transition-all text-[#1F261F]">
      {/* Top Bar with Dropdown Icon, Audio/Script Segmented Control, and Options */}
      <div className="p-5 sm:p-6 pb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleSkipTime(-5)}
          className="w-10 h-10 rounded-full bg-[#35523E] text-[#FAF7EF] flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          title="Rewind 5s"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Segmented Control [ Audio ] [ Script ] */}
        <div className="flex items-center bg-[#EAE3D2] p-1 rounded-full border border-[#D8CEBC]">
          <button
            type="button"
            onClick={() => setViewMode('audio')}
            className={`inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'audio'
                ? 'bg-[#B83848] text-[#FAF7EF] shadow-sm'
                : 'text-[#4A554D] hover:text-[#1F261F]'
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
                ? 'bg-[#B83848] text-[#FAF7EF] shadow-sm'
                : 'text-[#4A554D] hover:text-[#1F261F]'
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

          {/* More Options / Download button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-[#EAE3D2] text-[#35523E] flex items-center justify-center hover:bg-[#DDD3C0] transition-colors cursor-pointer"
              title="Options & Export"
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2.5]" />
            </button>

            {showOptions && (
              <div className="absolute right-0 top-12 w-52 bg-[#FAF7EF] border border-[#D8CEBC] rounded-2xl shadow-xl p-2 z-30 space-y-1">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowOptions(false)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1F261F] hover:bg-[#EAE3D2] flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-[#25D366]" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Share on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload();
                    setShowOptions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1F261F] hover:bg-[#EAE3D2] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#B83848]" />
                  <span>Download WAV File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCopy();
                    setShowOptions(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1F261F] hover:bg-[#EAE3D2] flex items-center gap-2 cursor-pointer"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#35523E]" />}
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
              <p className="text-xs uppercase tracking-widest font-semibold text-[#78857B] font-mono-numbers">
                VibeCast Master Session • {emotionLabel}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold-italic text-[#1C221D] leading-tight line-clamp-2">
                {scriptSnippet.slice(0, 52).trim() + (scriptSnippet.length > 52 ? '...' : '')}
              </h2>
            </div>

            {/* Acoustic WaveSurfer Visualizer */}
            <div className="space-y-2 mb-2">
              <WaveSurferVisualizer
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                playbackRate={speedMultiplier}
                volume={volume}
                isMuted={isMuted}
                onPlayStateChange={setIsPlaying}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onWaveSurferReady={(ws) => {
                  waveSurferInstanceRef.current = ws;
                }}
              />

              {/* Time Indicators */}
              <div className="flex justify-between items-center text-xs font-mono-numbers text-[#6A786D] px-1 font-semibold">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(remainingSeconds)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Script Mode */
          <div className="py-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2DAD0]">
              <span className="text-xs uppercase font-mono tracking-wider font-bold text-[#78857B]">
                Script Transcribed Text
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-[#B83848] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto pr-2">
              <p className="text-base sm:text-lg font-serif-display leading-relaxed text-[#1C221D] whitespace-pre-wrap">
                {scriptSnippet}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Retro Crimson Deck Player Controls */}
      <div className="bg-[#B83848] text-[#FAF7EF] px-6 sm:px-8 py-6">
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

        {/* Bottom deck micro controls (Volume & Direct Download) */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold transition-all shadow-sm cursor-pointer"
              title="Share take on WhatsApp"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Master WAV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
