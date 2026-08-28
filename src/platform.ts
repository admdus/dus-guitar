export type HostPlatform = "darwin" | "win32" | "linux" | "web";

type PlatformHost = {
  dusDesktop?: { platform?: string };
  navigator?: { platform?: string; userAgent?: string };
};

export function hostPlatform(runtime: PlatformHost = globalThis as PlatformHost): HostPlatform {
  const desktop = runtime.dusDesktop?.platform;
  if (desktop === "darwin" || desktop === "win32" || desktop === "linux") return desktop;

  const platform = runtime.navigator?.platform ?? "";
  const userAgent = runtime.navigator?.userAgent ?? "";
  if (/Mac|iPhone|iPad/i.test(platform) || /Mac OS X/i.test(userAgent)) return "darwin";
  if (/Win/i.test(platform) || /Windows/i.test(userAgent)) return "win32";
  if (/Linux/i.test(platform)) return "linux";
  return "web";
}

export function isMac(runtime?: PlatformHost) {
  return hostPlatform(runtime) === "darwin";
}
