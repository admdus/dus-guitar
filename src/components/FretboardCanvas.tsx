import { STRING_COLORS, bestPositionForMidi } from "../engine/notes";
import { isLegato } from "../engine/tab";
import { STANDARD_TUNING, type Tuning } from "../engine/tuning";
import type { DetectedPitch, EngineSnapshot, LiveNote, Technique } from "../types";

const PLAYHEAD = 148;
const PPS = 270;

export function drawFretboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snap: EngineSnapshot,
  detected: DetectedPitch | null,
  bpm: number,
  tuning: Tuning = STANDARD_TUNING,
) {
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#07080e");
  bg.addColorStop(1, "#12101a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const far = width + 20;
  const yNearTop = height * 0.16;
  const yNearBot = height * 0.84;
  const yFarTop = height * 0.34;
  const yFarBot = height * 0.66;

  ctx.beginPath();
  ctx.moveTo(PLAYHEAD - 36, yNearTop - 18);
  ctx.lineTo(far, yFarTop - 10);
  ctx.lineTo(far, yFarBot + 10);
  ctx.lineTo(PLAYHEAD - 36, yNearBot + 18);
  ctx.closePath();
  const wood = ctx.createLinearGradient(PLAYHEAD, 0, far, 0);
  wood.addColorStop(0, "#3b2414");
  wood.addColorStop(0.45, "#24160e");
  wood.addColorStop(1, "#140e0a");
  ctx.fillStyle = wood;
  ctx.fill();

  for (let s = 1; s <= 6; s++) {
    const y0 = stringY(s, PLAYHEAD, height);
    const y1 = stringY(s, far, height);
    ctx.beginPath();
    ctx.moveTo(PLAYHEAD - 24, y0);
    ctx.lineTo(far, y1);
    ctx.strokeStyle = `rgba(255,230,200,${0.18 + s * 0.03})`;
    ctx.lineWidth = 1.2 + (6 - s) * 0.35;
    ctx.stroke();
  }

  drawBeatGrid(ctx, width, height, snap, bpm);
  drawSlurs(ctx, width, height, snap.notes, snap.currentTime);

  ctx.save();
  const glow = ctx.createLinearGradient(PLAYHEAD - 40, 0, PLAYHEAD + 50, 0);
  glow.addColorStop(0, "rgba(34, 211, 238, 0)");
  glow.addColorStop(0.5, "rgba(34, 211, 238, 0.28)");
  glow.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(PLAYHEAD - 40, yNearTop - 20, 90, yNearBot - yNearTop + 40);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(PLAYHEAD, yNearTop - 8);
  ctx.lineTo(PLAYHEAD, yNearBot + 8);
  ctx.strokeStyle = "#67e8f9";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ecfeff";
  ctx.font = "700 11px Outfit, sans-serif";
  ctx.fillText("PLAY", PLAYHEAD - 16, yNearTop - 14);

  for (const note of snap.notes) {
    drawNote(ctx, width, height, note, snap.currentTime);
  }

  drawBall(ctx, height, snap);
  drawDetected(ctx, height, detected, tuning);

  if (snap.playing && snap.countInBeatsLeft > 0) {
    ctx.fillStyle = "rgba(8,10,16,0.35)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "800 96px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(snap.countInBeatsLeft), width / 2, height / 2 + 30);
    ctx.font = "600 18px Outfit, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Get ready", width / 2, height / 2 + 64);
    ctx.textAlign = "left";
  }

  if (snap.lastJudge && snap.currentTime > 0) {
    const colors: Record<string, string> = {
      perfect: "#67e8f9",
      great: "#4ade80",
      good: "#facc15",
      miss: "#fb7185",
    };
    ctx.font = "800 28px Outfit, sans-serif";
    ctx.fillStyle = colors[snap.lastJudge] ?? "#fff";
    ctx.textAlign = "left";
    ctx.fillText(snap.lastJudge.toUpperCase(), PLAYHEAD + 18, 42);
  }
}

function drawBeatGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snap: EngineSnapshot,
  bpm: number,
) {
  const beatDur = 60 / Math.max(40, bpm);
  const startBeat = Math.floor(snap.currentTime / beatDur) - 1;
  for (let b = startBeat; b < startBeat + 24; b++) {
    const t = b * beatDur;
    const x = PLAYHEAD + (t - snap.currentTime) * PPS;
    if (x < PLAYHEAD - 10 || x > width) continue;
    ctx.beginPath();
    ctx.moveTo(x, stringY(1, x, height) - 16);
    ctx.lineTo(x, stringY(6, x, height) + 16);
    ctx.strokeStyle = b % 4 === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)";
    ctx.lineWidth = b % 4 === 0 ? 2 : 1;
    ctx.stroke();
  }
}

function drawSlurs(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  notes: LiveNote[],
  currentTime: number,
) {
  for (let i = 1; i < notes.length; i++) {
    const note = notes[i];
    if (!isLegato(note.technique)) continue;
    let prev: LiveNote | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (notes[j].string === note.string) {
        prev = notes[j];
        break;
      }
    }
    if (!prev) continue;
    const x0 = PLAYHEAD + (prev.time - currentTime) * PPS;
    const x1 = PLAYHEAD + (note.time - currentTime) * PPS;
    if (x1 < -40 || x0 > width + 40) continue;
    const y0 = stringY(prev.string, x0, height);
    const y1 = stringY(note.string, x1, height);
    const midX = (x0 + x1) / 2;
    const lift = Math.min(22, 10 + Math.abs(x1 - x0) * 0.12);
    ctx.beginPath();
    ctx.moveTo(x0 + 8, y0 - 10);
    ctx.quadraticCurveTo(midX, Math.min(y0, y1) - lift, x1 - 8, y1 - 10);
    ctx.strokeStyle =
      note.technique === "hammer" ? "rgba(250, 204, 21, 0.85)" : "rgba(251, 113, 133, 0.85)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([]);
    ctx.stroke();
  }
}

function techniqueMark(technique?: Technique) {
  if (technique === "hammer") return "h";
  if (technique === "pull") return "p";
  return "";
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  note: LiveNote,
  currentTime: number,
) {
  const x = PLAYHEAD + (note.time - currentTime) * PPS;
  if (x < -50 || x > width + 80) return;
  const y = stringY(note.string, x, height);
  const t = Math.max(0, Math.min(1, (x - PLAYHEAD) / 900));
  const r = 16 - t * 6;
  const tail = Math.max(10, note.duration * PPS * 0.7);
  const mark = techniqueMark(note.technique);

  const color =
    note.status === "perfect"
      ? "#67e8f9"
      : note.status === "great"
        ? "#4ade80"
        : note.status === "good"
          ? "#facc15"
          : note.status === "miss"
            ? "#fb7185"
            : STRING_COLORS[note.string];

  ctx.globalAlpha = note.status === "miss" ? 0.35 : note.status === "pending" ? 1 : 0.55;
  ctx.fillStyle = color;
  roundRect(ctx, x, y - 5, tail, 10, 6);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = x < PLAYHEAD + 40 && note.status === "pending" ? 18 : 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = mark ? "rgba(250, 204, 21, 0.95)" : "rgba(8,10,16,0.45)";
  ctx.lineWidth = mark ? 2.6 : 2;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0b0d14";
  ctx.font = `700 ${Math.max(10, 15 - t * 4)}px JetBrains Mono, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(note.fret), x, y + 0.5);

  if (mark) {
    const badge = Math.max(8, 11 - t * 3);
    ctx.font = `800 ${badge}px Outfit, sans-serif`;
    ctx.fillStyle = note.technique === "hammer" ? "#fde68a" : "#fecdd3";
    ctx.strokeStyle = "rgba(8,10,16,0.75)";
    ctx.lineWidth = 3;
    ctx.strokeText(mark, x + r * 0.85, y - r * 0.7);
    ctx.fillText(mark, x + r * 0.85, y - r * 0.7);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawBall(ctx: CanvasRenderingContext2D, height: number, snap: EngineSnapshot) {
  const pending = snap.notes.filter((n) => n.status === "pending" || n.time >= snap.currentTime - 0.05);
  if (pending.length === 0) return;
  let prev = pending[0];
  let next = pending[0];
  for (let i = 0; i < pending.length; i++) {
    if (pending[i].time <= snap.currentTime) prev = pending[i];
    if (pending[i].time >= snap.currentTime) {
      next = pending[i];
      break;
    }
  }
  const span = Math.max(0.0001, next.time - prev.time);
  const p = Math.max(0, Math.min(1, (snap.currentTime - prev.time) / span));
  const y0 = stringY(prev.string, PLAYHEAD, height);
  const y1 = stringY(next.string, PLAYHEAD, height);
  const hop = Math.sin(p * Math.PI) * 28;
  const y = y0 + (y1 - y0) * p - hop;
  ctx.beginPath();
  ctx.arc(PLAYHEAD, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawDetected(ctx: CanvasRenderingContext2D, height: number, detected: DetectedPitch | null, tuning: Tuning) {
  if (!detected) return;
  const pos = bestPositionForMidi(detected.midi, tuning);
  if (!pos) return;
  const y = stringY(pos.string, PLAYHEAD, height);
  ctx.beginPath();
  ctx.arc(PLAYHEAD - 28, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.strokeStyle = STRING_COLORS[pos.string];
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function stringY(string: number, x: number, height: number): number {
  const t = Math.max(0, Math.min(1, (x - PLAYHEAD) / 1100));
  const spread = 1 - t * 0.42;
  const mid = height * 0.5;
  const gap = height * 0.105;
  return mid + (string - 3.5) * gap * spread;
}

export { PLAYHEAD, PPS };
