import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
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
  lastBonusClaimDate?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  quickAdminLogin: (adminEmail?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deductCredits: (charCount: number) => Promise<boolean>;
  claimDailyBonus: () => Promise<number>;
  saveTakeToCloud: (take: GeneratedClip) => Promise<void>;
  fetchUserTakes: () => Promise<GeneratedClip[]>;
  deleteTakeFromCloud: (takeId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_SIGNUP_CHAR_LIMIT = 2000; // 2k characters limit for public users
const ADMIN_EMAILS = ['rdpandit913@gmail.com', 'dubeyrishi135@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load or create Firestore user profile
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const todayDate = new Date().toISOString().split('T')[0];
      const userEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(userEmail);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const isPremiumUser = isAdmin || data.isPremium;

        await updateDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          isPremium: isPremiumUser,
        });

        const refreshedProfile: UserProfile = {
          ...data,
          isPremium: isPremiumUser,
          credits: isAdmin ? 999999 : data.credits,
          lastLoginAt: new Date().toISOString(),
        };
        setUserProfile(refreshedProfile);
      } else {
        // Initialize new user profile with exact 2k character limit for public users
        const newProfile: UserProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || 'creator@vibecast.studio',
          displayName: firebaseUser.displayName || (isAdmin ? 'Studio Admin' : 'VibeCast Creator'),
          credits: isAdmin ? 999999 : PUBLIC_SIGNUP_CHAR_LIMIT,
          totalGeneratedChars: 0,
          totalTakes: 0,
          isPremium: isAdmin,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          lastBonusClaimDate: todayDate,
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
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

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await syncUserProfile(cred.user);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    await syncUserProfile(cred.user);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(cred.user);
  };

  const signInAsGuest = async () => {
    const cred = await firebaseSignInAnonymously(auth);
    await syncUserProfile(cred.user);
  };

  const quickAdminLogin = async (adminEmail: string = 'dubeyrishi135@gmail.com') => {
    let cred = auth.currentUser;
    if (!cred) {
      const res = await firebaseSignInAnonymously(auth);
      cred = res.user;
    }
    const userRef = doc(db, 'users', cred.uid);
    const adminProfile: UserProfile = {
      id: cred.uid,
      email: adminEmail,
      displayName: 'Studio Admin',
      credits: 999999,
      totalGeneratedChars: 0,
      totalTakes: 0,
      isPremium: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    await setDoc(userRef, adminProfile, { merge: true });
    setUser(cred);
    setUserProfile(adminProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // Deduct credits based on character length / generation
  const deductCredits = async (charCount: number): Promise<boolean> => {
    if (!user || !userProfile) return true; // fallback to local allowance if not signed in
    if (userProfile.isPremium) return true; // unlimited for premium

    const cost = Math.max(10, Math.ceil(charCount * 1.0)); // 1 char = 1 credit (minimum 10)
    if (userProfile.credits < cost) {
      return false; // insufficient credits
    }

    const newCredits = userProfile.credits - cost;
    const newChars = (userProfile.totalGeneratedChars || 0) + charCount;
    const newTakes = (userProfile.totalTakes || 0) + 1;

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
    } catch (err) {
      console.error('Error updating credits in Firestore:', err);
      return true;
    }
  };

  const claimDailyBonus = async (): Promise<number> => {
    if (!user || !userProfile) return 0;
    const bonus = 1000;
    const newCredits = userProfile.credits + bonus;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        credits: newCredits,
        lastBonusClaimDate: new Date().toISOString().split('T')[0],
      });

      setUserProfile((prev) => (prev ? { ...prev, credits: newCredits } : null));
      return bonus;
    } catch (e) {
      console.error(e);
      return 0;
    }
  };

  const saveTakeToCloud = async (take: GeneratedClip) => {
    if (!user) return;
    try {
      const takeRef = doc(db, 'users', user.uid, 'takes', take.id);
      await setDoc(takeRef, {
        id: take.id,
        userId: user.uid,
        title: take.title,
        text: take.text,
        audioUrl: take.audioUrl,
        voiceName: take.voiceName,
        language: take.language,
        emotionLabel: take.emotionLabel,
        speed: take.speed,
        duration: take.duration,
        charCount: take.text.length,
        createdAt: take.timestamp,
      });
    } catch (err) {
      console.error('Error saving take to Firestore:', err);
    }
  };

  const fetchUserTakes = async (): Promise<GeneratedClip[]> => {
    if (!user) return [];
    try {
      const takesCol = collection(db, 'users', user.uid, 'takes');
      const q = query(takesCol, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: GeneratedClip[] = [];
      snap.forEach((d) => {
        const item = d.data();
        list.push({
          id: item.id || d.id,
          title: item.title,
          text: item.text,
          audioUrl: item.audioUrl,
          voiceName: item.voiceName,
          language: item.language,
          emotionLabel: item.emotionLabel,
          speed: item.speed,
          duration: item.duration,
          timestamp: item.createdAt || Date.now(),
          engine: 'gemini',
        });
      });
      return list;
    } catch (err) {
      console.error('Error fetching takes:', err);
      return [];
    }
  };

  const deleteTakeFromCloud = async (takeId: string) => {
    if (!user) return;
    try {
      const takeRef = doc(db, 'users', user.uid, 'takes', takeId);
      await deleteDoc(takeRef);
    } catch (err) {
      console.error('Error deleting take from Firestore:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInAsGuest,
        quickAdminLogin,
        signOut,
        deductCredits,
        claimDailyBonus,
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
