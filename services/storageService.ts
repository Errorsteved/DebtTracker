import { Transaction, AppSettings, Account } from '../types';

type DatabaseApi = {
  getAccounts: () => Account[];
  saveAccounts: (accounts: Account[]) => boolean;
  getCurrentAccountId: () => string | undefined;
  setCurrentAccountId: (id: string) => boolean;
  getTransactions: () => Transaction[];
  saveTransactions: (transactions: Transaction[]) => boolean;
  getSettings: () => AppSettings | undefined;
  saveSettings: (settings: AppSettings) => boolean;
};

declare global {
  interface Window {
    dbApi: DatabaseApi;
  }
}

const DEFAULT_CATEGORIES = ['Personal', 'Business', 'Rent', 'Dining', 'Groceries', 'Travel', 'Utilities', 'Emergency'];
const AVATAR_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-800'];

const getDbApi = (): DatabaseApi => {
  if (typeof window === 'undefined' || !window.dbApi) {
    throw new Error('Database API is not available. Ensure the app is running inside Electron.');
  }
  return window.dbApi;
};

// --- ID Generator ---
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// --- Account Management ---

export const getAccounts = (): Account[] => {
  const accounts = getDbApi().getAccounts();
  if (accounts.length > 0) return accounts;

  const defaultAccount: Account = {
    id: 'default_account',
    name: 'Main Account',
    avatarColor: 'bg-ios-blue',
    isDefault: true,
  };
  saveAccounts([defaultAccount]);
  return [defaultAccount];
};

export const saveAccounts = (accounts: Account[]) => {
  getDbApi().saveAccounts(accounts);
};

export const getCurrentAccountId = (): string => {
  const stored = getDbApi().getCurrentAccountId();
  if (stored) return stored;
  const accounts = getAccounts();
  return accounts[0].id;
};

export const setCurrentAccountId = (id: string) => {
  getDbApi().setCurrentAccountId(id);
};

// --- Transactions Management ---

export const getStoredTransactions = (): Transaction[] => {
  const stored = getDbApi().getTransactions();
  if (stored && stored.length > 0) {
    let transactions: Transaction[] = stored;
    const accounts = getAccounts();
    const defaultAccountId = accounts[0].id;
    let needsSave = false;

    transactions = transactions.map(t => {
      let modified = false;
      const newT = { ...t };

      if (!newT.accountId) {
        newT.accountId = defaultAccountId;
        modified = true;
      }

      if (!newT.id) {
        newT.id = generateId();
        modified = true;
      }

      if (modified) needsSave = true;
      return newT;
    });

    if (needsSave) {
      saveTransactions(transactions);
    }

    return transactions;
  }
  const data = generateMockData();
  saveTransactions(data);
  return data;
};

export const saveTransactions = (transactions: Transaction[]) => {
  getDbApi().saveTransactions(transactions);
};

// --- Settings Management ---

export const getStoredSettings = (): AppSettings => {
  const stored = getDbApi().getSettings();
  if (stored) {
    const parsed = { ...stored };
    if (!parsed.categories) {
      parsed.categories = DEFAULT_CATEGORIES;
    }
    return parsed;
  }
  const defaults = { currency: '¥', dateFormat: 'YYYY-MM-DD', language: 'zh', categories: DEFAULT_CATEGORIES };
  saveSettings(defaults);
  return defaults;
};

export const saveSettings = (settings: AppSettings) => {
  getDbApi().saveSettings(settings);
};

const generateMockData = (): Transaction[] => {
  const accounts = getAccounts();
  const mainAccountId = accounts[0].id;
  const today = new Date();
  const data: Transaction[] = [];
  const borrowers = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace'];
  const categories = DEFAULT_CATEGORIES;
  const tagsList = ['Urgent', 'Friend', 'Family', 'Work', 'Long-term', 'Cash'];

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 45);
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);

    const isLend = Math.random() > 0.4;
    const amount = Math.floor(Math.random() * 1000) + 50;

    let dueDate: string | undefined = undefined;
    if (isLend) {
      const dueDays = Math.floor(Math.random() * 60) - 10;
      const d = new Date(date);
      d.setDate(d.getDate() + dueDays);
      dueDate = d.toISOString();
    }

    const randomTags = [] as string[];
    if (Math.random() > 0.5) randomTags.push(tagsList[Math.floor(Math.random() * tagsList.length)]);

    data.push({
      id: generateId(),
      accountId: mainAccountId,
      borrower: borrowers[Math.floor(Math.random() * borrowers.length)],
      amount: amount,
      date: date.toISOString(),
      dueDate: dueDate,
      type: isLend ? 'LEND' : 'REPAYMENT',
      note: isLend ? 'Lent money' : 'Repayment received',
      category: categories[Math.floor(Math.random() * categories.length)],
      tags: randomTags,
    });
  }

  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
