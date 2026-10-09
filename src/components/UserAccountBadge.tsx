import React, { useState } from 'react';
import {
  User,
  LogOut,
  Coins,
  Sparkles,
  Crown,
  ChevronDown,
  Gift,
  Check,
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
        className="inline-flex items-center gap-2 h-8 sm:h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-xs cursor-pointer border border-white/15 active:scale-95 whitespace-nowrap backdrop-blur-md"
      >
        <User className="w-3.5 h-3.5 text-white/90" />
        <span>Sign In</span>
        <span className="font-mono-numbers px-2 py-0.5 rounded-full bg-[var(--accent-color)] text-white text-[10px] font-extrabold shadow-xs">
          2k Free
        </span>
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
      <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/15 shadow-sm backdrop-blur-md text-white">
        {/* Credits / Characters Pill */}
        <button
          type="button"
          onClick={isAdmin ? onOpenAdminKey : onOpenPremium}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
          title={isAdmin ? "Admin Dedicated API Key" : "Free Character Limit"}
        >
          <Zap className="w-3.5 h-3.5 text-[var(--accent-color)] fill-current" />
          <span className="font-mono-numbers font-extrabold text-[var(--accent-color)]">
            {isAdmin || userProfile.isPremium ? 'UNLIMITED' : `${remainingChars.toLocaleString()} Chars`}
          </span>
        </button>

        {/* User Pill Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center text-[10px] uppercase font-bold shadow-xs">
            {isAdmin ? '👑' : userProfile.displayName ? userProfile.displayName.charAt(0) : 'U'}
          </div>
          <span className="truncate max-w-[90px] text-[11px]">
            {isAdmin ? 'Admin' : (userProfile.displayName || 'Creator')}
          </span>
          <ChevronDown className="w-3 h-3 text-white/60" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-64 spatial-glass border border-white/20 rounded-2xl shadow-2xl p-3.5 z-50 space-y-2.5 animate-in fade-in text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* User Info Header */}
          <div className="pb-2 border-b border-[#E2DAD0] space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#1F261F] truncate">
                {userProfile.displayName}
              </p>
              {isAdmin && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6A786E] font-mono-numbers truncate">
              {userProfile.email}
            </p>
          </div>

          {/* Character Allowance Indicator */}
          {!isAdmin && !userProfile.isPremium ? (
            <div className="p-2.5 rounded-xl bg-white border border-[#DFD6C7] space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#6F7C71] font-medium">Daily Allowance:</span>
                <span className="font-mono-numbers font-bold text-[#1F261F]">
                  {remainingChars.toLocaleString()} / 2,000 Chars
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#EAE3D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B83848] rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#7A877C] pt-0.5">
                <span>🔄 Resets daily at 12:00 AM</span>
                <button
                  type="button"
                  onClick={async () => {
                    await resetDailyQuotaManually();
                  }}
                  className="text-[#B83848] hover:underline font-bold cursor-pointer"
                >
                  Sync Now
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-[11px]">
                {isAdmin ? 'ADMIN_API_KEY (Unlimited Master Quota)' : 'Premium Unlimited Member'}
              </span>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center py-1">
            <div className="p-2 rounded-xl bg-white border border-[#DFD6C7]">
              <span className="text-[10px] uppercase text-[#7A877C] block font-mono-numbers">
                Takes
              </span>
              <span className="font-mono-numbers font-bold text-xs text-[#1F261F]">
                {userProfile.totalTakes || 0}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-[#DFD6C7]">
              <span className="text-[10px] uppercase text-[#7A877C] block font-mono-numbers">
                Chars Used
              </span>
              <span className="font-mono-numbers font-bold text-xs text-[#1F261F]">
                {(userProfile.totalGeneratedChars || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Admin Specific Key Management Modal Trigger */}
          {isAdmin && onOpenAdminKey && (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenAdminKey();
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#344638] hover:bg-[#253328] text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>API Keys & Quota Architecture</span>
              </span>
              <span className="text-[10px] text-amber-400">Settings</span>
            </button>
          )}

          {/* Upgrade Link for Public users */}
          {!userProfile.isPremium && !isAdmin && (
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenPremium();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#B83848] to-[#922836] hover:from-[#A0283A] text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#F0C05A]" />
                <span>Unlimited UPI Upgrade</span>
              </span>
              <span className="text-[10px]">7571889019@ybl</span>
            </button>
          )}

          {/* Sign Out */}
          <button
            type="button"
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
            className="w-full py-1.5 px-3 rounded-xl hover:bg-[#F2ECE0] text-[#8C202F] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-transparent hover:border-[#DFD6C7]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
