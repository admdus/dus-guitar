import type { Song } from "../types";
import { fromBeats, loopBar, songDuration, type BeatEvent } from "../engine/tab";

function makeSong(
  song: Omit<Song, "notes" | "duration"> & { events: BeatEvent[] },
): Song {
  const notes = fromBeats(song.bpm, song.events);
  return {
    ...song,
    notes,
    duration: songDuration(notes),
  };
}

/** Two-string power chord: root plus the fifth on the next thinner string. */
function powerChord(
  beat: number,
  rootString: 5 | 6,
  fret: number,
  duration: number,
  group: number,
): BeatEvent[] {
  return [
    [beat, rootString, fret, duration, group],
    [beat, rootString - 1, fret + 2, duration, group],
  ];
}

function chug(
  start: number,
  count: number,
  step: number,
  rootString: 5 | 6,
  fret: number,
  duration: number,
  groupStart: number,
): BeatEvent[] {
  const out: BeatEvent[] = [];
  for (let i = 0; i < count; i++) {
    out.push(...powerChord(start + i * step, rootString, fret, duration, groupStart + i));
  }
  return out;
}

function shiftBeats(events: BeatEvent[], beatOffset: number, groupOffset: number): BeatEvent[] {
  return events.map(([beat, str, fret, duration, group]) => {
    const next: BeatEvent = [beat + beatOffset, str, fret, duration];
    if (group !== undefined) next[4] = group + groupOffset;
    return next;
  });
}

const sparkEvents: BeatEvent[] = [
  [0, 6, 0, 0.7],
  [1, 5, 0, 0.7],
  [2, 4, 0, 0.7],
  [3, 3, 0, 0.7],
  [4, 6, 0, 0.7],
  [5, 5, 0, 0.7],
  [6, 4, 0, 0.7],
  [7, 3, 0, 0.7],
];

const openRoadsEvents = loopBar(4, 8, [
  [0, 6, 0, 0.8],
  [1, 5, 0, 0.8],
  [2, 4, 0, 0.8],
  [3, 3, 0, 0.8],
  [4, 2, 0, 0.8],
  [5, 1, 0, 0.8],
  [6, 2, 0, 0.8],
  [7, 3, 0, 0.8],
]);

const firstFretsEvents = loopBar(4, 8, [
  [0, 4, 0, 0.7],
  [1, 4, 2, 0.7],
  [2, 4, 3, 0.7],
  [3, 4, 2, 0.7],
  [4, 5, 0, 0.7],
  [5, 5, 2, 0.7],
  [6, 5, 3, 0.7],
  [7, 5, 2, 0.7],
]);

const powerPulseEvents: BeatEvent[] = [
  // E5
  [0, 6, 0, 0.9, 1],
  [0, 5, 2, 0.9, 1],
  [1, 6, 0, 0.9, 2],
  [1, 5, 2, 0.9, 2],
  [2, 6, 0, 0.9, 3],
  [2, 5, 2, 0.9, 3],
  // G5
  [3, 6, 3, 0.9, 4],
  [3, 5, 5, 0.9, 4],
  // A5
  [4, 6, 5, 1.6, 5],
  [4, 5, 7, 1.6, 5],
  // G5
  [6, 6, 3, 0.9, 6],
  [6, 5, 5, 0.9, 6],
  // E5
  [7, 6, 0, 0.9, 7],
  [7, 5, 2, 0.9, 7],
];

const powerPulseLooped = loopBar(4, 8, powerPulseEvents).map((e, i) => {
  const copy: BeatEvent = [...e];
  if (copy[4] !== undefined) copy[4] = copy[4]! + Math.floor(i / powerPulseEvents.length) * 10;
  return copy;
});

const odeEvents: BeatEvent[] = [
  // Ode to Joy in C, first position (public domain)
  [0, 4, 2, 0.9],
  [1, 4, 2, 0.9],
  [2, 4, 3, 0.9],
  [3, 4, 5, 0.9],
  [4, 4, 5, 0.9],
  [5, 4, 3, 0.9],
  [6, 4, 2, 0.9],
  [7, 4, 0, 0.9],
  [8, 5, 3, 0.9],
  [9, 5, 3, 0.9],
  [10, 4, 0, 0.9],
  [11, 4, 2, 0.9],
  [12, 4, 2, 1.4],
  [13.5, 4, 0, 0.4],
  [14, 4, 0, 1.6],
  [16, 4, 2, 0.9],
  [17, 4, 2, 0.9],
  [18, 4, 3, 0.9],
  [19, 4, 5, 0.9],
  [20, 4, 5, 0.9],
  [21, 4, 3, 0.9],
  [22, 4, 2, 0.9],
  [23, 4, 0, 0.9],
  [24, 5, 3, 0.9],
  [25, 5, 3, 0.9],
  [26, 4, 0, 0.9],
  [27, 4, 2, 0.9],
  [28, 4, 0, 1.4],
  [29.5, 5, 3, 0.4],
  [30, 5, 3, 1.8],
];

const twinkleEvents: BeatEvent[] = [
  [0, 5, 3, 0.9],
  [1, 5, 3, 0.9],
  [2, 4, 0, 0.9],
  [3, 4, 0, 0.9],
  [4, 4, 2, 0.9],
  [5, 4, 2, 0.9],
  [6, 4, 0, 1.6],
  [8, 5, 3, 0.9],
  [9, 5, 2, 0.9],
  [10, 5, 0, 0.9],
  [11, 5, 0, 0.9],
  [12, 4, 0, 0.9],
  [13, 5, 3, 0.9],
  [14, 5, 3, 1.6],
  [16, 5, 3, 0.9],
  [17, 5, 2, 0.9],
  [18, 5, 0, 0.9],
  [19, 5, 0, 0.9],
  [20, 4, 0, 0.9],
  [21, 5, 3, 0.9],
  [22, 5, 3, 1.6],
  [24, 5, 3, 0.9],
  [25, 5, 3, 0.9],
  [26, 4, 0, 0.9],
  [27, 4, 0, 0.9],
  [28, 4, 2, 0.9],
  [29, 4, 2, 0.9],
  [30, 4, 0, 1.8],
];

const graceEvents: BeatEvent[] = [
  [0, 4, 2, 0.6],
  [0.5, 4, 0, 1.4],
  [2, 4, 2, 0.9],
  [3, 4, 4, 1.6],
  [5, 4, 2, 0.9],
  [6, 4, 0, 0.9],
  [7, 5, 4, 1.8],
  [9, 4, 2, 0.6],
  [9.5, 4, 0, 1.4],
  [11, 4, 2, 0.9],
  [12, 4, 4, 1.6],
  [14, 4, 5, 0.9],
  [15, 4, 4, 1.8],
  [17, 4, 2, 0.9],
  [18, 4, 0, 0.9],
  [19, 4, 2, 0.9],
  [20, 4, 4, 1.6],
  [22, 4, 2, 0.9],
  [23, 4, 0, 0.9],
  [24, 5, 4, 2],
];

const pentatonicEvents = loopBar(4, 8, [
  [0, 3, 2, 0.45],
  [0.5, 3, 0, 0.45],
  [1, 4, 2, 0.45],
  [1.5, 4, 0, 0.45],
  [2, 5, 2, 0.9],
  [3, 4, 0, 0.45],
  [3.5, 4, 2, 0.45],
  [4, 3, 0, 0.45],
  [4.5, 3, 2, 0.45],
  [5, 2, 0, 0.9],
  [6, 3, 2, 0.45],
  [6.5, 3, 0, 0.45],
  [7, 4, 2, 0.9],
]);

const risingEvents: BeatEvent[] = [];
const risingChords: Array<[BeatEvent[], number]> = [
  // Am
  [[[0, 5, 0, 0.45], [0.5, 4, 2, 0.45], [1, 3, 2, 0.45], [1.5, 2, 1, 0.45]], 0],
  // C
  [[[0, 5, 3, 0.45], [0.5, 4, 2, 0.45], [1, 3, 0, 0.45], [1.5, 2, 1, 0.45]], 2],
  // D
  [[[0, 4, 0, 0.45], [0.5, 3, 2, 0.45], [1, 2, 3, 0.45], [1.5, 1, 2, 0.45]], 4],
  // F
  [[[0, 4, 3, 0.45], [0.5, 3, 2, 0.45], [1, 2, 1, 0.45], [1.5, 1, 1, 0.45]], 6],
  // Am
  [[[0, 5, 0, 0.45], [0.5, 4, 2, 0.45], [1, 3, 2, 0.45], [1.5, 2, 1, 0.45]], 8],
  // C
  [[[0, 5, 3, 0.45], [0.5, 4, 2, 0.45], [1, 3, 0, 0.45], [1.5, 2, 1, 0.45]], 10],
  // E
  [[[0, 6, 0, 0.45], [0.5, 5, 2, 0.45], [1, 4, 2, 0.45], [1.5, 3, 1, 0.45]], 12],
  // Am
  [[[0, 5, 0, 0.45], [0.5, 4, 2, 0.45], [1, 3, 2, 0.45], [1.5, 2, 1, 1.2]], 14],
];
for (const [pattern, offset] of risingChords) {
  for (const [beat, s, f, d] of pattern) {
    risingEvents.push([beat + offset, s, f, d]);
  }
}

const bluesEvents = loopBar(3, 16, [
  [0, 5, 0, 0.45],
  [0.5, 5, 2, 0.45],
  [1, 5, 0, 0.45],
  [1.5, 5, 2, 0.45],
  [2, 5, 0, 0.45],
  [2.5, 5, 2, 0.45],
  [3, 5, 0, 0.45],
  [3.5, 5, 2, 0.45],
  [4, 4, 0, 0.45],
  [4.5, 4, 2, 0.45],
  [5, 4, 0, 0.45],
  [5.5, 4, 2, 0.45],
  [6, 5, 0, 0.45],
  [6.5, 5, 2, 0.45],
  [7, 5, 0, 0.45],
  [7.5, 5, 2, 0.45],
  [8, 6, 0, 0.45],
  [8.5, 6, 2, 0.45],
  [9, 6, 0, 0.45],
  [9.5, 6, 2, 0.45],
  [10, 4, 0, 0.45],
  [10.5, 4, 2, 0.45],
  [11, 5, 0, 0.45],
  [11.5, 5, 2, 0.45],
  [12, 5, 0, 0.45],
  [12.5, 4, 2, 0.45],
  [13, 5, 3, 0.45],
  [13.5, 5, 2, 0.45],
  [14, 5, 0, 1.6],
]);

const campfireEvents: BeatEvent[] = [];
const campfireChords: Array<[number, BeatEvent[]]> = [
  [0, [[0, 6, 3, 0.8, 1], [0, 5, 2, 0.8, 1], [0, 4, 0, 0.8, 1]]], // G
  [1, [[0, 6, 3, 0.8, 2], [0, 5, 2, 0.8, 2], [0, 4, 0, 0.8, 2]]],
  [2, [[0, 5, 3, 0.8, 3], [0, 4, 2, 0.8, 3], [0, 3, 0, 0.8, 3]]], // C
  [3, [[0, 5, 3, 0.8, 4], [0, 4, 2, 0.8, 4], [0, 3, 0, 0.8, 4]]],
  [4, [[0, 4, 0, 0.8, 5], [0, 3, 2, 0.8, 5], [0, 2, 3, 0.8, 5]]], // D
  [5, [[0, 4, 0, 0.8, 6], [0, 3, 2, 0.8, 6], [0, 2, 3, 0.8, 6]]],
  [6, [[0, 6, 3, 0.8, 7], [0, 5, 2, 0.8, 7], [0, 4, 0, 0.8, 7]]], // G
  [7, [[0, 6, 3, 1.4, 8], [0, 5, 2, 1.4, 8], [0, 4, 0, 1.4, 8]]],
];
for (let bar = 0; bar < 4; bar++) {
  for (const [beat, notes] of campfireChords) {
    for (const [b, s, f, d, g] of notes) {
      campfireEvents.push([b + beat + bar * 8, s, f, d, (g ?? 0) + bar * 20]);
    }
  }
}

// Original metalcore trainer — palm-muted E5 chugs plus G5 / C5 / D5 hits.
// Standard tuning, two-string shapes. Not a transcription of any licensed song.
const venomVerse: BeatEvent[] = [
  ...chug(0, 8, 0.5, 6, 0, 0.45, 1),
  ...chug(4, 4, 0.5, 6, 0, 0.45, 10),
  ...chug(6, 4, 0.5, 6, 3, 0.45, 20),
  ...chug(8, 8, 0.5, 5, 3, 0.45, 30),
  ...chug(12, 4, 0.5, 5, 5, 0.45, 40),
  ...powerChord(14, 6, 0, 1.8, 50),
];

const venomChorus: BeatEvent[] = [
  ...powerChord(0, 6, 0, 1.8, 1),
  ...powerChord(2, 6, 3, 1.8, 2),
  ...powerChord(4, 5, 3, 1.8, 3),
  ...powerChord(6, 5, 5, 1.8, 4),
  ...chug(8, 8, 0.5, 6, 0, 0.45, 10),
  ...powerChord(12, 6, 3, 0.9, 20),
  ...powerChord(13, 5, 3, 0.9, 21),
  ...powerChord(14, 5, 5, 0.9, 22),
  ...powerChord(15, 6, 0, 1.6, 23),
];

const venomDriveEvents: BeatEvent[] = [
  ...venomVerse,
  ...shiftBeats(venomVerse, 16, 100),
  ...shiftBeats(venomChorus, 32, 200),
];

export const SONGS: Song[] = [
  makeSong({
    id: "spark",
    title: "Spark",
    artist: "DUS Studio",
    difficulty: 1,
    bpm: 80,
    genre: "Exercise",
    category: "beginner",
    description: "Eight open-string notes. Perfect for checking your guitar connection and timing.",
    cover: { from: "#0ea5e9", to: "#22d3ee", motif: "dots" },
    events: sparkEvents,
  }),
  makeSong({
    id: "open-roads",
    title: "Open Roads",
    artist: "DUS Studio",
    difficulty: 1,
    bpm: 80,
    genre: "Exercise",
    category: "beginner",
    description: "Walk every open string in time. Listen, then pick as the notes reach the play line.",
    cover: { from: "#14b8a6", to: "#84cc16", motif: "waves" },
    events: openRoadsEvents,
  }),
  makeSong({
    id: "first-frets",
    title: "First Frets",
    artist: "DUS Studio",
    difficulty: 1,
    bpm: 88,
    genre: "Exercise",
    category: "exercise",
    description: "Frets 0, 2 and 3 on the A and D strings. Slow, even, and in rhythm.",
    cover: { from: "#6366f1", to: "#22d3ee", motif: "grid" },
    events: firstFretsEvents,
  }),
  makeSong({
    id: "power-pulse",
    title: "Power Pulse",
    artist: "DUS Studio",
    difficulty: 2,
    bpm: 104,
    genre: "Rock",
    category: "rock",
    description: "An original two-string power-chord riff. Strum E5, G5 and A5 on the beat.",
    cover: { from: "#f43f5e", to: "#f97316", motif: "bolts" },
    events: powerPulseLooped,
  }),
  makeSong({
    id: "ode-to-joy",
    title: "Ode to Joy",
    artist: "Ludwig van Beethoven",
    difficulty: 2,
    bpm: 96,
    genre: "Classical",
    category: "classical",
    description: "The famous melody in C, played in first position on the A and D strings.",
    cover: { from: "#fbbf24", to: "#f59e0b", motif: "score" },
    events: odeEvents,
  }),
  makeSong({
    id: "twinkle",
    title: "Twinkle Steps",
    artist: "Traditional",
    difficulty: 1,
    bpm: 90,
    genre: "Folk",
    category: "beginner",
    description: "A first-position take on the classic children's melody. Quarter notes, easy shapes.",
    cover: { from: "#a78bfa", to: "#f472b6", motif: "stars" },
    events: twinkleEvents,
  }),
  makeSong({
    id: "amazing-grace",
    title: "Amazing Grace",
    artist: "Traditional",
    difficulty: 2,
    bpm: 72,
    genre: "Folk",
    category: "folk",
    description: "Slow melody on the D string. Hold the long notes for their full value.",
    cover: { from: "#38bdf8", to: "#818cf8", motif: "rings" },
    events: graceEvents,
  }),
  makeSong({
    id: "pentatonic-drive",
    title: "Pentatonic Drive",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 112,
    genre: "Rock",
    category: "rock",
    description: "A minor pentatonic lick around the 2nd fret. Eighth notes — stay with the groove.",
    cover: { from: "#ef4444", to: "#7c3aed", motif: "slash" },
    events: pentatonicEvents,
  }),
  makeSong({
    id: "rising-sun",
    title: "The Rising Sun",
    artist: "Traditional",
    difficulty: 3,
    bpm: 92,
    genre: "Folk",
    category: "folk",
    description: "Arpeggiated folk progression. Pick one note at a time through Am, C, D, F and E.",
    cover: { from: "#0f766e", to: "#f59e0b", motif: "sun" },
    events: risingEvents,
  }),
  makeSong({
    id: "blues-shuffle",
    title: "Blue Porch",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 100,
    genre: "Blues",
    category: "rock",
    description: "A 12-bar shuffle using the 0–2 hammer feel on A, D and E. Play the swing as even eighths.",
    cover: { from: "#1d4ed8", to: "#fb7185", motif: "bars" },
    events: bluesEvents,
  }),
  makeSong({
    id: "campfire-night",
    title: "Campfire Night",
    artist: "DUS Studio",
    difficulty: 2,
    bpm: 86,
    genre: "Folk",
    category: "folk",
    description: "G, C and D shapes as stacked notes. Strum when the chord hits the play line.",
    cover: { from: "#b45309", to: "#65a30d", motif: "flame" },
    events: campfireEvents,
  }),
  makeSong({
    id: "venom-drive",
    title: "Venom Drive",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 120,
    genre: "Metal",
    category: "rock",
    description:
      "Metalcore chugs in standard tuning. Palm-mute eighth-note E5, then G5, C5 and D5. Let the chorus hits ring.",
    cover: { from: "#7f1d1d", to: "#111827", motif: "slash" },
    events: venomDriveEvents,
  }),
];

export const LEARN_PATH = [
  { songId: "spark", title: "Connect & pick", blurb: "Hear your guitar in the app, then hit eight notes in time." },
  { songId: "open-roads", title: "Open strings", blurb: "Learn the six strings from low E to high e." },
  { songId: "first-frets", title: "Add fingers", blurb: "Place fingers on frets 2 and 3 without rushing." },
  { songId: "power-pulse", title: "Power chords", blurb: "Two-string rock shapes. Strum both notes together." },
  { songId: "ode-to-joy", title: "Play a melody", blurb: "A real tune with held notes and simple shifts." },
  { songId: "pentatonic-drive", title: "Rock vocabulary", blurb: "The minor pentatonic box used in countless riffs." },
  { songId: "venom-drive", title: "Metalcore chugs", blurb: "Palm-mute E5 eighths, then hit G5, C5 and D5." },
] as const;

export function getSong(id: string): Song | undefined {
  return SONGS.find((song) => song.id === id);
}

export function songsByCategory(category: Song["category"]): Song[] {
  return SONGS.filter((song) => song.category === category);
}

const SCORE_KEY = "dus-guitar-scores";

export function loadHighScores(): Record<string, { accuracy: number; stars: number; score: number; date: string }> {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveHighScore(songId: string, accuracy: number, stars: number, score: number) {
  const all = loadHighScores();
  const prev = all[songId];
  if (!prev || score > prev.score) {
    all[songId] = { accuracy, stars, score, date: new Date().toISOString() };
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  }
}
