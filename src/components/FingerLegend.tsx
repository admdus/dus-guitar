import { FINGER_COLORS, FINGER_LABELS, FINGERS } from "../engine/fingers";
import type { Finger } from "../types";

export function FingerLegend() {
  return (
    <div className="finger-legend" role="list" aria-label="Finger colors">
      {FINGERS.map((finger) => (
        <span className="finger-chip" role="listitem" key={finger}>
          <i style={{ background: FINGER_COLORS[finger], boxShadow: `0 0 10px ${FINGER_COLORS[finger]}` }} />
          {labelFor(finger)}
        </span>
      ))}
    </div>
  );
}

function labelFor(finger: Finger) {
  if (finger === 0) return FINGER_LABELS[0];
  return `${finger} ${FINGER_LABELS[finger]}`;
}
