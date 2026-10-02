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

function getGeminiClientForRequest(req: Request): {
  ai: GoogleGenAI | null;
  role: 'admin' | 'public' | 'unconfigured';
  userEmail: string;
} {
  const rawEmail = (req.headers['x-user-email'] as string) || (req.body && req.body.userEmail) || '';
  const userEmail = rawEmail.trim().toLowerCase();
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail));

  let selectedKey: string | undefined;
  let role: 'admin' | 'public' | 'unconfigured';

  if (isAdmin) {
    selectedKey = ADMIN_API_KEY || PUBLIC_API_KEY;
    role = 'admin';
  } else {
    selectedKey = PUBLIC_API_KEY || ADMIN_API_KEY;
    role = 'public';
  }

  if (!selectedKey) {
    return { ai: null, role: 'unconfigured', userEmail };
  }

  if (!aiClients[selectedKey]) {
    aiClients[selectedKey] = new GoogleGenAI({
      apiKey: selectedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return { ai: aiClients[selectedKey], role, userEmail };
}

// Map emotion, language, and voice persona to detailed speech metadata style description
function buildStylePrompt(voiceName: string, emotion: string, speed: number, language: string = 'hindi'): string {
  const isEnglish = language === 'english' || /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(language);

  if (isEnglish) {
    const englishStyles: Record<string, string> = {
      'emotional-deep': 'Deep, soulful, and introspective male voice with natural cadence, heartfelt pauses, and resonant vocal warmth.',
      'emotional-dramatic': 'Cinematic, intense, and commanding deep baritone theatrical narrator with powerful presence and dynamic range.',
      'emotional-poetic': 'Warm, charismatic, and conversational male voice with natural phrasing, engaging rhythm, and smooth delivery.',
      'emotional-melancholy': 'Mellow, nostalgic, and quiet reflective voice with delicate sorrow and gentle pacing.',
      'emotional-inspiring': 'Confident, motivational, and passionate speaker with uplifting energy and articulate clarity.',
    };

    const base = englishStyles[emotion] || englishStyles['emotional-deep'];
    const pace = speed < 0.9 ? 'Delivered with thoughtful, deliberate pauses.' :
                 speed > 1.2 ? 'Delivered at a crisp, energetic pace.' : 'Delivered at a natural conversational pace.';
    return `${base} ${pace} Sound completely natural, expressive, and human-like without robotic cadence.`;
  }

  // Hindi Styles
  const hindiStyles: Record<string, string> = {
    'emotional-deep': 'Deep, soulful, and emotionally moving Hindi male voice with expressive pauses, poignant resonance, and heartfelt cadence.',
    'emotional-dramatic': 'Dramatic, intense, and passionate Hindi male theatrical narrator voice with powerful dynamics and cinematic depth.',
    'emotional-poetic': 'Poetic, gentle, and reflective Hindi male voice with soulful warmth, nuanced articulation, and artistic sentiment (शायराना अंदाज).',
    'emotional-melancholy': 'Mellow, nostalgic, and melancholic Hindi male voice with tender emotion, quiet introspection, and subdued grief.',
    'emotional-inspiring': 'Inspirational, motivational, and confident Hindi male speaker voice filled with passion, strength, and uplifting energy.',
  };

  const styleBase = hindiStyles[emotion] || hindiStyles['emotional-deep'];
  const speedNote = speed < 0.9 ? 'Spoken at a deliberate, slow, emotional pace.' :
                    speed > 1.2 ? 'Spoken at a brisk, energetic pace.' : 'Spoken at a natural, measured pace.';

  return `${styleBase} ${speedNote} Pronounce words with authentic natural inflection and expressive human prosody.`;
}

// POST /api/tts - Synthesize speech using Gemini TTS (gemini-3.8-flash-lite-tts free tier model)
app.post('/api/tts', rateLimiter(25, 60000), async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Charon', emotion = 'emotional-deep', speed = 1.0, language = 'hindi' } = req.body;

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
    const allowedEmotions = ['emotional-deep', 'emotional-dramatic', 'emotional-poetic', 'emotional-melancholy', 'emotional-inspiring'];
    const safeEmotion = allowedEmotions.includes(emotion) ? emotion : 'emotional-deep';

    const { ai, role, userEmail } = getGeminiClientForRequest(req);

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
        code: 'API_KEY_MISSING',
      });
    }

    const allowedVoices = ['Charon', 'Fenrir', 'Puck', 'Zephyr', 'Kore', 'Aoede'];
    const chosenVoice = allowedVoices.includes(voice) ? voice : 'Charon';

    const styleInstruction = buildStylePrompt(chosenVoice, safeEmotion, safeSpeed, language);

    // Call Gemini 3.8 Flash Lite TTS with automatic fallback
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
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
                text: cleanText,
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
      return res.status(500).json({
        error: 'The AI model completed the request but did not return audio data.',
      });
    }

    const mimeType = candidatePart?.inlineData?.mimeType || 'audio/wav';

    return res.json({
      audio: base64Audio,
      mimeType,
      voice: chosenVoice,
      emotion,
      speed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/tts:', error);
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

    const { ai } = getGeminiClientForRequest(req);

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const cleanMime = mimeType.split(';')[0] || 'audio/webm';

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

    const transcription = response.text?.trim() || '';
    return res.json({ transcription });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return res.status(500).json({
      error: error?.message || 'Transcription failed',
    });
  }
});

// POST /api/ai/enhance - AI Hindi Script Enhancer & Tone Rewriter using gemini-3.5-flash
app.post('/api/ai/enhance', rateLimiter(30, 60000), async (req: Request, res: Response) => {
  try {
    const { text, type = 'emotional' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Script text is required.' });
    }

    const { ai } = getGeminiClientForRequest(req);

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const instructions: Record<string, string> = {
      emotional: 'Rewrite and elevate this script to be deeply emotional, touching, and poignant (दर्द व गहराई भरा). Use evocative Hindi words with poetic pauses.',
      dramatic: 'Rewrite this script into an intense, cinematic theatrical dialogue with commanding power, passion, and strong rhetorical impact.',
      poetic: 'Convert this script into an exquisite Hindi/Urdu shayari or lyrical kavita with rich metaphors, rhythm, and soulful rhyme.',
      expand: 'Expand this script into a full heartfelt narration (~3-4 rich sentences) keeping the original sentiment alive.',
    };

    const selectedInstruction = instructions[type] || instructions.emotional;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${selectedInstruction}\n\nOriginal Text:\n${text}\n\nIMPORTANT: Return ONLY the rewritten Hindi script in clean Devanagari, ready for immediate text-to-speech voice narration. Do not include quotes, greetings, or conversational remarks.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'You are an award-winning Indian cinematic scriptwriter and emotional Hindi poet (शायर). You specialize in craft and voice prosody for audio speech synthesis.',
        temperature: 0.8,
      },
    });

    return res.json({
      result: response.text?.trim() || text,
      type,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/enhance:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to enhance script',
    });
  }
});

// POST /api/ai/chat - Multi-turn conversational AI script assistant using gemini-3.5-flash
app.post('/api/ai/chat', rateLimiter(30, 60000), async (req: Request, res: Response) => {
  try {
    const { messages = [] } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const { ai } = getGeminiClientForRequest(req);

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    // Format contents for generateContent
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction:
          'You are Vani AI Studio Assistant (वाणी सहायक), an expert Hindi scriptwriter, poet, and voice direction consultant. You assist users in writing emotional Shayaris, dramatic dialogues, and story scripts tailored for Hindi Male and Female text-to-speech voices. Provide clear, expressive Hindi scripts in Devanagari. Format suggested scripts in clear blocks so the user can easily copy or insert them.',
        temperature: 0.7,
      },
    });

    return res.json({
      reply: response.text?.trim() || 'माफ़ कीजिए, कोई उत्तर प्राप्त नहीं हुआ।',
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

    const { ai } = getGeminiClientForRequest(req);

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
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

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
    let response;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\n=== TEXT TO TRANSLATE ===\n${text}\n\n=== TRANSLATED OUTPUT ONLY ===`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.25,
          },
        });
        if (response?.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Translation attempt with ${modelName} failed, trying next candidate:`, err?.message);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All translation models are temporarily busy. Please try again.');
    }

    let translatedText = response.text?.trim() || '';
    // Strip accidental leading/trailing quotation marks if model wrapped them
    if (translatedText.startsWith('"') && translatedText.endsWith('"')) {
      translatedText = translatedText.slice(1, -1).trim();
    }
    if (translatedText.startsWith('“') && translatedText.endsWith('”')) {
      translatedText = translatedText.slice(1, -1).trim();
    }

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
  const { role, userEmail } = getGeminiClientForRequest(req);
  res.json({
    status: 'ok',
    hasApiKey: !!(ADMIN_API_KEY || PUBLIC_API_KEY || process.env.GEMINI_API_KEY),
    adminKeyConfigured: !!ADMIN_API_KEY,
    publicKeyConfigured: !!PUBLIC_API_KEY,
    adminEmails: ADMIN_EMAILS,
    primaryAdmin: ADMIN_EMAILS[0],
    resolvedRole: role,
    userEmail: userEmail || 'anonymous',
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
