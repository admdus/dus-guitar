export type StringIndex = 1 | 2 | 3 | 4 | 5 | 6;
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type SongCategory = "beginner" | "rock" | "folk" | "exercise" | "classical";
export type Judge = "perfect" | "great" | "good" | "miss";
export type NoteStatus = "pending" | Judge;

export interface SongNote {
  id: number;
  time: number;
  duration: number;
  string: StringIndex;
  fret: number;
  chordGroup?: number;
}

export interface SongCover {
  from: string;
  to: string;
  motif: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  bpm: number;
  genre: string;
  category: SongCategory;
  description: string;
  duration: number;
  cover: SongCover;
  notes: SongNote[];
}

export interface DetectedPitch {
  frequency: number;
  midi: number;
  noteName: string;
  cents: number;
  amplitude: number;
  onset: boolean;
  time: number;
}

export interface LiveNote extends SongNote {
  status: NoteStatus;
}

export interface EngineSnapshot {
  playing: boolean;
  finished: boolean;
  currentTime: number;
  speed: number;
  score: number;
  combo: number;
  maxCombo: number;
  counts: Record<Judge, number>;
  accuracy: number;
  stars: number;
  notes: LiveNote[];
  lastJudge: Judge | null;
  countInBeatsLeft: number;
}

export interface HighScore {
  songId: string;
  accuracy: number;
  stars: number;
  score: number;
  date: string;
}

export type Page =
  | { name: "home" }
  | { name: "songs" }
  | { name: "learn" }
  | { name: "tuner" }
  | { name: "setup" }
  | { name: "play"; songId: string };
