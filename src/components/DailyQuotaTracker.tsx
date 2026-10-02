import React from 'react';
import { Zap, Clock, Crown } from 'lucide-react';

interface DailyQuotaTrackerProps {
  usedChars: number;
  usedScripts: number;
  maxCharsPerDay?: number;
  maxScriptsPerDay?: number;
  currentScriptLength: number;
  onUpgradeClick?: () => void;
}

export const DailyQuotaTracker: React.FC<DailyQuotaTrackerProps> = ({
  usedChars,
  usedScripts,
  maxCharsPerDay = 25000,
  maxScriptsPerDay = 40,
  currentScriptLength,
  onUpgradeClick,
}) => {
  const remainingChars = Math.max(0, maxCharsPerDay - usedChars);
  const remainingScripts = Math.max(0, maxScriptsPerDay - usedScripts);

  const percentCharsRemaining = Math.max(0, Math.min(100, (remainingChars / maxCharsPerDay) * 100));
  const charsAfterTake = Math.max(0, remainingChars - currentScriptLength);

  const isLow = remainingChars < 3000 || remainingScripts < 5;

  return (
    <div className="bg-[#FAF7EF] border-2 border-[#DFD6C7] rounded-2xl p-4 shadow-sm space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isLow ? 'bg-amber-100 text-amber-800' : 'bg-[#2E4E3B]/10 text-[#2E4E3B]'}`}>
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F261F]">
              <span className="font-bold-italic text-sm text-[#1F261F]">Daily Generation</span>{' '}
              <span className="font-syne font-bold uppercase tracking-wider text-[11px] text-[#B83848]">
                Quota Remaining
              </span>
            </h4>
          </div>
        </div>

        {/* Counter Pills & Upgrade button */}
        <div className="flex flex-wrap items-center gap-2 font-mono-numbers text-xs">
          <span className="bg-[#FAF7EF] px-3 py-1 rounded-full border border-[#DFD6C7] font-bold text-[#1F261F] shadow-2xs">
            <strong className="text-[#B83848] text-sm">{remainingChars.toLocaleString()}</strong> / {maxCharsPerDay.toLocaleString()} chars left
          </span>
          <span className="bg-[#FAF7EF] px-3 py-1 rounded-full border border-[#DFD6C7] font-bold text-[#1F261F] shadow-2xs">
            <strong className="text-[#2E4E3B] text-sm">{remainingScripts}</strong> / {maxScriptsPerDay} scripts left
          </span>
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B83848] hover:bg-[#9E2A3B] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Get Unlimited Characters & Priority Access"
            >
              <Crown className="w-3 h-3 text-[#F0C05A] fill-[#F0C05A]" />
              <span>Unlimited</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-[#EAE3D4] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#D8CEBC]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isLow
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-[#2E4E3B] via-[#437554] to-[#B83848]'
            }`}
            style={{ width: `${percentCharsRemaining}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-[#6A786D] pt-0.5">
          <span className="flex items-center gap-1 font-mono-numbers">
            {currentScriptLength > 0 ? (
              <>
                <span>Current script: <strong>{currentScriptLength} chars</strong></span>
                <span>·</span>
                <span>Remaining after take: <strong className="text-[#B83848]">{charsAfterTake.toLocaleString()}</strong></span>
              </>
            ) : (
              <span>Ready to voice your script</span>
            )}
          </span>

          <span className="flex items-center gap-1 font-medium text-[#7C887E]">
            <Clock className="w-3 h-3 text-[#B83848]" />
            <span>Resets daily at 12:00 AM</span>
          </span>
        </div>
      </div>
    </div>
  );
};
