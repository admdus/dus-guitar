import { AMP_TONES, type AmpPrefs, type AmpPresetId } from "../audio/ampPresets";

interface Props {
  value: AmpPrefs;
  onChange: (prefs: AmpPrefs) => void;
  compact?: boolean;
}

export function AmpPicker({ value, onChange, compact = false }: Props) {
  const selected = AMP_TONES.find((tone) => tone.id === value.presetId) ?? AMP_TONES[0];

  const setPreset = (presetId: AmpPresetId) => {
    onChange({ ...value, presetId, enabled: true });
  };

  const volumePercent = Math.round(value.volume * 100);

  if (compact) {
    return (
      <label className="check amp-pick" title={selected.description}>
        <span>Amp</span>
        <select
          aria-label="Electric guitar amp preset"
          value={value.enabled ? value.presetId : "off"}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "off") {
              onChange({ ...value, enabled: false });
              return;
            }
            setPreset(next as AmpPresetId);
          }}
        >
          <option value="off">Off</option>
          {AMP_TONES.map((tone) => (
            <option key={tone.id} value={tone.id} title={tone.description}>
              {tone.name}
            </option>
          ))}
        </select>
        <input
          type="range"
          name="amp-volume"
          min={0}
          max={100}
          value={volumePercent}
          disabled={!value.enabled}
          aria-label="Amp volume"
          onChange={(e) => onChange({ ...value, volume: Number(e.target.value) / 100 })}
        />
      </label>
    );
  }

  return (
    <div className="amp-picker">
      <div className="amp-grid" role="group" aria-label="Electric guitar amp presets">
        {AMP_TONES.map((tone) => (
          <button
            key={tone.id}
            type="button"
            className={["amp-card", value.enabled && value.presetId === tone.id ? "on" : ""].filter(Boolean).join(" ")}
            onClick={() => setPreset(tone.id)}
          >
            <strong>
              {tone.name}
              <em>{tone.tag}</em>
            </strong>
            <p>{tone.description}</p>
          </button>
        ))}
      </div>
      <div className="amp-mix">
        <label className="check">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          Hear guitar
        </label>
        <label className="amp-volume">
          Volume
          <input
            type="range"
            name="amp-volume"
            min={0}
            max={100}
            value={volumePercent}
            disabled={!value.enabled}
            onChange={(e) => onChange({ ...value, volume: Number(e.target.value) / 100 })}
          />
          <span>{volumePercent}%</span>
        </label>
      </div>
    </div>
  );
}
