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
                ? 'bg-amber-100 text-amber-800'
                : isLow
                ? 'bg-rose-100 text-[#B83848]'
                : 'bg-[#2E4E3B]/10 text-[#2E4E3B]'
            }`}
          >
            {isUnlimited ? (
              <Crown className="w-3.5 h-3.5 text-[#B83848] fill-[#B83848]" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F261F] flex items-center gap-1.5">
              <span className="font-bold-italic text-sm text-[#1F261F]">Daily Generation</span>{' '}
              <span className="font-syne font-bold uppercase tracking-wider text-[11px] text-[#B83848]">
                Quota Remaining
              </span>
            </h4>
          </div>
        </div>

        {/* Counter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono-numbers text-xs">
          {isUnlimited ? (
            <span className="bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-bold text-amber-900 shadow-2xs flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>UNLIMITED CHARACTERS</span>
            </span>
          ) : (
            <span className="bg-[#FAF7EF] px-3 py-1 rounded-full border border-[#DFD6C7] font-bold text-[#1F261F] shadow-2xs">
              <strong className="text-[#B83848] text-sm">{effectiveRemaining.toLocaleString()}</strong> /{' '}
              {maxCharsPerDay.toLocaleString()} chars left
            </span>
          )}

          {remainingScripts !== undefined && !isUnlimited && (
            <span className="bg-[#FAF7EF] px-3 py-1 rounded-full border border-[#DFD6C7] font-bold text-[#1F261F] shadow-2xs">
              <strong className="text-[#2E4E3B] text-sm">{remainingScripts}</strong> / {maxScriptsPerDay} scripts left
            </span>
          )}

          {/* Sync / Refresh Button */}
          {onManualReset && (
            <button
              type="button"
              onClick={handleResetClick}
              disabled={isResetting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAE3D4] hover:bg-[#DFD6C7] text-[#364238] text-[11px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Click to refresh or verify daily quota"
            >
              {resetSuccess ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Refreshed</span>
                </>
              ) : (
                <>
                  <RotateCcw className={`w-3 h-3 text-[#5C6E60] ${isResetting ? 'animate-spin' : ''}`} />
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
        <div className="w-full bg-[#EAE3D4] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#D8CEBC]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isUnlimited
                ? 'bg-gradient-to-r from-amber-500 to-[#F0C05A]'
                : isLow
                ? 'bg-[#B83848]'
                : 'bg-gradient-to-r from-[#2E4E3B] via-[#437554] to-[#B83848]'
            }`}
            style={{ width: `${percentCharsRemaining}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-between items-center text-[11px] text-[#6A786D] pt-0.5 gap-2">
          <span className="flex items-center gap-1 font-mono-numbers">
            {currentScriptLength > 0 ? (
              <>
                <span>
                  Current script: <strong>{currentScriptLength} chars</strong>
                </span>
                <span>·</span>
                <span>
                  Remaining after take:{' '}
                  <strong className="text-[#B83848]">{charsAfterTake}</strong>
                </span>
              </>
            ) : (
              <span>Ready to voice your script</span>
            )}
          </span>

          {/* Local Midnight Timer & Explanation */}
          <span
            className="flex items-center gap-1.5 font-medium text-[#5F6E62] bg-[#EFE9DC] px-2 py-0.5 rounded-md"
            title="Your credits automatically reset every night at 12:00 AM in your local timezone"
          >
            <Clock className="w-3 h-3 text-[#B83848]" />
            <span>
              Resets at <strong>12:00 AM midnight</strong> {timeUntilMidnight ? `(in ${timeUntilMidnight})` : ''}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
