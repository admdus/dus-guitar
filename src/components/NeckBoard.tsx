import { STRING_COLORS } from "../engine/notes";
import type { Tuning } from "../engine/tuning";
import type { LiveNote, StringIndex } from "../types";

interface Props {
  notes: LiveNote[];
  currentTime: number;
  tuning: Tuning;
  highlight?: { string: StringIndex; fret: number } | null;
  onPlayFret: (string: StringIndex, fret: number) => void;
}

const MIN_FRETS = 12;
const MAX_FRETS = 15;
const DOTS = [3, 5, 7, 9, 12, 15];

export function NeckBoard({ notes, currentTime, tuning, highlight, onPlayFret }: Props) {
  const highest = notes.reduce((max, note) => Math.max(max, note.fret), 0);
  const frets = Math.min(MAX_FRETS, Math.max(MIN_FRETS, highest));
  const upcoming = notes.filter((n) => n.status === "pending" && n.time >= currentTime - 0.05 && n.time <= currentTime + 1.6);

  return (
    <div className="neck-board" role="group" aria-label="Guitar neck">
      <div className="neck-labels">
        {([1, 2, 3, 4, 5, 6] as StringIndex[]).map((s) => (
          <span key={s} style={{ color: STRING_COLORS[s] }}>
            {tuning.stringNames[s]}
          </span>
        ))}
      </div>
      <div className="neck-grid">
        {([1, 2, 3, 4, 5, 6] as StringIndex[]).map((s) => (
          <div className="neck-string" key={s} style={{ gridTemplateColumns: `repeat(${frets + 1}, 1fr)` }}>
            {Array.from({ length: frets + 1 }, (_, fret) => {
              const match = upcoming.find((n) => n.string === s && n.fret === fret);
              const isUpcoming = Boolean(match);
              const isNow = upcoming.some((n) => n.string === s && n.fret === fret && Math.abs(n.time - currentTime) < 0.12);
              const isHeard = highlight?.string === s && highlight.fret === fret;
              const mark = match?.technique === "hammer" ? "h" : match?.technique === "pull" ? "p" : "";
              const label = isUpcoming
                ? mark
                  ? `${fret}${mark}`
                  : String(fret)
                : fret === 0
                  ? String(fret)
                  : DOTS.includes(fret)
                    ? "•"
                    : "";
              return (
                <button
                  key={fret}
                  className={`fret-cell ${isUpcoming ? "upcoming" : ""} ${isNow ? "now" : ""} ${isHeard ? "heard" : ""} ${fret === 0 ? "open" : ""} ${mark ? "legato" : ""}`}
                  style={{ ["--s" as string]: STRING_COLORS[s] }}
                  onClick={() => onPlayFret(s, fret)}
                  aria-label={`${tuning.stringNames[s]} string fret ${fret}${match?.technique === "hammer" ? " hammer-on" : match?.technique === "pull" ? " pull-off" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
