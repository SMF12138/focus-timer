import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  quitApp: () => void;
  onTimerUpdate: (cb: (data: { remaining: number; total: number }) => void) => void;
  onTimerFinished: (cb: () => void) => void;
  finishAck: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  startTimer: (seconds: number) => ipcRenderer.send('start-timer', seconds),
  stopTimer: () => ipcRenderer.send('stop-timer'),
  quitApp: () => ipcRenderer.send('quit-app'),
  finishAck: () => ipcRenderer.send('finish-ack'),
  onTimerUpdate: (cb: (data: { remaining: number; total: number }) => void) => {
    ipcRenderer.on('timer-update', (_, data) => cb(data));
  },
  onTimerFinished: (cb: () => void) => {
    ipcRenderer.on('timer-finished', () => cb());
  },
} as ElectronAPI);
