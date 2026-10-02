import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, Flame, Feather, BookOpen } from 'lucide-react';
import { getApiHeaders } from '../utils/apiClient';

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
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: getApiHeaders(),
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
      <span className="text-xs font-fraunces font-bold text-[#B83848] flex items-center gap-1 pr-1">
        <Sparkles className="w-3.5 h-3.5 text-[#B83848]" />
        Tone Polisher:
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isLoading
                ? 'bg-[#B83848] text-white cursor-wait'
                : activeType !== null
                ? 'opacity-50 cursor-not-allowed bg-[#EFE9DB] text-[#8C988D]'
                : 'bg-[#F2ECE0] hover:bg-[#FAF7EF] border border-[#D5CABB] text-[#2C382E] hover:text-[#B83848] hover:border-[#B83848] shadow-xs'
            }`}
            title={btn.hint}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-white" />
            ) : (
              <Icon className="w-3 h-3 text-[#B83848]" />
            )}
            <span>{btn.label}</span>
          </button>
        );
      })}
    </div>
  );
};
