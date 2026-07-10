import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  quitApp: () => void;
  onTimerUpdate: (cb: (data: { remaining: number; total: number }) => void) => () => void;
  onTimerFinished: (cb: () => void) => () => void;
  finishAck: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  startTimer: (seconds: number) => ipcRenderer.send('start-timer', seconds),
  stopTimer: () => ipcRenderer.send('stop-timer'),
  quitApp: () => ipcRenderer.send('quit-app'),
  finishAck: () => ipcRenderer.send('finish-ack'),
  onTimerUpdate: (cb: (data: { remaining: number; total: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { remaining: number; total: number }) => cb(data);
    ipcRenderer.on('timer-update', handler);
    return () => ipcRenderer.removeListener('timer-update', handler);
  },
  onTimerFinished: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('timer-finished', handler);
    return () => ipcRenderer.removeListener('timer-finished', handler);
  },
} as ElectronAPI);
