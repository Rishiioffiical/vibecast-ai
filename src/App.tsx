import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  Sliders,
  AudioWaveform,
  Copy,
  Trash2,
  Check,
  Clock,
  History,
  Info,
  SlidersHorizontal,
  Flame,
  Radio,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Search,
  Mic,
  Disc,
  Headphones,
  FileText,
  ChevronRight,
  BookOpen,
  Crown,
  Mail,
  QrCode,
  ShieldCheck,
  Users,
  ArrowRightLeft,
  Palette,
  Type,
} from 'lucide-react';
import { ALL_VOICES, EMOTIONS, SAMPLE_SCRIPTS } from './data/voices';
import { VoiceOption, EmotionOption, GeneratedClip, SampleScript, VoiceLanguage } from './types';
import {
  callGeminiTts,
  estimateDurationSec,
} from './utils/audioSynthesis';
import { getActiveApiMode, subscribeApiMode, ApiMode } from './utils/apiClient';
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

export default function App() {
  const {
    currentTheme,
    currentThemeId,
    currentFont,
    currentFontId,
    editorFontSize,
  } = useTheme();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

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
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('english-male-marcus');
  const [selectedEmotionId, setSelectedEmotionId] = useState<string>('emotional-dramatic');
  const [speed, setSpeed] = useState<number>(1.0);

  // Auth Modal state
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'creator' | 'admin'>('creator');

  // Admin vs Public Key Modal & Mode state
  const [isAdminKeyModalOpen, setIsAdminKeyModalOpen] = useState<boolean>(false);
  const [apiMode, setApiMode] = useState<ApiMode>(getActiveApiMode());

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
        setSuccessNotice('🎉 Your daily credits have been refreshed to full allowance!');
      } else {
        setSuccessNotice('✅ Your credits are already up-to-date for today!');
      }
    } else {
      setDailyUsage({ chars: 0, scripts: 0 });
      try {
        localStorage.removeItem(getTodayDateKey());
      } catch (e) {}
      setSuccessNotice('🎉 Free guest daily quota has been refreshed!');
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

  const selectedVoice = ALL_VOICES.find((v) => v.id === selectedVoiceId) || ALL_VOICES[0];
  const selectedEmotion = EMOTIONS.find((e) => e.id === selectedEmotionId) || EMOTIONS[0];

  const estimatedSeconds = estimateDurationSec(scriptText, speed);
  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;

  // Filtered voice list
  const filteredVoiceList = ALL_VOICES.filter((v) => {
    if (voiceFilter === 'hindi-male') return v.language === 'hindi' && v.gender === 'male';
    if (voiceFilter === 'english-male') return v.language === 'english' && v.gender === 'male';
    if (voiceFilter === 'female') return v.gender === 'female';
    return true;
  });

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

  // Load user cloud takes when signed in
  useEffect(() => {
    if (user) {
      fetchUserTakes().then((cloudTakes) => {
        if (cloudTakes && cloudTakes.length > 0) {
          setClipHistory(cloudTakes);
          setActiveClip((prev) => prev || cloudTakes[0]);
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

    const isAdmin =
      !!user.email &&
      ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'].includes(user.email.trim().toLowerCase());

    // Check account credits for public users (2,000 character limit)
    if (!isAdmin && userProfile && !userProfile.isPremium && userProfile.credits < scriptText.length) {
      setErrorNotice(
        `Character limit reached! You have ${userProfile.credits.toLocaleString()} characters remaining from your 2,000 free allowance. Please upgrade via UPI to generate more.`
      );
      setIsPremiumOpen(true);
      return;
    }

    const remainingChars = Math.max(0, MAX_CHARS_PER_DAY - dailyUsage.chars);
    if (remainingChars <= 0) {
      setErrorNotice('You have reached your daily generation allowance of 25,000 characters. Quota resets at 12:00 AM midnight!');
      return;
    }

    setErrorNotice(null);
    setSuccessNotice(null);
    setIsGenerating(true);

    try {
      const result = await callGeminiTts({
        text: scriptText,
        voiceName: selectedVoice.geminiVoice,
        emotion: selectedEmotion.id,
        speed: speed,
        language: selectedVoice.language,
      });

      const newClip: GeneratedClip = {
        id: `clip-${Date.now()}`,
        title: scriptText.slice(0, 42).trim() + (scriptText.length > 42 ? '...' : ''),
        text: scriptText,
        audioUrl: result.audioUrl,
        voiceName: `${selectedVoice.name} (${selectedVoice.accent})`,
        language: selectedVoice.language,
        emotionLabel: selectedEmotion.label,
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
      setSuccessNotice(`Take synthesized with ${selectedVoice.name} (${scriptText.length} credits used)`);

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
    if (preset.recommendedVoiceId) {
      setSelectedVoiceId(preset.recommendedVoiceId);
      const matched = ALL_VOICES.find((v) => v.id === preset.recommendedVoiceId);
      if (matched) {
        if (matched.language === 'hindi') setVoiceFilter('hindi-male');
        else if (matched.language === 'english') setVoiceFilter('english-male');
      }
    }
    if (preset.recommendedEmotionId) {
      setSelectedEmotionId(preset.recommendedEmotionId);
    }
    if (preset.speed) {
      setSpeed(preset.speed);
    }
    setErrorNotice(null);
    setSuccessNotice(null);
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

  return (
    <div className="min-h-screen bg-[#344638] text-[#1E251F] font-['Plus_Jakarta_Sans',sans-serif] canvas-grid relative overflow-x-hidden selection:bg-[#B83848] selection:text-white">
      {/* VibeCast Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#B83848] via-[#9E2A3B] to-[#7D1F2D] text-white flex items-center justify-center shadow-xl border-2 border-[#FAF7EF] rotate-[-2deg] hover:rotate-0 transition-transform">
            <Radio className="w-7 h-7 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              {/* Bold Italic & Grotesque Typography Mashup */}
              <span className="font-bold-italic text-3xl sm:text-4xl text-[#FAF7EF] tracking-tight">
                Vibe
              </span>
              <span className="font-syne font-extrabold text-3xl sm:text-4xl text-[#F0C05A] tracking-tighter uppercase">
                Cast
              </span>
              <span className="ml-2 text-[10px] uppercase font-mono-numbers tracking-widest px-2.5 py-0.5 rounded-full bg-[#FAF7EF]/20 text-[#FAF7EF] font-bold border border-white/20">
                Studio AI
              </span>
            </div>
            <p className="text-xs text-[#CBD8CD] font-medium mt-0.5">
              <span className="italic font-serif-display font-semibold">Natural Voices</span> · Hindi & English Male Prosody · 24kHz Studio Output
            </p>
          </div>
        </div>

        {/* Header Action Buttons: User Account/Credits, Premium/UPI & AI Assistant */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Theme & Font Styling Button */}
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer border hover:scale-105 active:scale-95"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.cardBorder,
              color: currentTheme.textPrimary,
            }}
            title="Studio Theme & Font Styles (थीम व फॉन्ट सेटिंग)"
          >
            <div className="flex items-center gap-1">
              {currentTheme.swatchColors.map((color, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="font-mono-numbers text-[11px] font-bold">
              {currentTheme.name}
            </span>
            <span
              className="text-[10px] hidden sm:inline"
              style={{ color: currentTheme.textSecondary }}
            >
              · {currentFont.name}
            </span>
          </button>

          <UserAccountBadge
            onOpenAuth={() => {
              setAuthModalTab('creator');
              setIsAuthOpen(true);
            }}
            onOpenPremium={() => setIsPremiumOpen(true)}
            onOpenAdminKey={() => {
              if (user) {
                setIsAdminKeyModalOpen(true);
              } else {
                setAuthModalTab('admin');
                setIsAuthOpen(true);
              }
            }}
          />

          <button
            onClick={() => setIsPremiumOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#B83848] via-[#9E2A3B] to-[#7D1F2D] hover:from-[#A0283A] hover:to-[#6E1824] text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-[#FAF7EF]/30 active:scale-98"
          >
            <Crown className="w-4 h-4 text-[#F0C05A] fill-[#F0C05A]" />
            <span className="font-syne font-bold uppercase tracking-wide">Premium & Support</span>
          </button>

          <button
            onClick={() => setIsChatOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF7EF] hover:bg-[#EFE7D8] text-[#1F261F] text-xs font-bold transition-all shadow-md cursor-pointer border border-[#E0D7C9] active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-[#B83848]" />
            <span className="font-bold-italic text-sm">VibeCast</span>
            <span className="font-medium">Script AI</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workstation */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT COLUMN: Main Voiceover Console & Player (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Script Writing Card with Bold Italic Typography Mashup */}
            <div className="card-cream rounded-[28px] p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2DAD0]">
                <div className="flex items-center gap-2">
                  <label htmlFor="script-textarea" className="text-base text-[#1F261F]">
                    <span className="font-bold-italic text-lg text-[#1F261F]">Script &</span>{' '}
                    <span className="font-syne font-bold uppercase tracking-wide text-sm text-[#B83848]">Dialogue Editor</span>
                  </label>
                  <span className="text-xs font-bold-italic text-[#B83848] bg-[#B83848]/10 px-2.5 py-0.5 rounded-full">
                    Hindi & English
                  </span>
                </div>

                {/* Toolbar Buttons: Dictate, Font Selector, Copy, Clear */}
                <div className="flex flex-wrap items-center gap-2">
                  <AudioTranscriber
                    onTranscriptionComplete={handleTranscriptionComplete}
                    onError={(err) => setErrorNotice(err)}
                  />

                  {/* Quick Font Selector Pill */}
                  <button
                    type="button"
                    onClick={() => setIsThemeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 active:scale-95 shadow-2xs"
                    style={{
                      backgroundColor: currentTheme.inputBg,
                      borderColor: currentTheme.cardBorder,
                      color: currentTheme.textPrimary,
                    }}
                    title="Change Script Font Style"
                  >
                    <Type className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
                    <span className="font-bold">{currentFont.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F4EFE6] hover:bg-[#EAE3D4] text-[#4A554D] hover:text-[#1F261F] border border-[#DFD6C7] transition-colors cursor-pointer"
                    title="Copy script"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F4EFE6] hover:bg-rose-50 text-[#4A554D] hover:text-[#B83848] border border-[#DFD6C7] hover:border-[#B83848]/40 transition-colors cursor-pointer"
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
                  placeholder="Type your Hindi or English voiceover script here or click 'Dictate' to speak with your mic..."
                  className={`w-full rounded-2xl p-4 sm:p-5 outline-none transition-all resize-y shadow-inner border ${
                    editorFontSize === 'normal'
                      ? 'text-base leading-relaxed'
                      : editorFontSize === 'huge'
                      ? 'text-xl sm:text-2xl leading-loose font-medium'
                      : 'text-base sm:text-lg leading-relaxed'
                  }`}
                  style={{
                    backgroundColor: currentTheme.inputBg,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                    fontFamily: currentFont.fontFamily,
                  }}
                />

                <div className="mt-2.5 flex justify-between items-center text-xs text-[#6F7C71] font-mono-numbers px-1">
                  <span>{wordCount} Words · {charCount} Characters</span>
                  <span className="font-bold text-[#B83848] bg-[#B83848]/10 px-2 py-0.5 rounded-md">
                    Estimated Duration: ~{estimatedSeconds}s
                  </span>
                </div>
              </div>

              {/* AI Script Polish Toolbar */}
              <div className="pt-2 border-t border-[#E2DAD0]">
                <AiScriptEnhancer
                  currentText={scriptText}
                  onEnhanced={(newText) => {
                    setScriptText(newText);
                    setSuccessNotice('Script enhanced with AI!');
                  }}
                  onError={(err) => setErrorNotice(err)}
                />
              </div>

              {/* 2-Way Script Translation Feature (English <-> Hindi) */}
              <ScriptTranslator
                currentText={scriptText}
                onTranslated={(newText, targetLang) => {
                  setScriptText(newText);
                  if (targetLang === 'hindi') {
                    setVoiceFilter('hindi-male');
                    setSelectedVoiceId('hindi-male-kabir');
                    setSuccessNotice('Script translated into Hindi (हिंदी)! Switched to Kabir voice.');
                  } else {
                    setVoiceFilter('english-male');
                    setSelectedVoiceId('english-male-marcus');
                    setSuccessNotice('Script translated into English! Switched to Marcus voice.');
                  }
                }}
                onError={(err) => setErrorNotice(err)}
              />
            </div>

            {/* 2. Voice & Performance Settings Card */}
            <div className="card-cream rounded-[28px] p-6 sm:p-7 shadow-xl space-y-6">
              {/* Voice Filter & Dropdown */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="voice-select" className="text-base text-[#1F261F] flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#B83848]" />
                    <span className="font-bold-italic text-lg text-[#1F261F]">Voice</span>{' '}
                    <span className="font-syne font-bold uppercase tracking-wider text-sm text-[#B83848]">Cast</span>
                  </label>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#EAE3D2] p-1 rounded-full border border-[#D8CEBC] text-xs">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'hindi-male', label: '🇮🇳 Hindi Male' },
                        { id: 'english-male', label: '🇺🇸 Eng Male' },
                        { id: 'female', label: 'Female' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setVoiceFilter(t.id)}
                        className={`px-3 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                          voiceFilter === t.id
                            ? 'bg-[#B83848] text-white shadow-xs font-bold'
                            : 'text-[#4A554D] hover:text-[#1F261F]'
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
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full bg-[#F4EFE6] border-2 border-[#DFD6C7] hover:border-[#B83848] text-[#1F261F] text-base font-semibold rounded-2xl px-4 py-3.5 appearance-none focus:outline-none focus:border-[#B83848] cursor-pointer transition-all pr-12 shadow-sm font-serif-display"
                  >
                    {filteredVoiceList.map((v) => (
                      <option key={v.id} value={v.id} className="py-2 bg-white text-[#1F261F]">
                        {v.name} — {v.tone} ({v.accent})
                      </option>
                    ))}
                  </select>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#B83848]">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C6E60] pt-0.5">
                  <p className="line-clamp-1 italic font-serif-display">{selectedVoice.description}</p>
                  <span className="font-mono-numbers font-bold text-[#B83848] bg-[#B83848]/10 px-2.5 py-0.5 rounded ml-2 flex-shrink-0">
                    {selectedVoice.badge || selectedVoice.accent}
                  </span>
                </div>
              </div>

              {/* Emotional Mood Selection */}
              <div className="space-y-2.5 pt-3 border-t border-[#E2DAD0]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold-italic text-[#1F261F] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B83848]" />
                    <span>Cadence &</span> <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#B83848]">Emotion</span>
                  </span>
                  <span className="text-xs font-semibold italic text-[#B83848] font-serif-display">
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
                        onClick={() => setSelectedEmotionId(em.id)}
                        className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isEmSelected
                            ? 'bg-[#B83848] text-white border-[#B83848] shadow-sm font-bold'
                            : 'bg-[#F4EFE6] hover:bg-[#EAE3D4] border-[#DFD6C7] text-[#364238]'
                        }`}
                      >
                        <div className="line-clamp-1 italic font-serif-display">{em.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-3 pt-3 border-t border-[#E2DAD0]">
                <div className="flex items-center justify-between">
                  <label htmlFor="speed-slider" className="text-sm font-bold-italic text-[#1F261F] flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#B83848]" />
                    <span>Tempo &</span> <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#B83848]">Speed</span>
                  </label>
                  <span className="text-xs font-mono-numbers font-bold text-white bg-[#B83848] px-3 py-0.5 rounded-full shadow-xs">
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
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />

                <div className="flex justify-between items-center text-xs text-[#5C6E60]">
                  <span className="font-mono-numbers">0.5x Slow</span>
                  <div className="flex items-center gap-2">
                    {[0.85, 1.0, 1.15, 1.3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSpeed(val)}
                        className={`px-3 py-1 rounded-full text-xs font-mono-numbers font-bold transition-all cursor-pointer ${
                          Math.abs(speed - val) < 0.03
                            ? 'bg-[#B83848] text-white shadow-xs'
                            : 'bg-[#F4EFE6] hover:bg-[#EAE3D4] text-[#4A554D] border border-[#DFD6C7]'
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

              {/* Prominent Action Button: Generate Audio with Bold Italic Mashup */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateAudio}
                  disabled={isGenerating || !scriptText.trim()}
                  className={`w-full py-4.5 px-6 rounded-full font-bold text-base tracking-wider uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl active:scale-98 ${
                    isGenerating
                      ? 'bg-[#7A8E7F] text-white cursor-wait'
                      : !scriptText.trim()
                      ? 'bg-[#C2CCC4] text-white/80 cursor-not-allowed'
                      : !user
                      ? 'bg-[#B83848] hover:bg-[#9E2A3B] text-white hover:shadow-2xl'
                      : 'bg-[#2E4E3B] hover:bg-[#233C2D] text-white hover:shadow-2xl'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold-italic">Synthesizing ({generationTime}s)...</span>
                    </>
                  ) : !user ? (
                    <>
                      <AudioWaveform className="w-5 h-5" />
                      <span className="font-bold-italic text-lg">Sign In to Synthesize</span>
                      <span className="font-syne font-bold text-xs tracking-wide bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                        2,000 Free Chars
                      </span>
                    </>
                  ) : (
                    <>
                      <AudioWaveform className="w-5 h-5" />
                      <span className="font-bold-italic text-lg">Synthesize</span>
                      <span className="font-syne font-bold text-sm tracking-wide text-[#F0C05A]">Voiceover</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notifications */}
            {successNotice && (
              <div className="p-4 rounded-2xl bg-[#E8F0EA] border border-[#2E4E3B]/40 text-[#21432D] text-xs flex items-center gap-3 shadow-md">
                <CheckCircle2 className="w-5 h-5 text-[#2E4E3B] flex-shrink-0" />
                <span className="font-semibold flex-1 font-serif-display italic">{successNotice}</span>
                <button onClick={() => setSuccessNotice(null)} className="text-xs underline cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {errorNotice && (
              <div className="p-4 rounded-2xl bg-[#FCECEE] border border-[#B83848]/40 text-[#8B202D] text-xs flex items-center gap-3 shadow-md">
                <AlertTriangle className="w-5 h-5 text-[#B83848] flex-shrink-0" />
                <span className="font-semibold flex-1">{errorNotice}</span>
                <button onClick={handleGenerateAudio} className="text-xs underline font-bold cursor-pointer">
                  Retry
                </button>
              </div>
            )}

            {/* 3. Master WaveSurfer Player Card */}
            <div ref={playerSectionRef}>
              {activeClip ? (
                <AudioPlayer
                  audioUrl={activeClip.audioUrl}
                  voiceName={activeClip.voiceName}
                  emotionLabel={activeClip.emotionLabel}
                  speedMultiplier={activeClip.speed}
                  engine={activeClip.engine}
                  scriptSnippet={activeClip.text}
                  onSpeedChange={(newSpd) => {
                    setSpeed(newSpd);
                    setActiveClip((prev) => (prev ? { ...prev, speed: newSpd } : null));
                  }}
                />
              ) : (
                /* Ready State Showcase before first take with WhatsApp Share */
                <div className="card-cream rounded-[32px] p-6 sm:p-8 text-center border-2 border-dashed border-[#D8CEBC] space-y-4 shadow-sm">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#EAE3D2] text-[#B83848] flex items-center justify-center shadow-inner">
                    <AudioWaveform className="w-7 h-7 stroke-[2.2] animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold-italic text-[#1F261F]">
                      Studio Audio Station & Player
                    </h4>
                    <p className="text-xs text-[#5C6E60] max-w-md mx-auto leading-relaxed">
                      Click <strong>"Synthesize Voiceover"</strong> above to generate 24kHz studio audio with WaveSurfer visualizer, direct WAV export, and WhatsApp sharing.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleGenerateAudio}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B83848] hover:bg-[#9E2A3B] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Synthesize Now</span>
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `🎙️ *VibeCast Studio AI - Hindi & English Voiceover Studio*\n📝 *Script:* "${scriptText.slice(0, 100)}..."\n\n🎧 *Try it live:* ${typeof window !== 'undefined' ? window.location.href : 'https://vibecast.studio'}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      title="Share script on WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Script Presets & Session History with Clear Option (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Script Templates with Bold Italic Mashup */}
            <div className="card-cream rounded-[28px] p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E2DAD0]">
                <BookOpen className="w-4 h-4 text-[#B83848]" />
                <h3 className="text-base text-[#1F261F]">
                  <span className="font-bold-italic text-lg text-[#1F261F]">Curated</span>{' '}
                  <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#B83848]">Scripts</span>
                </h3>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {SAMPLE_SCRIPTS.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => handleSelectPresetScript(script)}
                    className="w-full text-left p-3.5 rounded-2xl bg-[#F4EFE6] hover:bg-[#FAF7EF] border border-[#DFD6C7] hover:border-[#B83848] transition-all cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold-italic text-[#1F261F] group-hover:text-[#B83848] transition-colors line-clamp-1">
                        {script.title}
                      </span>
                      <span className="text-[10px] uppercase font-mono-numbers px-2 py-0.5 rounded-full bg-[#B83848]/10 text-[#B83848] font-bold">
                        {script.language === 'hindi' ? 'Hindi' : 'English'}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6E60] line-clamp-2 leading-relaxed italic font-serif-display">
                      {script.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Session Takes History with PROMINENT "CLEAR HISTORY" OPTION */}
            <div className="card-cream rounded-[28px] p-6 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DAD0]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#B83848]" />
                  <h3 className="text-base text-[#1F261F]">
                    <span className="font-bold-italic text-lg text-[#1F261F]">Session</span>{' '}
                    <span className="font-syne font-bold uppercase tracking-wider text-xs text-[#B83848]">History</span>
                  </h3>
                </div>

                {/* CLEAR HISTORY OPTION */}
                {clipHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F4EFE6] hover:bg-rose-50 text-[#8C2A38] border border-[#DFD6C7] hover:border-rose-300 transition-all cursor-pointer shadow-xs"
                    title="Clear all generated recording history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {clipHistory.length === 0 ? (
                <div className="py-8 text-center text-[#7A877C] space-y-2">
                  <Disc className="w-8 h-8 mx-auto opacity-40 animate-pulse" />
                  <p className="text-xs font-bold-italic">No voice takes recorded yet.</p>
                  <p className="text-[11px] text-[#93A196]">Synthesize your script to save takes in your VibeCast reel.</p>
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
                            ? 'bg-[#B83848] text-white border-[#B83848] shadow-md'
                            : 'bg-[#F4EFE6] hover:bg-[#FAF7EF] border-[#DFD6C7] text-[#1F261F]'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'bg-white text-[#B83848]' : 'bg-[#EAE3D2] text-[#B83848]'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                          <div className="overflow-hidden">
                            <h5 className="text-xs line-clamp-1 font-bold-italic">
                              {clip.title}
                            </h5>
                            <p className={`text-[11px] line-clamp-1 ${isActive ? 'text-white/80' : 'text-[#6F7C71]'}`}>
                              {clip.voiceName.split(' ')[0]} ({clip.language}) · {clip.speed}x ·{' '}
                              {new Date(clip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* WhatsApp Share for this take */}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              `🎙️ *VibeCast Take: ${clip.title}*\n🎭 *Voice:* ${clip.voiceName}\n📝 *Script:* "${clip.text.slice(0, 120)}..."\n\n🎧 *Listen in VibeCast Studio:* ${typeof window !== 'undefined' ? window.location.href : 'https://vibecast.studio'}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white transition-all shadow-xs cursor-pointer"
                            title="Share take on WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                          </a>

                          {/* Individual delete */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTake(clip.id, e)}
                            className={`p-1.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer ${
                              isActive ? 'text-white/80 hover:text-white' : 'text-[#8A968C] hover:text-[#B83848]'
                            }`}
                            title="Delete take"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8A968C]'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Creator Support & UPI Payment Card */}
            <div className="card-cream rounded-[28px] p-6 shadow-xl space-y-4 border-2 border-[#D8CEBC]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DAD0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#5F259F] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    पे
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-fraunces text-[#1F261F] flex items-center gap-1.5">
                      <span>UPI & Premium Support</span>
                      <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-[#B83848]/10 text-[#B83848] font-bold">
                        Direct
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPremiumOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#B83848] hover:bg-[#9E2A3B] text-white transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                </button>
              </div>

              {/* UPI ID block */}
              <div className="p-3.5 rounded-2xl bg-[#F4EFE6] border border-[#DFD6C7] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#556357]">UPI ID:</span>
                  <span className="text-[11px] text-[#7A877C]">Union Bank of India - 0373</span>
                </div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#DFD6C7]">
                  <span className="font-mono-numbers font-bold text-xs text-[#1F261F] select-all">
                    7571889019@ybl
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('7571889019@ybl');
                      setSuccessNotice('UPI ID copied: 7571889019@ybl');
                    }}
                    className="text-xs font-bold text-[#B83848] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Email Support block */}
              <div className="flex items-center justify-between text-xs text-[#4A574C] p-2.5 rounded-xl bg-[#F4EFE6] border border-[#DFD6C7]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Mail className="w-4 h-4 text-[#B83848] flex-shrink-0" />
                  <span className="font-mono-numbers font-semibold truncate text-[11px]">
                    dubeyrishi135@gmail.com
                  </span>
                </div>
                <a
                  href="mailto:dubeyrishi135@gmail.com?subject=VibeCast%20Query%20%2F%20Premium%20Support"
                  className="font-bold text-[#2E4E3B] hover:underline flex-shrink-0 ml-2"
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
          setSuccessNotice('Script inserted from AI Assistant!');
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
        initialTab={authModalTab}
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

      {/* Clean Studio Footer with Contact & UPI */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-white/10 text-xs text-[#CBD8CD] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono-numbers">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold-italic text-sm text-white">VibeCast</span>
          <span>·</span>
          <span>Studio AI Audio & Podcast Generator</span>
          <span>·</span>
          <span className="text-[#F0C05A] font-bold">UPI: 7571889019@ybl</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="text-[#FAF7EF] hover:text-[#F0C05A] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Choose Themes and Fonts"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            <span>🎨 Theme: {currentTheme.name}</span>
          </button>
          <span>·</span>
          {!user && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('admin');
                  setIsAuthOpen(true);
                }}
                className="text-[#F0C05A] hover:underline font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 fill-[#F0C05A]" />
                <span>👑 Admin Sign In / Sign Up</span>
              </button>
              <span>·</span>
            </>
          )}
          <a
            href="mailto:dubeyrishi135@gmail.com"
            className="hover:text-white underline transition-colors"
          >
            Support: dubeyrishi135@gmail.com
          </a>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsAdminKeyModalOpen(true)}
            className="text-[#8E9F91] hover:text-white underline transition-colors cursor-pointer"
          >
            Admin & Key Settings
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsPremiumOpen(true)}
            className="text-[#F0C05A] hover:underline font-bold cursor-pointer flex items-center gap-1"
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>Upgrade Premium</span>
          </button>
          <span>·</span>
          <span className="font-bold text-[#FAF7EF]">24kHz WAV</span>
        </div>
      </footer>
    </div>
  );
}
