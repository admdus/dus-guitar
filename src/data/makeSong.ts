import type { Song } from "../types";
import { fromBeats, songDuration, type BeatEvent } from "../engine/tab";

export function makeSong(
  song: Omit<Song, "notes" | "duration"> & { events: BeatEvent[] },
): Song {
  const notes = fromBeats(song.bpm, song.events);
  return {
    ...song,
    notes,
    duration: songDuration(notes),
  };
}
