// console-backend — electron stub for plain-Node kernel boot.
//
// The generic bridge imports the desktop's main modules directly
// (installer.ts, media.ts, runtime-provider-actions.ts, …). Three of
// them import electron at runtime. Under `node --experimental-strip-types`
// there is no electron; the resolve-ts-loader redirects the bare
// "electron" specifier here so those modules load with degraded
// native APIs instead of crashing the kernel:
//
//   app.getPath("userData") → undefined (installer.ts optional-chains it)
//   dialog.showSaveDialog   → canceled (saveMedia degrades to false)
//   shell.openExternal      → logged no-op
//   BrowserWindow           → null-ish constructor (never instantiated)
//
// Everything else (ipcMain, Menu, Notification, clipboard, webContents)
// is only touched by index.ts itself, which the kernel never imports.

const log = (...args: unknown[]): void => {
  if (process.env.CONSOLE_KERNEL_QUIET !== "1") {
    console.log("[electron-stub]", ...args);
  }
};

export const app = {
  getPath: (_name: string): string | undefined => undefined,
  isPackaged: false,
  quit: (): void => log("app.quit() ignored (kernel)"),
  name: "cubecloud-agent-desktop-kernel",
};

export const dialog = {
  showSaveDialog: async (): Promise<{ canceled: true; filePath: undefined }> => ({
    canceled: true,
    filePath: undefined,
  }),
  showOpenDialog: async (): Promise<{ canceled: true; filePaths: [] }> => ({
    canceled: true,
    filePaths: [],
  }),
};

export const shell = {
  openExternal: async (url: string): Promise<void> =>
    log("shell.openExternal ignored:", url),
  openPath: async (p: string): Promise<string> => {
    log("shell.openPath ignored:", p);
    return "kernel: no desktop shell";
  },
};

export class BrowserWindow {
  constructor() {
    log("BrowserWindow constructed in kernel — no-op");
  }
  isFocused(): boolean {
    return false;
  }
}

// ipcMain / IpcMainEvent: askpass.ts and sudoCreds.ts register real
// ipcMain listeners at module load. In the kernel those channels are
// served by the HTTP registry, so the stub swallows the registrations.
export const ipcMain = {
  on: (_channel: string, _listener: unknown): void => {},
  handle: (_channel: string, _listener: unknown): void => {},
};

export type IpcMainEvent = unknown;

export default { app, dialog, shell, BrowserWindow };
