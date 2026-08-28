import { hostPlatform, isMac } from "./platform";

describe("hostPlatform", () => {
  it("prefers the Electron preload platform", () => {
    expect(hostPlatform({ dusDesktop: { platform: "darwin" }, navigator: { platform: "Win32" } })).toBe("darwin");
    expect(hostPlatform({ dusDesktop: { platform: "win32" } })).toBe("win32");
  });

  it("falls back to navigator for a browser tab", () => {
    expect(hostPlatform({ navigator: { platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } })).toBe("darwin");
    expect(hostPlatform({ navigator: { platform: "Win32", userAgent: "Windows" } })).toBe("win32");
  });

  it("detects macOS for traffic-light chrome", () => {
    expect(isMac({ dusDesktop: { platform: "darwin" } })).toBe(true);
    expect(isMac({ dusDesktop: { platform: "win32" } })).toBe(false);
  });
});
