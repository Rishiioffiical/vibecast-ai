import React, { useState } from 'react';
import {
  User,
  LogOut,
  Crown,
  ChevronDown,
  Zap,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserAccountBadgeProps {
  onOpenAuth: () => void;
  onOpenPremium: () => void;
  onOpenAdminKey?: () => void;
}

export const UserAccountBadge: React.FC<UserAccountBadgeProps> = ({
  onOpenAuth,
  onOpenPremium,
  onOpenAdminKey,
}) => {
  const { user, userProfile, signOut, resetDailyQuotaManually } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  if (!user || !userProfile) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--accent-color)] hover:opacity-95 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
      >
        <User className="w-3.5 h-3.5 text-white" />
        <span>Studio Pass · 2,000 Chars</span>
      </button>
    );
  }

  const userEmail = (user.email || '').trim().toLowerCase();
  const isAdmin = ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'].includes(userEmail);
  const charLimit = 2000;
  const remainingChars = Math.max(0, userProfile.credits);
  const percentUsed = Math.min(100, Math.round(((charLimit - remainingChars) / charLimit) * 100));

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-white/[0.06] p-1 rounded-xl border border-white/12 text-white">
        <button
          type="button"
          onClick={isAdmin ? onOpenAdminKey : onOpenPremium}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.08] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title={isAdmin ? 'Admin Dedicated API Key' : 'Character Allowance'}
        >
          <Zap className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          <span className="font-mono-numbers font-bold text-white">
            {isAdmin || userProfile.isPremium ? 'Unlimited' : `${remainingChars.toLocaleString()} Chars`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <div className="w-5 h-5 rounded-md bg-[var(--accent-color)] text-white flex items-center justify-center text-[10px] uppercase font-bold">
            {isAdmin ? 'A' : userProfile.displayName ? userProfile.displayName.charAt(0) : 'U'}
          </div>
          <span className="truncate max-w-[96px] text-xs">
            {isAdmin ? 'Admin' : userProfile.displayName || 'Creator'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-64 spatial-glass border border-white/20 rounded-2xl shadow-2xl p-4 z-50 space-y-3 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pb-2.5 border-b border-white/12 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white truncate">
                {userProfile.displayName}
              </p>
              {isAdmin && (
                <span className="text-[11px] font-mono-numbers text-amber-300 font-semibold">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/65 font-mono-numbers truncate">
              {userProfile.email}
            </p>
          </div>

          {!isAdmin && !userProfile.isPremium ? (
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/65">Daily Allowance</span>
                <span className="font-mono-numbers font-bold text-white">
                  {remainingChars.toLocaleString()} / 2,000
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/12 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-color)] rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-white/60 pt-0.5">
                <span>Resets daily at 12:00 AM</span>
                <button
                  type="button"
                  onClick={async () => {
                    await resetDailyQuotaManually();
                  }}
                  className="text-[var(--accent-color)] hover:underline font-semibold cursor-pointer"
                >
                  Sync Now
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="font-semibold text-[11px]">
                {isAdmin ? 'Admin Dedicated Master Quota' : 'Premium Unlimited Member'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-black/35 border border-white/10">
              <span className="text-[10px] uppercase text-white/55 block font-mono-numbers">
                Takes
              </span>
              <span className="font-mono-numbers font-bold text-xs text-white">
                {userProfile.totalTakes || 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/35 border border-white/10">
              <span className="text-[10px] uppercase text-white/55 block font-mono-numbers">
                Chars Used
              </span>
              <span className="font-mono-numbers font-bold text-xs text-white">
                {(userProfile.totalGeneratedChars || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {isAdmin && onOpenAdminKey && (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenAdminKey();
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/12 text-white text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-300" />
                <span>API Keys &amp; Routing</span>
              </span>
              <span className="text-[10px] text-white/60">Configure</span>
            </button>
          )}

          {!userProfile.isPremium && !isAdmin && (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenPremium();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[var(--accent-color)] hover:opacity-90 text-white text-xs font-semibold flex items-center justify-between transition-opacity cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-200" />
                <span>Studio Quota &amp; Pro Info</span>
              </span>
              <span className="text-[10px] font-mono-numbers">Refill</span>
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
            className="w-full py-2 px-3 rounded-xl hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-white/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
