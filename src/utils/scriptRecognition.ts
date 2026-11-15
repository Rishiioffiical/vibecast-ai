export type DetectedScriptType = 'hinglish' | 'hindi' | 'english';

export interface ScriptRecognitionResult {
  scriptType: DetectedScriptType;
  label: string;
  shortBadge: string;
  accentLabel: string;
  isEducationalTone: boolean;
  hinglishConfidence: number;
  summaryHint: string;
}

// Comprehensive list of common Romanized Hindi (Hinglish) words
const HINGLISH_MARKERS = new Set([
  'hai', 'hain', 'ho', 'hota', 'hoti', 'hote', 'tha', 'thi', 'the', 'hoga', 'hogi', 'honge',
  'mein', 'mai', 'main', 'hum', 'tum', 'aap', 'aapko', 'aapka', 'aapki', 'apna', 'apni', 'apne',
  'ka', 'ki', 'ke', 'ko', 'se', 'par', 'pe', 'aur', 'ya', 'bhi', 'toh', 'to', 'hi', 'tak', 'saath',
  'kya', 'kaise', 'kaisa', 'kaisi', 'kyun', 'kyunki', 'kab', 'kahan', 'kaun', 'kitna', 'kitne', 'kitni',
  'yeh', 'ye', 'woh', 'wo', 'is', 'us', 'in', 'un', 'iska', 'uska', 'iske', 'uske', 'isko', 'usko',
  'aaj', 'kal', 'ab', 'abhi', 'phir', 'fir', 'jab', 'tab', 'agar', 'magar', 'lekin', 'parantu', 'isliye',
  'nahi', 'nahin', 'na', 'mat', 'haan', 'ji', 'bilkul', 'zaroor', 'shayad', 'lagbhag', 'sirf', 'bas',
  'doston', 'dosto', 'mitron', 'bhai', 'log', 'logon', 'sab', 'sabhi', 'kuch', 'koi', 'har', 'ek', 'do', 'teen',
  'dekhiye', 'dekho', 'dekhte', 'samajh', 'samjhe', 'samajhte', 'samjhenge', 'jaante', 'jaano', 'sikhenge',
  'baat', 'baatein', 'karenge', 'karte', 'karta', 'karti', 'karo', 'karna', 'kiya', 'kiye', 'hui', 'hua',
  'chaliye', 'chalo', 'shuru', 'batate', 'batao', 'bataunga', 'bataungi', 'jaankari',
  'bahut', 'bohot', 'zyada', 'jyada', 'kam', 'accha', 'achha', 'acchi', 'bada', 'badi', 'bade', 'naya', 'nayi',
  'desh', 'bharat', 'duniya', 'zindagi', 'waqt', 'samay', 'paisa', 'paise', 'kaam', 'sarkar', 'padhai',
  'tarah', 'tareeka', 'tareeke', 'mudda', 'sawal', 'jawab', 'matlab', 'jaise', 'waise', 'aise', 'aisi', 'aisa',
  'iske', 'baare', 'bare', 'andar', 'bahar', 'upar', 'neeche', 'pehle', 'baad', 'dauran',
  'namaskar', 'namaste', 'hamari', 'hamare', 'hamara',
]);

const EDUCATIONAL_MARKERS = new Set([
  'understand', 'explain', 'concept', 'science', 'history', 'economy', 'technology', 'system',
  'fact', 'facts', 'reason', 'example', 'important', 'analysis', 'study', 'research', 'learn',
  'lesson', 'topic', 'chapter', 'data', 'process', 'theory', 'how', 'why',
  'samajhte', 'samjhenge', 'jaante', 'sikhenge', 'jaankari', 'matlab', 'tareeka', 'kyunki',
  'isliye', 'doston', 'aaj', 'video', 'episode', 'mudda', 'विश्लेषण', 'समझते', 'जानते', 'इतिहास', 'विज्ञान',
]);

/**
 * Recognizes whether the user's script is Hinglish (Romanized Hindi + English),
 * Devanagari Hindi, or English, and identifies educational/explainer tone.
 */
export function recognizeScript(text: string): ScriptRecognitionResult {
  const clean = (text || '').trim();
  if (!clean) {
    return {
      scriptType: 'hinglish',
      label: 'Ready for Hindi, Hinglish & English',
      shortBadge: '🇮🇳 Auto-Recognize Active',
      accentLabel: 'Indian Educational Accent (en-IN / hi-IN)',
      isEducationalTone: true,
      hinglishConfidence: 0,
      summaryHint: 'Type in Hinglish, Hindi, or English — voice stays locked & speaks in a crystal-clear Indian accent.',
    };
  }

  // Count Devanagari characters
  const devanagariMatches = clean.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  // Extract Latin words
  const latinWords = clean
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  let hinglishHits = 0;
  let eduHits = 0;

  for (const w of latinWords) {
    if (HINGLISH_MARKERS.has(w)) {
      hinglishHits++;
    }
    if (EDUCATIONAL_MARKERS.has(w)) {
      eduHits++;
    }
  }

  // Also check Devanagari educational markers
  if (/समझ|जान|दोस्तों|आज हम|इतिहास|विज्ञान|क्योंकि|इसलिए/.test(clean)) {
    eduHits += 2;
  }

  const isEducationalTone = eduHits >= 1 || hinglishHits >= 2;

  // Case 1: Primarily Devanagari Hindi (or Devanagari + English terms)
  if (devanagariCount > 8 && devanagariCount >= latinWords.length * 1.2) {
    return {
      scriptType: 'hindi',
      label: 'Hindi (Devanagari) Recognized',
      shortBadge: '🇮🇳 Hindi Script',
      accentLabel: 'Native Indian Accent · Crystal-Clear Diction',
      isEducationalTone,
      hinglishConfidence: 1,
      summaryHint: 'Pure Indian Hindi pronunciation with natural human breathing & clear studio articulation.',
    };
  }

  // Case 2: Hinglish (Romanized Hindi mixed with English, or mixed Devanagari + Roman)
  const hinglishRatio = latinWords.length > 0 ? hinglishHits / latinWords.length : 0;
  if (hinglishHits >= 2 || hinglishRatio >= 0.12 || (devanagariCount > 0 && latinWords.length > 0)) {
    return {
      scriptType: 'hinglish',
      label: 'Hinglish Script Recognized',
      shortBadge: '🇮🇳 Hinglish → Indian Accent',
      accentLabel: 'Indian Educational Accent (Crystal Clear)',
      isEducationalTone: true,
      hinglishConfidence: Math.min(1, +(hinglishRatio * 3).toFixed(2)),
      summaryHint: 'Hinglish words are automatically phonetically anchored for a crystal-clear, natural Indian educator voiceover.',
    };
  }

  // Case 3: English script (spoken with crystal-clear Indian Educational Accent)
  return {
    scriptType: 'english',
    label: 'English Script Recognized',
    shortBadge: '🇮🇳 Indian English Accent',
    accentLabel: 'Articulate Indian Educator Accent',
    isEducationalTone,
    hinglishConfidence: 0,
    summaryHint: 'Spoken with crisp, natural Indian English articulation — clear, human-like, and non-robotic.',
  };
}
