import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Volume2,
  Sparkles,
  Sliders,
  AudioWaveform,
  Copy,
  Trash2,
  Check,
  History,
  SlidersHorizontal,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  Disc,
  ChevronRight,
  BookOpen,
  Crown,
  Mail,
  QrCode,
  Palette,
  Type,
  Lock,
  Unlock,
  GraduationCap,
  Layers,
  Clock,
} from 'lucide-react';
import { ALL_VOICES, EMOTIONS, SAMPLE_SCRIPTS } from './data/voices';
import { GeneratedClip, SampleScript } from './types';
import {
  callGeminiTts,
  estimateDurationSec,
} from './utils/audioSynthesis';
import { recognizeScript } from './utils/scriptRecognition';
import { getActiveApiMode, subscribeApiMode, ApiMode } from './utils/apiClient';
import { AcousticFieldCanvas } from './components/AcousticFieldCanvas';
import { AudioPlayer } from './components/AudioPlayer';
import { AudioTranscriber } from './components/AudioTranscriber';
import { AiScriptEnhancer } from './components/AiScriptEnhancer';
import { ScriptTranslator } from './components/ScriptTranslator';
import { DailyQuotaTracker } from './components/DailyQuotaTracker';
import { PremiumModal } from './components/PremiumModal';
import { AuthModal } from './components/AuthModal';
import { UserAccountBadge } from './components/UserAccountBadge';
import { AiChatAssistant } from './components/AiChatAssistant';
import { AdminKeyModal } from './components/AdminKeyModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { useAuth, PUBLIC_SIGNUP_CHAR_LIMIT, getLocalDateString } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

type VisualMode = 'full' | 'wireframe' | 'particles' | 'minimal';

export default function App() {
  const {
    currentTheme,
    currentFont,
    editorFontSize,
  } = useTheme();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  // 3D Acoustic Field visual mode & live playback reactivity
  const [visualMode, setVisualMode] = useState<VisualMode>('full');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Studio HUD Session Timer (inspired by the Three.js HUD timer)
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedSessionTimer = `${String(Math.floor(sessionSeconds / 60)).padStart(2, '0')}:${String(
    sessionSeconds % 60
  ).padStart(2, '0')}`;

  const {
    user,
    userProfile,
    deductCredits,
    resetDailyQuotaManually,
    saveTakeToCloud,
    fetchUserTakes,
    deleteTakeFromCloud,
  } = useAuth();

  const [scriptText, setScriptText] = useState<string>(SAMPLE_SCRIPTS[0].text);

  // Persistent Voice Lock: Uses the exact same voice every time until manually changed by the user
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vibecast_selected_voice_id');
      if (saved && ALL_VOICES.some((v) => v.id === saved)) {
        return saved;
      }
    } catch {}
    return 'indian-edu-siddharth';
  });

  const [selectedEmotionId, setSelectedEmotionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vibecast_selected_emotion_id');
      if (saved && EMOTIONS.some((e) => e.id === saved)) {
        return saved;
      }
    } catch {}
    return 'educational-clear';
  });

  const [speed, setSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vibecast_selected_speed');
      if (saved && !isNaN(parseFloat(saved))) {
        return Math.min(2.0, Math.max(0.5, parseFloat(saved)));
      }
    } catch {}
    return 1.0;
  });

  const [isVoiceLocked, setIsVoiceLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vibecast_voice_locked');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Persist user's manually chosen voice, emotion, speed, and lock preference
  const handleManualVoiceChange = (newVoiceId: string) => {
    setSelectedVoiceId(newVoiceId);
    try {
      localStorage.setItem('vibecast_selected_voice_id', newVoiceId);
    } catch {}
  };

  const handleManualEmotionChange = (newEmotionId: string) => {
    setSelectedEmotionId(newEmotionId);
    try {
      localStorage.setItem('vibecast_selected_emotion_id', newEmotionId);
    } catch {}
  };

  const handleManualSpeedChange = (newSpeed: number) => {
    const clamped = Math.min(2.0, Math.max(0.5, newSpeed));
    setSpeed(clamped);
    try {
      localStorage.setItem('vibecast_selected_speed', String(clamped));
    } catch {}
  };

  const handleToggleVoiceLock = () => {
    setIsVoiceLocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vibecast_voice_locked', String(next));
      } catch {}
      return next;
    });
  };

  // Auth Modal state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Admin vs Public Key Modal & Mode state
  const [isAdminKeyModalOpen, setIsAdminKeyModalOpen] = useState<boolean>(false);
  const [, setApiMode] = useState<ApiMode>(getActiveApiMode());

  useEffect(() => {
    return subscribeApiMode((mode) => setApiMode(mode));
  }, []);

  const userEmail = (user?.email || '').trim().toLowerCase();
  const isAdmin = ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'].includes(userEmail);
  const isUnlimited = isAdmin || !!userProfile?.isPremium;

  // Daily quota tracking (2,000 characters daily limit for public creators, unlimited for admin)
  const MAX_CHARS_PER_DAY = isUnlimited ? 999999 : PUBLIC_SIGNUP_CHAR_LIMIT;
  const MAX_SCRIPTS_PER_DAY = 40;

  const getTodayDateKey = () => `vibecast_quota_${getLocalDateString()}`;

  const [dailyUsage, setDailyUsage] = useState<{ chars: number; scripts: number }>(() => {
    try {
      const key = `vibecast_quota_${getLocalDateString()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { chars: Number(parsed.chars) || 0, scripts: Number(parsed.scripts) || 0 };
      }
    } catch (e) {
      console.warn('Quota load error:', e);
    }
    return { chars: 0, scripts: 0 };
  });

  const recordUsage = (charLen: number) => {
    setDailyUsage((prev) => {
      const updated = {
        chars: prev.chars + charLen,
        scripts: prev.scripts + 1,
      };
      try {
        const key = `vibecast_quota_${getLocalDateString()}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.warn('Quota save error:', e);
      }
      return updated;
    });
  };

  const handleManualQuotaReset = async () => {
    if (user) {
      const ok = await resetDailyQuotaManually();
      setDailyUsage({ chars: 0, scripts: 0 });
      try {
        localStorage.removeItem(getTodayDateKey());
      } catch (e) {}
      if (ok) {
        setSuccessNotice('Daily credits have been refreshed to full allowance.');
      } else {
        setSuccessNotice('Credits are already up-to-date for today.');
      }
    } else {
      setDailyUsage({ chars: 0, scripts: 0 });
      try {
        localStorage.removeItem(getTodayDateKey());
      } catch (e) {}
      setSuccessNotice('Free guest daily quota has been refreshed.');
    }
  };

  const currentAvailableChars = isUnlimited
    ? 999999
    : user && userProfile
    ? userProfile.credits
    : Math.max(0, PUBLIC_SIGNUP_CHAR_LIMIT - dailyUsage.chars);

  // Voice filter: 'all' | 'hindi-male' | 'english-male' | 'female'
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'hindi-male' | 'english-male' | 'female'>('all');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationTime, setGenerationTime] = useState<number>(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [activeClip, setActiveClip] = useState<GeneratedClip | null>(null);
  const [clipHistory, setClipHistory] = useState<GeneratedClip[]>([]);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // AI Chat Assistant Drawer
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Premium & Contact UPI Modal
  const [isPremiumOpen, setIsPremiumOpen] = useState<boolean>(false);

  const playerSectionRef = useRef<HTMLDivElement>(null);
  const consoleSectionRef = useRef<HTMLDivElement>(null);
  const presetsSectionRef = useRef<HTMLDivElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);

  const selectedVoice = ALL_VOICES.find((v) => v.id === selectedVoiceId) || ALL_VOICES[0];
  const selectedEmotion = EMOTIONS.find((e) => e.id === selectedEmotionId) || EMOTIONS[0];

  // Real-time Script Recognition (Devanagari Hindi, Hinglish, or Indian English)
  const scriptRecognition = recognizeScript(scriptText);

  const estimatedSeconds = estimateDurationSec(scriptText, speed);
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;

  // Filtered voice list — always keep the currently selected/locked voice present so dropdown never resets it
  const baseFilteredVoices = ALL_VOICES.filter((v) => {
    if (voiceFilter === 'hindi-male') return v.language === 'hindi' && v.gender === 'male';
    if (voiceFilter === 'english-male') return v.language === 'english' && v.gender === 'male';
    if (voiceFilter === 'female') return v.gender === 'female';
    return true;
  });
  const filteredVoiceList = baseFilteredVoices.some((v) => v.id === selectedVoice.id)
    ? baseFilteredVoices
    : [selectedVoice, ...baseFilteredVoices];

  // Timer while generating
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setGenerationTime(0);
      interval = setInterval(() => {
        setGenerationTime((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      setGenerationTime(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load user cloud takes when signed in (without auto-opening stale session blob URLs in the player)
  useEffect(() => {
    if (user) {
      fetchUserTakes().then((cloudTakes) => {
        if (cloudTakes && cloudTakes.length > 0) {
          setClipHistory(cloudTakes);
        }
      });
    }
  }, [user]);

  // Main generate audio handler
  const handleGenerateAudio = async () => {
    if (!scriptText.trim()) {
      setErrorNotice('Please enter your script text to synthesize audio.');
      return;
    }

    // MANDATORY Sign In Gate: Without sign in, no generation can take place!
    if (!user) {
      setErrorNotice('Please sign in or create an account to synthesize audio (2,000 Free Characters included).');
      setIsAuthOpen(true);
      return;
    }

    const isAdminUser =
      !!user.email &&
      ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'].includes(user.email.trim().toLowerCase());

    // Check account credits for public users (2,000 character limit)
    if (!isAdminUser && userProfile && !userProfile.isPremium && userProfile.credits < scriptText.length) {
      setErrorNotice(
        `Character limit reached! You have ${userProfile.credits.toLocaleString()} characters remaining from your 2,000 free allowance. Please upgrade via UPI to generate more.`
      );
      setIsPremiumOpen(true);
      return;
    }

    const remainingChars = Math.max(0, MAX_CHARS_PER_DAY - dailyUsage.chars);
    if (remainingChars <= 0) {
      setErrorNotice(
        `You have reached your daily generation allowance of ${MAX_CHARS_PER_DAY.toLocaleString()} characters. Quota resets at 12:00 AM midnight!`
      );
      return;
    }

    setErrorNotice(null);
    setSuccessNotice(null);
    setIsGenerating(true);

    try {
      const result = await callGeminiTts({
        text: scriptText,
        voiceName: selectedVoice.geminiVoice,
        voiceId: selectedVoice.id,
        emotion: selectedEmotion.id,
        speed: speed,
        language: selectedVoice.language,
        scriptMode: scriptRecognition.scriptType,
      });

      const newClip: GeneratedClip = {
        id: `clip-${Date.now()}`,
        title: scriptText.slice(0, 42).trim() + (scriptText.length > 42 ? '...' : ''),
        text: scriptText,
        audioUrl: result.audioUrl,
        voiceName: `${selectedVoice.name} (${selectedVoice.accent})`,
        language: selectedVoice.language,
        emotionLabel: `${selectedEmotion.label} · ${scriptRecognition.shortBadge}`,
        speed: speed,
        duration: estimatedSeconds,
        timestamp: Date.now(),
        engine: result.engine,
      };

      // Record daily quota deduction
      recordUsage(scriptText.length);

      // Deduct user credits and sync take to cloud Firestore if signed in
      if (user) {
        await deductCredits(scriptText.length);
        await saveTakeToCloud(newClip);
      }

      setActiveClip(newClip);
      setClipHistory((prev) => [newClip, ...prev]);
      setSuccessNotice(
        `Synthesized with locked voice "${selectedVoice.name}" [${scriptRecognition.label}] (${scriptText.length} credits used)`
      );

      // Scroll to player
      setTimeout(() => {
        playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    } catch (err: any) {
      console.error('Audio generation error:', err);
      setErrorNotice(err.message || 'Audio generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectPresetScript = (preset: SampleScript) => {
    setScriptText(preset.text);
    // Only change voice/emotion if Voice Lock is explicitly turned OFF by the user
    if (!isVoiceLocked) {
      if (preset.recommendedVoiceId) {
        handleManualVoiceChange(preset.recommendedVoiceId);
        const matched = ALL_VOICES.find((v) => v.id === preset.recommendedVoiceId);
        if (matched) {
          if (matched.language === 'hindi') setVoiceFilter('hindi-male');
          else if (matched.language === 'english') setVoiceFilter('english-male');
        }
      }
      if (preset.recommendedEmotionId) {
        handleManualEmotionChange(preset.recommendedEmotionId);
      }
      if (preset.speed) {
        handleManualSpeedChange(preset.speed);
      }
    } else {
      setSuccessNotice(`Loaded script "${preset.title}" — keeping your locked voice (${selectedVoice.name}).`);
    }
    setErrorNotice(null);
  };

  const handleClearText = () => {
    setScriptText('');
  };

  const handleCopyText = async () => {
    if (!scriptText) return;
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleTranscriptionComplete = (transcribed: string) => {
    setScriptText((prev) => (prev.trim() ? `${prev.trim()}\n\n${transcribed}` : transcribed));
  };

  // Clear History Handler
  const handleClearHistory = () => {
    setClipHistory([]);
    setSuccessNotice('Session recording history cleared.');
  };

  // Delete single take
  const handleDeleteTake = async (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClipHistory((prev) => prev.filter((c) => c.id !== clipId));
    if (activeClip?.id === clipId) {
      setActiveClip(null);
    }
    if (user) {
      await deleteTakeFromCloud(clipId);
    }
  };

  const heroWords = ['Spatial', 'Acoustic', 'Voice', 'Studio'];

  return (
    <div className="min-h-screen spatial-canvas text-[var(--text-primary)] font-['Plus_Jakarta_Sans',sans-serif] relative overflow-x-hidden selection:bg-[var(--accent-color)] selection:text-white">
      {/* Live Interactive Three.js WebGL Acoustic Field (Shader Blob + Geodesic Wireframe + Particle Field) */}
      <AcousticFieldCanvas
        accentColor={currentTheme.accent}
        secondaryColor={currentTheme.orbColors[0]}
        canvasBg={currentTheme.canvasBg}
        isGenerating={isGenerating}
        isPlaying={isPlayingAudio}
        speed={speed}
        visualMode={visualMode}
      />

      {/* Ambient Atmospheric Glow Layers */}
      <div
        className="spatial-orb -top-24 -left-24 w-96 h-96"
        style={{ backgroundColor: currentTheme.orbColors[0] }}
      />
      <div
        className="spatial-orb top-1/3 -right-32 w-[32rem] h-[32rem]"
        style={{ backgroundColor: currentTheme.orbColors[1], animationDelay: '-6s' }}
      />

      {/* 3-Zone Top Bar Contract: [Zone 1: Brand] — [Zone 2: 5 Nav Links] — [Zone 3: Account] */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/25 transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.accent}, #111a14)`,
                boxShadow: `0 0 18px ${currentTheme.spatialGlow}`,
              }}
            >
              <Radio className="w-5 h-5 stroke-[2.3] text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold-italic text-2xl text-white tracking-tight">
                  Vibe
                </span>
                <span
                  className="font-syne font-extrabold text-2xl tracking-tighter uppercase"
                  style={{ color: currentTheme.accent }}
                >
                  Cast
                </span>
              </div>
              <p className="text-[11px] text-white/60 font-medium hidden sm:block">
                24kHz Indian & Global Voice Synthesis
              </p>
            </div>
          </div>

          {/* Zone 2: Clean Single-Line Studio Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-white/75">
            <button
              type="button"
              onClick={() => consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Studio Console
            </button>
            <button
              type="button"
              onClick={() => presetsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Curated Scripts
            </button>
            <button
              type="button"
              onClick={() => historySectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Session Archive
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>Script AI</span>
            </button>
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>{currentTheme.name}</span>
            </button>
          </nav>

          {/* Zone 3: Primary Account & Mobile Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/12 cursor-pointer"
              title="AI Script Assistant"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span>AI</span>
            </button>

            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/12 cursor-pointer"
              title="Appearance & Fonts"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            </button>

            <UserAccountBadge
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenPremium={() => setIsPremiumOpen(true)}
              onOpenAdminKey={() => setIsAdminKeyModalOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Studio Workstation */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Kinetic Editorial Studio HUD Strip & 3D Acoustic Field Controls */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-numbers uppercase tracking-widest text-white/60">
              <span style={{ color: currentTheme.accent }} className="font-bold">
                LIVE ACOUSTIC CORE
              </span>
              <span>·</span>
              <span>{scriptRecognition.shortBadge}</span>
              <span>·</span>
              <span>
                {isVoiceLocked ? `Locked: ${selectedVoice.name.split(' ')[0]}` : selectedVoice.name.split(' ')[0]}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-white/80">
                <Clock className="w-3 h-3 opacity-70" />
                <span>SESSION {formattedSessionTimer}</span>
              </span>
            </div>

            {/* Staggered Kinetic Word Reveal */}
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white flex flex-wrap items-baseline gap-x-2.5">
              {heroWords.map((word, idx) => (
                <motion.span
                  key={word}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: idx * 0.09,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={
                    idx % 2 === 0
                      ? 'font-bold-italic'
                      : 'font-syne font-extrabold uppercase tracking-tight'
                  }
                  style={idx === 1 ? { color: currentTheme.accent } : undefined}
                >
                  {word}
                </motion.span>
              ))}
            </h1>
          </div>

          {/* Interactive 3D Acoustic Field Mode Selector (Controls Shader Blob, Wireframe & Particles) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
            <div className="inline-flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/12 text-xs">
              <span className="px-2.5 py-1 text-[10px] font-mono-numbers uppercase tracking-wider text-white/55 hidden sm:inline-flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>3D Field</span>
              </span>
              {(
                [
                  { id: 'full', label: 'Core + Wire' },
                  { id: 'wireframe', label: 'Geodesic' },
                  { id: 'particles', label: 'Particles' },
                  { id: 'minimal', label: 'Minimal' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setVisualMode(mode.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    visualMode === mode.id
                      ? 'bg-white/15 text-white border border-white/20 shadow-xs'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div ref={consoleSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT COLUMN: Main Voiceover Console & Player (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Script Writing Card with Spatial Studio Surface */}
            <div className="spatial-glass rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <label htmlFor="script-textarea" className="text-base text-white">
                    <span className="font-bold-italic text-lg text-white">Script &</span>{' '}
                    <span
                      className="font-syne font-bold uppercase tracking-wide text-sm"
                      style={{ color: currentTheme.accent }}
                    >
                      Dialogue Editor
                    </span>
                  </label>
                  <span className="text-xs text-white/50 font-mono-numbers">
                    · Hindi, Hinglish & English
                  </span>
                </div>

                {/* Toolbar Buttons: Dictate, Font Selector, Copy, Clear */}
                <div className="flex flex-wrap items-center gap-2">
                  <AudioTranscriber
                    onTranscriptionComplete={handleTranscriptionComplete}
                    onError={(err) => setErrorNotice(err)}
                  />

                  {/* Quick Font Selector Button */}
                  <button
                    type="button"
                    onClick={() => setIsThemeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/12 transition-all cursor-pointer active:scale-95"
                    title="Change Script Font Style"
                  >
                    <Type className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
                    <span>{currentFont.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white/85 hover:text-white border border-white/12 transition-colors cursor-pointer"
                    title="Copy script"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-rose-500/20 text-white/80 hover:text-rose-200 border border-white/12 hover:border-rose-400/30 transition-colors cursor-pointer"
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Textarea with Dynamic Theme Font & Size */}
              <div className="relative">
                <textarea
                  id="script-textarea"
                  rows={editorFontSize === 'huge' ? 7 : 6}
                  value={scriptText}
                  onChange={(e) => {
                    setScriptText(e.target.value);
                    if (errorNotice) setErrorNotice(null);
                    if (successNotice) setSuccessNotice(null);
                  }}
                  placeholder="Type your Hindi, Hinglish, or English voiceover script here or click 'Dictate' to speak with your mic..."
                  className={`w-full rounded-2xl p-4 sm:p-5 outline-none transition-all resize-y shadow-inner border border-white/14 focus:border-white/30 bg-black/40 text-white placeholder:text-white/35 ${
                    editorFontSize === 'normal'
                      ? 'text-base leading-relaxed'
                      : editorFontSize === 'huge'
                      ? 'text-xl sm:text-2xl leading-loose font-medium'
                      : 'text-base sm:text-lg leading-relaxed'
                  }`}
                  style={{
                    fontFamily: currentFont.fontFamily,
                  }}
                />

                <div className="mt-2.5 flex justify-between items-center text-xs text-white/70 font-mono-numbers px-1">
                  <span>{wordCount} Words · {charCount} Characters</span>
                  <span className="font-bold text-[#FF8A98]">
                    Est. Duration: ~{estimatedSeconds}s
                  </span>
                </div>

                {/* Smart Script Recognition & Locked Voice Status Bar */}
                <div className="mt-3 p-3 rounded-2xl bg-black/35 border border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2E4E3B] text-white font-bold text-[11px] border border-emerald-400/30">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{scriptRecognition.shortBadge}</span>
                    </span>
                    <span className="font-medium text-white/85">
                      {scriptRecognition.accentLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleVoiceLock}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        isVoiceLocked
                          ? 'bg-[#E14B5A]/20 border-[#FF8A98]/40 text-white'
                          : 'bg-white/[0.06] border-white/15 text-white/75 hover:text-white'
                      }`}
                      title="When locked, the exact same voice is used for every script until you manually change it"
                    >
                      {isVoiceLocked ? <Lock className="w-3 h-3 text-[#FF8A98]" /> : <Unlock className="w-3 h-3" />}
                      <span>
                        {isVoiceLocked
                          ? `Voice Locked: ${selectedVoice.name.split(' ')[0]}`
                          : 'Voice Unlocked'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Script Polish Toolbar */}
              <div className="pt-2 border-t border-white/10">
                <AiScriptEnhancer
                  currentText={scriptText}
                  onEnhanced={(newText) => {
                    setScriptText(newText);
                    setSuccessNotice(`Script enhanced! Using locked voice: ${selectedVoice.name}.`);
                  }}
                  onError={(err) => setErrorNotice(err)}
                />
              </div>

              {/* 2-Way Script Translation Feature (English <-> Hindi) */}
              <ScriptTranslator
                currentText={scriptText}
                onTranslated={(newText, targetLang) => {
                  setScriptText(newText);
                  if (isVoiceLocked) {
                    setSuccessNotice(
                      `Script translated into ${targetLang === 'hindi' ? 'Hindi (हिंदी)' : 'English'}! Keeping your locked voice (${selectedVoice.name}).`
                    );
                  } else if (targetLang === 'hindi') {
                    setVoiceFilter('hindi-male');
                    handleManualVoiceChange('indian-edu-siddharth');
                    setSuccessNotice('Script translated into Hindi (हिंदी)!');
                  } else {
                    setVoiceFilter('english-male');
                    handleManualVoiceChange('english-male-marcus');
                    setSuccessNotice('Script translated into English!');
                  }
                }}
                onError={(err) => setErrorNotice(err)}
              />
            </div>

            {/* 2. Voice & Performance Settings Card */}
            <div className="spatial-glass rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-6">
              {/* Voice Filter & Dropdown */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <label htmlFor="voice-select" className="text-base text-white flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#FF8A98]" />
                      <span className="font-bold-italic text-lg text-white">Voice</span>{' '}
                      <span className="font-syne font-bold uppercase tracking-wider text-sm text-[#FF8A98]">Cast</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleToggleVoiceLock}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        isVoiceLocked
                          ? 'bg-[#2E4E3B] text-white border-emerald-400/35'
                          : 'bg-white/[0.06] text-white/80 border-white/15 hover:text-white'
                      }`}
                      title="Keep the exact same voice across all scripts until manually changed"
                    >
                      {isVoiceLocked ? <Lock className="w-3 h-3 text-emerald-300" /> : <Unlock className="w-3 h-3" />}
                      <span>{isVoiceLocked ? 'Same Voice Locked' : 'Lock Voice'}</span>
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/12 text-xs">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'hindi-male', label: 'Indian / Hinglish' },
                        { id: 'english-male', label: 'Eng Male' },
                        { id: 'female', label: 'Female' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setVoiceFilter(t.id)}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                          voiceFilter === t.id
                            ? 'bg-[#E14B5A] text-white font-bold shadow-xs'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <select
                    id="voice-select"
                    value={selectedVoiceId}
                    onChange={(e) => handleManualVoiceChange(e.target.value)}
                    className="w-full bg-black/45 border border-white/18 hover:border-white/35 text-white text-base font-semibold rounded-2xl px-4 py-3.5 appearance-none focus:outline-none focus:border-[#E14B5A] cursor-pointer transition-all pr-12 shadow-inner font-serif-display"
                  >
                    {filteredVoiceList.map((v) => (
                      <option key={v.id} value={v.id} className="py-2 bg-[#111915] text-white">
                        {v.name} — {v.tone} ({v.accent})
                      </option>
                    ))}
                  </select>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FF8A98]">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/75 pt-0.5">
                  <p className="line-clamp-1 italic font-serif-display">{selectedVoice.description}</p>
                  <span className="font-mono-numbers font-bold text-[#FF8A98] ml-2 flex-shrink-0">
                    {selectedVoice.badge || selectedVoice.accent}
                  </span>
                </div>
              </div>

              {/* Emotional Mood Selection */}
              <div className="space-y-2.5 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold-italic text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8A98]" />
                    <span>Cadence &</span>{' '}
                    <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#FF8A98]">
                      Emotion
                    </span>
                  </span>
                  <span className="text-xs font-semibold italic text-[#FF8A98] font-serif-display">
                    {selectedEmotion.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EMOTIONS.map((em) => {
                    const isEmSelected = selectedEmotionId === em.id;
                    return (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => handleManualEmotionChange(em.id)}
                        className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isEmSelected
                            ? 'bg-[#E14B5A] text-white border-[#FF8A98]/50 shadow-sm font-bold'
                            : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/12 text-white/80 hover:text-white'
                        }`}
                      >
                        <div className="line-clamp-1 italic font-serif-display">{em.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label htmlFor="speed-slider" className="text-sm font-bold-italic text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF8A98]" />
                    <span>Tempo &</span>{' '}
                    <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#FF8A98]">
                      Speed
                    </span>
                  </label>
                  <span className="text-xs font-mono-numbers font-bold text-white bg-[#E14B5A] px-3 py-0.5 rounded-lg">
                    {speed.toFixed(2)}x
                  </span>
                </div>

                <input
                  id="speed-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => handleManualSpeedChange(parseFloat(e.target.value))}
                  className="w-full"
                />

                <div className="flex justify-between items-center text-xs text-white/70">
                  <span className="font-mono-numbers">0.5x Slow</span>
                  <div className="flex items-center gap-1.5">
                    {[0.85, 1.0, 1.15, 1.3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleManualSpeedChange(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono-numbers font-bold transition-all cursor-pointer ${
                          Math.abs(speed - val) < 0.03
                            ? 'bg-[#E14B5A] text-white'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border border-white/12'
                        }`}
                      >
                        {val}x
                      </button>
                    ))}
                  </div>
                  <span className="font-mono-numbers">2.0x Fast</span>
                </div>
              </div>

              {/* Real-time Daily Generation Quota & Remaining Counter */}
              <DailyQuotaTracker
                remainingChars={currentAvailableChars}
                maxCharsPerDay={MAX_CHARS_PER_DAY}
                remainingScripts={Math.max(0, MAX_SCRIPTS_PER_DAY - dailyUsage.scripts)}
                maxScriptsPerDay={MAX_SCRIPTS_PER_DAY}
                currentScriptLength={scriptText.length}
                isUnlimited={isUnlimited}
                onUpgradeClick={() => setIsPremiumOpen(true)}
                onManualReset={handleManualQuotaReset}
              />

              {/* Primary Action Button: Synthesize Voiceover */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  disabled={isGenerating || !scriptText.trim()}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base tracking-wider uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl active:scale-99 ${
                    isGenerating
                      ? 'bg-white/15 text-white cursor-wait border border-white/20'
                      : !scriptText.trim()
                      ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
                      : !user
                      ? 'bg-[#E14B5A] hover:bg-[#C83746] text-white border border-white/20'
                      : 'bg-[#2E4E3B] hover:bg-[#254030] text-white border border-emerald-400/30'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold-italic font-mono-numbers">
                        Synthesizing ({generationTime.toFixed(1)}s)...
                      </span>
                    </>
                  ) : !user ? (
                    <>
                      <AudioWaveform className="w-5 h-5" />
                      <span className="font-bold-italic text-lg">Sign In to Synthesize</span>
                      <span className="font-mono-numbers text-xs tracking-wide bg-black/30 px-2.5 py-0.5 rounded-lg text-white">
                        2,000 Free Chars
                      </span>
                    </>
                  ) : (
                    <>
                      <AudioWaveform className="w-5 h-5 text-emerald-300" />
                      <span className="font-bold-italic text-lg">Synthesize</span>
                      <span className="font-syne font-bold text-sm tracking-wide text-[#F0C05A]">Voiceover</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications */}
            {successNotice && (
              <div className="p-4 rounded-2xl bg-emerald-950/75 border border-emerald-400/35 text-emerald-100 text-xs flex items-center gap-3 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold flex-1 font-serif-display italic">{successNotice}</span>
                <button
                  type="button"
                  onClick={() => setSuccessNotice(null)}
                  className="text-xs text-emerald-300 hover:text-white underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {errorNotice && (
              <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-400/40 text-rose-100 text-xs flex items-center gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span className="font-semibold flex-1">{errorNotice}</span>
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  className="text-xs text-rose-200 hover:text-white underline font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 3. Master Studio Audio Player Card */}
            <div ref={playerSectionRef}>
              {activeClip && (
                <AudioPlayer
                  audioUrl={activeClip.audioUrl}
                  voiceName={activeClip.voiceName}
                  emotionLabel={activeClip.emotionLabel}
                  speedMultiplier={activeClip.speed}
                  engine={activeClip.engine}
                  scriptSnippet={activeClip.text}
                  onPlayingChange={setIsPlayingAudio}
                  onSpeedChange={(newSpd) => {
                    handleManualSpeedChange(newSpd);
                    setActiveClip((prev) => (prev ? { ...prev, speed: newSpd } : null));
                  }}
                  onResynthesize={(textToRegenerate) => {
                    setScriptText(textToRegenerate);
                    setErrorNotice(null);
                    setSuccessNotice(
                      `Loaded take into editor — click "Synthesize Voiceover" to generate fresh 24kHz audio with ${selectedVoice.name}.`
                    );
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Script Presets, Session History & Creator UPI Support (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Curated Scripts Card */}
            <div ref={presetsSectionRef} className="spatial-glass rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: currentTheme.accent }} />
                  <h3 className="text-base text-white">
                    <span className="font-bold-italic text-lg text-white">Curated</span>{' '}
                    <span
                      className="font-syne font-bold uppercase tracking-wider text-xs"
                      style={{ color: currentTheme.accent }}
                    >
                      Scripts
                    </span>
                  </h3>
                </div>
                <span className="text-[11px] font-mono-numbers text-white/50">
                  {SAMPLE_SCRIPTS.length} Studio Templates
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {SAMPLE_SCRIPTS.map((script) => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => handleSelectPresetScript(script)}
                    className="w-full text-left p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-sm font-bold-italic text-white group-hover:text-[#FF8A98] transition-colors line-clamp-1">
                        {script.title}
                      </span>
                      <span className="text-[10px] uppercase font-mono-numbers text-white/60 font-semibold flex-shrink-0">
                        {script.language === 'hindi' ? 'HI / HINGLISH' : 'EN'}
                      </span>
                    </div>
                    <p className="text-xs text-white/65 line-clamp-2 leading-relaxed italic font-serif-display">
                      {script.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Takes History Card */}
            <div ref={historySectionRef} className="spatial-glass rounded-[28px] p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: currentTheme.accent }} />
                  <h3 className="text-base text-white">
                    <span className="font-bold-italic text-lg text-white">Session</span>{' '}
                    <span
                      className="font-syne font-bold uppercase tracking-wider text-xs"
                      style={{ color: currentTheme.accent }}
                    >
                      Archive
                    </span>
                  </h3>
                </div>

                {clipHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-rose-500/20 text-white/80 hover:text-rose-200 border border-white/12 transition-all cursor-pointer"
                    title="Clear all generated recording history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {clipHistory.length === 0 ? (
                <div className="py-8 text-center text-white/65 space-y-2">
                  <Disc className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-bold-italic text-white/80">No voice takes recorded yet.</p>
                  <p className="text-[11px] text-white/50">
                    Synthesize your script to archive studio takes in your session reel.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {clipHistory.map((clip) => {
                    const isActive = activeClip?.id === clip.id;
                    return (
                      <div
                        key={clip.id}
                        onClick={() => setActiveClip(clip)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#E14B5A]/25 text-white border-[#FF8A98]/50 shadow-md'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isActive
                                ? 'bg-[#E14B5A] text-white'
                                : 'bg-white/[0.08] text-[#FF8A98]'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                          <div className="overflow-hidden">
                            <h5 className="text-xs line-clamp-1 font-bold-italic text-white">
                              {clip.title}
                            </h5>
                            <p className="text-[11px] line-clamp-1 text-white/60 font-mono-numbers">
                              {clip.voiceName.split(' ')[0]} · {clip.speed}x ·{' '}
                              {new Date(clip.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* WhatsApp Share for this take */}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              `🎙️ *VibeCast Take: ${clip.title}*\n🎭 *Voice:* ${clip.voiceName}\n📝 *Script:* "${clip.text.slice(0, 120)}..."\n\n🎧 *Listen in VibeCast Studio:* ${
                                typeof window !== 'undefined' ? window.location.href : 'https://vibecast.studio'
                              }`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 transition-all cursor-pointer"
                            title="Share take on WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                          </a>

                          {/* Individual delete */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTake(clip.id, e)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Delete take"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-white/50" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Creator Support & Direct UPI Card */}
            <div className="spatial-glass rounded-[28px] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#5F259F] text-white flex items-center justify-center font-bold text-xs shadow-sm border border-white/15">
                    पे
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-fraunces text-white">
                      UPI & Pro Studio Upgrade
                    </h3>
                    <p className="text-[11px] text-white/55">Union Bank of India - 0373</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPremiumOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E14B5A] hover:bg-[#C83746] text-white transition-all cursor-pointer shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                </button>
              </div>

              {/* UPI ID block */}
              <div className="flex items-center justify-between bg-black/35 px-3.5 py-2.5 rounded-xl border border-white/12">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/55 font-mono-numbers uppercase">UPI:</span>
                  <span className="font-mono-numbers font-bold text-xs text-white select-all">
                    7571889019@ybl
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('7571889019@ybl');
                    setSuccessNotice('UPI ID copied: 7571889019@ybl');
                  }}
                  className="text-xs font-bold text-[#FF8A98] hover:text-white cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

              {/* Email Support block */}
              <div className="flex items-center justify-between text-xs text-white/70 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="w-3.5 h-3.5 text-[#FF8A98] flex-shrink-0" />
                  <span className="font-mono-numbers truncate text-[11px]">
                    dubeyrishi135@gmail.com
                  </span>
                </div>
                <a
                  href="mailto:dubeyrishi135@gmail.com?subject=VibeCast%20Query%20%2F%20Premium%20Support"
                  className="font-bold text-emerald-300 hover:text-white flex-shrink-0 ml-2 transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Chat Assistant Modal */}
      <AiChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onInsertScript={(script) => {
          setScriptText(script);
          setSuccessNotice('Script inserted from AI Assistant.');
        }}
      />

      {/* Premium & UPI Payment Modal */}
      <PremiumModal
        isOpen={isPremiumOpen}
        onClose={() => setIsPremiumOpen(false)}
      />

      {/* User Auth & Credits Sign-In Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Admin vs Public Dual API Key Inspector Modal */}
      <AdminKeyModal
        isOpen={isAdminKeyModalOpen}
        onClose={() => setIsAdminKeyModalOpen(false)}
        currentUserEmail={user?.email}
      />

      {/* Theme and Font Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Clean Studio Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-white/10 text-xs text-white/60 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono-numbers relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold-italic text-sm text-white">VibeCast</span>
          <span>·</span>
          <span>Spatial AI Voice & Podcast Workstation</span>
          <span>·</span>
          <span className="text-[#F0C05A] font-bold">UPI: 7571889019@ybl</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="text-white/80 hover:text-white font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            <span>Theme: {currentTheme.name}</span>
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsPremiumOpen(true)}
            className="text-[#F0C05A] hover:underline font-bold cursor-pointer flex items-center gap-1"
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>Upgrade Pro</span>
          </button>
          <span>·</span>
          <span className="font-bold text-white/85">24kHz WAV · MP3 · OGG · AAC</span>
        </div>
      </footer>
    </div>
  );
}
