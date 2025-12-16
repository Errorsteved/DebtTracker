
import { Transaction, AppSettings, Account } from '../types';

const STORAGE_KEY = 'debt_tracker_data_v2';
const SETTINGS_KEY = 'debt_tracker_settings_v1';
const ACCOUNTS_KEY = 'debt_tracker_accounts_v1';
const CURRENT_ACCOUNT_KEY = 'debt_tracker_current_account_id';

const DEFAULT_CATEGORIES = ['Personal', 'Business', 'Rent', 'Dining', 'Groceries', 'Travel', 'Utilities', 'Emergency'];
const AVATAR_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-800'];

// --- ID Generator ---
export const generateId = (): string => {
  // Prefer crypto.randomUUID for better uniqueness
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// --- Account Management ---

export const getAccounts = (): Account[] => {
  const stored = localStorage.getItem(ACCOUNTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Initialize default account if none exists
  const defaultAccount: Account = {
    id: 'default_account',
    name: 'Main Account',
    avatarColor: 'bg-ios-blue',
    isDefault: true
  };
  saveAccounts([defaultAccount]);
  return [defaultAccount];
};

export const saveAccounts = (accounts: Account[]) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getCurrentAccountId = (): string => {
  const stored = localStorage.getItem(CURRENT_ACCOUNT_KEY);
  if (stored) return stored;
  
  const accounts = getAccounts();
  return accounts[0].id;
};

export const setCurrentAccountId = (id: string) => {
  localStorage.setItem(CURRENT_ACCOUNT_KEY, id);
};

// --- Transactions Management ---

export const getStoredTransactions = (): Transaction[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    let transactions: Transaction[] = JSON.parse(stored);
    
    // MIGRATION: Ensure accountId and ID exist
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
  return generateMockData();
};

export const saveTransactions = (transactions: Transaction[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
};

// --- Settings Management ---

export const getStoredSettings = (): AppSettings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed.categories) {
        parsed.categories = DEFAULT_CATEGORIES;
    }
    return parsed;
  }
  return { currency: '¥', dateFormat: 'YYYY-MM-DD', language: 'zh', categories: DEFAULT_CATEGORIES };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

    const randomTags = [];
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
      tags: randomTags
    });
  }
  
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
