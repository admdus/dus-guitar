/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  AMP_TONES,
  DEFAULT_AMP_PREFS,
  getAmpTone,
  isAmpPresetId,
  loadAmpPrefs,
  makeDriveCurve,
  monitorOutputGain,
  normalizeAmpPrefs,
  saturateSample,
  saveAmpPrefs,
} from "./ampPresets";

describe("electric amp presets", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("ships several electric tones with distinct gain characters", () => {
    const ids = AMP_TONES.map((tone) => tone.id);
    expect(ids).toEqual(["clean", "chorus", "crunch", "blues", "lead", "metal", "fuzz"]);
    expect(new Set(AMP_TONES.map((tone) => tone.name)).size).toBe(AMP_TONES.length);

    const clean = getAmpTone("clean");
    const crunch = getAmpTone("crunch");
    const metal = getAmpTone("metal");
    expect(crunch.drive).toBeGreaterThan(clean.drive);
    expect(metal.drive).toBeGreaterThan(crunch.drive);
    expect(metal.mid).toBeLessThan(0);
    expect(getAmpTone("chorus").chorus).toBeGreaterThan(0.3);
    expect(getAmpTone("mystery").id).toBe("clean");
  });

  it("keeps tone knobs in a playable range", () => {
    for (const tone of AMP_TONES) {
      expect(tone.preGain).toBeGreaterThan(0);
      expect(tone.postGain).toBeGreaterThan(0);
      expect(tone.output).toBeGreaterThan(0);
      expect(tone.output).toBeLessThanOrEqual(1);
      expect(tone.highpass).toBeGreaterThanOrEqual(40);
      expect(tone.cabLowpass).toBeGreaterThan(tone.cabHighpass);
      expect(tone.chorus).toBeGreaterThanOrEqual(0);
      expect(tone.chorus).toBeLessThanOrEqual(1);
      expect(tone.reverb).toBeGreaterThanOrEqual(0);
      expect(tone.reverb).toBeLessThanOrEqual(1);
    }
  });

  it("validates preset ids", () => {
    expect(isAmpPresetId("metal")).toBe(true);
    expect(isAmpPresetId("jazz-master")).toBe(false);
  });

  it("normalizes and persists monitor prefs", () => {
    expect(loadAmpPrefs()).toEqual(DEFAULT_AMP_PREFS);
    saveAmpPrefs({ presetId: "metal", volume: 0.4, enabled: false });
    expect(loadAmpPrefs()).toEqual({ presetId: "metal", volume: 0.4, enabled: false });
    expect(normalizeAmpPrefs({ presetId: "nope" as never, volume: 4, enabled: undefined })).toEqual({
      presetId: "clean",
      volume: 1,
      enabled: true,
    });
    expect(normalizeAmpPrefs({ volume: Number.NaN, enabled: false }).volume).toBe(DEFAULT_AMP_PREFS.volume);
    localStorage.setItem("dus-guitar.amp", "{not json");
    expect(loadAmpPrefs()).toEqual(DEFAULT_AMP_PREFS);
  });

  it("mutes the monitor when hearing is off", () => {
    expect(monitorOutputGain({ presetId: "crunch", volume: 1, enabled: false })).toBe(0);
    expect(monitorOutputGain({ presetId: "clean", volume: 0.5, enabled: true })).toBeCloseTo(
      getAmpTone("clean").output * 0.5,
    );
  });
});

describe("drive curves", () => {
  it("is an odd saturating function that stays within ±1", () => {
    for (const kind of ["soft", "hard", "fuzz"] as const) {
      expect(saturateSample(0, 8, kind)).toBeCloseTo(0, 5);
      expect(saturateSample(1, 8, kind)).toBeLessThanOrEqual(1);
      expect(saturateSample(-1, 8, kind)).toBeGreaterThanOrEqual(-1);
      expect(saturateSample(-0.4, 8, kind)).toBeCloseTo(-saturateSample(0.4, 8, kind), 5);
    }
    const mild = Math.abs(saturateSample(0.4, 1, "soft"));
    const hot = Math.abs(saturateSample(0.4, 20, "soft"));
    expect(hot).toBeGreaterThan(mild);
  });

  it("builds a waveshaper table from -1 to 1", () => {
    const curve = makeDriveCurve(12, "soft", 65);
    expect(curve).toHaveLength(65);
    expect(curve[0]).toBeLessThan(0);
    expect(curve[32]).toBeCloseTo(0, 5);
    expect(curve[63]).toBeGreaterThan(0);
    expect(Math.max(...curve)).toBeLessThanOrEqual(1);
    expect(Math.min(...curve)).toBeGreaterThanOrEqual(-1);
  });
});
