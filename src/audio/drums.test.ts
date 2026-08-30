/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  DRUM_KIT_OPTIONS,
  hitsForStep,
  isDrumKitId,
  loadDrumKit,
  saveDrumKit,
  type DrumVoice,
} from "./drums";

function voicesAt(kit: Parameters<typeof hitsForStep>[0], step: number): DrumVoice[] {
  return hitsForStep(kit, step).map((hit) => hit.voice);
}

describe("drum kits", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("offers several kits besides the metronome click", () => {
    const ids = DRUM_KIT_OPTIONS.map((kit) => kit.id);
    expect(ids).toContain("off");
    expect(ids.filter((id) => id !== "off")).toEqual(["kick", "rock", "pop", "metal", "shuffle"]);
  });

  it("plays nothing when drums are off", () => {
    expect(hitsForStep("off", 0)).toEqual([]);
    expect(hitsForStep("off", 4)).toEqual([]);
  });

  it("pulses a kick on every quarter-note beat", () => {
    expect(voicesAt("kick", 0)).toContain("kick");
    expect(voicesAt("kick", 4)).toContain("kick");
    expect(voicesAt("kick", 8)).toContain("kick");
    expect(voicesAt("kick", 12)).toContain("kick");
    expect(voicesAt("kick", 1)).toEqual([]);
    expect(voicesAt("kick", 2)).toEqual([]);
  });

  it("puts a rock snare on beats 2 and 4", () => {
    expect(voicesAt("rock", 4)).toContain("snare");
    expect(voicesAt("rock", 12)).toContain("snare");
    expect(voicesAt("rock", 0)).not.toContain("snare");
    expect(voicesAt("rock", 0)).toContain("kick");
    expect(voicesAt("rock", 8)).toContain("kick");
  });

  it("keeps pop four-on-the-floor with a backbeat snare", () => {
    for (const step of [0, 4, 8, 12]) {
      expect(voicesAt("pop", step)).toContain("kick");
    }
    expect(voicesAt("pop", 4)).toContain("snare");
    expect(voicesAt("pop", 12)).toContain("snare");
  });

  it("uses a double-kick metal pulse on the off-beats", () => {
    expect(voicesAt("metal", 0)).toContain("kick");
    expect(voicesAt("metal", 2)).toContain("kick");
    expect(voicesAt("metal", 8)).toContain("kick");
    expect(voicesAt("metal", 10)).toContain("kick");
    expect(voicesAt("metal", 4)).toContain("snare");
    expect(voicesAt("metal", 1)).toContain("hat");
  });

  it("places shuffle hats on swung eighths", () => {
    expect(voicesAt("shuffle", 0)).toContain("hat");
    expect(voicesAt("shuffle", 3)).toContain("hat");
    expect(voicesAt("shuffle", 2)).toEqual([]);
    expect(voicesAt("shuffle", 4)).toContain("snare");
  });

  it("wraps a 16-step bar and accepts negative steps", () => {
    expect(hitsForStep("rock", 16)).toEqual(hitsForStep("rock", 0));
    expect(hitsForStep("rock", 20)).toEqual(hitsForStep("rock", 4));
    expect(hitsForStep("rock", -1)).toEqual(hitsForStep("rock", 15));
  });

  it("validates and persists the chosen kit", () => {
    expect(isDrumKitId("rock")).toBe(true);
    expect(isDrumKitId("bongos")).toBe(false);
    expect(loadDrumKit()).toBe("off");
    saveDrumKit("metal");
    expect(loadDrumKit()).toBe("metal");
    localStorage.setItem("dus-guitar.drums", "bongos");
    expect(loadDrumKit()).toBe("off");
  });
});
