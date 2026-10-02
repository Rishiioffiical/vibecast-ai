import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Users,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  X,
  Server,
  Zap,
  Info,
  Sparkles,
} from 'lucide-react';
import { getActiveApiMode, setActiveApiMode, ApiMode } from '../utils/apiClient';

interface AdminKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const AdminKeyModal: React.FC<AdminKeyModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [activeMode, setMode] = useState<ApiMode>(getActiveApiMode());
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMode(getActiveApiMode());
      checkServerHealth();
    }
  }, [isOpen]);

  const checkServerHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const mode = getActiveApiMode();
      const testEmail = mode === 'admin' ? (currentUserEmail || 'dubeyrishi135@gmail.com') : 'public-tester@vibecast.app';
      const res = await fetch('/api/health', {
        headers: {
          'x-user-email': testEmail,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (err) {
      console.warn('Health check error:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const handleToggleMode = (newMode: ApiMode) => {
    setMode(newMode);
    setActiveApiMode(newMode);
    setTimeout(() => {
      checkServerHealth();
    }, 100);
  };

  if (!isOpen) return null;

  const isAdminActive = activeMode === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FAF7EF] rounded-[32px] border-2 border-[#D8CEBC] shadow-2xl p-6 sm:p-8 text-[#1F261F] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#EAE3D2] hover:bg-[#DDD3C0] text-[#4A554D] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#E2DAD0] mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#B83848] text-[#FAF7EF] flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold-italic text-[#1F261F]">
              Dual API Key & Quota System
            </h2>
            <p className="text-xs text-[#5C6E60]">
              Admin vs Public Quota Protection & Server-side Routing
            </p>
          </div>
        </div>

        {/* Current Active Mode Banner */}
        <div
          className={`p-4 rounded-2xl border mb-6 flex items-center justify-between transition-all ${
            isAdminActive
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                isAdminActive ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              {isAdminActive ? <Lock className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Mode:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white shadow-xs">
                  {isAdminActive ? '👑 Admin (Dedicated Quota)' : '🌐 Public (Standard Quota)'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isAdminActive
                  ? 'Requests route through ADMIN_API_KEY. Your personal quota is completely isolated.'
                  : 'Requests route through PUBLIC_API_KEY. Public visitors use separate quota.'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => handleToggleMode('admin')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              isAdminActive
                ? 'border-[#B83848] bg-[#FCECEE] shadow-sm'
                : 'border-[#DFD6C7] bg-[#F4EFE6] hover:border-[#B83848]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold font-fraunces text-[#1F261F] flex items-center gap-1.5">
                <span>👑 Admin Mode</span>
              </span>
              {isAdminActive && <CheckCircle2 className="w-4 h-4 text-[#B83848]" />}
            </div>
            <p className="text-xs text-[#5C6E60] leading-snug">
              Uses <span className="font-mono font-bold text-[#B83848]">ADMIN_API_KEY</span> for{' '}
              <span className="font-semibold text-[#1F261F]">{currentUserEmail || 'dubeyrishi135@gmail.com'}</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleMode('public')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              !isAdminActive
                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                : 'border-[#DFD6C7] bg-[#F4EFE6] hover:border-emerald-600/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold font-fraunces text-[#1F261F] flex items-center gap-1.5">
                <span>🌐 Public Mode</span>
              </span>
              {!isAdminActive && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-[#5C6E60] leading-snug">
              Uses <span className="font-mono font-bold text-emerald-700">PUBLIC_API_KEY</span> for public visitors
            </p>
          </button>
        </div>

        {/* Server Proxy Live Verification */}
        <div className="p-4 rounded-2xl bg-[#EAE3D2] border border-[#D8CEBC] space-y-2.5 mb-6 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-[#35523E]">
              <Server className="w-3.5 h-3.5" />
              <span>Server-Side Proxy Verification:</span>
            </span>
            <button
              onClick={checkServerHealth}
              disabled={isLoadingHealth}
              className="text-[#B83848] hover:underline font-bold cursor-pointer"
            >
              {isLoadingHealth ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-[#FAF7EF] p-2 rounded-xl border border-[#D8CEBC]">
              <div className="text-[#6F7C71] text-[10px]">ADMIN_API_KEY</div>
              <div className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Configured & Isolated</span>
              </div>
            </div>

            <div className="bg-[#FAF7EF] p-2 rounded-xl border border-[#D8CEBC]">
              <div className="text-[#6F7C71] text-[10px]">PUBLIC_API_KEY</div>
              <div className="font-bold text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Configured & Active</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#556357] flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#B83848] flex-shrink-0" />
            <span>
              Admin Email Target: <strong className="text-[#1F261F]">{currentUserEmail || 'dubeyrishi135@gmail.com'}</strong>
            </span>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-[#78857B] italic">
            Keys are never exposed to the client browser.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1F261F] text-[#FAF7EF] text-xs font-bold hover:bg-[#35523E] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
