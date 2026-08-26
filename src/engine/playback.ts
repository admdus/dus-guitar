import type { EngineSnapshot, Judge, LiveNote, Song, StringIndex } from "../types";
import { noteMidi, pitchMatches, starsForAccuracy } from "./notes";
import { hitAccuracy, JUDGE_WINDOWS, judgeTiming, pointsFor } from "./score";

export interface EngineOptions {
  latencyMs?: number;
}

export class SongEngine {
  readonly song: Song;
  private notes: LiveNote[];
  private playing = false;
  private finished = false;
  private speed = 1;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private counts: Record<Judge, number> = { perfect: 0, great: 0, good: 0, miss: 0 };
  private lastJudge: Judge | null = null;
  private originMs = 0;
  private pausedAt = 0;
  private latencyMs: number;
  private readonly countInSec: number;

  constructor(song: Song, options: EngineOptions = {}) {
    this.song = song;
    this.latencyMs = options.latencyMs ?? 0;
    this.countInSec = (60 / song.bpm) * 4;
    this.notes = song.notes.map((note) => ({ ...note, status: "pending" }));
  }

  setLatency(ms: number) {
    this.latencyMs = ms;
  }

  setSpeed(speed: number) {
    if (this.playing) {
      const now = this.nowMs();
      const t = this.rawTimeAt(now);
      this.speed = speed;
      this.originMs = now - (t / this.speed) * 1000;
    } else {
      this.speed = speed;
    }
  }

  start(nowMs = this.nowMs()) {
    if (this.finished) this.reset();
    if (this.playing) return;
    if (this.pausedAt !== 0) {
      const frozen = this.pausedAt;
      this.originMs = nowMs - (frozen / this.speed) * 1000;
      this.pausedAt = 0;
    } else {
      this.originMs = nowMs;
    }
    this.playing = true;
  }

  pause(nowMs = this.nowMs()) {
    if (!this.playing) return;
    this.pausedAt = this.rawTimeAt(nowMs);
    this.playing = false;
  }

  reset() {
    this.notes = this.song.notes.map((note) => ({ ...note, status: "pending" }));
    this.playing = false;
    this.finished = false;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.lastJudge = null;
    this.originMs = 0;
    this.pausedAt = 0;
  }

  tick(nowMs = this.nowMs()): EngineSnapshot {
    const currentTime = this.songTime(nowMs);
    if (this.playing) {
      this.expireMisses(currentTime);
      if (currentTime >= this.song.duration && this.notes.every((n) => n.status !== "pending")) {
        this.playing = false;
        this.finished = true;
      }
    }
    return this.snapshot(currentTime);
  }

  feedPitch(midi: number, nowMs = this.nowMs(), onset = true): Judge | null {
    if (!this.playing || this.finished) return null;
    const t = this.songTime(nowMs - this.latencyMs);
    return this.tryHit((note) => pitchMatches(noteMidi(note.string, note.fret), midi), t, onset);
  }

  feedFret(string: StringIndex, fret: number, nowMs = this.nowMs()): Judge | null {
    if (!this.playing || this.finished) return null;
    const t = this.songTime(nowMs);
    return this.tryHit((note) => note.string === string && note.fret === fret, t, true);
  }

  feedPractice(nowMs = this.nowMs()): Judge | null {
    if (!this.playing || this.finished) return null;
    const t = this.songTime(nowMs);
    return this.tryHit(() => true, t, true);
  }

  snapshot(currentTime = this.songTime()): EngineSnapshot {
    const accuracy = hitAccuracy(this.counts);
    const countInBeatsLeft =
      currentTime < 0 ? Math.ceil((-currentTime) / (60 / this.song.bpm)) : 0;
    return {
      playing: this.playing,
      finished: this.finished,
      currentTime,
      speed: this.speed,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      counts: { ...this.counts },
      accuracy,
      stars: starsForAccuracy(accuracy),
      notes: this.notes.map((n) => ({ ...n })),
      lastJudge: this.lastJudge,
      countInBeatsLeft,
    };
  }

  private tryHit(
    matches: (note: LiveNote) => boolean,
    songTime: number,
    onset: boolean,
  ): Judge | null {
    if (songTime < -0.05) return null;
    let best: LiveNote | null = null;
    let bestDelta = Infinity;
    for (const note of this.notes) {
      if (note.status !== "pending") continue;
      if (!matches(note)) continue;
      const delta = Math.abs(songTime - note.time);
      if (delta > JUDGE_WINDOWS.good) continue;
      if (delta < bestDelta) {
        best = note;
        bestDelta = delta;
      }
    }
    if (!best) return null;
    if (!onset && bestDelta > JUDGE_WINDOWS.perfect) return null;
    return this.resolve(best, judgeTiming(best.time, songTime));
  }

  private expireMisses(songTime: number) {
    for (const note of this.notes) {
      if (note.status !== "pending") continue;
      if (songTime > note.time + JUDGE_WINDOWS.good) {
        this.resolve(note, "miss");
      }
    }
  }

  private resolve(note: LiveNote, judge: Judge): Judge {
    const group = note.chordGroup;
    const targets =
      group === undefined ? [note] : this.notes.filter((n) => n.chordGroup === group);
    for (const target of targets) {
      if (target.status !== "pending") continue;
      target.status = judge;
    }
    this.counts[judge] += 1;
    if (judge === "miss") {
      this.combo = 0;
    } else {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += pointsFor(judge, this.combo);
    }
    this.lastJudge = judge;
    return judge;
  }

  private songTime(nowMs = this.nowMs()): number {
    return this.rawTimeAt(nowMs) - this.countInSec;
  }

  private rawTimeAt(nowMs: number): number {
    if (!this.playing && this.pausedAt !== 0) return this.pausedAt;
    if (!this.playing && this.originMs === 0) return 0;
    return ((nowMs - this.originMs) / 1000) * this.speed;
  }

  private nowMs() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }
}
