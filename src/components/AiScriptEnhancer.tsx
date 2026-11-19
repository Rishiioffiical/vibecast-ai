import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, Flame, Feather, BookOpen } from 'lucide-react';
import { getAsyncApiHeaders } from '../utils/apiClient';

interface AiScriptEnhancerProps {
  currentText: string;
  onEnhanced: (newText: string) => void;
  onError: (error: string) => void;
}

export const AiScriptEnhancer: React.FC<AiScriptEnhancerProps> = ({
  currentText,
  onEnhanced,
  onError,
}) => {
  const [activeType, setActiveType] = useState<string | null>(null);

  const handleEnhance = async (type: string) => {
    if (!currentText.trim()) {
      onError('Please enter some script text first to enhance.');
      return;
    }

    setActiveType(type);

    try {
      const headers = await getAsyncApiHeaders();
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: currentText,
          type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to enhance script');
      }

      const data = await response.json();
      if (data.result) {
        onEnhanced(data.result);
      }
    } catch (err: any) {
      console.error('Enhance error:', err);
      onError(err.message || 'AI Script enhancement failed.');
    } finally {
      setActiveType(null);
    }
  };

  const enhanceButtons = [
    {
      id: 'emotional',
      label: 'Deep Emotional',
      icon: Wand2,
      hint: 'Add emotional resonance, depth and touching cadence',
    },
    {
      id: 'dramatic',
      label: 'Cinematic Drama',
      icon: Flame,
      hint: 'Rewrite into powerful trailer or theatrical monologue',
    },
    {
      id: 'poetic',
      label: 'Poetic & Lyrical',
      icon: Feather,
      hint: 'Add lyrical metaphors and poetic cadence',
    },
    {
      id: 'expand',
      label: 'Expand Story',
      icon: BookOpen,
      hint: 'Develop into a rich, full voice narration',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-xs font-semibold text-white/65 flex items-center gap-1.5 pr-1">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-color)]" />
        <span>Tone Polisher:</span>
      </span>

      {enhanceButtons.map((btn) => {
        const isLoading = activeType === btn.id;
        const Icon = btn.icon;

        return (
          <button
            key={btn.id}
            type="button"
            onClick={() => handleEnhance(btn.id)}
            disabled={activeType !== null}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isLoading
                ? 'bg-[var(--accent-color)] text-white cursor-wait'
                : activeType !== null
                ? 'opacity-45 cursor-not-allowed bg-white/[0.04] text-white/50 border border-white/10'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-white/90 hover:text-white hover:border-white/25'
            }`}
            title={btn.hint}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            )}
            <span>{btn.label}</span>
          </button>
        );
      })}
    </div>
  );
};
