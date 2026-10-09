import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Coins,
  Zap,
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
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsGuest,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Always reset fields to empty when opening modal (never pre-fill personal emails)
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setErrorMsg(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signUpWithEmail(cleanEmail, password, name.trim());
      } else {
        await signInWithEmail(cleanEmail, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'Authentication failed.';
      const code = err.code || '';

      if (code === 'auth/invalid-credential' || friendlyMessage.includes('invalid-credential')) {
        friendlyMessage = 'Invalid email or password. If you have not created an account yet, click "Sign Up" below.';
      } else if (code === 'auth/user-not-found' || friendlyMessage.includes('user-not-found')) {
        friendlyMessage = 'No account found with this email. Click "Sign Up" below to create one.';
      } else if (code === 'auth/email-already-in-use' || friendlyMessage.includes('email-already-in-use')) {
        friendlyMessage = 'An account with this email already exists. Please switch to "Sign In".';
      } else if (code === 'auth/weak-password' || friendlyMessage.includes('weak-password')) {
        friendlyMessage = 'Password should be at least 6 characters.';
      } else if (code === 'auth/invalid-email' || friendlyMessage.includes('invalid-email')) {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';

      // Gracefully handle user closing the popup: do not throw a loud error
      if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        // User intentionally dismissed the popup, simply stop loading quietly
        setIsLoading(false);
        return;
      }

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setErrorMsg(
          'Google popup is restricted on this preview domain by Firebase security. Please use Email & Password below, or click "Continue as Guest" for instant 1-click access!'
        );
      } else {
        setErrorMsg(err.message || 'Google sign-in failed. Please try Email & Password or Guest access.');
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
      console.error(err);
      setErrorMsg(err.message || 'Guest sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md spatial-glass border border-white/20 rounded-[36px] shadow-2xl overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#344638] text-[#FAF7EF] px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#B83848] text-white flex items-center justify-center shadow-md">
              <Coins className="w-5 h-5 text-[#F0C05A]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold-italic text-xl text-[#FAF7EF]">VibeCast</span>
                <span className="text-[10px] uppercase font-syne font-bold px-2 py-0.5 rounded-full bg-[#FAF7EF]/20 text-[#FAF7EF]">
                  Studio Pass
                </span>
              </div>
              <p className="text-[11px] text-[#CBD8CD]">
                {mode === 'signin'
                  ? 'Sign in to access your daily character allowance'
                  : 'Create account & get 2,000 free daily characters'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF7EF] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Quota Banner */}
        <div className="bg-gradient-to-r from-[#B83848]/15 via-[#FAF7EF] to-[#2E4E3B]/15 px-6 py-2.5 border-b border-[#E0D7C9] flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-[#8C202F]">
            <Sparkles className="w-3.5 h-3.5 text-[#B83848]" />
            <span>2,000 Free Daily Characters · Natural AI Voices</span>
          </span>
          <span className="font-mono-numbers text-[10px] text-[#2E4E3B] font-bold">
            Resets 12 AM
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* 1-Click Fast Guest Access (Works 100% on every domain without popups) */}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#2E4E3B] hover:bg-[#233C2D] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
          >
            <Zap className="w-4 h-4 text-[#F0C05A] fill-[#F0C05A]" />
            <span>Continue as Guest (Instant 2k Free Credits)</span>
          </button>

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F2ECE0] text-[#1F261F] font-bold text-xs flex items-center justify-center gap-2 border-2 border-[#DFD6C7] transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[#DFD6C7] w-full" />
            <span className="bg-[#FAF7EF] px-3 text-[10px] text-[#7C887E] font-medium uppercase font-mono-numbers">
              Or with email password
            </span>
          </div>

          {/* Form with Clean Inputs (No Pre-filled Emails) */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[#1F261F] mb-1">
                  Your Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#7C887E] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#DFD6C7] text-xs text-[#1F261F] focus:border-[#B83848] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1F261F] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7C887E] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#DFD6C7] text-xs text-[#1F261F] focus:border-[#B83848] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F261F] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7C887E] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 6 characters)"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#DFD6C7] text-xs text-[#1F261F] focus:border-[#B83848] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#B83848] hover:bg-[#9E2A3B] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'signin'
                      ? 'Sign In to Studio'
                      : 'Create Account & Get 2,000 Free Characters'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="pt-2 border-t border-[#DFD6C7] flex items-center justify-between text-xs text-[#5C6E60]">
            <span>
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMsg(null);
              }}
              className="font-bold text-[#B83848] hover:underline cursor-pointer"
            >
              {mode === 'signin' ? 'Create Account (Sign Up)' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
