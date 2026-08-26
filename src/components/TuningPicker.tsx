import { TUNINGS, type Tuning } from "../engine/tuning";

interface Props {
  value: Tuning;
  onChange: (tuning: Tuning) => void;
  compact?: boolean;
}

export function TuningPicker({ value, onChange, compact = false }: Props) {
  return (
    <div className={`tuning-picks ${compact ? "compact" : ""}`} role="group" aria-label="Guitar tuning">
      {TUNINGS.map((tuning) => (
        <button
          key={tuning.id}
          type="button"
          className={value.id === tuning.id ? "chip on" : "chip"}
          onClick={() => onChange(tuning)}
        >
          {tuning.name}
          <em>{tuning.notation}</em>
        </button>
      ))}
    </div>
  );
}
