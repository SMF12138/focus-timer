export interface ElectronAPI {
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  quitApp: () => void;
  finishAck: () => void;
  onTimerUpdate: (cb: (data: { remaining: number; total: number }) => void) => void;
  onTimerFinished: (cb: () => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
