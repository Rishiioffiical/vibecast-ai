export interface StudioSharePayload {
  text: string;
  voiceName?: string;
  emotionLabel?: string;
  speed?: number;
  language?: string;
  voiceId?: string;
  timestamp?: number;
}

function encodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeUtf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(payload: StudioSharePayload): string {
  const safePayload: StudioSharePayload = {
    text: payload.text?.trim() || '',
    voiceName: payload.voiceName || 'VibeCast Studio',
    emotionLabel: payload.emotionLabel || 'Educational',
    speed: Number(payload.speed) || 1,
    language: payload.language || 'hindi',
    voiceId: payload.voiceId || '',
    timestamp: payload.timestamp || Date.now(),
  };

  const serialized = JSON.stringify(safePayload);
  const encoded = encodeUtf8(serialized);
  const url = new URL(window.location.href);
  url.searchParams.set('take', encoded);
  return url.toString();
}

export function readSharePayload(search: string): StudioSharePayload | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get('take') || params.get('share');
    if (!raw) return null;

    const decoded = decodeUtf8(raw);
    const parsed = JSON.parse(decoded) as StudioSharePayload;
    if (!parsed || typeof parsed.text !== 'string' || !parsed.text.trim()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
