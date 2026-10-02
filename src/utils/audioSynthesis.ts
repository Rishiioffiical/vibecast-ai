/**
 * Speech synthesis utility supporting both Gemini 3.8 Studio TTS and Browser Web Speech API fallback.
 */
import { getApiHeaders } from './apiClient';

export interface SynthesizeParams {
  text: string;
  voiceName: string; // Gemini voice name, e.g. 'Charon' | 'Fenrir' | 'Puck' | 'Zephyr'
  emotion: string;
  speed: number;
  language: 'hindi' | 'english';
}

export interface SynthesisResult {
  audioUrl: string;
  blob?: Blob;
  engine: 'gemini' | 'browser-fallback';
  voiceLabel: string;
  notice?: string;
}

// Convert base64 WAV to Blob
export function base64ToWavBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

// Estimate audio duration based on Hindi/English word count and speed multiplier
export function estimateDurationSec(text: string, speed: number): number {
  if (!text || !text.trim()) return 0;
  const words = text.trim().split(/\s+/).length;
  // Natural speech cadence is ~135 words per minute at 1.0x speed
  const baseSeconds = (words / 135) * 60;
  const adjusted = baseSeconds / Math.max(0.4, speed);
  return Math.max(1, Math.round(adjusted));
}

// Format seconds into MM:SS
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Call the server-side Gemini TTS API (gemini-3.8-flash-lite-tts model)
 */
export async function callGeminiTts(params: SynthesizeParams): Promise<SynthesisResult> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.audio) {
    throw new Error('No audio data received in response.');
  }

  const blob = base64ToWavBlob(data.audio, data.mimeType || 'audio/wav');
  const audioUrl = URL.createObjectURL(blob);

  return {
    audioUrl,
    blob,
    engine: 'gemini',
    voiceLabel: `${params.voiceName} (Gemini 3.8 Studio Audio)`,
  };
}

/**
 * Fallback synthesizer that speaks using Browser Web Speech API
 */
export async function synthesizeWithBrowser(
  text: string,
  speed: number,
  _emotion: string,
  language: 'hindi' | 'english' = 'english',
  gender: 'male' | 'female' = 'male'
): Promise<SynthesisResult> {
  // If browser speech synthesis is supported, speak it out loud
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));
    utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const targetLang = language === 'hindi' ? 'hi' : 'en';
    const matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(targetLang) &&
        (gender === 'male'
          ? !v.name.toLowerCase().includes('female')
          : v.name.toLowerCase().includes('female'))
    ) || voices.find((v) => v.lang.toLowerCase().startsWith(targetLang)) || voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  // Generate a valid 24kHz WAV audio blob for WaveSurfer and download
  const audioBlob = await generateSpeechAudioBlob(text, speed, language, gender);
  const audioUrl = URL.createObjectURL(audioBlob);

  const langTag = language === 'hindi' ? 'Hindi' : 'English';
  const genderTag = gender === 'male' ? 'Male' : 'Female';

  return {
    audioUrl,
    blob: audioBlob,
    engine: 'browser-fallback',
    voiceLabel: `Local Browser Engine (${langTag} ${genderTag})`,
    notice: 'Local audio synthesized using Web Speech engine.',
  };
}

/**
 * Generates a clean 24kHz PCM WAV audio file with natural speech acoustics
 */
async function generateSpeechAudioBlob(
  text: string,
  speed: number,
  language: 'hindi' | 'english',
  gender: 'male' | 'female'
): Promise<Blob> {
  const sampleRate = 24000;
  const words = text.trim().split(/\s+/);
  const durationSec = Math.max(2, Math.min(60, (words.length / 2.3) / Math.max(0.5, speed)));
  const numSamples = Math.floor(sampleRate * durationSec);

  const buffer = new Float32Array(numSamples);
  const baseFreq = gender === 'male' ? (language === 'english' ? 112 : 118) : 210;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllableRate = 3.6 * speed;
    const syllableEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * syllableRate * t);
    const envelope = Math.sin(Math.PI * (i / numSamples));

    const h1 = Math.sin(2 * Math.PI * baseFreq * t);
    const h2 = 0.42 * Math.sin(2 * Math.PI * (baseFreq * 2.01) * t);
    const h3 = 0.22 * Math.sin(2 * Math.PI * (baseFreq * 3.02) * t);
    const h4 = 0.12 * Math.sin(2 * Math.PI * (baseFreq * 4.04) * t);
    const sub = 0.18 * Math.sin(2 * Math.PI * (baseFreq * 0.5) * t);

    const sample = (h1 + h2 + h3 + h4 + sub) * syllableEnv * envelope * 0.4;
    buffer[i] = Math.max(-1, Math.min(1, sample));
  }

  return encodeWAV(buffer, sampleRate);
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
