import { STRING_COLORS, STRING_NAMES } from "../engine/notes";
import type { LiveNote, StringIndex } from "../types";

interface Props {
  notes: LiveNote[];
  currentTime: number;
  highlight?: { string: StringIndex; fret: number } | null;
  onPlayFret: (string: StringIndex, fret: number) => void;
}

const FRETS = 12;

export function NeckBoard({ notes, currentTime, highlight, onPlayFret }: Props) {
  const upcoming = notes.filter((n) => n.status === "pending" && n.time >= currentTime - 0.05 && n.time <= currentTime + 1.6);

  return (
    <div className="neck-board" role="group" aria-label="Guitar neck">
      <div className="neck-labels">
        {([1, 2, 3, 4, 5, 6] as StringIndex[]).map((s) => (
          <span key={s} style={{ color: STRING_COLORS[s] }}>
            {STRING_NAMES[s]}
          </span>
        ))}
      </div>
      <div className="neck-grid">
        {([1, 2, 3, 4, 5, 6] as StringIndex[]).map((s) => (
          <div className="neck-string" key={s}>
            {Array.from({ length: FRETS + 1 }, (_, fret) => {
              const isUpcoming = upcoming.some((n) => n.string === s && n.fret === fret);
              const isNow = upcoming.some((n) => n.string === s && n.fret === fret && Math.abs(n.time - currentTime) < 0.12);
              const isHeard = highlight?.string === s && highlight.fret === fret;
              return (
                <button
                  key={fret}
                  className={`fret-cell ${isUpcoming ? "upcoming" : ""} ${isNow ? "now" : ""} ${isHeard ? "heard" : ""} ${fret === 0 ? "open" : ""}`}
                  style={{ ["--s" as string]: STRING_COLORS[s] }}
                  onClick={() => onPlayFret(s, fret)}
                  aria-label={`${STRING_NAMES[s]} string fret ${fret}`}
                >
                  {isUpcoming || fret === 0 ? fret : [3, 5, 7, 9, 12].includes(fret) ? "•" : ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
