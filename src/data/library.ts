import type { Song } from "../types";
import { parseSongJson } from "../engine/transcribe";

const IMPORT_KEY = "dus-guitar-imported-songs";

export function loadImportedSongs(): Song[] {
  try {
    const raw = globalThis.localStorage?.getItem(IMPORT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => parseSongJson(item));
  } catch {
    return [];
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
  try {
    globalThis.localStorage?.setItem(IMPORT_KEY, JSON.stringify(songs));
  } catch {
    throw new Error("Could not save the imported song (storage is full or blocked).");
  }
}
