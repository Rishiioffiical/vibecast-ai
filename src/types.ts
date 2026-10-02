export type VoiceLanguage = 'hindi' | 'english';
export type VoiceGender = 'male' | 'female';

export interface VoiceOption {
  id: string;
  name: string;
  language: VoiceLanguage;
  gender: VoiceGender;
  tone: string;
  accent: string;
  description: string;
  recommendedEmotion: string;
  geminiVoice: string; // 'Charon' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Kore'
  badge?: string;
  avatarIcon?: string;
}

export interface EmotionOption {
  id: string;
  label: string;
  description: string;
  category: 'emotional' | 'dramatic' | 'warm' | 'calm' | 'inspiring';
  pitchOffset: number;
  rateOffset: number;
}

export interface GeneratedClip {
  id: string;
  title: string;
  text: string;
  audioUrl: string;
  voiceName: string;
  language: VoiceLanguage;
  emotionLabel: string;
  speed: number;
  duration?: number;
  timestamp: number;
  engine: 'gemini' | 'browser-fallback';
}

export interface SampleScript {
  id: string;
  title: string;
  language: 'hindi' | 'english';
  category: string;
  text: string;
  recommendedVoiceId: string;
  recommendedEmotionId: string;
  speed: number;
}
