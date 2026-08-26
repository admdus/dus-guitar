import { useEffect } from "react";
import type { GuitarStatus } from "../hooks/useGuitar";
import type { InputDevice } from "../audio/guitarInput";
import type { DetectedPitch } from "../types";

interface Props {
  status: GuitarStatus;
  error: string | null;
  devices: InputDevice[];
  deviceId?: string;
  detected: DetectedPitch | null;
  onConnect: (deviceId?: string) => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export function Setup({
  status,
  error,
  devices,
  deviceId,
  detected,
  onConnect,
  onDisconnect,
  onRefresh,
}: Props) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const level = Math.min(100, (detected?.amplitude ?? 0) * 900);

  return (
    <div className="page setup-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Audio interface</p>
          <h1>Connect your guitar</h1>
          <p className="lede">
            Plug an electric guitar into an audio interface, or point a microphone at an acoustic. The app listens for pitch
            and attacks, then scores the notes that reach the play line.
          </p>
        </div>
      </header>

      <ol className="setup-steps">
        <li>
          <h3>1. Choose the input</h3>
          <p>Select the interface or microphone your guitar is using.</p>
          <div className="device-list">
            {devices.length === 0 && <p className="empty">No inputs yet. Connect and click refresh — the browser may ask for microphone access first.</p>}
            {devices.map((device) => (
              <button
                key={device.deviceId}
                className={device.deviceId === deviceId ? "device on" : "device"}
                onClick={() => onConnect(device.deviceId)}
              >
                {device.label}
              </button>
            ))}
          </div>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => onConnect(deviceId)}>
              {status === "live" ? "Reconnect" : "Enable input"}
            </button>
            <button className="btn" onClick={onRefresh}>
              Refresh devices
            </button>
            {status === "live" && (
              <button className="btn" onClick={onDisconnect}>
                Disconnect
              </button>
            )}
          </div>
          {error && <p className="error-text">{error}</p>}
        </li>
        <li>
          <h3>2. Make a sound</h3>
          <p>Pick an open string. The meter should jump and a note name should appear.</p>
          <div className="level-wrap">
            <div className="level-bar">
              <span style={{ width: `${level}%` }} />
            </div>
            <strong>{detected ? detected.noteName : status === "live" ? "Listening…" : "Not connected"}</strong>
          </div>
        </li>
        <li>
          <h3>3. Tune, then play</h3>
          <p>
            Open the tuner if the note names look off. Then pick a song — notes scroll toward the glowing play line. Hit the
            matching fret in rhythm.
          </p>
        </li>
      </ol>
    </div>
  );
}
