import { midiToName, midiToFreq, OPEN_MIDI, STRING_NAMES } from "../engine/notes";
import type { DetectedPitch, StringIndex } from "../types";
import type { GuitarStatus } from "../hooks/useGuitar";
import { pluckMidi } from "../audio/synth";

interface Props {
  detected: DetectedPitch | null;
  status: GuitarStatus;
  onConnect: () => void;
}

const STRINGS: StringIndex[] = [6, 5, 4, 3, 2, 1];

export function Tuner({ detected, status, onConnect }: Props) {
  const midi = detected?.midi ?? 0;
  const cents = detected?.cents ?? 0;
  const inTune = !!detected && Math.abs(cents) < 8 && detected.amplitude > 0.01;
  const needle = Math.max(-50, Math.min(50, cents));

  return (
    <div className="page tuner-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Standard EADGBE</p>
          <h1>Tuner</h1>
        </div>
        {status !== "live" && (
          <button className="btn primary" onClick={onConnect}>
            Enable guitar input
          </button>
        )}
      </header>

      <div className={`tuner-face ${inTune ? "in-tune" : ""}`}>
        <div className="tuner-note">{detected ? midiToName(midi) : "—"}</div>
        <div className="tuner-hz">{detected ? `${detected.frequency.toFixed(1)} Hz` : "Play a string"}</div>
        <div className="tuner-scale">
          <span>-50</span>
          <div className="needle-track">
            <div className="needle" style={{ transform: `translateX(${needle * 3.2}px)` }} />
            <div className="center-line" />
          </div>
          <span>+50</span>
        </div>
        <p className="tuner-cents">{detected ? `${cents >= 0 ? "+" : ""}${cents.toFixed(0)} cents` : "Waiting for signal"}</p>
      </div>

      <div className="string-refs">
        {STRINGS.map((s) => (
          <button key={s} className="string-ref" onClick={() => pluckMidi(OPEN_MIDI[s], undefined, 0.22)}>
            <strong>{STRING_NAMES[s]}</strong>
            <span>{midiToName(OPEN_MIDI[s])}</span>
            <em>{midiToFreq(OPEN_MIDI[s]).toFixed(1)} Hz</em>
          </button>
        ))}
      </div>
    </div>
  );
}
