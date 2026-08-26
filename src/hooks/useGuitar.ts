import { useCallback, useEffect, useState } from "react";
import { guitarInput, type CaptureInfo, type InputDevice } from "../audio/guitarInput";
import { loadInputPrefs, preferGuitarDevice, saveInputPrefs, type InputChannel } from "../audio/devices";
import type { DetectedPitch } from "../types";

export type GuitarStatus = "idle" | "connecting" | "live" | "error";

export function useGuitar() {
  const [status, setStatus] = useState<GuitarStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(() => loadInputPrefs().deviceId);
  const [channel, setChannelState] = useState<InputChannel>(() => loadInputPrefs().channel);
  const [detected, setDetected] = useState<DetectedPitch | null>(null);
  const [capture, setCapture] = useState<CaptureInfo | null>(null);

  useEffect(() => {
    let last = 0;
    return guitarInput.subscribe((pitch) => {
      const now = performance.now();
      if (pitch?.onset || now - last > 90) {
        last = now;
        setDetected(pitch);
      }
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await guitarInput.listDevices();
      setDevices(list);
      return list;
    } catch {
      setDevices([]);
      return [] as InputDevice[];
    }
  }, []);

  useEffect(() => {
    return guitarInput.watchDevices(() => {
      void refreshDevices();
    });
  }, [refreshDevices]);

  const connect = useCallback(async (id?: string, nextChannel: InputChannel = channel) => {
    setStatus("connecting");
    setError(null);
    try {
      const list = devices.length > 0 ? devices : await guitarInput.listDevices();
      if (list.length) setDevices(list);
      const chosen = id ?? preferGuitarDevice(list, deviceId)?.deviceId;
      await guitarInput.start(chosen, nextChannel);
      const liveId = guitarInput.getDeviceId() ?? chosen;
      setDeviceId(liveId);
      setChannelState(nextChannel);
      setCapture(guitarInput.getCaptureInfo());
      setStatus("live");
      saveInputPrefs({ deviceId: liveId, channel: nextChannel });
      await refreshDevices();
    } catch (err) {
      setStatus("error");
      setCapture(null);
      setError(err instanceof Error ? err.message : "Could not open the guitar input.");
    }
  }, [channel, deviceId, devices, refreshDevices]);

  const disconnect = useCallback(async () => {
    await guitarInput.stop();
    setDetected(null);
    setCapture(null);
    setStatus("idle");
  }, []);

  const setChannel = useCallback((next: InputChannel) => {
    setChannelState(next);
    guitarInput.setChannel(next);
    setCapture(guitarInput.getCaptureInfo());
    saveInputPrefs({ deviceId: guitarInput.getDeviceId() ?? deviceId, channel: next });
  }, [deviceId]);

  return {
    status,
    error,
    devices,
    deviceId,
    channel,
    capture,
    detected,
    connect,
    disconnect,
    setChannel,
    refreshDevices,
    live: status === "live",
  };
}
