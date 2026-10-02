import React, { useState } from 'react';
import { SAMPLE_SCRIPTS } from '../data/voices';
import { SampleScript } from '../types';
import { Sparkles, BookOpen } from 'lucide-react';

interface ScriptPresetsProps {
  onSelectScript: (script: SampleScript) => void;
  selectedId?: string;
}

export const ScriptPresets: React.FC<ScriptPresetsProps> = ({
  onSelectScript,
  selectedId,
}) => {
  const [filterLang, setFilterLang] = useState<'all' | 'english' | 'hindi'>('all');

  const filteredScripts = SAMPLE_SCRIPTS.filter((s) =>
    filterLang === 'all' ? true : s.language === filterLang
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#B83848]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#FAF7EF] font-fraunces">
            Curated Editorial Scripts
          </h2>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-[#2C3F30] p-1 rounded-full border border-white/10 text-xs">
          {(['all', 'english', 'hindi'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterLang(tab)}
              className={`px-3.5 py-1 rounded-full capitalize font-semibold transition-all cursor-pointer ${
                filterLang === tab
                  ? 'bg-[#FAF7EF] text-[#2C3F30] shadow-sm font-bold'
                  : 'text-[#D0DBCF] hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Curations' : tab === 'english' ? 'English' : 'Hindi (हिंदी)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {filteredScripts.map((script) => {
          const isSelected = selectedId === script.id;
          return (
            <button
              key={script.id}
              onClick={() => onSelectScript(script)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'bg-[#FAF7EF] border-[#B83848] text-[#1C201C] shadow-lg ring-2 ring-[#B83848]/30'
                  : 'bg-[#FAF7EF]/90 hover:bg-[#FAF7EF] border-[#E0D7C9] text-[#1C201C] hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-sm font-bold font-serif-display text-[#1C201C] group-hover:text-[#B83848] transition-colors line-clamp-1">
                    {script.title.split('(')[0]}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-[#B83848] opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <p className="text-xs leading-relaxed text-[#5F6A60] group-hover:text-[#2E372F] line-clamp-2">
                  {script.text}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#EAE3D4] flex items-center justify-between text-[11px] text-[#7A857B]">
                <span className="text-[#B83848] font-bold capitalize">{script.category}</span>
                <span className="font-mono-numbers text-[#2C352E] font-semibold">{script.speed}x</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
