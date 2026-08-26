/** @vitest-environment jsdom */

import { deleteImportedSong, findImportedSong, loadImportedSongs, saveImportedSong } from "./library";
import type { Song } from "../types";

function stubSong(id: string, title: string): Song {
  return {
    id,
    title,
    artist: "Imported",
    difficulty: 1,
    bpm: 90,
    genre: "Imported",
    category: "exercise",
    description: "test",
    duration: 1,
    cover: { from: "#0ea5e9", to: "#22d3ee", motif: "dots" },
    notes: [{ id: 0, time: 0, duration: 0.4, string: 6, fret: 0 }],
    imported: true,
  };
}

describe("imported song library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, finds, and deletes a track", () => {
    expect(loadImportedSongs()).toEqual([]);
    saveImportedSong(stubSong("import-a", "A"));
    expect(findImportedSong("import-a")?.title).toBe("A");
    saveImportedSong(stubSong("import-b", "B"));
    expect(loadImportedSongs()).toHaveLength(2);
    deleteImportedSong("import-a");
    expect(findImportedSong("import-a")).toBeUndefined();
    expect(loadImportedSongs().map((song) => song.id)).toEqual(["import-b"]);
  });
});
