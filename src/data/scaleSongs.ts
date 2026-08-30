import type { Song } from "../types";
import { scalePhrase, type BeatEvent, type ScaleStep } from "../engine/tab";
import { makeSong } from "./makeSong";

/** E minor pentatonic box: two notes on each string, low to high. */
type PentBox = Array<readonly [string: number, low: number, high: number]>;

function pentatonicBox(startBeat: number, box: PentBox): BeatEvent[] {
  const up: ScaleStep[] = [];
  for (const [string, low, high] of box) {
    up.push([string, low], [string, high]);
  }
  const top = box[box.length - 1];
  const prev = box[box.length - 2];
  return scalePhrase(startBeat, [
    ...up,
    [top[0], top[1]],
    [prev[0], prev[2]],
    [top[0], top[2]],
    [top[0], top[1]],
  ]);
}

const EM_BOX_1: PentBox = [
  [6, 0, 3],
  [5, 0, 2],
  [4, 0, 2],
  [3, 0, 2],
  [2, 0, 3],
  [1, 0, 3],
];
const EM_BOX_2: PentBox = [
  [6, 3, 5],
  [5, 2, 5],
  [4, 2, 5],
  [3, 2, 4],
  [2, 3, 5],
  [1, 3, 5],
];
const EM_BOX_3: PentBox = [
  [6, 5, 7],
  [5, 5, 7],
  [4, 5, 7],
  [3, 4, 7],
  [2, 5, 8],
  [1, 5, 7],
];
const EM_BOX_4: PentBox = [
  [6, 7, 10],
  [5, 7, 10],
  [4, 7, 9],
  [3, 7, 9],
  [2, 8, 10],
  [1, 7, 10],
];
const EM_BOX_5: PentBox = [
  [6, 10, 12],
  [5, 10, 12],
  [4, 9, 12],
  [3, 9, 12],
  [2, 10, 12],
  [1, 10, 12],
];

// Original etude — five connected E minor pentatonic boxes, then a 12th-fret lick.
const fiveBoxesEvents: BeatEvent[] = [
  ...pentatonicBox(0, EM_BOX_1),
  ...pentatonicBox(8, EM_BOX_2),
  ...pentatonicBox(16, EM_BOX_3),
  ...pentatonicBox(24, EM_BOX_4),
  ...pentatonicBox(32, EM_BOX_5),
  ...scalePhrase(40, [
    [1, 12],
    [1, 15],
    [2, 12],
    [1, 15],
    [1, 12],
    [2, 12],
    [2, 10],
    [3, 12],
    [3, 9],
    [4, 12],
    [4, 9],
    [5, 10],
    [5, 7],
    [6, 7],
    [6, 3],
    [6, 0, 2],
  ]),
];

/** E minor pentatonic frets on each string, open through the 12th-fret octave. */
const STRING_PENT: Record<1 | 2 | 3 | 4 | 5 | 6, number[]> = {
  6: [0, 3, 5, 7, 10, 12],
  5: [0, 2, 5, 7, 10, 12],
  4: [0, 2, 5, 7, 9, 12],
  3: [0, 2, 4, 7, 9, 12],
  2: [0, 3, 5, 8, 10, 12],
  1: [0, 3, 5, 7, 10, 12],
};

function stringLadder(startBeat: number, string: 1 | 2 | 3 | 4 | 5 | 6): BeatEvent[] {
  const frets = STRING_PENT[string];
  const steps: ScaleStep[] = [
    ...frets.map((fret) => [string, fret] as const),
    ...frets.slice(0, -1).reverse().map((fret) => [string, fret] as const),
    [string, frets[0], 2.5],
  ];
  return scalePhrase(startBeat, steps);
}

const ironLadderEvents: BeatEvent[] = [
  ...stringLadder(0, 6),
  ...stringLadder(8, 5),
  ...stringLadder(16, 4),
  ...stringLadder(24, 3),
  ...stringLadder(32, 2),
  ...stringLadder(40, 1),
  ...scalePhrase(48, [
    [1, 12],
    [2, 12],
    [3, 12],
    [4, 12],
    [5, 12],
    [6, 12],
    [6, 0, 2],
  ]),
];

/** Same G–A–B–G | D–B–A–G melody in each CAGED shape. */
function cagedMotif(startBeat: number, notes: ScaleStep[]): BeatEvent[] {
  return scalePhrase(startBeat, notes, 1);
}

const cagedVoyageEvents: BeatEvent[] = [
  // G shape — open
  ...cagedMotif(0, [
    [3, 0],
    [3, 2],
    [2, 0],
    [3, 0],
    [2, 3],
    [2, 0],
    [3, 2],
    [6, 3],
  ]),
  ...scalePhrase(8, [
    [3, 0],
    [3, 2],
    [2, 0],
    [2, 1],
    [2, 3],
    [1, 0],
    [1, 2],
    [1, 3],
  ]),
  // E shape — 3rd fret
  ...cagedMotif(12, [
    [6, 3],
    [6, 5],
    [5, 2],
    [6, 3],
    [5, 5],
    [5, 2],
    [6, 5],
    [6, 3],
  ]),
  ...scalePhrase(20, [
    [5, 2],
    [5, 3],
    [5, 5],
    [4, 4],
    [4, 5],
    [4, 7],
    [3, 4],
    [3, 5],
  ]),
  // D shape — 5th fret
  ...cagedMotif(24, [
    [4, 5],
    [4, 7],
    [3, 4],
    [4, 5],
    [3, 7],
    [3, 4],
    [4, 7],
    [4, 5],
  ]),
  ...scalePhrase(32, [
    [4, 5],
    [4, 7],
    [3, 4],
    [3, 5],
    [3, 7],
    [2, 5],
    [2, 7],
    [2, 8],
  ]),
  // C shape — 7th–10th
  ...cagedMotif(36, [
    [5, 10],
    [4, 7],
    [4, 9],
    [5, 10],
    [3, 7],
    [4, 9],
    [4, 7],
    [5, 10],
  ]),
  ...scalePhrase(44, [
    [4, 9],
    [4, 10],
    [4, 12],
    [3, 9],
    [3, 11],
    [3, 12],
    [2, 10],
    [2, 12],
  ]),
  // A shape — 10th fret
  ...cagedMotif(48, [
    [5, 10],
    [5, 12],
    [4, 12],
    [5, 10],
    [3, 12],
    [4, 12],
    [5, 12],
    [5, 10],
  ]),
  ...scalePhrase(56, [
    [1, 10],
    [1, 7],
    [2, 8],
    [2, 5],
    [3, 7],
    [4, 5],
    [5, 5],
    [6, 3, 2],
  ]),
];

const TRIPLET = 1 / 3;

function threeNpsRun(startBeat: number, steps: Array<readonly [number, number]>): BeatEvent[] {
  const body = steps.slice(0, -1);
  const last = steps[steps.length - 1];
  const hold = 8 - body.length * TRIPLET;
  return scalePhrase(
    startBeat,
    [...body.map(([string, fret]) => [string, fret] as const), [last[0], last[1], hold]],
    TRIPLET,
  );
}

const G_3NPS_P1: Array<readonly [number, number]> = [
  [6, 3],
  [6, 5],
  [6, 7],
  [5, 3],
  [5, 5],
  [5, 7],
  [4, 4],
  [4, 5],
  [4, 7],
  [3, 4],
  [3, 5],
  [3, 7],
  [2, 5],
  [2, 7],
  [2, 8],
  [1, 5],
  [1, 7],
  [1, 8],
];
const G_3NPS_P2: Array<readonly [number, number]> = [
  [6, 5],
  [6, 7],
  [6, 8],
  [5, 5],
  [5, 7],
  [5, 9],
  [4, 5],
  [4, 7],
  [4, 9],
  [3, 5],
  [3, 7],
  [3, 9],
  [2, 7],
  [2, 8],
  [2, 10],
  [1, 7],
  [1, 8],
  [1, 10],
];
const G_3NPS_P3: Array<readonly [number, number]> = [
  [6, 7],
  [6, 8],
  [6, 10],
  [5, 7],
  [5, 9],
  [5, 10],
  [4, 7],
  [4, 9],
  [4, 10],
  [3, 7],
  [3, 9],
  [3, 11],
  [2, 8],
  [2, 10],
  [2, 12],
  [1, 8],
  [1, 10],
  [1, 12],
];
const G_3NPS_P4: Array<readonly [number, number]> = [
  [6, 8],
  [6, 10],
  [6, 12],
  [5, 9],
  [5, 10],
  [5, 12],
  [4, 9],
  [4, 10],
  [4, 12],
  [3, 9],
  [3, 11],
  [3, 12],
  [2, 10],
  [2, 12],
  [2, 13],
  [1, 10],
  [1, 12],
  [1, 14],
];

const threeAcrossEvents: BeatEvent[] = [
  ...threeNpsRun(0, G_3NPS_P1),
  ...threeNpsRun(8, G_3NPS_P2),
  ...threeNpsRun(16, G_3NPS_P3),
  ...threeNpsRun(24, G_3NPS_P4),
  ...threeNpsRun(32, [...G_3NPS_P1].reverse()),
];

export const SCALE_SONGS: Song[] = [
  makeSong({
    id: "five-boxes",
    title: "Five Boxes",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 96,
    genre: "Exercise",
    category: "exercise",
    description:
      "Walk all five E minor pentatonic boxes from the open strings to the 12th fret, then a high lick at 12–15 and a run back to open E.",
    cover: { from: "#7c3aed", to: "#22d3ee", motif: "grid" },
    events: fiveBoxesEvents,
  }),
  makeSong({
    id: "iron-ladder",
    title: "Iron Ladder",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 88,
    genre: "Exercise",
    category: "exercise",
    description:
      "One string at a time: climb the E minor pentatonic from fret 0 to 12 and back down, low E through high e, then the 12th-fret octave.",
    cover: { from: "#0ea5e9", to: "#a78bfa", motif: "waves" },
    events: ironLadderEvents,
  }),
  makeSong({
    id: "caged-voyage",
    title: "CAGED Voyage",
    artist: "DUS Studio",
    difficulty: 3,
    bpm: 84,
    genre: "Exercise",
    category: "exercise",
    description:
      "The same G major melody in the five CAGED shapes — G, E, D, C, A — so the scale stays put while your hand moves up the neck.",
    cover: { from: "#f59e0b", to: "#10b981", motif: "sun" },
    events: cagedVoyageEvents,
  }),
  makeSong({
    id: "three-across",
    title: "Three Across",
    artist: "DUS Studio",
    difficulty: 4,
    bpm: 72,
    genre: "Exercise",
    category: "exercise",
    description:
      "G major three-notes-per-string in triplets. Four positions from the 3rd fret to 14, then the first shape back down.",
    cover: { from: "#6366f1", to: "#f43f5e", motif: "slash" },
    events: threeAcrossEvents,
  }),
];
