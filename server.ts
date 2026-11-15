import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '5mb' }));

// Professional Security Headers Middleware
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'microphone=*');
  next();
});

// In-Memory IP Rate Limiter to protect from DDoS, bot spam, and denial of wallet attacks
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function rateLimiter(maxRequests: number, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: () => void) => {
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${rawIp}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      return res.status(429).json({
        error: 'Too many requests. Rate limit exceeded to protect studio resources. Please slow down and try again.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

// Stale record cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Dual API Key Configuration
// ADMIN_API_KEY: Dedicated quota for the admin (e.g. dubeyrishi135@gmail.com, rdpandit913@gmail.com)
// PUBLIC_API_KEY: Dedicated quota for public/standard users
const ADMIN_EMAILS = [
  (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  'dubeyrishi135@gmail.com',
  'rdpandit913@gmail.com',
].filter(Boolean);
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.GEMINI_API_KEY;
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || process.env.GEMINI_API_KEY;

// Cache GoogleGenAI instances by key to avoid re-creation overhead
const aiClients: Record<string, GoogleGenAI> = {};

function getCandidateKeysForRequest(req: Request): {
  keys: string[];
  isAdmin: boolean;
  userEmail: string;
} {
  const rawEmail = (req.headers['x-user-email'] as string) || (req.body && req.body.userEmail) || '';
  const userEmail = rawEmail.trim().toLowerCase();
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail));

  // Build candidate keys pool without duplicates
  const rawPool = isAdmin
    ? [ADMIN_API_KEY, PUBLIC_API_KEY, process.env.GEMINI_API_KEY]
    : [PUBLIC_API_KEY, ADMIN_API_KEY, process.env.GEMINI_API_KEY];

  const keys = Array.from(new Set(rawPool.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)));

  return { keys, isAdmin, userEmail };
}

/**
 * Executes a Gemini operation with automatic multi-key failover and jitter retry.
 * If a key encounters 503 (high demand) or 429 (rate limit), it retries and
 * fails over to alternate keys in the pool.
 */
async function runWithKeyFailover<T>(
  req: Request,
  operation: (ai: GoogleGenAI, key: string, isPrimary: boolean) => Promise<T>
): Promise<T> {
  const { keys } = getCandidateKeysForRequest(req);

  if (keys.length === 0) {
    throw new Error('Gemini API key is not configured on the server.');
  }

  let lastError: any = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!aiClients[key]) {
      aiClients[key] = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          apiVersion: 'v1beta',
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    // Try up to 2 attempts per key in case of momentary 503 spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await operation(aiClients[key], key, i === 0);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusText || err?.code;
        const isTransient = status === 503 || status === 429 || `${err?.message}`.includes('high demand') || `${err?.message}`.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt < 2) {
          await new Promise((r) => setTimeout(r, 350));
          continue;
        }

        console.warn(`[Key Failover] Key #${i + 1} attempt ${attempt} failed: ${err?.message || err} [status: ${status}]. Attempting fallback...`);
        break;
      }
    }

    // Pause briefly before switching to next key
    if (i < keys.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  throw lastError;
}

// Server-side Hinglish & Script Mode Detector
const SERVER_HINGLISH_WORDS = new Set([
  'hai', 'hain', 'ho', 'hota', 'hoti', 'hote', 'tha', 'thi', 'the', 'hoga', 'hogi', 'honge',
  'mein', 'mai', 'main', 'hum', 'tum', 'aap', 'aapko', 'aapka', 'aapki', 'apna', 'apni', 'apne',
  'ka', 'ki', 'ke', 'ko', 'se', 'par', 'pe', 'aur', 'ya', 'bhi', 'toh', 'hi', 'tak', 'saath',
  'kya', 'kaise', 'kaisa', 'kaisi', 'kyun', 'kyunki', 'kab', 'kahan', 'kaun', 'kitna', 'kitne', 'kitni',
  'yeh', 'ye', 'woh', 'wo', 'iska', 'uska', 'iske', 'uske', 'isko', 'usko',
  'aaj', 'kal', 'ab', 'abhi', 'phir', 'fir', 'jab', 'tab', 'agar', 'magar', 'lekin', 'parantu', 'isliye',
  'nahi', 'nahin', 'mat', 'haan', 'ji', 'bilkul', 'zaroor', 'shayad', 'lagbhag', 'sirf', 'bas',
  'doston', 'dosto', 'mitron', 'bhai', 'log', 'logon', 'sab', 'sabhi', 'kuch', 'koi', 'har', 'ek', 'do', 'teen',
  'dekhiye', 'dekho', 'dekhte', 'samajh', 'samjhe', 'samajhte', 'samjhenge', 'jaante', 'jaano', 'sikhenge',
  'baat', 'baatein', 'karenge', 'karte', 'karta', 'karti', 'karo', 'karna', 'kiya', 'kiye', 'hui', 'hua',
  'chaliye', 'chalo', 'shuru', 'batate', 'batao', 'bataunga', 'bataungi', 'jaankari',
  'bahut', 'bohot', 'zyada', 'jyada', 'accha', 'achha', 'acchi', 'bada', 'badi', 'bade', 'naya', 'nayi',
  'desh', 'bharat', 'duniya', 'zindagi', 'waqt', 'samay', 'paisa', 'paise', 'kaam', 'sarkar', 'padhai',
  'tarah', 'tareeka', 'tareeke', 'mudda', 'sawal', 'jawab', 'matlab', 'jaise', 'waise', 'aise', 'aisi', 'aisa',
  'baare', 'bare', 'andar', 'bahar', 'upar', 'neeche', 'pehle', 'baad', 'namaskar', 'namaste', 'hamari', 'hamare',
]);

// Fast fallback dictionary for unambiguous Hinglish words -> Devanagari so Indian pronunciation is guaranteed
const HINGLISH_DEVANAGARI_FALLBACK: Record<string, string> = {
  namaskar: 'नमस्कार', namaste: 'नमस्ते', doston: 'दोस्तों', dosto: 'दोस्तों', mitron: 'मित्रों',
  aaj: 'आज', kal: 'कल', abhi: 'अभी', hum: 'हम', aap: 'आप', aapko: 'आपको', aapka: 'आपका', aapki: 'आपकी',
  mein: 'में', mai: 'मैं', hai: 'है', hain: 'हैं', hota: 'होता', hoti: 'होती', hote: 'होते',
  tha: 'था', thi: 'थी', hoga: 'होगा', hogi: 'होगी', honge: 'होंगे',
  ka: 'का', ki: 'की', ke: 'के', ko: 'को', se: 'से', aur: 'और', bhi: 'भी',
  toh: 'तो', tak: 'तक', saath: 'साथ', kya: 'क्या', kaise: 'कैसे', kyun: 'क्यों', kyunki: 'क्योंकि',
  kab: 'कब', kahan: 'कहाँ', kaun: 'कौन', kitna: 'कितना', kitne: 'कितने', kitni: 'कितनी',
  yeh: 'यह', ye: 'ये', woh: 'वह', wo: 'वो', iska: 'इसका', uska: 'उसका', iske: 'इसके', uske: 'उसके',
  agar: 'अगर', magar: 'मगर', lekin: 'लेकिन', isliye: 'इसलिए', nahi: 'नहीं', nahin: 'नहीं', haan: 'हाँ',
  bilkul: 'बिल्कुल', zaroor: 'ज़रूर', sirf: 'सिर्फ़', sab: 'सब', sabhi: 'सभी', kuch: 'कुछ', koi: 'कोई',
  ek: 'एक', teen: 'तीन', dekhiye: 'देखिए', dekho: 'देखो',
  samajh: 'समझ', samjhe: 'समझे', samajhte: 'समझते', samjhenge: 'समझेंगे', jaante: 'जानते', sikhenge: 'सीखेंगे',
  baat: 'बात', karenge: 'करेंगे', karte: 'करते', karta: 'करता', karti: 'करती', karo: 'करो', karna: 'करना',
  kiya: 'किया', chaliye: 'चलिए', chalo: 'चलो', shuru: 'शुरू', bahut: 'बहुत', bohot: 'बहुत', zyada: 'ज़्यादा', jyada: 'ज़्यादा',
  accha: 'अच्छा', achha: 'अच्छा', bada: 'बड़ा', badi: 'बड़ी', bade: 'बड़े', naya: 'नया', nayi: 'नयी',
  desh: 'देश', bharat: 'भारत', duniya: 'दुनिया', zindagi: 'ज़िंदगी', waqt: 'वक़्त', samay: 'समय',
  kaam: 'काम', tarah: 'तरह', tareeka: 'तरीका', tareeke: 'तरीके', mudda: 'मुद्दा', sawal: 'सवाल', jawab: 'जवाब',
  matlab: 'मतलब', jaise: 'जैसे', waise: 'वैसे', aise: 'ऐसे', baare: 'बारे',
  pehle: 'पहले', baad: 'बाद', hamari: 'हमारी', hamare: 'हमारे', hamara: 'हमारा', apna: 'अपना', apni: 'अपनी', apne: 'अपने',
  peeche: 'पीछे', gehra: 'गहरा', jab: 'जब', tab: 'तब',
};

function detectServerScriptMode(text: string): 'hinglish' | 'hindi' | 'english' {
  const clean = text.trim();
  const devanagariCount = (clean.match(/[\u0900-\u097F]/g) || []).length;
  const words = clean
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  let hinglishHits = 0;
  for (const w of words) {
    if (SERVER_HINGLISH_WORDS.has(w)) {
      hinglishHits++;
    }
  }

  if (devanagariCount > 8 && devanagariCount >= words.length * 1.2) {
    return 'hindi';
  }

  const ratio = words.length > 0 ? hinglishHits / words.length : 0;
  if (hinglishHits >= 2 || ratio >= 0.12 || (devanagariCount > 0 && words.length > 0)) {
    return 'hinglish';
  }

  return 'english';
}

function applyDictionaryHinglishFallback(text: string): string {
  return text.replace(/\b([a-zA-Z]+)\b/g, (match) => {
    const lower = match.toLowerCase();
    return HINGLISH_DEVANAGARI_FALLBACK[lower] || match;
  });
}

/**
 * Converts Romanized Hindi (Hinglish) script into phonetically accurate Devanagari + Indian English
 * so Gemini TTS speaks with an authentic, crystal-clear Indian Educational accent instead of a Western/robotic accent.
 */
async function prepareHinglishForIndianTts(ai: GoogleGenAI, text: string): Promise<string> {
  try {
    const prompt = `Convert the following Hinglish (Romanized Hindi mixed with English) script into clean Devanagari script for phonetic Indian accent text-to-speech synthesis.
CRITICAL RULES:
1. DO NOT translate or change any word's meaning or word order! Keep the exact same spoken words.
2. Transliterate Hindi words written in the English alphabet into pure Devanagari (e.g., "Namaskar doston aaj ke is video mein hum samjhenge" -> "नमस्कार दोस्तों आज के इस वीडियो में हम समझेंगे").
3. For English technical/modern words (e.g., Artificial Intelligence, Quantum Computing, Economy, Technology, Concept, Step by Step), keep them natural or in clean Indian Devanagari phonetics so an Indian educator pronounces every word in a crystal-clear Indian accent.
4. Preserve all punctuation (commas, periods, question marks, exclamation marks) for natural human breathing pauses.
5. Output ONLY the converted script text—no quotes, no explanations.

Input Hinglish Script:
${text}`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Hinglish phonetic pass timed out')), 6500)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
      }),
      timeoutPromise,
    ]);

    let converted = response.text?.trim() || '';
    if (converted.startsWith('"') && converted.endsWith('"')) {
      converted = converted.slice(1, -1).trim();
    }
    return converted || applyDictionaryHinglishFallback(text);
  } catch (err) {
    console.warn('Hinglish phonetic pass skipped/fallback used:', (err as Error)?.message || err);
    return applyDictionaryHinglishFallback(text);
  }
}

// Map emotion, language, scriptMode, and voice persona to detailed speech metadata style description
function buildStylePrompt(
  voiceName: string,
  emotion: string,
  speed: number,
  language: string = 'hindi',
  scriptMode: 'hinglish' | 'hindi' | 'english' = 'hindi',
  voiceId: string = ''
): string {
  const isEducational =
    emotion === 'educational-clear' ||
    voiceId.startsWith('indian-edu-') ||
    scriptMode === 'hinglish';

  const paceNote =
    speed < 0.9
      ? 'Deliver at a calm, measured, deliberate teaching pace with clear pauses between concepts.'
      : speed > 1.15
      ? 'Deliver at an engaging, crisp, articulate pace with crystal-clear syllable separation.'
      : 'Deliver at a natural, steady human educator pace with organic breath pauses.';

  if (isEducational) {
    return `Authentic, crystal-clear Indian educator and documentary explainer voice (${voiceName}) with a natural, educated Indian accent (en-IN / hi-IN). Speak like a real human teacher explaining concepts clearly—crisp consonant articulation, warm studio close-mic presence, natural human breathing pauses, and genuine intellectual curiosity. Pronounce Hindi and Hinglish words with native Indian phonetics and English terms with a clean, articulate Indian accent. Maintain 100% consistent vocal identity and timbre. Strictly avoid any robotic, monotonous, or synthetic AI cadence. ${paceNote}`;
  }

  const isEnglish = scriptMode === 'english' && language === 'english';

  if (isEnglish) {
    const englishStyles: Record<string, string> = {
      'educational-clear': 'Crystal-clear, articulate Indian English educator and documentary narrator with crisp diction and natural human cadence.',
      'emotional-deep': 'Deep, soulful, and introspective male voice with natural cadence, heartfelt pauses, and resonant vocal warmth.',
      'emotional-dramatic': 'Cinematic, intense, and commanding deep baritone theatrical narrator with powerful presence and dynamic range.',
      'emotional-poetic': 'Warm, charismatic, and conversational male voice with natural phrasing, engaging rhythm, and smooth delivery.',
      'emotional-melancholy': 'Mellow, nostalgic, and quiet reflective voice with delicate sorrow and gentle pacing.',
      'emotional-inspiring': 'Confident, motivational, and passionate speaker with uplifting energy and articulate clarity.',
    };

    const base = englishStyles[emotion] || englishStyles['educational-clear'];
    return `${base} ${paceNote} Sound completely natural, crystal-clear, and human-like without robotic AI cadence.`;
  }

  // Hindi & Hinglish Styles (Always authentic Indian accent & crystal-clear studio diction)
  const hindiStyles: Record<string, string> = {
    'educational-clear': 'Crystal-clear, articulate Indian educator and explainer voice (Hindi & Hinglish) with crisp studio diction, natural human breath pauses, and zero robotic AI tone.',
    'emotional-deep': 'Deep, soulful, and emotionally moving Indian Hindi voice with crystal-clear diction, expressive pauses, poignant resonance, and heartfelt human cadence.',
    'emotional-dramatic': 'Dramatic, intense, and commanding Indian Hindi theatrical narrator voice with crystal-clear articulation and cinematic depth.',
    'emotional-poetic': 'Poetic, warm, and conversational Indian Hindi voice with soulful clarity, nuanced articulation, and natural human flow.',
    'emotional-melancholy': 'Mellow, nostalgic, and tender Indian Hindi voice with gentle human breathing and clear, intimate studio presence.',
    'emotional-inspiring': 'Inspirational, motivational, and confident Indian Hindi speaker voice filled with clarity, conviction, and uplifting human energy.',
  };

  const styleBase = hindiStyles[emotion] || hindiStyles['educational-clear'];
  return `${styleBase} ${paceNote} Pronounce every word with authentic Indian inflection, crystal-clear studio articulation, and natural human prosody.`;
}

// POST /api/tts - Synthesize speech using Gemini TTS (gemini-3.8-flash-lite-tts free tier model)
app.post('/api/tts', rateLimiter(25, 60000), async (req: Request, res: Response) => {
  try {
    const {
      text,
      voice,
      voiceName,
      voiceId = '',
      emotion = 'educational-clear',
      speed = 1.0,
      language = 'hindi',
      scriptMode: clientScriptMode,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text script is required.', code: 'INVALID_INPUT' });
    }

    const cleanText = text.trim();
    if (cleanText.length > 2500) {
      return res.status(400).json({
        error: 'Script text exceeds maximum allowed limit of 2,500 characters per take.',
        code: 'SCRIPT_TOO_LONG',
      });
    }

    const safeSpeed = Math.min(2.0, Math.max(0.5, Number(speed) || 1.0));
    const allowedEmotions = [
      'educational-clear',
      'emotional-deep',
      'emotional-dramatic',
      'emotional-poetic',
      'emotional-melancholy',
      'emotional-inspiring',
    ];
    const safeEmotion = allowedEmotions.includes(emotion) ? emotion : 'educational-clear';

    // Strictly honor the locked voiceName or voice sent by the client
    const requestedVoice = voiceName || voice || 'Charon';
    const allowedVoices = ['Charon', 'Fenrir', 'Puck', 'Zephyr', 'Kore', 'Aoede'];
    const chosenVoice = allowedVoices.includes(requestedVoice) ? requestedVoice : 'Charon';

    // Auto-recognize script mode (hinglish, hindi, or english)
    const detectedMode = clientScriptMode || detectServerScriptMode(cleanText);

    const styleInstruction = buildStylePrompt(
      chosenVoice,
      safeEmotion,
      safeSpeed,
      language,
      detectedMode,
      voiceId
    );

    // Call Gemini 3.8 Flash Lite TTS with automatic multi-key failover
    const result = await runWithKeyFailover(req, async (ai) => {
      // If script is Hinglish, phonetically anchor Roman Hindi words to Devanagari for authentic Indian accent
      const textForSynthesis =
        detectedMode === 'hinglish'
          ? await prepareHinglishForIndianTts(ai, cleanText)
          : cleanText;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: textForSynthesis,
                  speechMetadata: {
                    style: styleInstruction,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: chosenVoice,
                },
              },
            },
          },
        });
      } catch (innerErr: any) {
        console.warn('TTS with speechMetadata failed, retrying with standard text prompt...', innerErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: textForSynthesis,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: chosenVoice,
                },
              },
            },
          },
        });
      }

      const candidatePart = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = candidatePart?.inlineData?.data;

      if (!base64Audio) {
        throw new Error('The AI model completed the request but did not return audio data.');
      }

      const mimeType = candidatePart?.inlineData?.mimeType || 'audio/wav';
      return { base64Audio, mimeType, detectedMode };
    });

    return res.json({
      audio: result.base64Audio,
      mimeType: result.mimeType,
      voice: chosenVoice,
      emotion: safeEmotion,
      speed: safeSpeed,
      scriptMode: result.detectedMode,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/tts after all key attempts:', error);
    const errorMessage = error?.message || 'Failed to synthesize speech.';
    return res.status(500).json({
      error: errorMessage,
      details: error?.statusText || error?.name,
    });
  }
});

// POST /api/transcribe - Transcribe voice using gemini-3.5-transcribe
app.post('/api/transcribe', rateLimiter(20, 60000), async (req: Request, res: Response) => {
  try {
    const { audio, mimeType = 'audio/webm' } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required for transcription.' });
    }

    const cleanMime = mimeType.split(';')[0] || 'audio/webm';

    const transcription = await runWithKeyFailover(req, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: audio,
                },
              },
              {
                text: 'Transcribe this spoken audio accurately into natural Hindi (using Devanagari script). Keep the exact wording and natural emotional flow. Do not add metadata or preamble, just return the transcription.',
              },
            ],
          },
        ],
      });
      return response.text?.trim() || '';
    });

    return res.json({ transcription });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      error: error?.message || 'Transcription failed',
    });
  }
});

// POST /api/ai/enhance - AI Hindi Script Enhancer & Tone Rewriter using gemini-3.8-flash
app.post('/api/ai/enhance', rateLimiter(30, 60000), async (req: Request, res: Response) => {
  try {
    const { text, type = 'emotional' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Script text is required.' });
    }

    const instructions: Record<string, string> = {
      emotional: 'Rewrite and elevate this script to be deeply emotional, touching, and poignant (दर्द व गहराई भरा). Use evocative Hindi words with poetic pauses.',
      dramatic: 'Rewrite this script into an intense, cinematic theatrical dialogue with commanding power, passion, and strong rhetorical impact.',
      poetic: 'Convert this script into an exquisite Hindi/Urdu shayari or lyrical kavita with rich metaphors, rhythm, and soulful rhyme.',
      expand: 'Expand this script into a full heartfelt narration (~3-4 rich sentences) keeping the original sentiment alive.',
    };

    const selectedInstruction = instructions[type] || instructions.emotional;

    const result = await runWithKeyFailover(req, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${selectedInstruction}\n\nOriginal Text:\n${text}\n\nIMPORTANT: Return ONLY the rewritten script, ready for immediate text-to-speech voice narration. Do not include quotes, greetings, or conversational remarks.`,
        config: {
          systemInstruction:
            'You are an award-winning Indian cinematic scriptwriter, educator, and emotional Hindi poet (शायर). You specialize in craft and voice prosody for audio speech synthesis.',
        },
      });
      return response.text?.trim() || text;
    });

    return res.json({
      result,
      type,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/enhance:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to enhance script',
    });
  }
});

// Helper to extract deduplicated web sources from Gemini groundingMetadata
function extractGroundingSources(response: any): {
  sources: Array<{ title: string; uri: string }>;
  searchQueries: string[];
} {
  const metadata = response?.candidates?.[0]?.groundingMetadata;
  const chunks = metadata?.groundingChunks || [];
  const seenUris = new Set<string>();
  const sources: Array<{ title: string; uri: string }> = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && typeof uri === 'string' && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({
        title: (title && typeof title === 'string' ? title.trim() : uri),
        uri,
      });
    }
  }

  const searchQueries = Array.isArray(metadata?.webSearchQueries)
    ? metadata.webSearchQueries.filter((q: any) => typeof q === 'string')
    : [];

  return { sources, searchQueries };
}

// POST /api/ai/google-search-script - Generate a voiceover script grounded in real-time Google Search data
app.post('/api/ai/google-search-script', rateLimiter(25, 60000), async (req: Request, res: Response) => {
  try {
    const { query, language = 'hindi', emotion = 'emotional-deep' } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search topic or query is required.' });
    }

    const cleanQuery = query.trim();
    const isHindi = language === 'hindi';

    const emotionToneMap: Record<string, string> = {
      'emotional-deep': 'deep, soulful, reflective, and emotionally resonant documentary narration',
      'emotional-dramatic': 'intense, cinematic, commanding, and high-stakes broadcast storytelling',
      'emotional-poetic': 'warm, eloquent, literary, and lyrical podcast storytelling',
      'emotional-melancholy': 'poignant, thoughtful, and deeply moving narrative tone',
      'emotional-inspiring': 'uplifting, visionary, energetic, and motivational voiceover narration',
    };

    const toneDescription = emotionToneMap[emotion] || emotionToneMap['emotional-deep'];

    const prompt = isHindi
      ? `Search Google for the latest, verified, real-world facts and news about: "${cleanQuery}".
Using accurate, up-to-date information from Google Search, write a compelling, natural spoken voiceover / podcast script in pure Hindi (Devanagari script) suitable for immediate text-to-speech synthesis.
Tone & Style: ${toneDescription}.
Length: 4 to 6 rich, engaging spoken sentences (~80–140 words).
Rules:
1. Incorporate real facts, dates, figures, or recent developments found via Google Search naturally into the spoken narration.
2. Write ONLY in clean Devanagari Hindi (e.g., नमस्ते दोस्तों...) with natural punctuation (commas, ellipses, full stops) for expressive vocal pauses.
3. Return ONLY the spoken voiceover script text itself—no titles, no markdown headers, no bullet points, and no introductory remarks.`
      : `Search Google for the latest, verified, real-world facts and news about: "${cleanQuery}".
Using accurate, up-to-date information from Google Search, write a compelling, natural spoken voiceover / podcast script in English suitable for immediate text-to-speech synthesis.
Tone & Style: ${toneDescription}.
Length: 4 to 6 rich, engaging spoken sentences (~80–140 words).
Rules:
1. Incorporate real facts, dates, figures, or recent developments found via Google Search naturally into the spoken narration.
2. Use natural punctuation (commas, ellipses, periods) for expressive vocal cadence.
3. Return ONLY the spoken voiceover script text itself—no titles, no markdown headers, no bullet points, and no introductory remarks.`;

    const result = await runWithKeyFailover(req, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'You are an award-winning documentary & podcast voiceover scriptwriter. You always ground your scripts in real, up-to-date facts retrieved via Google Search and write clean spoken narration ready for studio TTS.',
        },
      });

      let script = response.text?.trim() || '';
      if (script.startsWith('"') && script.endsWith('"')) {
        script = script.slice(1, -1).trim();
      }
      const { sources, searchQueries } = extractGroundingSources(response);
      return { script, sources, searchQueries };
    });

    return res.json({
      script: result.script,
      sources: result.sources,
      searchQueries: result.searchQueries,
      language,
      query: cleanQuery,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/google-search-script:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate script from Google Search data.',
    });
  }
});

// POST /api/ai/chat - Multi-turn conversational AI script assistant using gemini-4-hydrogen + Google Search Grounding
app.post('/api/ai/chat', rateLimiter(30, 60000), async (req: Request, res: Response) => {
  try {
    const { messages = [] } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Format contents for generateContent
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    const result = await runWithKeyFailover(req, async (ai) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: formattedContents,
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction:
              'You are Vani AI Studio Assistant (वाणी सहायक), an expert Hindi, Hinglish & English scriptwriter, documentary researcher, poet, and voice direction consultant. You have live Google Search access to ground scripts in real-time news, facts, history, sports, science, and current events. Assist users in writing emotional Shayaris, dramatic dialogues, and factual podcast/documentary scripts tailored for text-to-speech voices.',
          },
        });
        const reply = response.text?.trim() || 'माफ़ कीजिए, कोई उत्तर प्राप्त नहीं हुआ।';
        const { sources, searchQueries } = extractGroundingSources(response);
        return { reply, sources, searchQueries };
      } catch (primaryErr: any) {
        const msg = `${primaryErr?.message || ''}`;
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: formattedContents,
            config: {
              systemInstruction:
                'You are Vani AI Studio Assistant (वाणी सहायक), an expert Hindi, Hinglish & English scriptwriter, documentary researcher, poet, and voice direction consultant. Assist users in writing emotional Shayaris, dramatic dialogues, and clear educational/podcast scripts tailored for text-to-speech voices.',
            },
          });
          return {
            reply: fallbackResponse.text?.trim() || 'माफ़ कीजिए, कोई उत्तर प्राप्त नहीं हुआ।',
            sources: [],
            searchQueries: [],
          };
        }
        throw primaryErr;
      }
    });

    return res.json({
      reply: result.reply,
      sources: result.sources,
      searchQueries: result.searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Chat generation failed',
    });
  }
});

// POST /api/ai/translate - Ultra-Powerful Voiceover Script Translator (English <-> Hindi & Hinglish)
app.post('/api/ai/translate', rateLimiter(30, 60000), async (req: Request, res: Response) => {
  try {
    const { text, targetLang = 'hindi', style = 'natural' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for translation.' });
    }

    const isToHindi = targetLang === 'hindi';

    let styleDirective = '';
    if (style === 'emotional') {
      styleDirective = 'Use deeply evocative, touching, heartfelt vocabulary with emotional weight (गहराई और भावुकता).';
    } else if (style === 'poetic') {
      styleDirective = 'Use rhythmic, lyrical, poetic diction suitable for artistic recitation, shayaris, or theatrical monologues.';
    } else {
      styleDirective = 'Use natural, idiomatic, spoken voiceover language that sounds completely authentic when spoken out loud.';
    }

    const systemPrompt = isToHindi
      ? `You are an elite bilingual dialogue & voiceover translation master specializing in English to Hindi (and Hinglish/Romanized Hindi to pure Devanagari Hindi).
Translate the user's script into high-fidelity, spoken Hindi (using clean Devanagari script).
Rules:
1. ${styleDirective}
2. Never do literal machine translation. Translate the emotional intent, nuance, subtext, and natural cadence.
3. If the input text is Hinglish (Hindi written in English alphabet, e.g. "Mujhe tumse kuch kehna hai"), correctly transcribe and translate it into pure, natural Devanagari Hindi.
4. Preserve commas, ellipsis (...), question marks, and exclamation marks so voice synthesis prosody remains expressive.
5. Keep recognized global proper nouns (e.g. Einstein, Google, New York) natural in Devanagari.
6. Output ONLY the translated Hindi script. Do NOT include quotes, "Translation:", notes, or preambles.`
      : `You are an elite bilingual dialogue & voiceover translation master specializing in Hindi (Devanagari or Hinglish) to English.
Translate the user's script into high-fidelity, spoken English suitable for natural studio voice synthesis.
Rules:
1. ${styleDirective}
2. Never do literal word-by-word translation. Capture the exact emotional intensity, cultural resonance, and spoken rhythm.
3. If the input text is in Hindi Devanagari or Hinglish, produce natural, cinematic, idiomatic English dialogue.
4. Preserve punctuation, pauses, and rhetorical questions for voice cadence.
5. Output ONLY the translated English script. Do NOT include quotes, "Translation:", notes, or preambles.`;

    const translatedText = await runWithKeyFailover(req, async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${systemPrompt}\n\n=== TEXT TO TRANSLATE ===\n${text}\n\n=== TRANSLATED OUTPUT ONLY ===`,
      });

      let out = response.text?.trim() || '';
      if (out.startsWith('"') && out.endsWith('"')) {
        out = out.slice(1, -1).trim();
      }
      if (out.startsWith('“') && out.endsWith('”')) {
        out = out.slice(1, -1).trim();
      }
      return out;
    });

    return res.json({ translatedText, targetLang, style });
  } catch (error: any) {
    console.error('Error in /api/ai/translate:', error);
    return res.status(500).json({
      error: error?.message || 'Translation failed',
    });
  }
});

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  const { keys, isAdmin } = getCandidateKeysForRequest(req);
  res.json({
    status: 'ok',
    hasApiKey: keys.length > 0,
    totalKeysInPool: keys.length,
    adminKeyConfigured: !!ADMIN_API_KEY,
    publicKeyConfigured: !!PUBLIC_API_KEY,
    resolvedRole: isAdmin ? 'admin' : 'public',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
