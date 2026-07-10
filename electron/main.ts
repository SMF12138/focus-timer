import { app, BrowserWindow, ipcMain, globalShortcut, screen, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import util from 'node:util';

const isDev = process.env.NODE_ENV === 'development';

const logPath = path.join(app.getPath('userData'), 'app.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FOCUS_SECONDS = 24 * 60 * 60; // 24 hours

function rotateLog() {
  try {
    const stat = fs.statSync(logPath);
    if (stat.size > MAX_LOG_SIZE) {
      const backup = logPath + '.old';
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(logPath, backup);
    }
  } catch {
    // ignore
  }
}

function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  try {
    return util.inspect(arg, { depth: 3, breakLength: Infinity });
  } catch {
    return '[uninspectable]';
  }
}

function log(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${args.map(formatLogArg).join(' ')}\n`;
  try {
    rotateLog();
    fs.appendFileSync(logPath, line);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
  if (isDev) console.log(...args);
}

function validateSeconds(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isInteger(value)) return null;
  if (value <= 0 || value > MAX_FOCUS_SECONDS) return null;
  return value;
}

const ESCAPE_SHORTCUT = 'Ctrl+Shift+E';

let setupWin: BrowserWindow | null = null;
let timerWin: BrowserWindow | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let timerDuration = 0;
let timerStartAt = 0;
let isExiting = false;

let keyHook: { startHook: () => boolean; stopHook: () => void } | null = null;
try {
  const mod = require('./native/keyHook.node') as unknown;
  if (
    mod &&
    typeof (mod as { startHook?: unknown }).startHook === 'function' &&
    typeof (mod as { stopHook?: unknown }).stopHook === 'function'
  ) {
    keyHook = mod as { startHook: () => boolean; stopHook: () => void };
  } else {
    log('[keyHook] Native module exports unexpected interface');
  }
} catch (err) {
  log('[keyHook] Native key hook not loaded:', err);
}

function createSetupWindow() {
  if (setupWin && !setupWin.isDestroyed()) {
    setupWin.show();
    setupWin.focus();
    return;
  }
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
      sandbox: true,
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
    log('[setup closed]');
    setupWin = null;
  });
}

function createTimerWindow() {
  if (timerWin && !timerWin.isDestroyed()) {
    timerWin.show();
    timerWin.focus();
    return;
  }
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
      sandbox: true,
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
  const validSeconds = validateSeconds(seconds);
  if (validSeconds === null) {
    log('[startTimer] invalid seconds:', seconds);
    return;
  }
  stopTimer();

  timerDuration = validSeconds;
  timerStartAt = Date.now();

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

  try {
    const registered = globalShortcut.register(ESCAPE_SHORTCUT, () => {
      stopTimer();
    });
    if (!registered) {
      log('[startTimer] failed to register global shortcut:', ESCAPE_SHORTCUT);
    }
  } catch (err) {
    log('[startTimer] globalShortcut.register error:', err);
  }

  sendTimerUpdate();

  timerInterval = setInterval(() => {
    const remaining = getRemaining();
    sendTimerUpdate();
    if (remaining <= 0) {
      finishTimer();
    }
  }, 100);
}

function getRemaining() {
  const elapsed = Math.floor((Date.now() - timerStartAt) / 1000);
  return Math.max(0, timerDuration - elapsed);
}

function sendTimerUpdate() {
  const remaining = getRemaining();
  timerWin?.webContents.send('timer-update', { remaining, total: timerDuration });
}

function stopTimer() {
  log('[stopTimer] called');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  globalShortcut.unregister(ESCAPE_SHORTCUT);
  keyHook?.stopHook();

  timerDuration = 0;
  timerStartAt = 0;

  if (timerWin && !timerWin.isDestroyed()) {
    try {
      timerWin.setKiosk(false);
      timerWin.setFullScreen(false);
      timerWin.hide();
    } catch (err) {
      log('[stopTimer] timerWin error:', err);
    }
  }

  if (setupWin && !setupWin.isDestroyed()) {
    try {
      setupWin.show();
      setupWin.focus();
      setupWin.setFullScreen(true);
    } catch (err) {
      log('[stopTimer] setupWin error:', err);
    }
  }
}

function cleanupAndExit(code = 0) {
  if (isExiting) return;
  isExiting = true;
  log('[cleanupAndExit] exiting with code', code);
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  try {
    globalShortcut.unregisterAll();
    keyHook?.stopHook();
  } catch (err) {
    log('[cleanupAndExit] cleanup error:', err);
  }

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
  app.quit();
});

function finishTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerWin?.webContents.send('timer-finished');
  timerDuration = 0;
  timerStartAt = 0;
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
  try {
    globalShortcut.unregisterAll();
    keyHook?.stopHook();
  } catch (err) {
    log('[will-quit] cleanup error:', err);
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSetupWindow();
  }
});
