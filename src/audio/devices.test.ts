import {
  buildConstraintAttempts,
  classifyInputLabel,
  describeCaptureError,
  preferGuitarDevice,
  processingOffConstraints,
  rankInputDevices,
  toInputDevice,
} from "./devices";

describe("Scarlett / Focusrite device classification", () => {
  it("recognizes Scarlett and Focusrite analog endpoints", () => {
    expect(classifyInputLabel("Scarlett 2i2 4th Gen")).toBe("scarlett");
    expect(classifyInputLabel("Analogue 1 + 2 (Focusrite USB Audio)")).toBe("scarlett");
    expect(classifyInputLabel("Microphone (Scarlett 2i2 USB)")).toBe("scarlett");
    expect(classifyInputLabel("Focusrite USB Audio")).toBe("scarlett");
  });

  it("keeps loopback mixes out of the guitar path", () => {
    expect(classifyInputLabel("Loopback 1-2 (Focusrite USB Audio)")).toBe("loopback");
    expect(classifyInputLabel("Scarlett 2i2 4th Gen Loopback")).toBe("loopback");
  });

  it("ranks Scarlett analog first and loopback last", () => {
    const ranked = rankInputDevices([
      toInputDevice({ deviceId: "loop", label: "Loopback (Scarlett 2i2 4th Gen)" }, 0),
      toInputDevice({ deviceId: "mic", label: "Microphone Array" }, 1),
      toInputDevice({ deviceId: "scarlett", label: "Scarlett 2i2 4th Gen" }, 2),
    ]);
    expect(ranked.map((d) => d.deviceId)).toEqual(["scarlett", "mic", "loop"]);
    expect(ranked[0].recommended).toBe(true);
  });

  it("prefers a saved analog device, then Scarlett, and never loopback when something else exists", () => {
    const devices = rankInputDevices([
      toInputDevice({ deviceId: "loop", label: "Loopback (Scarlett 2i2)" }, 0),
      toInputDevice({ deviceId: "scarlett", label: "Scarlett 2i2 USB" }, 1),
      toInputDevice({ deviceId: "webcam", label: "HD Webcam" }, 2),
    ]);
    expect(preferGuitarDevice(devices)?.deviceId).toBe("scarlett");
    expect(preferGuitarDevice(devices, "webcam")?.deviceId).toBe("webcam");
    expect(preferGuitarDevice(devices, "loop")?.deviceId).toBe("scarlett");
  });
});

describe("capture constraints", () => {
  it("never requests mono channelCount, which breaks 2-in Scarlett interfaces", () => {
    for (const attempt of [...buildConstraintAttempts("dev-1"), ...buildConstraintAttempts()]) {
      const count = attempt.channelCount;
      if (typeof count === "number") expect(count).not.toBe(1);
      if (count && typeof count === "object") {
        expect("exact" in count && count.exact === 1).toBe(false);
        if ("ideal" in count && count.ideal !== undefined) expect(count.ideal).toBe(2);
      }
    }
  });

  it("keeps processing off and pins a named device across fallbacks", () => {
    const off = processingOffConstraints();
    expect(off.echoCancellation).toBe(false);
    expect(off.noiseSuppression).toBe(false);
    expect(off.autoGainControl).toBe(false);
    expect(off.voiceIsolation).toBe(false);
    expect(off.googHighpassFilter).toBe(false);

    const named = buildConstraintAttempts("scarlett-id");
    expect(named.length).toBeGreaterThanOrEqual(3);
    for (const attempt of named) {
      expect(attempt.deviceId).toEqual({ exact: "scarlett-id" });
    }
  });

  it("maps WASAPI / ASIO lock errors to a Scarlett-specific hint", () => {
    expect(describeCaptureError({ name: "NotReadableError", message: "Could not start audio source" })).toMatch(/ASIO/i);
    expect(describeCaptureError({ name: "OverconstrainedError", message: "overconstrained" })).toMatch(/48 kHz/i);
    expect(describeCaptureError({ name: "NotFoundError", message: "not found" })).toMatch(/Scarlett 2i2/i);
  });
});
