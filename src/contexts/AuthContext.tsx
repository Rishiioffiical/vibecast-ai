import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { GeneratedClip } from '../types';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  credits: number;
  totalGeneratedChars: number;
  totalTakes: number;
  isPremium: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastResetDate?: string;
  lastBonusClaimDate?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  deductCredits: (charCount: number) => Promise<boolean>;
  claimDailyBonus: () => Promise<number>;
  resetDailyQuotaManually: () => Promise<boolean>;
  saveTakeToCloud: (take: GeneratedClip) => Promise<void>;
  fetchUserTakes: () => Promise<GeneratedClip[]>;
  deleteTakeFromCloud: (takeId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const PUBLIC_SIGNUP_CHAR_LIMIT = 2000; // 2k characters daily limit for public creators
const ADMIN_EMAILS = ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'];
const LOCAL_GUEST_STORAGE_KEY = 'vibecast_local_studio_session';

export const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function createLocalGuestUser(): User {
  return {
    uid: 'local-studio-creator',
    email: 'creator@vibecast.local',
    displayName: 'Studio Creator',
    emailVerified: false,
    isAnonymous: true,
  } as unknown as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load or create Firestore user profile with local midnight reset
  const syncUserProfile = async (firebaseUser: User) => {
    const todayDate = getLocalDateString();
    const userEmail = (firebaseUser.email || 'creator@vibecast.local').trim().toLowerCase().slice(0, 250);
    const isAdmin = ADMIN_EMAILS.includes(userEmail) && firebaseUser.emailVerified;

    // Handle local studio guest pass without hitting Firestore
    if (firebaseUser.uid === 'local-studio-creator') {
      try {
        const savedRaw = localStorage.getItem(LOCAL_GUEST_STORAGE_KEY);
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw) as UserProfile;
          const isNewDay = !parsed.lastResetDate || parsed.lastResetDate !== todayDate;
          const updated: UserProfile = {
            ...parsed,
            credits: isNewDay ? PUBLIC_SIGNUP_CHAR_LIMIT : parsed.credits,
            lastResetDate: todayDate,
            lastLoginAt: new Date().toISOString(),
          };
          localStorage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(updated));
          setUserProfile(updated);
          return;
        }
      } catch {}

      const freshGuest: UserProfile = {
        id: 'local-studio-creator',
        email: 'creator@vibecast.local',
        displayName: 'Studio Creator',
        credits: PUBLIC_SIGNUP_CHAR_LIMIT,
        totalGeneratedChars: 0,
        totalTakes: 0,
        isPremium: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        lastResetDate: todayDate,
        lastBonusClaimDate: todayDate,
      };
      try {
        localStorage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(freshGuest));
      } catch {}
      setUserProfile(freshGuest);
      return;
    }

    const userPath = `users/${firebaseUser.uid}`;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const isPremiumUser = isAdmin || Boolean(data.isPremium);

        // Check if user has entered a new day since last reset
        const isNewDay = !data.lastResetDate || data.lastResetDate !== todayDate;
        let freshCredits = typeof data.credits === 'number' ? data.credits : PUBLIC_SIGNUP_CHAR_LIMIT;

        if (isAdmin || isPremiumUser) {
          freshCredits = 999999;
        } else if (isNewDay) {
          freshCredits = PUBLIC_SIGNUP_CHAR_LIMIT;
        }

        const nowIso = new Date().toISOString();
        const updatePayload: Record<string, any> = {
          lastLoginAt: nowIso,
        };

        if (isAdmin && !data.isPremium) {
          updatePayload.isPremium = true;
        }

        if (isNewDay) {
          updatePayload.credits = freshCredits;
          updatePayload.lastResetDate = todayDate;
        }

        await updateDoc(userRef, updatePayload);

        const refreshedProfile: UserProfile = {
          ...data,
          isPremium: isPremiumUser,
          credits: freshCredits,
          lastResetDate: isNewDay ? todayDate : data.lastResetDate,
          lastLoginAt: nowIso,
        };
        setUserProfile(refreshedProfile);
      } else {
        const nowIso = new Date().toISOString();
        const newProfile: UserProfile = {
          id: firebaseUser.uid,
          email: userEmail,
          displayName: (firebaseUser.displayName || (isAdmin ? 'Studio Admin' : 'VibeCast Creator')).slice(0, 120),
          credits: isAdmin ? 999999 : PUBLIC_SIGNUP_CHAR_LIMIT,
          totalGeneratedChars: 0,
          totalTakes: 0,
          isPremium: isAdmin,
          createdAt: nowIso,
          lastLoginAt: nowIso,
          lastResetDate: todayDate,
          lastBonusClaimDate: todayDate,
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      if (err?.code === 'permission-denied' || `${err?.message}`.includes('Missing or insufficient permissions')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        } catch {}
      }
      // Graceful fallback profile so UI never stalls
      setUserProfile({
        id: firebaseUser.uid,
        email: userEmail,
        displayName: firebaseUser.displayName || 'Studio Creator',
        credits: isAdmin ? 999999 : PUBLIC_SIGNUP_CHAR_LIMIT,
        totalGeneratedChars: 0,
        totalTakes: 0,
        isPremium: isAdmin,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        lastResetDate: todayDate,
      });
    }
  };

  // Real-time Midnight watcher: triggers automatic quota reset right at 12:00 AM local time
  useEffect(() => {
    let timerId: any;
    const scheduleMidnightWatcher = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime());

      timerId = setTimeout(async () => {
        if (auth.currentUser) {
          await syncUserProfile(auth.currentUser);
        } else if (user) {
          await syncUserProfile(user);
        }
        scheduleMidnightWatcher();
      }, msUntilMidnight);
    };

    scheduleMidnightWatcher();
    return () => clearTimeout(timerId);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await syncUserProfile(currentUser);
      } else {
        // Check if user activated a local studio session
        try {
          const savedGuest = localStorage.getItem(LOCAL_GUEST_STORAGE_KEY);
          if (savedGuest) {
            const guestUser = createLocalGuestUser();
            setUser(guestUser);
            await syncUserProfile(guestUser);
            setLoading(false);
            return;
          }
        } catch {}
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await syncUserProfile(user);
    }
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(cred.user);
  };

  const signInAsGuest = async () => {
    const guestUser = createLocalGuestUser();
    setUser(guestUser);
    await syncUserProfile(guestUser);
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_GUEST_STORAGE_KEY);
    } catch {}
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setUserProfile(null);
  };

  // Deduct credits based on character length / generation
  const deductCredits = async (charCount: number): Promise<boolean> => {
    if (!user || !userProfile) return true;
    if (userProfile.isPremium) return true;

    const cost = Math.max(10, Math.ceil(charCount * 1.0));
    if (userProfile.credits < cost) {
      return false;
    }

    const newCredits = Math.max(0, userProfile.credits - cost);
    const newChars = (userProfile.totalGeneratedChars || 0) + charCount;
    const newTakes = (userProfile.totalTakes || 0) + 1;

    if (user.uid === 'local-studio-creator') {
      const updated = {
        ...userProfile,
        credits: newCredits,
        totalGeneratedChars: newChars,
        totalTakes: newTakes,
      };
      setUserProfile(updated);
      try {
        localStorage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return true;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: newCredits,
        totalGeneratedChars: newChars,
        totalTakes: newTakes,
      });

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              credits: newCredits,
              totalGeneratedChars: newChars,
              totalTakes: newTakes,
            }
          : null
      );
      return true;
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        } catch {}
      }
      return true;
    }
  };

  const claimDailyBonus = async (): Promise<number> => {
    if (!user || !userProfile) return 0;
    const todayDate = getLocalDateString();
    const targetCredits = Math.min(PUBLIC_SIGNUP_CHAR_LIMIT, userProfile.credits + 500);

    if (user.uid === 'local-studio-creator') {
      const updated = { ...userProfile, credits: targetCredits, lastBonusClaimDate: todayDate };
      setUserProfile(updated);
      try {
        localStorage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return targetCredits - userProfile.credits;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: targetCredits,
        lastBonusClaimDate: todayDate,
      });

      setUserProfile((prev) => (prev ? { ...prev, credits: targetCredits } : null));
      return Math.max(0, targetCredits - userProfile.credits);
    } catch {
      return 0;
    }
  };

  const resetDailyQuotaManually = async (): Promise<boolean> => {
    if (!user || !userProfile) return false;
    const todayDate = getLocalDateString();
    const userEmail = (user.email || '').trim().toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(userEmail) && user.emailVerified;
    const targetCredits = isAdmin ? 999999 : PUBLIC_SIGNUP_CHAR_LIMIT;

    if (user.uid === 'local-studio-creator') {
      const updated = { ...userProfile, credits: targetCredits, lastResetDate: todayDate };
      setUserProfile(updated);
      try {
        localStorage.setItem(LOCAL_GUEST_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return true;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      if (userProfile.lastResetDate !== todayDate || isAdmin) {
        await updateDoc(userRef, {
          credits: targetCredits,
          lastResetDate: todayDate,
        });
      }

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              credits: targetCredits,
              lastResetDate: todayDate,
            }
          : null
      );
      return true;
    } catch {
      return false;
    }
  };

  const saveTakeToCloud = async (take: GeneratedClip) => {
    if (!user || user.uid === 'local-studio-creator') return;
    const safeTakeId = take.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || `take-${Date.now()}`;
    const takePath = `users/${user.uid}/takes/${safeTakeId}`;
    try {
      const takeRef = doc(db, 'users', user.uid, 'takes', safeTakeId);
      // Do not store ephemeral session blob: URLs in cloud Firestore
      const safeAudioUrl =
        take.audioUrl && !take.audioUrl.startsWith('blob:')
          ? take.audioUrl.slice(0, 2000)
          : '';
      await setDoc(takeRef, {
        id: safeTakeId,
        userId: user.uid,
        title: (take.title || 'Studio Take').slice(0, 240),
        text: (take.text || '').slice(0, 9500),
        audioUrl: safeAudioUrl,
        voiceName: (take.voiceName || 'Charon').slice(0, 120),
        language: (take.language || 'hindi').slice(0, 30),
        emotionLabel: (take.emotionLabel || 'Educational').slice(0, 120),
        speed: Math.min(4.0, Math.max(0.25, Number(take.speed) || 1.0)),
        duration: Math.min(7200, Math.max(0, Number(take.duration) || 1)),
        charCount: Math.min(10000, Math.max(0, (take.text || '').length)),
        createdAt: Number(take.timestamp) || Date.now(),
      });
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.CREATE, takePath);
        } catch {}
      }
    }
  };

  const fetchUserTakes = async (): Promise<GeneratedClip[]> => {
    if (!user || user.uid === 'local-studio-creator') return [];
    const takesPath = `users/${user.uid}/takes`;
    try {
      const takesCol = collection(db, 'users', user.uid, 'takes');
      // Explicitly filter by userId == user.uid to satisfy hardened Firestore Query Enforcer rules without requiring a composite index
      const q = query(takesCol, where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: GeneratedClip[] = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({
          id: item.id || d.id,
          title: item.title || 'Studio Take',
          text: item.text || '',
          audioUrl: item.audioUrl || '',
          voiceName: item.voiceName || 'Studio Voice',
          language: item.language || 'hindi',
          emotionLabel: item.emotionLabel || 'Educational',
          speed: Number(item.speed) || 1.0,
          duration: Number(item.duration) || 1,
          timestamp: Number(item.createdAt) || Date.now(),
          engine: 'gemini',
        });
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      return list;
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.LIST, takesPath);
        } catch {}
      }
      return [];
    }
  };

  const deleteTakeFromCloud = async (takeId: string) => {
    if (!user || user.uid === 'local-studio-creator') return;
    const safeTakeId = takeId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    if (!safeTakeId) return;
    const takePath = `users/${user.uid}/takes/${safeTakeId}`;
    try {
      const takeRef = doc(db, 'users', user.uid, 'takes', safeTakeId);
      await deleteDoc(takeRef);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.DELETE, takePath);
        } catch {}
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        deductCredits,
        claimDailyBonus,
        resetDailyQuotaManually,
        saveTakeToCloud,
        fetchUserTakes,
        deleteTakeFromCloud,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
