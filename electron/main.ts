import { app, BrowserWindow, ipcMain, globalShortcut, screen, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const isDev = process.env.NODE_ENV === 'development';

const logPath = path.join(app.getPath('userData'), 'app.log');
function log(...args: any[]) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  fs.appendFileSync(logPath, line);
  if (isDev) console.log(...args);
}

const ESCAPE_SHORTCUT = 'Ctrl+Shift+E';

let setupWin: BrowserWindow | null = null;
let timerWin: BrowserWindow | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let remaining = 0;
let total = 0;

let keyHook: { startHook: () => boolean; stopHook: () => void } | null = null;
try {
  keyHook = require('./native/keyHook.node');
} catch (err) {
  console.warn('Native key hook not loaded:', err);
}

function createSetupWindow() {
  const { width, height } = screen.getPrimaryDisplay().size;
  log('[createSetupWindow] creating setup window', { width, height });

  setupWin = new BrowserWindow({
    width,
    height,
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreen: true,
    show: false,
    title: '专注计时器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupWin.once('ready-to-show', () => {
    log('[setup ready-to-show] showing setup window');
    setupWin?.show();
    setupWin?.focus();
  });

  setupWin.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`[console:${level}] ${sourceId}:${line} ${message}`);
  });

  setupWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`[did-fail-load] ${errorCode} ${errorDescription}`);
  });

  setupWin.webContents.on('render-process-gone', (_event, details) => {
    log(`[render-process-gone]`, details);
  });

  setupWin.on('unresponsive', () => {
    log('[unresponsive] setup window');
  });

  if (isDev) {
    setupWin.loadURL('http://localhost:5173/#/setup');
    setupWin.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    log('[setup] loading URL:', 'file://' + indexPath + '#/setup');
    setupWin.loadURL('file://' + indexPath + '#/setup');
  }

  setupWin.on('closed', () => {
    log('[setup closed] cleaning up and exiting');
    setupWin = null;
    cleanupAndExit();
  });
}

function createTimerWindow() {
  const { width, height } = screen.getPrimaryDisplay().size;

  timerWin = new BrowserWindow({
    width,
    height,
    frame: false,
    fullscreen: true,
    kiosk: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  timerWin.on('blur', () => {
    if (timerWin && !timerWin.isDestroyed()) {
      timerWin.focus();
      timerWin.setAlwaysOnTop(true, 'screen-saver');
      timerWin.setKiosk(true);
      timerWin.setFullScreen(true);
    }
  });

  timerWin.on('closed', () => {
    timerWin = null;
  });

  timerWin.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log(`[timer-console:${level}] ${sourceId}:${line} ${message}`);
  });

  timerWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`[timer-did-fail-load] ${errorCode} ${errorDescription}`);
  });

  timerWin.webContents.on('render-process-gone', (_event, details) => {
    log(`[timer-render-process-gone]`, details);
  });

  if (isDev) {
    timerWin.loadURL('http://localhost:5173/#/timer');
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    timerWin.loadURL('file://' + indexPath + '#/timer');
  }
}

function startTimer(seconds: number) {
  if (seconds <= 0) return;

  remaining = seconds;
  total = seconds;

  if (!timerWin || timerWin.isDestroyed()) {
    createTimerWindow();
  }

  timerWin?.show();
  timerWin?.focus();
  timerWin?.setKiosk(true);
  timerWin?.setFullScreen(true);
  timerWin?.setAlwaysOnTop(true, 'screen-saver');

  setupWin?.hide();

  keyHook?.startHook();

  globalShortcut.register(ESCAPE_SHORTCUT, () => {
    stopTimer();
  });

  timerWin?.webContents.send('timer-update', { remaining, total });

  timerInterval = setInterval(() => {
    remaining--;
    timerWin?.webContents.send('timer-update', { remaining, total });
    if (remaining <= 0) {
      finishTimer();
    }
  }, 1000);
}

function stopTimer() {
  log('[stopTimer] called');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  globalShortcut.unregister(ESCAPE_SHORTCUT);
  keyHook?.stopHook();

  if (timerWin && !timerWin.isDestroyed()) {
    timerWin.setKiosk(false);
    timerWin.setFullScreen(false);
    timerWin.hide();
  }

  if (setupWin && !setupWin.isDestroyed()) {
    setupWin.show();
    setupWin.focus();
    setupWin.setFullScreen(true);
  }
}

function cleanupAndExit(code = 0) {
  log('[cleanupAndExit] exiting with code', code);
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  globalShortcut.unregisterAll();
  keyHook?.stopHook();

  if (timerWin && !timerWin.isDestroyed()) {
    try {
      timerWin.destroy();
    } catch (err) {
      log('[cleanupAndExit] timerWin destroy error:', err);
    }
    timerWin = null;
  }

  if (setupWin && !setupWin.isDestroyed()) {
    try {
      setupWin.destroy();
    } catch (err) {
      log('[cleanupAndExit] setupWin destroy error:', err);
    }
    setupWin = null;
  }

  app.exit(code);
}

ipcMain.on('start-timer', (_, seconds: number) => startTimer(seconds));
ipcMain.on('stop-timer', stopTimer);
ipcMain.on('finish-ack', () => {
  log('[finish-ack] received');
  stopTimer();
});
ipcMain.on('quit-app', () => {
  log('[quit-app] received');
  cleanupAndExit(0);
});

function finishTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerWin?.webContents.send('timer-finished');
}

app.whenReady().then(() => {
  log('[app.whenReady] starting', process.argv[0], process.argv[1]);
  Menu.setApplicationMenu(null);
  createSetupWindow();
});

app.on('window-all-closed', () => {
  log('[window-all-closed] exiting');
  cleanupAndExit(0);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  keyHook?.stopHook();
  if (timerInterval) clearInterval(timerInterval);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSetupWindow();
  }
});
