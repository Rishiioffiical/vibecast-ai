import React, { useState } from 'react';
import { Languages, ArrowRightLeft, Loader2, Undo2 } from 'lucide-react';
import { getAsyncApiHeaders } from '../utils/apiClient';

interface ScriptTranslatorProps {
  currentText: string;
  onTranslated: (newText: string, targetLang: 'hindi' | 'english') => void;
  onError: (error: string) => void;
}

export const ScriptTranslator: React.FC<ScriptTranslatorProps> = ({
  currentText,
  onTranslated,
  onError,
}) => {
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [targetLangInProgress, setTargetLangInProgress] = useState<'hindi' | 'english' | null>(null);
  const [lastOriginalText, setLastOriginalText] = useState<string | null>(null);
  const [recentlyTranslated, setRecentlyTranslated] = useState<'hindi' | 'english' | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'natural' | 'emotional' | 'poetic'>('natural');

  const handleTranslate = async (targetLang: 'hindi' | 'english') => {
    if (!currentText || !currentText.trim()) {
      onError('Please write or paste a script first before translating.');
      return;
    }

    setIsTranslating(true);
    setTargetLangInProgress(targetLang);

    try {
      const headers = await getAsyncApiHeaders();
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: currentText,
          targetLang,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Translation request failed on server');
      }

      const data = await response.json();
      if (!data.translatedText) {
        throw new Error('No translated text received from AI engine.');
      }

      setLastOriginalText(currentText);
      setRecentlyTranslated(targetLang);
      onTranslated(data.translatedText, targetLang);
    } catch (err: any) {
      console.error('Translation error:', err);
      onError(err.message || 'Failed to translate script.');
    } finally {
      setIsTranslating(false);
      setTargetLangInProgress(null);
    }
  };

  const handleUndo = () => {
    if (lastOriginalText) {
      const original = lastOriginalText;
      const prevLang = recentlyTranslated === 'hindi' ? 'english' : 'hindi';
      setLastOriginalText(null);
      setRecentlyTranslated(null);
      onTranslated(original, prevLang);
    }
  };

  return (
    <div className="pt-3.5 border-t border-white/12 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-[var(--accent-color)]" />
          <span className="text-sm font-semibold text-white">
            Bilingual Voice Translator
          </span>
        </div>

        {/* Translation Nuance Style Selector */}
        <div className="flex items-center gap-1 bg-black/35 p-1 rounded-xl border border-white/12 text-xs">
          {(
            [
              { id: 'natural', label: 'Natural' },
              { id: 'emotional', label: 'Emotional' },
              { id: 'poetic', label: 'Poetic' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStyle(s.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedStyle === s.id
                  ? 'bg-[var(--accent-color)] text-white shadow-xs'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Translate to Hindi button */}
          <button
            type="button"
            onClick={() => handleTranslate('hindi')}
            disabled={isTranslating || !currentText.trim()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              targetLangInProgress === 'hindi'
                ? 'bg-[var(--accent-color)] text-white cursor-wait'
                : isTranslating || !currentText.trim()
                ? 'bg-white/[0.04] text-white/40 cursor-not-allowed border border-white/10'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white hover:border-white/30'
            }`}
            title="Translate English or Hinglish script into expressive spoken Devanagari Hindi"
          >
            {targetLangInProgress === 'hindi' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Translating to Hindi...</span>
              </>
            ) : (
              <>
                <span>English / Hinglish</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span className="font-bold">Hindi (हिंदी)</span>
              </>
            )}
          </button>

          {/* Translate to English button */}
          <button
            type="button"
            onClick={() => handleTranslate('english')}
            disabled={isTranslating || !currentText.trim()}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              targetLangInProgress === 'english'
                ? 'bg-[#2E4E3B] text-white cursor-wait'
                : isTranslating || !currentText.trim()
                ? 'bg-white/[0.04] text-white/40 cursor-not-allowed border border-white/10'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white hover:border-white/30'
            }`}
            title="Translate Hindi script into natural spoken English"
          >
            {targetLangInProgress === 'english' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Translating to English...</span>
              </>
            ) : (
              <>
                <span>Hindi (हिंदी)</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#38D9A9]" />
                <span className="font-bold">English</span>
              </>
            )}
          </button>
        </div>

        {/* Revert / Undo Translation Button */}
        {lastOriginalText && (
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.07] hover:bg-white/[0.14] text-[var(--accent-color)] border border-white/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Revert back to your previous script text"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Revert Script</span>
          </button>
        )}
      </div>
    </div>
  );
};
