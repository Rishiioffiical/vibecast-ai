import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Zap,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    signInWithGoogle,
    signInAsGuest,
  } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        setIsLoading(false);
        return;
      }

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setErrorMsg(
          'Google sign-in popup is restricted on this preview domain. Click "Activate Instant Studio Pass" below for immediate access.'
        );
      } else {
        setErrorMsg('Could not complete Google sign-in. Click "Activate Instant Studio Pass" below for immediate access.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInAsGuest();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not start studio session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md spatial-glass border border-white/20 rounded-[28px] shadow-2xl overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black/45 text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E14B5A] text-white flex items-center justify-center shadow-md border border-white/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold-italic text-xl text-white">VibeCast</span>
                <span className="text-[10px] uppercase font-mono-numbers font-bold text-[#F0C05A]">
                  · STUDIO ACCESS
                </span>
              </div>
              <p className="text-xs text-white/65">
                Start your voice synthesis session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Quota Banner */}
        <div className="bg-white/[0.04] px-6 py-3 border-b border-white/10 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-[#FF8A98]" />
            <span>2,000 Daily Characters · 24kHz Studio Audio</span>
          </span>
          <span className="font-mono-numbers text-[11px] text-emerald-300 font-bold">
            Free Tier
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-400/35 text-xs text-rose-100 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Primary 1-Click Studio Pass (Zero password prompts, works 100% in every iframe/domain) */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#2E4E3B] hover:bg-[#254030] border border-emerald-400/35 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer active:scale-99"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4 text-[#F0C05A] fill-[#F0C05A]" />
            )}
            <span>Activate Instant Studio Pass (2,000 Free Chars)</span>
          </button>

          <div className="relative flex items-center justify-center my-2 gap-3">
            <div className="border-t border-white/10 flex-1" />
            <span className="text-[10px] text-white/50 font-medium uppercase font-mono-numbers">
              Or sync takes across devices
            </span>
            <div className="border-t border-white/10 flex-1" />
          </div>

          {/* Official Firebase Google OAuth Popup */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-white font-semibold text-xs flex items-center justify-center gap-2.5 border border-white/15 transition-all cursor-pointer active:scale-99"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Sign In with Google Account</span>
          </button>

          <p className="text-[11px] text-white/50 text-center leading-relaxed pt-1">
            No passwords are collected or stored by VibeCast Studio. Cloud take history is protected by Firebase Authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
