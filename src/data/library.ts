import type { Song } from "../types";
import { parseSongJson } from "../engine/transcribe";

const IMPORT_KEY = "dus-guitar-imported-songs";

let cached: Song[] | null = null;
let cachedRaw: string | null = null;

export function loadImportedSongs(): Song[] {
  try {
    const raw = globalThis.localStorage?.getItem(IMPORT_KEY) ?? null;
    if (!raw) {
      cached = [];
      cachedRaw = null;
      return cached;
    }
    if (cached && cachedRaw === raw) return cached;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cached = [];
      cachedRaw = raw;
      return cached;
    }
    cached = parsed.map((item) => parseSongJson(item));
    cachedRaw = raw;
    return cached;
  } catch {
    cached = [];
    cachedRaw = null;
    return cached;
  }
}

export function saveImportedSong(song: Song): Song[] {
  const next = [...loadImportedSongs().filter((item) => item.id !== song.id), { ...song, imported: true }];
  persist(next);
  return next;
}

export function deleteImportedSong(id: string): Song[] {
  const next = loadImportedSongs().filter((song) => song.id !== id);
  persist(next);
  return next;
}

export function findImportedSong(id: string): Song | undefined {
  return loadImportedSongs().find((song) => song.id === id);
}

function persist(songs: Song[]) {
  const raw = JSON.stringify(songs);
  try {
    globalThis.localStorage?.setItem(IMPORT_KEY, raw);
  } catch {
    throw new Error("Could not save the imported song (storage is full or blocked).");
  }
  cached = songs;
  cachedRaw = raw;
}
