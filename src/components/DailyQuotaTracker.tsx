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

  // Live countdown to local 12:00 AM midnight
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
    const interval = setInterval(updateCountdown, 60000); // update every minute
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
    <div className="spatial-glass-interactive rounded-2xl p-4 shadow-lg border border-white/15 space-y-2.5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isUnlimited
                ? 'bg-amber-400/20 text-amber-300'
                : isLow
                ? 'bg-rose-500/25 text-rose-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {isUnlimited ? (
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="font-bold-italic text-sm text-white">Daily Generation</span>{' '}
              <span className="font-syne font-bold uppercase tracking-wider text-[11px] text-[#FF8A98]">
                Quota Remaining
              </span>
            </h4>
          </div>
        </div>

        {/* Counter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono-numbers text-xs">
          {isUnlimited ? (
            <span className="bg-amber-400/15 px-3 py-1 rounded-full border border-amber-300/35 font-bold text-amber-200 shadow-2xs flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>UNLIMITED CHARACTERS</span>
            </span>
          ) : (
            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/15 font-bold text-white shadow-2xs">
              <strong className="text-[#FF8A98] text-sm">{effectiveRemaining.toLocaleString()}</strong> /{' '}
              {maxCharsPerDay.toLocaleString()} chars left
            </span>
          )}

          {remainingScripts !== undefined && !isUnlimited && (
            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/15 font-bold text-white shadow-2xs">
              <strong className="text-emerald-300 text-sm">{remainingScripts}</strong> / {maxScriptsPerDay} scripts left
            </span>
          )}

          {/* Sync / Refresh Button */}
          {onManualReset && (
            <button
              type="button"
              onClick={handleResetClick}
              disabled={isResetting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Click to refresh or verify daily quota"
            >
              {resetSuccess ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Refreshed</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`w-3 h-3 text-white/80 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>Sync Quota</span>
                </>
              )}
            </button>
          )}

          {onUpgradeClick && !isUnlimited && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#B83848] hover:bg-[#9E2A3B] text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              title="Get Unlimited Characters & Priority Access"
            >
              <Crown className="w-3 h-3 text-[#F0C05A] fill-[#F0C05A]" />
              <span>Get Unlimited</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-black/35 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/15">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlimited
                ? 'bg-gradient-to-r from-amber-500 to-[#F0C05A]'
                : isLow
                ? 'bg-[#B83848]'
                : 'bg-gradient-to-r from-[#437554] via-emerald-400 to-[#FF8A98]'
            }`}
            style={{ width: `${percentCharsRemaining}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-between items-center text-[11px] text-white/75 pt-0.5 gap-2">
          <span className="flex items-center gap-1 font-mono-numbers">
            {currentScriptLength > 0 ? (
              <>
                <span>
                  Current script: <strong className="text-white">{currentScriptLength} chars</strong>
                </span>
                <span>·</span>
                <span>
                  Remaining after take:{' '}
                  <strong className="text-[#FF8A98]">{charsAfterTake}</strong>
                </span>
              </>
            ) : (
              <span>Ready to voice your script</span>
            )}
          </span>

          {/* Local Midnight Timer & Explanation */}
          <span
            className="flex items-center gap-1.5 font-medium text-white/85 bg-white/10 border border-white/15 px-2 py-0.5 rounded-md"
            title="Your credits automatically reset every night at 12:00 AM in your local timezone"
          >
            <Clock className="w-3 h-3 text-[#FF8A98]" />
            <span>
              Resets at <strong className="text-white">12:00 AM midnight</strong> {timeUntilMidnight ? `(in ${timeUntilMidnight})` : ''}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
