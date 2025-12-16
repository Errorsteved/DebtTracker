
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  Settings, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  CalendarIcon, 
  Filter,
  CreditCard, 
  User, 
  MoreHorizontal, 
  BarChart3, 
  Tag, 
  Clock 
} from './components/Icons';
import { TrendChart, DistributionChart } from './components/DashboardCharts';
import { CalendarWidget } from './components/CalendarWidget';
import { TransactionModal } from './components/TransactionModal';
import { DayDetailModal } from './components/DayDetailModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CustomDatePicker } from './components/CustomDatePicker';
import { BorrowersView, TransactionsView, SettingsView, ReportsView, TagsView } from './components/Views';
import { AccountSwitcher } from './components/AccountSwitcher';
import {
  loadAppState,
  persistAppState,
  generateId,
  getDatabaseStatus
} from './services/storageService';
import { Transaction, TransactionType, AppSettings, Language, Account } from './types';
import { translate } from './utils/i18n';
import * as XLSX from 'xlsx';

// Utility for currency formatting (Dynamic)
const formatCurrency = (amount: number, symbol: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount).replace('$', symbol);
};

// --- Components (Inline) ---

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 mb-1 rounded-xl transition-all duration-200 ${active ? 'bg-ios-blue text-white shadow-lg shadow-ios-blue/30 scale-[1.02]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
  >
    <Icon size={20} strokeWidth={2.5} className={active ? '' : 'text-gray-400'} />
    <span className={`ml-3 font-medium text-sm ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
  </button>
);

const StatCard = ({ label, amount, type, subtext, onClick }: { label: string, amount: string, type: 'neutral' | 'positive' | 'negative' | 'info', subtext?: string, onClick?: () => void }) => {
  const colorClass = {
    neutral: 'text-gray-900',
    positive: 'text-ios-green',
    negative: 'text-ios-red',
    info: 'text-ios-blue',
  }[type];

  const bgIconClass = {
    neutral: 'bg-gray-100 text-gray-500',
    positive: 'bg-green-100 text-ios-green',
    negative: 'bg-red-100 text-ios-red',
    info: 'bg-blue-100 text-ios-blue',
  }[type];

  return (
    <div 
        onClick={onClick}
        className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-ios-blue/30 active:scale-[0.98]' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
         <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</span>
            <span className={`text-2xl font-bold ${colorClass}`}>{amount}</span>
         </div>
         <div className={`p-2 rounded-full ${bgIconClass} opacity-80 group-hover:scale-110 transition-transform`}>
             {type === 'negative' ? <ArrowUpRight size={18} /> : 
              type === 'positive' ? <ArrowDownLeft size={18} /> :
              type === 'info' ? <Wallet size={18} /> : <PieChart size={18} />}
         </div>
      </div>
      {subtext && <div className="text-xs text-gray-400 font-medium">{subtext}</div>}
    </div>
  );
};

const TransactionItem: React.FC<{ t: Transaction, currencySymbol: string, translate: (key: string) => string, onEdit?: (t: Transaction) => void }> = ({ t, currencySymbol, translate, onEdit }) => {
    const isRepayment = t.type === 'REPAYMENT';
    // Helper helpers
    const getLocalizedCategory = (raw: string) => {
        const key = `cat${raw}`;
        const val = translate(key);
        return val !== key ? val : raw;
    }
    
    // Status Logic
    const isOverdue = t.type === 'LEND' && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
    
    return (
        <div 
            onClick={() => onEdit && onEdit(t)}
            className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group cursor-pointer"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRepayment ? 'bg-green-100 text-ios-green' : 'bg-red-100 text-ios-red'}`}>
                    {isRepayment ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-sm font-bold text-gray-900 truncate pr-2">{t.borrower}</h4>
                        <span className={`block text-sm font-bold shrink-0 ${isRepayment ? 'text-ios-green' : 'text-gray-900'}`}>
                            {isRepayment ? '+' : '-'}{formatCurrency(t.amount, currencySymbol)}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{new Date(t.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-medium text-gray-700">{getLocalizedCategory(t.category)}</span>
                        {t.type === 'LEND' && t.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                {isOverdue && <Clock size={10} />}
                                {isOverdue ? translate('overdue') : `${translate('dueDate')}: ${new Date(t.dueDate).toLocaleDateString()}`}
                            </span>
                        )}
                    </div>

                    {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {t.tags.map(tag => (
                                <span key={tag} className="inline-flex px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- View State Types ---
type ViewState = 'DASHBOARD' | 'BORROWERS' | 'TRANSACTIONS' | 'REPORTS' | 'SETTINGS' | 'TAGS';

// --- Main App Component ---

const App: React.FC = () => {
  // Accounts State - Initialize synchronously
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountIdState] = useState<string>('');

  // Data State
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ currency: '¥', dateFormat: 'YYYY-MM-DD', language: 'en', categories: [] });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  // Keeps the state variable to avoid breaking Views, but UI control is removed
  const [searchQuery, setSearchQuery] = useState('');
  
  // Day Detail Modal State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Safe Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
      isOpen: boolean;
      type: 'TRANSACTION' | 'BORROWER' | 'ALL' | 'ACCOUNT' | 'CATEGORY';
      targetId?: string;
      targetName?: string;
      validationString?: string;
  }>({ isOpen: false, type: 'TRANSACTION' });
  
  // New State for Transaction pre-fill (Edit or New)
  const [prefillData, setPrefillData] = useState<Partial<Transaction> | undefined>(undefined);
  
  // Navigation State for Transaction Filters
  const [txFilter, setTxFilter] = useState<'ALL' | TransactionType>('ALL');

  // Dashboard Filters
  const [dashboardFilter, setDashboardFilter] = useState<'ALL' | 'LEND' | 'REPAYMENT'>('ALL');
  const [dashboardDateFilter, setDashboardDateFilter] = useState<string>('');
  const [showDashboardDatePicker, setShowDashboardDatePicker] = useState(false);

  // Persistence guards
  const hasHydrated = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const lastPersistedRef = useRef<string | undefined>(undefined);
  const isDirtyRef = useRef(false);
  const latestStateRef = useRef<{
    accounts: Account[];
    currentAccountId: string;
    transactions: Transaction[];
    settings: AppSettings;
  }>();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const status = await getDatabaseStatus();
        console.info('[DB] SQLite status', status);
      } catch (error) {
        console.warn('[DB] Unable to read SQLite status', error);
      }

      const state = await loadAppState();

      // Self-heal legacy records missing IDs
      let transactions = state.transactions;
      let modified = false;
      transactions = transactions.map(t => {
        if (!t.id) {
          modified = true;
          return { ...t, id: generateId() };
        }
        return t;
      });

      const normalizedState = {
        accounts: state.accounts,
        currentAccountId: state.currentAccountId,
        transactions,
        settings: state.settings,
      };

      if (modified) {
        await persistAppState(normalizedState);
      }

      setAccounts(normalizedState.accounts);
      setCurrentAccountIdState(normalizedState.currentAccountId);
      setAllTransactions(normalizedState.transactions);
      setSettings(normalizedState.settings);

      lastPersistedRef.current = JSON.stringify(normalizedState);
      latestStateRef.current = normalizedState;
      hasHydrated.current = true;
      setHydrated(true);
    };

    loadData();
  }, []);

  // Track changes and mark dirty when app state mutates
  useEffect(() => {
    if (!hydrated) return;

    const snapshot = {
      accounts,
      currentAccountId,
      transactions: allTransactions,
      settings,
    };

    latestStateRef.current = snapshot;
    const serialized = JSON.stringify(snapshot);
    if (serialized !== lastPersistedRef.current) {
      isDirtyRef.current = true;
    }
  }, [accounts, currentAccountId, allTransactions, settings, hydrated]);

  // Flush immediately after state changes (debounced by isDirtyRef)
  useEffect(() => {
    if (!hydrated || !isDirtyRef.current) return;
    void flushState();
  }, [accounts, currentAccountId, allTransactions, settings, hydrated]);

  const flushState = async (force = false) => {
    if (!hasHydrated.current) return;
    const snapshot =
      latestStateRef.current || {
        accounts,
        currentAccountId,
        transactions: allTransactions,
        settings,
      };
    const serialized = JSON.stringify(snapshot);
    if (!force && (!isDirtyRef.current || serialized === lastPersistedRef.current)) return;

    try {
      await persistAppState(snapshot);
      lastPersistedRef.current = serialized;
      isDirtyRef.current = false;
    } catch (error) {
      console.error('[DB] Failed to flush app state', error);
    }
  };

  // Automatic persistence every 5 seconds, only when dirty
  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      void flushState();
    }, 5000);

    return () => clearInterval(interval);
  }, [hydrated]);

  // Final flush before window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      void flushState(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Derived State: Active Transactions for Current Account
  const transactions = useMemo(() => {
      return allTransactions.filter(t => t.accountId === currentAccountId);
  }, [allTransactions, currentAccountId]);

  const currentAccount = useMemo(() => {
      return accounts.find(a => a.id === currentAccountId) || accounts[0] || { id: 'init', name: 'Loading', avatarColor: 'bg-gray-400' };
  }, [accounts, currentAccountId]);


  // --- Account Management Handlers ---

  const handleSwitchAccount = (id: string) => {
      setCurrentAccountIdState(id);
      // Optional: Reset view to dashboard on switch?
      setCurrentView('DASHBOARD');
  };

  const handleCreateAccount = async (name: string, color: string) => {
      const newAccount: Account = {
          id: generateId(),
          name,
          avatarColor: color
      };
      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      handleSwitchAccount(newAccount.id);
  };

  const handleUpdateAccount = async (updatedAccount: Account) => {
      const updatedAccounts = accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a);
      setAccounts(updatedAccounts);
  };

  const requestDeleteAccount = (accountId: string) => {
      // Prevent deleting the last account
      if (accounts.length <= 1) {
          alert("Cannot delete the only account.");
          return;
      }

      const validationPhrase = settings.language === 'en' ? 'delete account' : '删除账本';
      setDeleteModalState({
          isOpen: true,
          type: 'ACCOUNT',
          targetId: accountId,
          validationString: validationPhrase
      });
  };

  // --- Data Handlers ---

  const handleUpdateSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
  };

  // Translation Helper
  const t = (key: string, params?: any) => translate(settings.language, key as any, params);

  // Derive Unique Borrowers from Transactions
  const existingBorrowers = useMemo(() => {
      return Array.from(new Set(transactions.map(t => t.borrower))).sort();
  }, [transactions]);

  // Derive Unique Tags
  const existingTags = useMemo(() => {
      const allTags = new Set<string>();
      transactions.forEach(t => t.tags?.forEach(tag => allTags.add(tag)));
      return Array.from(allTags).sort();
  }, [transactions]);

  // Calculate Stats
  const stats = useMemo(() => {
    const totalLent = transactions.filter(t => t.type === 'LEND').reduce((acc, t) => acc + t.amount, 0);
    const totalRepaid = transactions.filter(t => t.type === 'REPAYMENT').reduce((acc, t) => acc + t.amount, 0);
    const outstanding = totalLent - totalRepaid;
    return { totalLent, totalRepaid, outstanding };
  }, [transactions]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    // 1. Daily Balance Trend
    const dailyMap = new Map<string, number>();
    let runningBalance = 0;
    // Sort ascending for calculation
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const locale = settings.language === 'en' ? 'en-US' : 'zh-CN';
    
    sorted.forEach(t => {
       if (t.type === 'LEND') runningBalance += t.amount;
       else runningBalance -= t.amount;
       const dateStr = new Date(t.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
       dailyMap.set(dateStr, runningBalance);
    });

    const trendData = Array.from(dailyMap).map(([name, balance]) => ({ name, balance, lent: 0, repaid: 0 }));

    // 2. Borrower Distribution (Who owes the most?)
    const borrowerMap = new Map<string, number>();
    transactions.filter(t => t.type === 'LEND').forEach(t => {
        borrowerMap.set(t.borrower, (borrowerMap.get(t.borrower) || 0) + t.amount);
    });
    // Subtract repayments
    transactions.filter(t => t.type === 'REPAYMENT').forEach(t => {
         const current = borrowerMap.get(t.borrower) || 0;
         borrowerMap.set(t.borrower, Math.max(0, current - t.amount));
    });
    
    const distributionData = Array.from(borrowerMap)
        .map(([name, value]) => ({ name, value }))
        .filter(i => i.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5

    return { trendData, distributionData };
  }, [transactions, settings.language]);

  // Dashboard List Filtering
  const dashboardTransactions = useMemo(() => {
    return transactions.filter(t => {
        const matchesType = dashboardFilter === 'ALL' ? true : t.type === dashboardFilter;
        const matchesDate = dashboardDateFilter === '' ? true : t.date.startsWith(dashboardDateFilter);
        return matchesType && matchesDate;
    }).slice(0, 10);
  }, [transactions, dashboardFilter, dashboardDateFilter]);

  const handleSaveTransaction = async (data: any) => {
    let updatedAllTransactions;

    // Check if it's an edit (ID exists)
    if (prefillData && prefillData.id) {
        // Edit existing: Find in master list
        const id = prefillData.id;
        updatedAllTransactions = allTransactions.map(t =>
            t.id === id ? { ...data, id, accountId: t.accountId } : t
        );
    } else {
        // Create new: Add with current account ID
        // Ignore any ID coming from the form payload so new transactions always get a fresh generated ID
        const { id: _ignoredId, ...txData } = data;
        const newTx: Transaction = {
            id: generateId(),
            accountId: currentAccountId,
            ...txData
        };
        updatedAllTransactions = [newTx, ...allTransactions];
    }

    setAllTransactions(updatedAllTransactions);
    setPrefillData(undefined); // Reset prefill
  };

  const handleImportTransactions = async (importData: {transactions: Transaction[], accounts?: Account[]}) => {
      // 1. Handle New Accounts
      let updatedAccounts = [...accounts];
      if (importData.accounts) {
          const existingIds = new Set(accounts.map(a => a.id));
          importData.accounts.forEach(acc => {
              if (!existingIds.has(acc.id)) {
                  updatedAccounts.push(acc);
              }
          });
          setAccounts(updatedAccounts);
      }

      // 2. Handle Transactions
      const currentMap = new Map(allTransactions.map(t => [t.id, t]));
      
      importData.transactions.forEach(tx => {
          // If transaction has no accountId (from old export?), assign to current
          const finalTx = { 
              ...tx, 
              accountId: tx.accountId || currentAccountId 
          };
          
          if (!finalTx.id) {
              finalTx.id = generateId();
          }

          currentMap.set(finalTx.id, finalTx);
      });

      const mergedTransactions = Array.from(currentMap.values());
      setAllTransactions(mergedTransactions);
  };

  const handleEditTransaction = (tx: Transaction) => {
      setPrefillData(tx);
      setIsModalOpen(true);
  };

  // --- Deletion Handlers (Trigger Modal) ---

  const requestDeleteTransaction = (id: string) => {
      setDeleteModalState({ isOpen: true, type: 'TRANSACTION', targetId: id });
  };

  const requestDeleteBorrower = (name: string) => {
      setDeleteModalState({ isOpen: true, type: 'BORROWER', targetName: name });
  };

  const requestDeleteCategory = (name: string) => {
      setDeleteModalState({ isOpen: true, type: 'CATEGORY', targetName: name });
  };

  const requestClearData = () => {
      const validationPhrase = settings.language === 'en' ? 'clear date' : '清空所有数据';
      setDeleteModalState({ 
        isOpen: true, 
        type: 'ALL',
        validationString: validationPhrase
      });
  };

  const performDelete = async () => {
      const { type, targetId, targetName } = deleteModalState;
      let updated: Transaction[] = [];

      if (type === 'TRANSACTION' && targetId) {
          updated = allTransactions.filter(t => t.id !== targetId);
          setAllTransactions(updated);
      } else if (type === 'BORROWER' && targetName) {
          // Only delete borrower for CURRENT account
          updated = allTransactions.filter(t => !(t.borrower === targetName && t.accountId === currentAccountId));
          setAllTransactions(updated);
      } else if (type === 'CATEGORY' && targetName) {
          // Delete category logic
          const newCategories = settings.categories.filter(c => c !== targetName);
          handleUpdateSettings({ ...settings, categories: newCategories });
          // Note: We are NOT deleting transactions with this category, they will just appear as text or custom category
      } else if (type === 'ALL') {
          // Clear only CURRENT account data
          updated = allTransactions.filter(t => t.accountId !== currentAccountId);
          setAllTransactions(updated);
      } else if (type === 'ACCOUNT' && targetId) {
          // Delete Account Logic
          const updatedAccounts = accounts.filter(a => a.id !== targetId);
          setAccounts(updatedAccounts);

          // Delete associated transactions from ALL transactions
          updated = allTransactions.filter(t => t.accountId !== targetId);
          setAllTransactions(updated);

          // If we deleted the current account, switch to the first available one
          if (currentAccountId === targetId) {
              handleSwitchAccount(updatedAccounts[0].id);
          }
      }

      setDeleteModalState({ isOpen: false, type: 'TRANSACTION' });
  };

  const ensureTransactionIds = () => {
      let modified = false;
      const updated = allTransactions.map(t => {
          if (!t.id) {
              modified = true;
              return { ...t, id: generateId() };
          }
          return t;
      });

      if (modified) {
          setAllTransactions(updated);
      }

      return modified ? updated : allTransactions;
  };

  const handleExportData = (format: 'xlsx' | 'csv') => {
      const transactionsWithIds = ensureTransactionIds();

      if (format === 'xlsx') {
          // Excel Export
          const wb = XLSX.utils.book_new();
          const isZh = settings.language === 'zh';
          const usedSheetNames = new Set<string>();

          // Headers Keys - Defined once
          const kDate = isZh ? '日期' : 'Date';
          const kBorrower = isZh ? '对象' : 'Borrower';
          const kCategory = isZh ? '分类' : 'Category';
          const kTags = isZh ? '标签' : 'Tags';
          const kStatus = isZh ? '状态' : 'Status';
          const kAmount = isZh ? '金额' : 'Amount';
          const kNote = isZh ? '备注' : 'Note';
          const kDueDate = isZh ? '到期日' : 'DueDate';

          const headers = ['ID', kDate, kBorrower, kCategory, kTags, kStatus, kAmount, kNote, kDueDate];

          accounts.forEach(account => {
              const accountTxs = transactionsWithIds.filter(t => t.accountId === account.id);
              if (accountTxs.length === 0) return; // Optional: can export empty sheet if preferred

              const rows = accountTxs.map(t => {
                  const row: any = {};
                  
                  // ID Column (Guaranteed by useEffect self-healing)
                  row['ID'] = t.id;

                  row[kDate] = t.date.split('T')[0];
                  row[kBorrower] = t.borrower;
                  row[kCategory] = t.category;
                  row[kTags] = t.tags ? t.tags.join(', ') : '';
                  
                  // Localize Status Value
                  if (isZh) {
                      row[kStatus] = t.type === 'LEND' ? '借出' : '还款';
                  } else {
                      row[kStatus] = t.type;
                  }
                  
                  row[kAmount] = t.amount;
                  row[kNote] = t.note || '';
                  row[kDueDate] = t.dueDate ? t.dueDate.split('T')[0] : '';
                  
                  return row;
              });
              
              const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
              
              // Ensure unique sheet name
              let sheetName = account.name.substring(0, 31); // Excel limit 31 chars
              if (usedSheetNames.has(sheetName)) {
                  let counter = 1;
                  while (usedSheetNames.has(`${sheetName.substring(0, 28)}(${counter})`)) {
                      counter++;
                  }
                  sheetName = `${sheetName.substring(0, 28)}(${counter})`;
              }
              usedSheetNames.add(sheetName);

              XLSX.utils.book_append_sheet(wb, ws, sheetName);
          });
          
          XLSX.writeFile(wb, "debt_tracker_backup.xlsx");

      } else {
          // CSV Export Logic (Legacy - Single Sheet All Data)
          const accountMap = new Map(accounts.map(a => [a.id, a.name]));

          const headers = ["ID", "Account", "Date", "Type", "Borrower", "Amount", "Category", "Note", "DueDate", "Tags"];
          
          const rows = transactionsWithIds.map(t => [
              t.id, 
              `"${accountMap.get(t.accountId) || 'Unknown'}"`,
              t.date, 
              t.type, 
              `"${t.borrower}"`, 
              t.amount, 
              t.category, 
              `"${t.note || ''}"`,
              t.dueDate || "",
              `"${t.tags?.join(',') || ""}"`
          ]);
          
          const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
          const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
          const fileName = "debt_tracker_export_all.csv";

          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", fileName);
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
      }
  }

  const handleSettleUp = (borrower: string) => {
    setPrefillData({ borrower, type: 'REPAYMENT' });
    setIsModalOpen(true);
  }

  const handleCalendarDateClick = (date: Date) => {
      setSelectedDate(date);
      setIsDayDetailOpen(true);
  };

  const navigateToTransactions = (filter: 'ALL' | TransactionType) => {
      setTxFilter(filter);
      setCurrentView('TRANSACTIONS');
  }

  // Dashboard Button Handlers
  const cycleDashboardFilter = () => {
      if (dashboardFilter === 'ALL') setDashboardFilter('LEND');
      else if (dashboardFilter === 'LEND') setDashboardFilter('REPAYMENT');
      else setDashboardFilter('ALL');
  };

  // Current Date Logic
  const currentDateDisplay = useMemo(() => {
      if (settings.language === 'zh') {
          return new Date().toLocaleDateString('zh-CN', { 
            timeZone: 'Asia/Shanghai', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
          });
      } else {
          // English format
          return new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
          });
      }
  }, [settings.language]);

  return (
    <div className="flex h-screen bg-ios-bg font-sans overflow-hidden text-slate-800">
      
      {/* Sidebar - Added z-50 to ensure it sits above content if needed, though relative stacking usually handles it */}
      <div className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200 h-full p-4 pt-8 relative z-50">
        
        {/* New Account Switcher Header */}
        <AccountSwitcher 
            accounts={accounts}
            currentAccount={currentAccount}
            onSwitch={handleSwitchAccount}
            onCreate={handleCreateAccount}
            onUpdate={handleUpdateAccount}
            onDelete={requestDeleteAccount}
            language={settings.language}
        />

        <nav className="flex-1 space-y-2">
            <SidebarItem 
                icon={LayoutDashboard} 
                label={t('dashboard')} 
                active={currentView === 'DASHBOARD'} 
                onClick={() => setCurrentView('DASHBOARD')}
            />
            <SidebarItem 
                icon={User} 
                label={t('borrowers')} 
                active={currentView === 'BORROWERS'} 
                onClick={() => setCurrentView('BORROWERS')}
            />
             <SidebarItem 
                icon={CreditCard} 
                label={t('transactions')} 
                active={currentView === 'TRANSACTIONS'} 
                onClick={() => {
                    setTxFilter('ALL');
                    setCurrentView('TRANSACTIONS');
                }}
            />
            <SidebarItem 
                icon={Tag} 
                label={t('tagsView')} 
                active={currentView === 'TAGS'} 
                onClick={() => setCurrentView('TAGS')}
            />
            <SidebarItem 
                icon={BarChart3} 
                label={t('reports')} 
                active={currentView === 'REPORTS'} 
                onClick={() => setCurrentView('REPORTS')}
            />
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-100">
             <SidebarItem 
                icon={Settings} 
                label={t('settings')} 
                active={currentView === 'SETTINGS'} 
                onClick={() => setCurrentView('SETTINGS')}
            />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 md:px-10 py-4 bg-white/50 backdrop-blur-md border-b border-slate-200 z-10 sticky top-0">
            <h2 className="text-xl font-bold text-gray-800 capitalize">
                {currentView === 'TAGS' ? t('tagsView') : (t(currentView.toLowerCase() as any) || currentView)}
            </h2>
            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full md:hidden">
                    <LayoutDashboard size={20} />
                </button>
                <div className="text-sm font-semibold text-gray-500">
                    {currentDateDisplay}
                </div>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#F2F2F7]">
            <div className="max-w-7xl mx-auto h-full">
                
                {/* --- DASHBOARD VIEW --- */}
                {currentView === 'DASHBOARD' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Stats Row - Updated to 3 columns, removed Budget Remaining */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard 
                                label={t('totalOutstanding')} 
                                amount={formatCurrency(stats.outstanding, settings.currency)} 
                                type="info" 
                                subtext={t('netAssetValue')}
                                onClick={() => navigateToTransactions('ALL')}
                            />
                            <StatCard 
                                label={t('totalLent')} 
                                amount={formatCurrency(stats.totalLent, settings.currency)} 
                                type="negative" 
                                subtext={t('transactionCount', { count: transactions.filter(t => t.type === 'LEND').length })}
                                onClick={() => navigateToTransactions('LEND')}
                            />
                            <StatCard 
                                label={t('totalRepaid')} 
                                amount={formatCurrency(stats.totalRepaid, settings.currency)} 
                                type="positive" 
                                subtext={t('yearToDate')}
                                onClick={() => navigateToTransactions('REPAYMENT')}
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-96">
                            {/* Main Chart */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                        <div className="w-2 h-6 bg-ios-blue rounded-full"></div>
                                        {t('trendTitle')}
                                    </h3>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <TrendChart data={chartData.trendData} />
                                </div>
                            </div>

                            {/* Donut Chart */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-base font-bold text-gray-800">{t('borrowerSplit')}</h3>
                                    <button 
                                        onClick={() => setCurrentView('BORROWERS')}
                                        className="text-xs font-semibold text-gray-400 hover:text-ios-blue transition-colors"
                                    >
                                        {t('viewAll')}
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <DistributionChart 
                                        data={chartData.distributionData} 
                                        topBorrowerLabel={t('topBorrower')}
                                        noneLabel={t('none')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Calendar & List */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Calendar Widget Area */}
                            <div className="space-y-6 flex flex-col h-full">
                                <CalendarWidget 
                                    transactions={transactions} 
                                    onDateClick={handleCalendarDateClick}
                                    language={settings.language}
                                />
                            </div>

                            {/* Transaction List */}
                            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-800">{t('recentTransactions')}</h3>
                                        {(dashboardFilter !== 'ALL' || dashboardDateFilter) && (
                                            <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md">
                                                Filtered
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={cycleDashboardFilter}
                                            className={`p-2 rounded-lg transition-colors ${dashboardFilter !== 'ALL' ? 'bg-ios-blue text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title={t('filterDate')}
                                        >
                                            <Filter size={18} />
                                        </button>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setShowDashboardDatePicker(!showDashboardDatePicker)}
                                                className={`p-2 rounded-lg transition-colors ${dashboardDateFilter || showDashboardDatePicker ? 'bg-ios-blue text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                                            >
                                                <CalendarIcon size={18} />
                                            </button>
                                            
                                            {/* Custom Date Picker Popup */}
                                            {showDashboardDatePicker && (
                                                <CustomDatePicker 
                                                    value={dashboardDateFilter}
                                                    onChange={(date) => {
                                                        setDashboardDateFilter(date);
                                                        // Picker closes automatically on selection inside component or we can choose behavior
                                                    }}
                                                    onClear={() => setDashboardDateFilter('')}
                                                    onClose={() => setShowDashboardDatePicker(false)}
                                                    language={settings.language}
                                                    className="right-0"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {dashboardTransactions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <Wallet size={48} className="mb-2 opacity-20" />
                                            <p>{t('noTransactions')}</p>
                                        </div>
                                    ) : (
                                        dashboardTransactions.map((tx) => <TransactionItem key={tx.id} t={tx} currencySymbol={settings.currency} translate={t} onEdit={handleEditTransaction} />)
                                    )}
                                </div>
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                    <button 
                                        onClick={() => setCurrentView('TRANSACTIONS')}
                                        className="w-full text-center text-sm font-medium text-gray-500 hover:text-ios-blue transition-colors"
                                    >
                                        {t('viewAll')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- OTHER VIEWS --- */}
                {currentView === 'BORROWERS' && (
                    <BorrowersView 
                        transactions={transactions} 
                        onSettleUp={handleSettleUp} 
                        onDeleteBorrower={requestDeleteBorrower}
                        currencySymbol={settings.currency}
                        t={t}
                        onEdit={handleEditTransaction}
                    />
                )}
                
                {currentView === 'TRANSACTIONS' && (
                    <TransactionsView 
                        transactions={transactions} 
                        onDelete={requestDeleteTransaction} 
                        searchQuery={searchQuery}
                        filterType={txFilter}
                        currencySymbol={settings.currency}
                        t={t}
                        onEdit={handleEditTransaction}
                        onSearchChange={setSearchQuery}
                        onFilterChange={setTxFilter}
                        language={settings.language}
                    />
                )}
                
                {currentView === 'TAGS' && (
                    <TagsView
                        transactions={transactions}
                        currencySymbol={settings.currency}
                        t={t}
                        onEdit={handleEditTransaction}
                    />
                )}
                
                {currentView === 'REPORTS' && (
                    <ReportsView 
                        transactions={transactions}
                        currencySymbol={settings.currency}
                        t={t}
                        language={settings.language}
                        onDateClick={handleCalendarDateClick}
                    />
                )}

                {currentView === 'SETTINGS' && (
                    <SettingsView 
                        onClearData={requestClearData} 
                        onExport={handleExportData} 
                        onImport={handleImportTransactions}
                        settings={settings}
                        onUpdateSettings={handleUpdateSettings}
                        onDeleteCategory={requestDeleteCategory}
                        t={t}
                        accounts={accounts}
                    />
                )}

            </div>
            
            {/* Safe area padding for mobile */}
            <div className="h-20 md:h-0"></div>
        </main>

        {/* Floating Action Button (Mobile/Tablet) */}
        <button 
            onClick={() => {
                setPrefillData(undefined);
                setIsModalOpen(true);
            }}
            className="absolute bottom-8 right-8 md:bottom-10 md:right-10 w-14 h-14 bg-ios-blue text-white rounded-full shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center z-40"
        >
            <Plus size={28} />
        </button>

      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTransaction} 
        initialData={prefillData}
        currencySymbol={settings.currency}
        existingBorrowers={existingBorrowers}
        categories={settings.categories}
        existingTags={existingTags}
        t={t}
        language={settings.language}
      />
      
      <DayDetailModal 
        isOpen={isDayDetailOpen}
        date={selectedDate}
        transactions={transactions}
        onClose={() => setIsDayDetailOpen(false)}
        currencySymbol={settings.currency}
        onAddTransaction={(date) => {
            setIsDayDetailOpen(false);
            setPrefillData({ date: date.toISOString().split('T')[0] });
            setIsModalOpen(true);
        }}
        language={settings.language}
        onEditTransaction={(tx) => {
            setIsDayDetailOpen(false);
            handleEditTransaction(tx);
        }}
      />

      <ConfirmModal 
        isOpen={deleteModalState.isOpen}
        title={
            deleteModalState.type === 'BORROWER' ? t('confirmDeleteBorrowerTitle') : 
            deleteModalState.type === 'ALL' ? t('clearData') :
            deleteModalState.type === 'ACCOUNT' ? t('confirmDeleteTitle') :
            deleteModalState.type === 'CATEGORY' ? t('confirmDeleteTitle') :
            t('confirmDeleteTitle')
        }
        message={
            deleteModalState.type === 'BORROWER' ? t('confirmDeleteBorrowerMessage', {name: deleteModalState.targetName || ''}) :
            deleteModalState.type === 'ALL' ? t('clearDataMessage') :
            deleteModalState.type === 'CATEGORY' ? t('confirmDeleteMessage') :
            deleteModalState.type === 'ACCOUNT' ? t('clearDataMessage') : // Reuse message or specific
            t('confirmDeleteMessage')
        }
        onConfirm={performDelete}
        onCancel={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        validationString={deleteModalState.validationString}
        validationInstruction={deleteModalState.validationString ? t('typeToConfirm', {phrase: deleteModalState.validationString}) : undefined}
      />

    </div>
  );
};
export default App;
