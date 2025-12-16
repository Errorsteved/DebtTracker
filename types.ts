
export type TransactionType = 'LEND' | 'REPAYMENT';

export interface Account {
  id: string;
  name: string;
  avatarColor: string; // Tailwind class e.g., 'bg-blue-500'
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  accountId: string; // Link transaction to a specific account
  borrower: string;
  amount: number;
  date: string; // ISO string
  dueDate?: string; // ISO string, optional, mainly for LEND
  type: TransactionType;
  note: string;
  category: string;
  tags?: string[];
}

export type Language = 'en' | 'zh';

export interface AppSettings {
  currency: string;
  dateFormat: string; // 'YYYY-MM-DD' etc.
  language: Language;
  categories: string[];
}

export interface SummaryStats {
  totalLent: number;
  totalRepaid: number;
  outstanding: number;
  count: number;
}

export interface DailyData {
  name: string; // Date string usually
  lent: number;
  repaid: number;
  balance: number;
}

export interface BorrowerData {
  name: string;
  value: number;
}
