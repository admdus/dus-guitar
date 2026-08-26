import { useCallback, useEffect, useState } from "react";
import { guitarInput, type InputDevice } from "../audio/guitarInput";
import type { DetectedPitch } from "../types";

export type GuitarStatus = "idle" | "connecting" | "live" | "error";

export function useGuitar() {
  const [status, setStatus] = useState<GuitarStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [detected, setDetected] = useState<DetectedPitch | null>(null);

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
    } catch {
      setDevices([]);
    }
  }, []);

  const connect = useCallback(async (id?: string) => {
    setStatus("connecting");
    setError(null);
    try {
      await guitarInput.start(id);
      setDeviceId(id ?? guitarInput.getDeviceId());
      setStatus("live");
      await refreshDevices();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not open the guitar input.");
    }
  }, [refreshDevices]);

  const disconnect = useCallback(async () => {
    await guitarInput.stop();
    setDetected(null);
    setStatus("idle");
  }, []);

  return {
    status,
    error,
    devices,
    deviceId,
    detected,
    connect,
    disconnect,
    refreshDevices,
    live: status === "live",
  };
}
