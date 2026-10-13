// Platform detection without an Electron dependency.
//
// Phase E (de-Electronization): these reads used `window.electron.process`
// directly. That is fine in the Electron shell but throws in the browser
// shell (the console-backend shim provides no `window.electron`). The
// optional fallbacks below keep the same answer in Electron and degrade
// to the browser's own hints in the shell.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

interface ElectronBridge {
  process?: {
    platform?: string;
    versions?: Record<string, string>;
  };
}

interface UADataLike {
  platform?: string;
}

function electron(): ElectronBridge | undefined {
  return (window as unknown as { electron?: ElectronBridge }).electron;
}

/** The OS platform id: "win32" | "darwin" | "linux" | "" (unknown). */
export function getPlatform(): string {
  const fromElectron = electron()?.process?.platform;
  if (typeof fromElectron === "string" && fromElectron.length > 0) {
    return fromElectron;
  }
  if (typeof navigator === "undefined") return "";
  // navigator.userAgentData.platform is the modern, non-deprecated hint.
  const uaData = (navigator as Navigator & { userAgentData?: UADataLike })
    .userAgentData;
  if (uaData?.platform) {
    const p = uaData.platform.toLowerCase();
    if (p.includes("win")) return "win32";
    if (p.includes("mac")) return "darwin";
    if (p.includes("linux")) return "linux";
  }
  const ua = navigator.userAgent ?? "";
  if (/Windows/i.test(ua)) return "win32";
  if (/Mac OS X|Macintosh/i.test(ua)) return "darwin";
  if (/Linux/i.test(ua)) return "linux";
  return "";
}

export function isWindows(): boolean {
  return getPlatform() === "win32";
}

export function isMac(): boolean {
  return getPlatform() === "darwin";
}

/** Runtime version labels for the about surface. Electron/Node are
 *  blanked in the browser shell (they do not exist there). */
export function getRuntimeVersions(): {
  electron: string;
  chrome: string;
  node: string;
} {
  const versions = electron()?.process?.versions ?? {};
  return {
    electron: versions.electron ?? "",
    chrome: versions.chrome ?? "",
    node: versions.node ?? "",
  };
}
