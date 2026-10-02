import React, { useState } from 'react';
import { Languages, ArrowRightLeft, Loader2, Undo2, Sparkles, Wand2, Feather } from 'lucide-react';
import { getApiHeaders } from '../utils/apiClient';

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
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: getApiHeaders(),
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
    <div className="pt-3.5 border-t border-[#E2DAD0] space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-[#B83848]" />
          <span className="text-sm text-[#1F261F]">
            <span className="font-bold-italic text-sm text-[#1F261F]">Bilingual</span>{' '}
            <span className="font-syne font-bold uppercase tracking-wider text-[11px] text-[#B83848]">
              Voice Translator
            </span>
          </span>
        </div>

        {/* Translation Nuance Style Selector */}
        <div className="flex items-center gap-1 bg-[#EAE3D2] p-1 rounded-full border border-[#D8CEBC] text-[11px]">
          <span className="text-[#6C776E] px-2 font-medium">Style:</span>
          {(
            [
              { id: 'natural', label: 'Natural Voice' },
              { id: 'emotional', label: 'Deep Emotion' },
              { id: 'poetic', label: 'Lyrical/Poetic' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStyle(s.id)}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                selectedStyle === s.id
                  ? 'bg-[#B83848] text-white shadow-xs font-bold'
                  : 'text-[#4A554D] hover:text-[#1F261F]'
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
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
              targetLangInProgress === 'hindi'
                ? 'bg-[#B83848] text-white cursor-wait'
                : isTranslating || !currentText.trim()
                ? 'bg-[#EAE3D4] text-[#8C988E] cursor-not-allowed border border-[#D5CABB]'
                : 'bg-[#FAF7EF] hover:bg-[#B83848] hover:text-white border border-[#B83848]/60 text-[#8C202F] active:scale-98'
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
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#B83848] group-hover:text-white" />
                <span className="font-extrabold">🇮🇳 Hindi (हिंदी)</span>
              </>
            )}
          </button>

          {/* Translate to English button */}
          <button
            type="button"
            onClick={() => handleTranslate('english')}
            disabled={isTranslating || !currentText.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
              targetLangInProgress === 'english'
                ? 'bg-[#2E4E3B] text-white cursor-wait'
                : isTranslating || !currentText.trim()
                ? 'bg-[#EAE3D4] text-[#8C988E] cursor-not-allowed border border-[#D5CABB]'
                : 'bg-[#FAF7EF] hover:bg-[#2E4E3B] hover:text-white border border-[#2E4E3B]/60 text-[#213F2C] active:scale-98'
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
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#2E4E3B] group-hover:text-white" />
                <span className="font-extrabold">🇺🇸 English</span>
              </>
            )}
          </button>
        </div>

        {/* Revert / Undo Translation Button */}
        {lastOriginalText && (
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-[#FAF7EF] hover:bg-[#EAE3D4] text-[#B83848] border border-[#B83848]/40 transition-colors cursor-pointer shadow-xs"
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
