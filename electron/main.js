import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

sqlite3.verbose();

let dbPromise;
let dbPath;

const ensureUserDataDir = () => {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const logDebug = (message, meta = {}) => {
  try {
    const userData = ensureUserDataDir();
    const logFile = path.join(userData, 'debug.log');
    const line = `[${new Date().toISOString()}][${process.type}][main] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(logFile, line);
    console.log(line.trim());
  } catch (error) {
    console.error('Failed to write debug log', error);
  }
};

const openDatabase = dbPath =>
  new Promise((resolve, reject) => {
    const database = new sqlite3.Database(dbPath, err => {
      if (err) reject(err);
      else resolve(database);
    });
  });

const run = (database, sql, params = []) => promisify(database.run.bind(database))(sql, params);
const get = (database, sql, params = []) => promisify(database.get.bind(database))(sql, params);
const all = (database, sql, params = []) => promisify(database.all.bind(database))(sql, params);
const exec = (database, sql) => promisify(database.exec.bind(database))(sql);

const withTransaction = async (database, fn) => {
  await run(database, 'BEGIN');
  try {
    await fn();
    await run(database, 'COMMIT');
  } catch (err) {
    await run(database, 'ROLLBACK');
    throw err;
  }
};

const getDatabase = () => {
  if (dbPromise) return dbPromise;
  const userData = ensureUserDataDir();
  dbPath = path.join(userData, 'debt-tracker.db');

  dbPromise = (async () => {
    logDebug('Opening SQLite connection', { appName: app.getName(), userData, dbPath });
    const database = await openDatabase(dbPath);
    await run(database, 'PRAGMA journal_mode=WAL;');
    await initializeDatabase(database);
    await seedDefaults(database);
    return database;
  })();

  return dbPromise;
};

const initializeDatabase = async database => {
  await exec(
    database,
    `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatarColor TEXT NOT NULL,
        isDefault INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        borrower TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        dueDate TEXT,
        type TEXT NOT NULL,
        note TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  );
};

const seedDefaults = async database => {
  const row = await get(database, 'SELECT COUNT(*) as count FROM accounts');
  if ((row?.count ?? 0) === 0) {
    await run(
      database,
      'INSERT INTO accounts (id, name, avatarColor, isDefault) VALUES (?, ?, ?, ?)',
      ['default_account', 'Main Account', 'bg-ios-blue', 1]
    );
    await run(database, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'currentAccountId',
      JSON.stringify('default_account'),
    ]);
  }
};

const serializeTransactions = transactions =>
  transactions.map(t => ({ ...t, tags: t.tags ? JSON.stringify(t.tags) : null }));

const deserializeTransactions = rows =>
  rows.map(row => ({ ...row, tags: row.tags ? JSON.parse(row.tags) : [] }));

const loadAppState = async () => {
  const database = await getDatabase();

  const [accounts, currentAccountId, transactions, settings] = await Promise.all([
    all(database, 'SELECT * FROM accounts'),
    get(database, 'SELECT value FROM settings WHERE key = ?', ['currentAccountId']),
    all(database, 'SELECT * FROM transactions ORDER BY date DESC'),
    get(database, 'SELECT value FROM settings WHERE key = ?', ['appSettings']),
  ]);

  const state = {
    accounts: accounts.map(row => ({ ...row, isDefault: !!row.isDefault })),
    currentAccountId: currentAccountId ? JSON.parse(currentAccountId.value) : undefined,
    transactions: deserializeTransactions(transactions),
    settings: settings ? JSON.parse(settings.value) : undefined,
  };

  logDebug('Loaded app state from SQLite', {
    accounts: state.accounts.length,
    transactions: state.transactions.length,
    hasSettings: !!state.settings,
  });

  return state;
};

const applyChanges = async state => {
  const database = await getDatabase();
  await withTransaction(database, async () => {
    await run(database, 'DELETE FROM accounts');
    for (const acc of state.accounts) {
      await run(database, 'INSERT INTO accounts (id, name, avatarColor, isDefault) VALUES (?, ?, ?, ?)', [
        acc.id,
        acc.name,
        acc.avatarColor,
        acc.isDefault ? 1 : 0,
      ]);
    }

    await run(database, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'currentAccountId',
      JSON.stringify(state.currentAccountId),
    ]);

    await run(database, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'appSettings',
      JSON.stringify(state.settings),
    ]);

    await run(database, 'DELETE FROM transactions');
    for (const t of serializeTransactions(state.transactions)) {
      await run(
        database,
        `INSERT INTO transactions (id, accountId, borrower, amount, date, dueDate, type, note, category, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.accountId,
          t.borrower,
          t.amount,
          t.date,
          t.dueDate,
          t.type,
          t.note,
          t.category,
          t.tags,
        ]
      );
    }
  });

  logDebug('Flushed app state to SQLite', {
    accounts: state.accounts.length,
    transactions: state.transactions.length,
    hasSettings: !!state.settings,
  });
};

const registerIpcHandlers = () => {
  ipcMain.handle('db:getStatus', async () => {
    const database = await getDatabase();
    const userData = ensureUserDataDir();
    const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : undefined;

    const [accounts, transactions, settings] = await Promise.all([
      get(database, 'SELECT COUNT(*) as count FROM accounts'),
      get(database, 'SELECT COUNT(*) as count FROM transactions'),
      get(database, 'SELECT COUNT(*) as count FROM settings'),
    ]);

    const payload = {
      appName: app.getName(),
      processType: process.type,
      userData,
      dbPath,
      dbExists: !!stats,
      dbSize: stats?.size ?? 0,
      counts: {
        accounts: accounts?.count ?? 0,
        transactions: transactions?.count ?? 0,
        settings: settings?.count ?? 0,
      },
    };

    logDebug('DB status requested', payload);
    return payload;
  });

  ipcMain.handle('db:load', async () => loadAppState());
  ipcMain.handle('db:flush', async (_event, state) => {
    await applyChanges(state);
    return true;
  });
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setMenuBarVisibility(false);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

app.whenReady().then(async () => {
  await getDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
