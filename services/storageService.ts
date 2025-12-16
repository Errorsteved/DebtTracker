import { Transaction, AppSettings, Account } from '../types';

type DatabaseApi = {
  load: () => Promise<{
    accounts: Account[];
    currentAccountId?: string;
    transactions: Transaction[];
    settings?: AppSettings;
  }>;
  flush: (state: {
    accounts: Account[];
    currentAccountId: string;
    transactions: Transaction[];
    settings: AppSettings;
  }) => Promise<boolean>;
  getStatus: () => Promise<{ userData: string; dbPath: string; dbExists: boolean; dbSize: number; counts: Record<string, number> }>;
};

declare global {
  interface Window {
    dbApi: DatabaseApi;
  }
}

export const DEFAULT_CATEGORIES = ['Personal', 'Business', 'Rent', 'Dining', 'Groceries', 'Travel', 'Utilities', 'Emergency'];
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

// --- App state helpers ---

export type AppState = {
  accounts: Account[];
  currentAccountId: string;
  transactions: Transaction[];
  settings: AppSettings;
};

export const buildDefaultState = (): AppState => {
  const defaultAccount: Account = {
    id: 'default_account',
    name: 'Main Account',
    avatarColor: 'bg-ios-blue',
    isDefault: true,
  };

  const settings: AppSettings = {
    currency: '¥',
    dateFormat: 'YYYY-MM-DD',
    language: 'zh',
    categories: DEFAULT_CATEGORIES,
  };

  return {
    accounts: [defaultAccount],
    currentAccountId: defaultAccount.id,
    transactions: [],
    settings,
  };
};

export const loadAppState = async (): Promise<AppState> => {
  try {
    const state = await getDbApi().load();

    const normalized: AppState = {
      accounts: state.accounts && state.accounts.length > 0 ? state.accounts : buildDefaultState().accounts,
      currentAccountId: state.currentAccountId || state.accounts?.[0]?.id || buildDefaultState().currentAccountId,
      transactions: state.transactions || [],
      settings: state.settings
        ? { ...state.settings, categories: state.settings.categories ?? DEFAULT_CATEGORIES }
        : buildDefaultState().settings,
    };

    if (normalized.accounts.length === 0) {
      const defaults = buildDefaultState();
      await getDbApi().flush(defaults);
      return defaults;
    }

    // Ensure current account is valid
    if (!normalized.accounts.find(a => a.id === normalized.currentAccountId)) {
      normalized.currentAccountId = normalized.accounts[0].id;
    }

    return normalized;
  } catch (error) {
    console.error('Failed to load app state from SQLite, falling back to defaults', error);
    const defaults = buildDefaultState();
    await getDbApi().flush(defaults);
    return defaults;
  }
};

export const persistAppState = async (state: AppState) => {
  await getDbApi().flush(state);
};

export const getDatabaseStatus = async () => {
  return getDbApi().getStatus();
};

const generateMockData = async (): Promise<Transaction[]> => {
  const accounts = await getAccounts();
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
