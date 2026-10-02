import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Coins,
  Shield,
  Zap,
  Crown,
  Key,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'creator' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'creator',
}) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    quickAdminLogin,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'creator' | 'admin'>(initialTab);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (initialTab === 'admin') {
        setEmail('dubeyrishi135@gmail.com');
      } else {
        setEmail('');
      }
    }
  }, [isOpen, initialTab]);

  const handleTabChange = (tab: 'creator' | 'admin') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (tab === 'admin') {
      setEmail('dubeyrishi135@gmail.com');
    } else {
      setEmail('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim() && activeTab !== 'admin') throw new Error('Please enter your name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signUpWithEmail(email, password, name.trim() || 'Studio Admin');
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'Authentication failed.';
      if (friendlyMessage.includes('auth/invalid-credential')) {
        friendlyMessage = 'Invalid email or password. If you have not created a password yet, use 1-Click Instant Admin Access or Sign Up.';
      } else if (friendlyMessage.includes('auth/email-already-in-use')) {
        friendlyMessage = 'This email is already registered. Please click "Sign In" below.';
      } else if (friendlyMessage.includes('auth/weak-password')) {
        friendlyMessage = 'Password should be at least 6 characters.';
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
      console.error(err);
      setErrorMsg(err.message || 'Google sign in was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminAccess = async (targetEmail: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await quickAdminLogin(targetEmail);
      setSuccessMsg(`Logged in successfully as Admin (${targetEmail})!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Instant admin login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#FAF7EF] border-2 border-[#D8CEBC] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#344638] text-[#FAF7EF] px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#B83848] text-white flex items-center justify-center shadow-md">
              {activeTab === 'admin' ? (
                <Crown className="w-5 h-5 text-[#F0C05A] fill-[#F0C05A]" />
              ) : (
                <Coins className="w-5 h-5 text-[#F0C05A]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold-italic text-xl text-[#FAF7EF]">VibeCast</span>
                <span className={`text-[10px] uppercase font-syne font-bold px-2 py-0.5 rounded-full ${activeTab === 'admin' ? 'bg-[#F0C05A] text-[#1F261F]' : 'bg-[#FAF7EF]/20 text-[#FAF7EF]'}`}>
                  {activeTab === 'admin' ? '👑 Admin Portal' : 'Studio Pass'}
                </span>
              </div>
              <p className="text-[11px] text-[#CBD8CD]">
                {activeTab === 'admin'
                  ? 'Admin access with unlimited characters & ADMIN_API_KEY'
                  : mode === 'signin'
                  ? 'Sign in to access your 2k characters'
                  : 'Create account & get 2,000 free characters'}
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

        {/* Tab Switcher: Creator vs Admin */}
        <div className="grid grid-cols-2 p-1.5 bg-[#EAE3D2] border-b border-[#D8CEBC] text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange('creator')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'creator'
                ? 'bg-white text-[#1F261F] shadow-sm font-extrabold'
                : 'text-[#5C6E60] hover:text-[#1F261F]'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-[#B83848]" />
            <span>Public Creator (2k Limit)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#B83848] text-white shadow-sm font-extrabold'
                : 'text-[#B83848] hover:bg-[#F2ECE0]'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-[#F0C05A] fill-[#F0C05A]" />
            <span>👑 Admin Sign In / Sign Up</span>
          </button>
        </div>

        {/* Sub-banner */}
        {activeTab === 'creator' ? (
          <div className="bg-gradient-to-r from-[#B83848]/15 via-[#FAF7EF] to-[#2E4E3B]/15 px-6 py-2 border-b border-[#E0D7C9] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[#8C202F]">
              <Sparkles className="w-3.5 h-3.5 text-[#B83848]" />
              <span>2,000 Free Characters on Signup</span>
            </span>
            <span className="font-mono-numbers text-[10px] text-[#2E4E3B] font-bold">
              Standard Quota
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 px-6 py-2 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 font-bold">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Privileges: Unlimited Takes & Quota</span>
            </span>
            <span className="font-mono text-[10px] bg-amber-200 px-2 py-0.5 rounded-full text-amber-950 font-extrabold">
              ADMIN_API_KEY
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Dedicated Admin Instant Quick-Access Section */}
          {activeTab === 'admin' && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-[#F4EFE6] border-2 border-amber-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F261F] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>1-Click Instant Admin Access:</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">Fast-Track</span>
              </div>
              <p className="text-[11px] text-[#5C6E60]">
                Click below to instantly log in as Admin without typing password:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickAdminAccess('dubeyrishi135@gmail.com')}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#B83848] hover:bg-[#9E2A3B] text-white font-bold text-xs flex items-center justify-between transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-[#F0C05A] fill-[#F0C05A]" />
                    <span>Login as: dubeyrishi135@gmail.com</span>
                  </span>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md font-mono">
                    Admin Primary
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickAdminAccess('rdpandit913@gmail.com')}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl bg-[#344638] hover:bg-[#253328] text-white font-bold text-xs flex items-center justify-between transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-[#F0C05A]" />
                    <span>Login as: rdpandit913@gmail.com</span>
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                    Admin
                  </span>
                </button>
              </div>
            </div>
          )}

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
            <span>{activeTab === 'admin' ? 'Continue as Admin with Google' : 'Continue with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[#DFD6C7] w-full" />
            <span className="bg-[#FAF7EF] px-3 text-[10px] text-[#7C887E] font-medium uppercase font-mono-numbers">
              Or with email password
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && activeTab === 'creator' && (
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-[#1F261F]">
                  {activeTab === 'admin' ? 'Admin Email Address' : 'Email Address'}
                </label>
                {activeTab === 'admin' && (
                  <span className="text-[10px] text-[#B83848] font-bold">
                    dubeyrishi135@gmail.com
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7C887E] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'admin' ? 'dubeyrishi135@gmail.com' : 'you@example.com'}
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
                  placeholder="Min 6 characters"
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-[#DFD6C7] text-xs text-[#1F261F] focus:border-[#B83848] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98 ${
                activeTab === 'admin'
                  ? 'bg-[#B83848] hover:bg-[#9E2A3B]'
                  : 'bg-[#2E4E3B] hover:bg-[#233C2D]'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {activeTab === 'admin'
                      ? mode === 'signin'
                        ? 'Sign In as Admin'
                        : 'Sign Up Admin Account'
                      : mode === 'signin'
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
              {mode === 'signin' ? "Don't have a password yet?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMsg(null);
              }}
              className="font-bold text-[#B83848] hover:underline cursor-pointer"
            >
              {mode === 'signin'
                ? activeTab === 'admin'
                  ? 'Admin Sign Up (Create Password)'
                  : 'Sign Up (2,000 Free Characters)'
                : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
