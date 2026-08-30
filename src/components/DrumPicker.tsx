import { DRUM_KIT_OPTIONS, type DrumKitId } from "../audio/drums";

interface Props {
  value: DrumKitId;
  onChange: (kit: DrumKitId) => void;
}

export function DrumPicker({ value, onChange }: Props) {
  const selected = DRUM_KIT_OPTIONS.find((kit) => kit.id === value) ?? DRUM_KIT_OPTIONS[0];

  return (
    <label className="check drum-pick" title={selected.hint}>
      <span>Drums</span>
      <select
        aria-label="Background drums"
        value={value}
        onChange={(e) => onChange(e.target.value as DrumKitId)}
      >
        {DRUM_KIT_OPTIONS.map((kit) => (
          <option key={kit.id} value={kit.id} title={kit.hint}>
            {kit.label}
          </option>
        ))}
      </select>
    </label>
  );
}
