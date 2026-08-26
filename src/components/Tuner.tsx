import { midiToName, midiToFreq } from "../engine/notes";
import { closestOpenString, type Tuning } from "../engine/tuning";
import { TuningPicker } from "./TuningPicker";
import type { DetectedPitch, StringIndex } from "../types";
import type { GuitarStatus } from "../hooks/useGuitar";
import { pluckMidi } from "../audio/synth";

interface Props {
  detected: DetectedPitch | null;
  status: GuitarStatus;
  tuning: Tuning;
  onTuning: (tuning: Tuning) => void;
  onConnect: () => void;
}

const STRINGS: StringIndex[] = [6, 5, 4, 3, 2, 1];

export function Tuner({ detected, status, tuning, onTuning, onConnect }: Props) {
  const midi = detected?.midi ?? 0;
  const cents = detected?.cents ?? 0;
  const inTune = !!detected && Math.abs(cents) < 8 && detected.amplitude > 0.01;
  const needle = Math.max(-50, Math.min(50, cents));
  const activeString = detected ? closestOpenString(detected.midi, tuning) : null;

  return (
    <div className="page tuner-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{tuning.name} · {tuning.notation}</p>
          <h1>Tuner</h1>
        </div>
        {status !== "live" && (
          <button className="btn primary" onClick={onConnect}>
            Enable guitar input
          </button>
        )}
      </header>

      <TuningPicker value={tuning} onChange={onTuning} />
      <p className="tuning-hint">{tuning.hint}</p>

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
          <button
            key={s}
            className={`string-ref ${activeString === s ? "on" : ""}`}
            onClick={() => pluckMidi(tuning.openMidi[s], undefined, 0.22)}
          >
            <strong>{tuning.stringNames[s]}</strong>
            <span>{midiToName(tuning.openMidi[s])}</span>
            <em>{midiToFreq(tuning.openMidi[s]).toFixed(1)} Hz</em>
          </button>
        ))}
      </div>
    </div>
  );
}
