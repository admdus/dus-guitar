import { useEffect } from "react";
import type { GuitarStatus } from "../hooks/useGuitar";
import { channelLabel, type CaptureInfo, type InputChannel, type InputDevice } from "../audio/devices";
import type { DetectedPitch } from "../types";
import type { Tuning } from "../engine/tuning";
import { TuningPicker } from "./TuningPicker";

interface Props {
  status: GuitarStatus;
  error: string | null;
  devices: InputDevice[];
  deviceId?: string;
  channel: InputChannel;
  capture: CaptureInfo | null;
  detected: DetectedPitch | null;
  tuning: Tuning;
  onTuning: (tuning: Tuning) => void;
  onConnect: (deviceId?: string) => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onChannel: (channel: InputChannel) => void;
}

export function Setup({
  status,
  error,
  devices,
  deviceId,
  channel,
  capture,
  detected,
  tuning,
  onTuning,
  onConnect,
  onDisconnect,
  onRefresh,
  onChannel,
}: Props) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const level = Math.min(100, (detected?.amplitude ?? 0) * 900);
  const recommended = devices.filter((device) => device.recommended);
  const other = devices.filter((device) => !device.recommended);
  const selected = devices.find((device) => device.deviceId === deviceId);
  const scarlettLive = selected?.kind === "scarlett" || /scarlett|focusrite/i.test(capture?.label ?? "");
  const monoOnly = (capture?.channelCount ?? 2) < 2;

  return (
    <div className="page setup-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Audio interface</p>
          <h1>Connect your guitar</h1>
          <p className="lede">
            Built for USB interfaces like the Focusrite Scarlett 2i2. Plug the guitar into Input 1, pick that device here,
            and the app listens on that channel for pitch and attacks.
          </p>
        </div>
      </header>

      <ol className="setup-steps">
        <li>
          <h3>1. Choose the interface</h3>
          <p>Select the Scarlett (or another input). Skip Loopback — that mixes computer playback, not the guitar.</p>
          {devices.length === 0 && (
            <p className="empty">No inputs yet. Plug in the Scarlett, click Enable input so Windows grants microphone access, then Refresh.</p>
          )}
          {recommended.length > 0 && (
            <DeviceGroup title="Recommended · Focusrite" devices={recommended} deviceId={deviceId} onConnect={onConnect} />
          )}
          {other.length > 0 && (
            <DeviceGroup
              title={recommended.length > 0 ? "Other inputs" : "Available inputs"}
              devices={other}
              deviceId={deviceId}
              onConnect={onConnect}
            />
          )}
          <div className="channel-picks" role="group" aria-label="Scarlett input channel">
            <button
              type="button"
              className={channel === 0 ? "chip on" : "chip"}
              onClick={() => onChannel(0)}
            >
              {channelLabel(0)}
            </button>
            <button
              type="button"
              className={channel === 1 ? "chip on" : "chip"}
              onClick={() => onChannel(1)}
              disabled={monoOnly}
            >
              {channelLabel(1)}
            </button>
          </div>
          {monoOnly && status === "live" && (
            <p className="empty">This endpoint is reporting one channel, so Input 1 is the guitar. That is normal for some WASAPI views of the 2i2.</p>
          )}
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
          {status === "live" && capture && (
            <p className="capture-meta">
              Listening to <strong>{capture.label}</strong> · {channelLabel(capture.channel)} · {capture.sampleRate} Hz ·{" "}
              {capture.channelCount} ch
              {scarlettLive ? " · Scarlett 2i2 compatible" : ""}
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </li>
        <li>
          <h3>2. Scarlett 2i2 front panel</h3>
          <ul className="hint-list">
            <li>Guitar cable into <strong>Input 1</strong> (left combo jack), not the headphone or line outputs.</li>
            <li>Press <strong>INST</strong> so the instrument pad is on. Leave AIR off unless you want extra brightness.</li>
            <li>Turn <strong>GAIN 1</strong> until the halo is green when you pick; back off if it turns red (clipping wrecks pitch detection).</li>
            <li>48V is only for condenser mics on Input 2. Leave it off for a guitar.</li>
            <li>Direct Monitor lets you hear yourself with no software delay. The app still captures Input 1 over WASAPI.</li>
            <li>Close Ableton, Reaper, or other hosts that hold the Focusrite <strong>ASIO</strong> driver, or Windows will refuse the input.</li>
          </ul>
        </li>
        <li>
          <h3>3. Make a sound</h3>
          <p>Pick an open string. The meter should jump and a note name should appear.</p>
          <div className="level-wrap">
            <div className="level-bar">
              <span style={{ width: `${level}%` }} />
            </div>
            <strong>{detected ? detected.noteName : status === "live" ? "Listening…" : "Not connected"}</strong>
          </div>
        </li>
        <li>
          <h3>4. Tune, then play</h3>
          <p>
            Match the tuner to your guitar. Drop D rewrites every song so it still sounds the same — the low
            string is a D, so those notes sit two frets higher and power chords become one-finger shapes.
          </p>
          <TuningPicker value={tuning} onChange={onTuning} />
          <p className="tuning-hint">{tuning.hint}</p>
        </li>
      </ol>
    </div>
  );
}

function DeviceGroup({
  title,
  devices,
  deviceId,
  onConnect,
}: {
  title: string;
  devices: InputDevice[];
  deviceId?: string;
  onConnect: (deviceId?: string) => void;
}) {
  return (
    <div className="device-group">
      <p className="device-group-title">{title}</p>
      <div className="device-list">
        {devices.map((device) => (
          <button
            key={device.deviceId}
            className={[
              "device",
              device.deviceId === deviceId ? "on" : "",
              device.kind === "loopback" ? "loopback" : "",
              device.recommended ? "recommended" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onConnect(device.deviceId)}
          >
            {device.label}
            {device.recommended ? <em>2i2</em> : null}
            {device.kind === "loopback" ? <em>skip</em> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
