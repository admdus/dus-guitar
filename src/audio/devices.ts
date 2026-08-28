/**
 * USB interface helpers. Chromium/Electron uses Core Audio on macOS and WASAPI
 * on Windows — not ASIO — so a Scarlett 2i2 appears as a class-compliant capture device.
 */

import { hostPlatform, type HostPlatform } from "../platform";

export type InputKind = "scarlett" | "loopback" | "other";
export type InputChannel = 0 | 1;

export interface InputDevice {
  deviceId: string;
  label: string;
  kind: InputKind;
  recommended: boolean;
}

export interface InputPrefs {
  deviceId?: string;
  channel: InputChannel;
}

export interface CaptureInfo {
  deviceId?: string;
  label: string;
  channel: InputChannel;
  sampleRate: number;
  channelCount: number;
}

export const INPUT_PREFS_KEY = "dus-guitar.input";

export type CaptureConstraints = MediaTrackConstraints & {
  latency?: ConstrainDouble;
  voiceIsolation?: ConstrainBoolean;
  googEchoCancellation?: ConstrainBoolean;
  googAutoGainControl?: ConstrainBoolean;
  googNoiseSuppression?: ConstrainBoolean;
  googHighpassFilter?: ConstrainBoolean;
  googTypingNoiseDetection?: ConstrainBoolean;
};

export function classifyInputLabel(label: string): InputKind {
  const text = label.toLowerCase();
  if (/loopback|blackhole|soundflower/.test(text)) return "loopback";
  if (/scarlett|focusrite/.test(text)) return "scarlett";
  return "other";
}

export function toInputDevice(
  device: Pick<MediaDeviceInfo, "deviceId" | "label">,
  index: number,
): InputDevice {
  const label = device.label.trim() || `Microphone ${index + 1}`;
  const kind = classifyInputLabel(label);
  return {
    deviceId: device.deviceId,
    label,
    kind,
    recommended: kind === "scarlett",
  };
}

export function rankInputDevices(devices: InputDevice[]): InputDevice[] {
  const score = (device: InputDevice) => {
    if (device.kind === "scarlett") return 0;
    if (device.kind === "loopback") return 2;
    return 1;
  };
  return [...devices].sort((a, b) => score(a) - score(b) || a.label.localeCompare(b.label));
}

export function preferGuitarDevice(devices: InputDevice[], savedId?: string): InputDevice | undefined {
  if (savedId) {
    const saved = devices.find((device) => device.deviceId === savedId);
    if (saved && saved.kind !== "loopback") return saved;
  }
  return devices.find((device) => device.kind === "scarlett")
    ?? devices.find((device) => device.kind !== "loopback")
    ?? devices[0];
}

export function processingOffConstraints(): CaptureConstraints {
  return {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    voiceIsolation: false,
    googEchoCancellation: false,
    googAutoGainControl: false,
    googNoiseSuppression: false,
    googHighpassFilter: false,
    googTypingNoiseDetection: false,
  };
}

export function buildConstraintAttempts(deviceId?: string): CaptureConstraints[] {
  const off = processingOffConstraints();
  if (deviceId) {
    return [
      {
        ...off,
        deviceId: { exact: deviceId },
        channelCount: { ideal: 2 },
        sampleRate: { ideal: 48000 },
        latency: { ideal: 0.01 },
      },
      {
        ...off,
        deviceId: { exact: deviceId },
        channelCount: { ideal: 2 },
      },
      {
        ...off,
        deviceId: { exact: deviceId },
      },
      { deviceId: { exact: deviceId } },
    ];
  }
  return [
    {
      ...off,
      channelCount: { ideal: 2 },
      sampleRate: { ideal: 48000 },
      latency: { ideal: 0.01 },
    },
    { ...off, channelCount: { ideal: 2 } },
    { ...off },
    {},
  ];
}

export function describeCaptureError(err: unknown, platform: HostPlatform = hostPlatform()): string {
  const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
  const message = err instanceof Error ? err.message : "Could not open the guitar input.";
  const mac = platform === "darwin";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return mac
      ? "Microphone permission was blocked. Open System Settings → Privacy & Security → Microphone, enable DUS Guitar, then reconnect."
      : "Microphone permission was blocked. Allow audio input for DUS Guitar, then reconnect.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return mac
      ? "No audio input found. Plug in the Scarlett 2i2 (or another interface), wait for macOS to list it, then click Refresh devices."
      : "No audio input found. Plug in the Scarlett 2i2 (or another interface), wait for Windows to see it, then click Refresh devices.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || /could not start audio source/i.test(message)) {
    return mac
      ? "macOS could not open this interface. Close Logic Pro, GarageBand, or any DAW using the Scarlett exclusively, then try again. Chromium uses Core Audio, not ASIO."
      : "Windows could not open this interface. Close any DAW using Focusrite ASIO (Ableton, Reaper, Guitar Rig, etc.), then try again. Chromium uses WASAPI, not ASIO.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return mac
      ? "This interface refused the capture format. In Audio MIDI Setup or Focusrite Control, set the Scarlett to 44.1 or 48 kHz, then reconnect."
      : "This interface refused the capture format. In Focusrite Control / Windows Sound, set the Scarlett to 44.1 or 48 kHz, then reconnect.";
  }
  if (name === "AbortError") {
    return "Audio capture was interrupted. Unplug and replug the Scarlett, then reconnect.";
  }
  if (name === "SecurityError") {
    return "Audio input is not allowed in this window. Use the DUS Guitar desktop app.";
  }
  if (name === "NotSupportedError") {
    return "This build cannot open microphone devices. Use the DUS Guitar desktop app rather than a locked-down browser.";
  }
  return message;
}

export function setupHints(platform: HostPlatform = hostPlatform()) {
  const mac = platform === "darwin";
  return {
    emptyDevices: mac
      ? "No inputs yet. Plug in the Scarlett, click Enable input so macOS can grant microphone access, then Refresh."
      : "No inputs yet. Plug in the Scarlett, click Enable input so Windows grants microphone access, then Refresh.",
    monoCapture: mac
      ? "This endpoint is reporting one channel, so Input 1 is the guitar. That is normal for some Core Audio views of the 2i2."
      : "This endpoint is reporting one channel, so Input 1 is the guitar. That is normal for some WASAPI views of the 2i2.",
    monitorPath: mac
      ? "Direct Monitor lets you hear yourself with no software delay. The app still captures Input 1 over Core Audio."
      : "Direct Monitor lets you hear yourself with no software delay. The app still captures Input 1 over WASAPI.",
    exclusiveAccess: mac
      ? "Close Logic Pro, GarageBand, or other hosts that take exclusive access to the Scarlett, or macOS will refuse the input."
      : "Close Ableton, Reaper, or other hosts that hold the Focusrite ASIO driver, or Windows will refuse the input.",
  };
}

export async function openCaptureStream(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This app needs microphone access. Run the DUS Guitar desktop app.");
  }
  const granted = await window.dusDesktop?.requestMicrophoneAccess?.();
  if (granted === false) {
    throw new Error(describeCaptureError({ name: "NotAllowedError" }));
  }
  const attempts = buildConstraintAttempts(deviceId);
  let lastError: unknown;
  for (const audio of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(describeCaptureError(lastError));
}

export function loadInputPrefs(): InputPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(INPUT_PREFS_KEY);
    if (!raw) return { channel: 0 };
    const parsed = JSON.parse(raw) as Partial<InputPrefs>;
    const channel: InputChannel = parsed.channel === 1 ? 1 : 0;
    return { deviceId: parsed.deviceId, channel };
  } catch {
    return { channel: 0 };
  }
}

export function saveInputPrefs(prefs: InputPrefs) {
  try {
    globalThis.localStorage?.setItem(INPUT_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function channelLabel(channel: InputChannel): string {
  return channel === 0 ? "Input 1 · Guitar / INST" : "Input 2 · Mic / Line";
}
