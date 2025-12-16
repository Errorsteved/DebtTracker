import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db;

const getDatabase = () => {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'debt-tracker.db');
  db = new Database(dbPath);
  initializeDatabase(db);
  seedDefaults(db);
  return db;
};

const initializeDatabase = database => {
  database.exec(`
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
  `);
};

const seedDefaults = database => {
  const accountCount = database.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  if (accountCount === 0) {
    database
      .prepare(
        'INSERT INTO accounts (id, name, avatarColor, isDefault) VALUES (@id, @name, @avatarColor, @isDefault)'
      )
      .run({ id: 'default_account', name: 'Main Account', avatarColor: 'bg-ios-blue', isDefault: 1 });
    database
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)')
      .run({ key: 'currentAccountId', value: JSON.stringify('default_account') });
  }
};

const serializeTransactions = transactions =>
  transactions.map(t => ({ ...t, tags: t.tags ? JSON.stringify(t.tags) : null }));

const deserializeTransactions = rows =>
  rows.map(row => ({ ...row, tags: row.tags ? JSON.parse(row.tags) : [] }));

const registerIpcHandlers = () => {
  ipcMain.on('db:getAccounts', event => {
    const rows = getDatabase().prepare('SELECT * FROM accounts').all();
    event.returnValue = rows.map(row => ({ ...row, isDefault: !!row.isDefault }));
  });

  ipcMain.on('db:saveAccounts', (event, accounts) => {
    const database = getDatabase();
    const deleteStmt = database.prepare('DELETE FROM accounts');
    const insertStmt = database.prepare(
      'INSERT INTO accounts (id, name, avatarColor, isDefault) VALUES (@id, @name, @avatarColor, @isDefault)'
    );

    const transaction = database.transaction(accs => {
      deleteStmt.run();
      accs.forEach(acc => insertStmt.run({ ...acc, isDefault: acc.isDefault ? 1 : 0 }));
    });

    transaction(accounts);
    event.returnValue = true;
  });

  ipcMain.on('db:getCurrentAccountId', event => {
    const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get('currentAccountId');
    event.returnValue = row ? JSON.parse(row.value) : undefined;
  });

  ipcMain.on('db:setCurrentAccountId', (event, id) => {
    getDatabase()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)')
      .run({ key: 'currentAccountId', value: JSON.stringify(id) });
    event.returnValue = true;
  });

  ipcMain.on('db:getTransactions', event => {
    const rows = getDatabase().prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    event.returnValue = deserializeTransactions(rows);
  });

  ipcMain.on('db:saveTransactions', (event, transactions) => {
    const database = getDatabase();
    const deleteStmt = database.prepare('DELETE FROM transactions');
    const insertStmt = database.prepare(
      `INSERT INTO transactions (id, accountId, borrower, amount, date, dueDate, type, note, category, tags)
       VALUES (@id, @accountId, @borrower, @amount, @date, @dueDate, @type, @note, @category, @tags)`
    );

    const transaction = database.transaction(list => {
      deleteStmt.run();
      serializeTransactions(list).forEach(t => insertStmt.run(t));
    });

    transaction(transactions);
    event.returnValue = true;
  });

  ipcMain.on('db:getSettings', event => {
    const row = getDatabase().prepare('SELECT value FROM settings WHERE key = ?').get('appSettings');
    event.returnValue = row ? JSON.parse(row.value) : undefined;
  });

  ipcMain.on('db:saveSettings', (event, settings) => {
    getDatabase()
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)')
      .run({ key: 'appSettings', value: JSON.stringify(settings) });
    event.returnValue = true;
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

app.whenReady().then(() => {
  getDatabase();
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
