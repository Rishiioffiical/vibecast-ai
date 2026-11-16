import React, { useState, useEffect } from 'react';
import { Zap, Clock, Crown, RotateCcw, CheckCircle2 } from 'lucide-react';

interface DailyQuotaTrackerProps {
  remainingChars: number;
  maxCharsPerDay: number;
  remainingScripts?: number;
  maxScriptsPerDay?: number;
  currentScriptLength: number;
  isUnlimited?: boolean;
  onUpgradeClick?: () => void;
  onManualReset?: () => Promise<boolean | void>;
}

export const DailyQuotaTracker: React.FC<DailyQuotaTrackerProps> = ({
  remainingChars,
  maxCharsPerDay,
  remainingScripts = 40,
  maxScriptsPerDay = 40,
  currentScriptLength,
  isUnlimited = false,
  onUpgradeClick,
  onManualReset,
}) => {
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrowMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0
      );
      const diffMs = tomorrowMidnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilMidnight(`${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleResetClick = async () => {
    if (!onManualReset || isResetting) return;
    setIsResetting(true);
    try {
      await onManualReset();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } finally {
      setIsResetting(false);
    }
  };

  const effectiveRemaining = isUnlimited ? maxCharsPerDay : Math.max(0, remainingChars);
  const percentCharsRemaining = isUnlimited
    ? 100
    : Math.max(0, Math.min(100, (effectiveRemaining / Math.max(1, maxCharsPerDay)) * 100));

  const charsAfterTake = isUnlimited
    ? 'Unlimited'
    : Math.max(0, effectiveRemaining - currentScriptLength).toLocaleString();

  const isLow = !isUnlimited && effectiveRemaining < 400;

  return (
    <div className="pt-3 border-t border-white/12 space-y-2.5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          {isUnlimited ? (
            <Crown className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          )}
          <span className="font-semibold text-white">Daily Studio Quota</span>
          <span className="text-white/40" aria-hidden="true">·</span>
          <span className="font-mono-numbers text-white/80">
            {isUnlimited ? (
              <strong className="text-amber-300">Unlimited Characters</strong>
            ) : (
              <>
                <strong className="text-white">{effectiveRemaining.toLocaleString()}</strong> /{' '}
                {maxCharsPerDay.toLocaleString()} chars
                {remainingScripts !== undefined && ` · ${remainingScripts}/${maxScriptsPerDay} takes`}
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onManualReset && (
            <button
              type="button"
              onClick={handleResetClick}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/85 hover:text-white border border-white/12 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Refresh daily quota"
            >
              {resetSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Synced</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`w-3 h-3 text-white/75 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Sync Quota</span>
                </>
              )}
            </button>
          )}

          {onUpgradeClick && !isUnlimited && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold transition-opacity cursor-pointer whitespace-nowrap shrink-0"
            >
              <Crown className="w-3 h-3 text-amber-200" />
              <span>Upgrade Unlimited</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isUnlimited
              ? 'bg-amber-400'
              : isLow
              ? 'bg-rose-500'
              : 'bg-[var(--soundstage-color)]'
          }`}
          style={{ width: `${percentCharsRemaining}%` }}
        />
      </div>

      <div className="flex flex-wrap justify-between items-center text-[11px] text-white/60 font-mono-numbers gap-2">
        <span>
          {currentScriptLength > 0 ? (
            <>
              Script: <strong className="text-white/90">{currentScriptLength} chars</strong> · After take:{' '}
              <strong className="text-[var(--accent-color)]">{charsAfterTake}</strong>
            </>
          ) : (
            'Ready to synthesize 24kHz voiceover'
          )}
        </span>

        <span className="flex items-center gap-1 text-white/60">
          <Clock className="w-3 h-3 text-[var(--accent-color)]" />
          <span>
            Resets 12:00 AM {timeUntilMidnight ? `(${timeUntilMidnight})` : ''}
          </span>
        </span>
      </div>
    </div>
  );
};
