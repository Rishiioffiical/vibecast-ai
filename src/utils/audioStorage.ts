import { GeneratedClip } from '../types';
import { ALL_VOICES, EMOTIONS } from '../data/voices';
import { callGeminiTts } from './audioSynthesis';

const DB_NAME = 'VibeCastAudioVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_takes';
const LOCAL_META_KEY = 'vibecast_recent_takes_meta_v1';
const MAX_VAULT_TAKES = 50;

interface StoredAudioTakeRecord {
  id: string;
  clip: GeneratedClip;
  audioBlob?: Blob;
  savedAt: number;
}

// Keep a runtime cache of live Object URLs created during this session so we don't recreate duplicates
const liveObjectUrlCache = new Map<string, string>();

function openAudioVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB Audio Vault'));
  });
}

function saveMetaBackupToLocalStorage(clips: GeneratedClip[]) {
  try {
    const trimmed = clips.slice(0, MAX_VAULT_TAKES);
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to write metadata backup to localStorage:', e);
  }
}

function loadMetaBackupFromLocalStorage(): GeneratedClip[] {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Persists a generated clip and its raw binary WAV Blob into IndexedDB so it survives
 * page reloads, browser restarts, and offline sessions without losing audio data.
 */
export async function saveAudioTakeToVault(clip: GeneratedClip, audioBlob?: Blob): Promise<void> {
  let blobToSave = audioBlob;

  if (!blobToSave && clip.audioUrl) {
    try {
      const response = await fetch(clip.audioUrl);
      if (response.ok) {
        blobToSave = await response.blob();
      }
    } catch (e) {
      console.warn('Could not fetch audioUrl blob for vault storage:', e);
    }
  }

  if (blobToSave) {
    liveObjectUrlCache.set(clip.id, clip.audioUrl);
  }

  // Update localStorage metadata list as well
  const existingMeta = loadMetaBackupFromLocalStorage().filter((c) => c.id !== clip.id);
  saveMetaBackupToLocalStorage([clip, ...existingMeta]);

  try {
    const db = await openAudioVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredAudioTakeRecord = {
        id: clip.id,
        clip,
        audioBlob: blobToSave,
        savedAt: clip.timestamp || Date.now(),
      };

      store.put(record);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });

    await pruneOldVaultTakes();
  } catch (err) {
    console.warn('IndexedDB saveAudioTakeToVault warning:', err);
  }
}

async function pruneOldVaultTakes(): Promise<void> {
  try {
    const db = await openAudioVaultDB();
    const records = await new Promise<StoredAudioTakeRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredAudioTakeRecord[]) || []);
      req.onerror = () => reject(req.error);
    });

    if (records.length <= MAX_VAULT_TAKES) {
      db.close();
      return;
    }

    records.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const toRemove = records.slice(MAX_VAULT_TAKES);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const item of toRemove) {
        store.delete(item.id);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    // Ignore pruning errors
  }
}

/**
 * Loads all persisted takes from IndexedDB and reconstructs live playable/downloadable
 * Object URLs from the stored binary WAV Blobs.
 */
export async function loadAllStoredTakesFromVault(): Promise<GeneratedClip[]> {
  const metaBackup = loadMetaBackupFromLocalStorage();

  try {
    const db = await openAudioVaultDB();
    const records = await new Promise<StoredAudioTakeRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredAudioTakeRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    const byId = new Map<string, GeneratedClip>();

    for (const rec of records) {
      if (!rec || !rec.clip) continue;
      let liveUrl = liveObjectUrlCache.get(rec.id);
      if (!liveUrl && rec.audioBlob instanceof Blob && rec.audioBlob.size > 0) {
        liveUrl = URL.createObjectURL(rec.audioBlob);
        liveObjectUrlCache.set(rec.id, liveUrl);
      }
      byId.set(rec.id, {
        ...rec.clip,
        audioUrl: liveUrl || rec.clip.audioUrl,
      });
    }

    for (const metaClip of metaBackup) {
      if (!byId.has(metaClip.id)) {
        byId.set(metaClip.id, metaClip);
      }
    }

    const merged = Array.from(byId.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return merged.slice(0, MAX_VAULT_TAKES);
  } catch (err) {
    console.warn('Falling back to localStorage metadata for recent takes:', err);
    return metaBackup;
  }
}

/**
 * Merges Firestore cloud takes with locally stored IndexedDB takes and hydrates
 * valid live Object URLs for any take whose binary Blob is stored in IndexedDB.
 */
export async function mergeAndHydrateTakes(cloudTakes: GeneratedClip[]): Promise<GeneratedClip[]> {
  const localTakes = await loadAllStoredTakesFromVault();
  const byId = new Map<string, GeneratedClip>();

  for (const local of localTakes) {
    byId.set(local.id, local);
  }

  for (const cloud of cloudTakes) {
    const existingLocal = byId.get(cloud.id);
    const cachedLiveUrl = liveObjectUrlCache.get(cloud.id);

    if (existingLocal && cachedLiveUrl) {
      byId.set(cloud.id, {
        ...cloud,
        audioUrl: cachedLiveUrl,
      });
    } else if (!existingLocal) {
      byId.set(cloud.id, cloud);
    }
  }

  const combined = Array.from(byId.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  saveMetaBackupToLocalStorage(combined);
  return combined.slice(0, MAX_VAULT_TAKES);
}

/**
 * Checks whether a take has its raw binary audio Blob cached in the local IndexedDB vault.
 */
export function hasCachedLiveAudio(clipId: string): boolean {
  return liveObjectUrlCache.has(clipId);
}

/**
 * Ensures a clip has a valid, playable, downloadable audioUrl.
 * 1. Tests if clip.audioUrl is already a live reachable Blob/HTTP stream.
 * 2. Checks IndexedDB for the stored binary Blob and creates a fresh Object URL.
 * 3. If the take was synced from the cloud on a new device without a local Blob,
 *    automatically re-synthesizes the exact take via Gemini TTS and caches the Blob in IndexedDB.
 */
export async function ensurePlayableClipAudio(
  clip: GeneratedClip
): Promise<{ clip: GeneratedClip; reSynthesized: boolean }> {
  // 1. Check if current audioUrl is already live and reachable
  if (clip.audioUrl) {
    try {
      const testRes = await fetch(clip.audioUrl);
      if (testRes.ok) {
        const testBlob = await testRes.blob();
        if (testBlob.size > 0) {
          if (!liveObjectUrlCache.has(clip.id)) {
            await saveAudioTakeToVault(clip, testBlob);
          }
          return { clip, reSynthesized: false };
        }
      }
    } catch {
      // Expired blob URL from previous session — proceed to Vault recovery
    }
  }

  // 2. Check runtime cache or IndexedDB Vault for stored binary Blob
  try {
    const db = await openAudioVaultDB();
    const record = await new Promise<StoredAudioTakeRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(clip.id);
      req.onsuccess = () => resolve(req.result as StoredAudioTakeRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (record?.audioBlob instanceof Blob && record.audioBlob.size > 0) {
      const freshUrl = URL.createObjectURL(record.audioBlob);
      liveObjectUrlCache.set(clip.id, freshUrl);
      const updatedClip: GeneratedClip = {
        ...clip,
        audioUrl: freshUrl,
      };
      return { clip: updatedClip, reSynthesized: false };
    }
  } catch (e) {
    console.warn('Error checking IndexedDB for take blob:', e);
  }

  // 3. Cloud take from an earlier session or another device without local binary Blob:
  // Re-synthesize using the saved voice, emotion, speed, and script, then store in Vault
  const matchedVoice =
    ALL_VOICES.find((v) => clip.voiceName.toLowerCase().includes(v.name.toLowerCase())) ||
    ALL_VOICES.find((v) => v.language === clip.language) ||
    ALL_VOICES[0];

  const matchedEmotion =
    EMOTIONS.find((e) => e.label.toLowerCase() === clip.emotionLabel.toLowerCase()) ||
    EMOTIONS[0];

  const result = await callGeminiTts({
    text: clip.text,
    voiceName: matchedVoice.geminiVoice,
    emotion: matchedEmotion.id,
    speed: clip.speed || 1.0,
    language: clip.language || matchedVoice.language,
  });

  const restoredClip: GeneratedClip = {
    ...clip,
    audioUrl: result.audioUrl,
    engine: result.engine,
  };

  await saveAudioTakeToVault(restoredClip, result.blob);
  return { clip: restoredClip, reSynthesized: true };
}

/**
 * Deletes a single take from IndexedDB and localStorage metadata backup.
 */
export async function deleteTakeFromVault(clipId: string): Promise<void> {
  const cachedUrl = liveObjectUrlCache.get(clipId);
  if (cachedUrl) {
    try {
      URL.revokeObjectURL(cachedUrl);
    } catch {}
    liveObjectUrlCache.delete(clipId);
  }

  const remainingMeta = loadMetaBackupFromLocalStorage().filter((c) => c.id !== clipId);
  saveMetaBackupToLocalStorage(remainingMeta);

  try {
    const db = await openAudioVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(clipId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('Failed to delete take from IndexedDB vault:', e);
  }
}

/**
 * Clears all stored takes from IndexedDB and localStorage backup.
 */
export async function clearAllTakesFromVault(): Promise<void> {
  for (const url of liveObjectUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
  liveObjectUrlCache.clear();

  try {
    localStorage.removeItem(LOCAL_META_KEY);
  } catch {}

  try {
    const db = await openAudioVaultDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('Failed to clear IndexedDB vault:', e);
  }
}
