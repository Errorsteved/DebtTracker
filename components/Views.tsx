
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, TransactionType, AppSettings, Language, Account } from '../types';
import { 
  User, 
  Download, 
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  XCircle,
  Check,
  Filter,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  Settings as SettingsIcon,
  FileText,
  LogOut,
  RefreshCw,
  Globe,
  DollarSign,
  Layers
} from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';
import { TrendChart, DistributionChart } from './DashboardCharts';
import * as XLSX from 'xlsx';
import { generateId } from '../services/storageService';

// --- Utility ---
const formatCurrency = (amount: number, symbol: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount).replace('$', symbol);
};

const isOverdue = (t: Transaction) => {
    if (t.type !== 'LEND' || !t.dueDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(t.dueDate) < today;
};

// Helper to translate categories safely
const getLocalizedCategory = (rawCategory: string, t: (key: string) => string) => {
    const key = `cat${rawCategory}`;
    const translated = t(key);
    return translated !== key ? translated : rawCategory;
};

// --- Borrowers View ---
interface BorrowersViewProps {
  transactions: Transaction[];
  onSettleUp: (borrower: string) => void;
  onDeleteBorrower: (borrower: string) => void;
  currencySymbol: string;
  t: (key: string, params?: any) => string;
  onEdit: (tx: Transaction) => void;
}

export const BorrowersView: React.FC<BorrowersViewProps> = ({ transactions, onSettleUp, onDeleteBorrower, currencySymbol, t, onEdit }) => {
  const [selectedBorrower, setSelectedBorrower] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Reset category when borrower changes
  useEffect(() => {
      setSelectedCategory('ALL');
      setShowCategoryDropdown(false);
  }, [selectedBorrower]);

  // Handle outside click for category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const borrowers = useMemo(() => {
    const map = new Map<string, { lent: number; repaid: number; lastActivity: string; hasOverdue: boolean }>();
    
    transactions.forEach(t => {
      const current = map.get(t.borrower) || { lent: 0, repaid: 0, lastActivity: t.date, hasOverdue: false };
      if (t.type === 'LEND') current.lent += t.amount;
      else current.repaid += t.amount;
      
      if (new Date(t.date) > new Date(current.lastActivity)) {
        current.lastActivity = t.date;
      }
      if (isOverdue(t)) {
          current.hasOverdue = true;
      }

      map.set(t.borrower, current);
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      balance: data.lent - data.repaid
    })).sort((a, b) => b.balance - a.balance);
  }, [transactions]);

  const detailData = useMemo(() => {
      if (!selectedBorrower) return null;
      
      // Get all transactions for this borrower
      const borrowerTx = transactions.filter(t => t.borrower === selectedBorrower);
      
      // Filter by category
      const filteredTx = selectedCategory === 'ALL' 
        ? borrowerTx 
        : borrowerTx.filter(t => t.category === selectedCategory);

      // Recalculate stats based on filtered transactions
      const stats = filteredTx.reduce((acc, t) => {
          if (t.type === 'LEND') acc.lent += t.amount;
          else acc.repaid += t.amount;
          return acc;
      }, { lent: 0, repaid: 0 });

      // Get unique categories for this borrower
      const categories = Array.from(new Set(borrowerTx.map(t => t.category))).sort();

      return { 
          name: selectedBorrower,
          stats: {
              ...stats,
              balance: stats.lent - stats.repaid
          },
          transactions: filteredTx,
          categories
      };
  }, [selectedBorrower, transactions, selectedCategory]);

  // --- Detail View Render ---
  if (selectedBorrower && detailData) {
      const { name, stats, transactions: txs, categories } = detailData;
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header / Back */}
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedBorrower(null)}
                        className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                      >
                          <ChevronLeft size={24} />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                  </div>

                  {/* Category Filter Dropdown */}
                  <div className="relative" ref={categoryDropdownRef}>
                      <button 
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedCategory !== 'ALL' ? 'bg-ios-blue text-white border-ios-blue shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                      >
                          <Filter size={16} />
                          <span>{selectedCategory === 'ALL' ? t('category') : getLocalizedCategory(selectedCategory, t)}</span>
                          <ChevronDown size={14} className={selectedCategory !== 'ALL' ? 'text-white/80' : 'text-gray-400'} />
                      </button>

                      {showCategoryDropdown && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                              <div 
                                  onClick={() => {
                                      setSelectedCategory('ALL');
                                      setShowCategoryDropdown(false);
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between group ${selectedCategory === 'ALL' ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                              >
                                  <span>{t('filterAll')}</span>
                                  {selectedCategory === 'ALL' && <Check size={14} />}
                              </div>
                              <div className="h-px bg-gray-100 my-1"></div>
                              {categories.map(cat => (
                                  <div 
                                      key={cat}
                                      onClick={() => {
                                          setSelectedCategory(cat);
                                          setShowCategoryDropdown(false);
                                      }}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between group ${selectedCategory === cat ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                                  >
                                      <span>{getLocalizedCategory(cat, t)}</span>
                                      {selectedCategory === cat && <Check size={14} />}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {selectedCategory !== 'ALL' ? `${getLocalizedCategory(selectedCategory, t)} ${t('totalOutstanding')}` : t('totalOutstanding')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.balance, currencySymbol)}</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('totalLent')}</div>
                      <div className="text-2xl font-bold text-ios-red">{formatCurrency(stats.lent, currencySymbol)}</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('totalRepaid')}</div>
                      <div className="text-2xl font-bold text-ios-green">{formatCurrency(stats.repaid, currencySymbol)}</div>
                  </div>
              </div>

              {/* Transaction List */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">{t('transactions')}</h3>
                      {selectedCategory !== 'ALL' && (
                          <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-ios-blue rounded-md">
                              {getLocalizedCategory(selectedCategory, t)} Filtered
                          </span>
                      )}
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('date')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('borrower')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('category')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('tags')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('amount')}</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {txs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400 text-sm">
                                        {t('noTransactions')}
                                    </td>
                                </tr>
                            ) : (
                                txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                                    const overdue = isOverdue(tx);
                                    return (
                                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                            {new Date(tx.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                            {tx.borrower}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {getLocalizedCategory(tx.category, t)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex flex-wrap gap-1">
                                                {tx.tags?.map(tag => (
                                                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {tx.type === 'LEND' && tx.dueDate ? (
                                                <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                                    {overdue && <Clock size={14} />}
                                                    {overdue ? t('overdue') : new Date(tx.dueDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'LEND' ? 'text-gray-900' : 'text-ios-green'}`}>
                                            {tx.type === 'LEND' ? '-' : '+'}{formatCurrency(tx.amount, currencySymbol)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(tx);
                                                }}
                                                className="text-gray-300 hover:text-ios-blue opacity-0 group-hover:opacity-100 transition-all p-1"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  }

  // --- List View Render ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {borrowers.map((b) => {
            // Debt status logic: Active if balance > 0 (they owe me). Settled if <= 0 (cleared or overpaid).
            const isSettled = b.balance <= 0.01;
            
            return (
              <div 
                key={b.name} 
                onClick={() => setSelectedBorrower(b.name)}
                className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all cursor-pointer active:scale-[0.98] ${b.hasOverdue && b.balance > 0.01 ? 'ring-2 ring-red-100' : ''}`}
              >
                {b.hasOverdue && b.balance > 0.01 && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 rounded-bl-xl font-bold z-10">{t('overdue')}</div>
                )}
                
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBorrower(b.name);
                    }}
                    className="absolute top-4 right-4 px-2 py-1 text-xs font-semibold text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                    {t('delete')}
                </button>

                <div className="flex justify-between items-start mb-4 pr-12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-ios-blue flex items-center justify-center text-xl font-bold shadow-inner">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{b.name}</h3>
                      <p className="text-xs text-gray-400">{new Date(b.lastActivity).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${!isSettled ? 'bg-orange-50 text-orange-600' : 'bg-green-100 text-ios-green'}`}>
                     {!isSettled ? t('active') : t('settled')}
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('totalLent')}</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(b.lent, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('totalRepaid')}</span>
                        <span className="font-semibold text-ios-green">{formatCurrency(b.repaid, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between items-end mt-4 pt-2">
                        <div>
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('totalOutstanding')}</span>
                            <div className={`text-2xl font-bold ${!isSettled ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatCurrency(b.balance, currencySymbol)}
                            </div>
                        </div>
                        {b.balance > 0.01 && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSettleUp(b.name);
                                }}
                                className="bg-ios-blue text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-ios-blue/20 hover:bg-blue-600 active:scale-95 transition-all"
                            >
                                {t('settleUp')}
                            </button>
                        )}
                    </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

// --- Tags View ---
interface TagsViewProps {
  transactions: Transaction[];
  currencySymbol: string;
  t: (key: string, params?: any) => string;
  onEdit: (tx: Transaction) => void;
}

export const TagsView: React.FC<TagsViewProps> = ({ transactions, currencySymbol, t, onEdit }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tagsData = useMemo(() => {
    const map = new Map<string, { lent: number; repaid: number; count: number }>();
    
    transactions.forEach(t => {
      const txTags = (t.tags && t.tags.length > 0) ? t.tags : ['Untagged'];
      
      txTags.forEach(tag => {
          const current = map.get(tag) || { lent: 0, repaid: 0, count: 0 };
          if (t.type === 'LEND') current.lent += t.amount;
          else current.repaid += t.amount;
          current.count += 1;
          map.set(tag, current);
      });
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      balance: data.lent - data.repaid
    })).sort((a, b) => b.balance - a.balance);
  }, [transactions]);

  const detailData = useMemo(() => {
      if (!selectedTag) return null;
      
      const tagTx = transactions.filter(t => {
          if (selectedTag === 'Untagged') return !t.tags || t.tags.length === 0;
          return t.tags?.includes(selectedTag);
      });

      const stats = tagsData.find(d => d.name === selectedTag);
      
      return { 
          name: selectedTag,
          stats,
          transactions: tagTx
      };
  }, [selectedTag, transactions, tagsData]);

  // Detail View
  if (selectedTag && detailData && detailData.stats) {
     const { name, stats, transactions: txs } = detailData;
     const displayTag = name === 'Untagged' ? t('untagged') : name;

     return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Back */}
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedTag(null)}
                  className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <Tag size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{displayTag}</h2>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('totalOutstanding')}</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.balance, currencySymbol)}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('totalLent')}</div>
                    <div className="text-2xl font-bold text-ios-red">{formatCurrency(stats.lent, currencySymbol)}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('totalRepaid')}</div>
                    <div className="text-2xl font-bold text-ios-green">{formatCurrency(stats.repaid, currencySymbol)}</div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t('transactions')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('date')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('borrower')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('category')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('tags')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('amount')}</th>
                              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                              const overdue = isOverdue(tx);
                              return (
                              <tr key={tx.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                      {new Date(tx.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                      {tx.borrower}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                      {getLocalizedCategory(tx.category, t)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                      <div className="flex flex-wrap gap-1">
                                          {tx.tags?.map(tag => (
                                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                  #{tag}
                                              </span>
                                          ))}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                        {tx.type === 'LEND' && tx.dueDate ? (
                                            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                                {overdue && <Clock size={14} />}
                                                {overdue ? t('overdue') : new Date(tx.dueDate).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                  </td>
                                  <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'LEND' ? 'text-gray-900' : 'text-ios-green'}`}>
                                      {tx.type === 'LEND' ? '-' : '+'}{formatCurrency(tx.amount, currencySymbol)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              onEdit(tx);
                                          }}
                                          className="text-gray-300 hover:text-ios-blue opacity-0 group-hover:opacity-100 transition-all p-1"
                                      >
                                          <Edit2 size={16} />
                                      </button>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                    </table>
                </div>
            </div>
        </div>
     )
  }

  // List View
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tagsData.map(tag => (
                <div 
                    key={tag.name}
                    onClick={() => setSelectedTag(tag.name)}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                            <Tag size={24} />
                        </div>
                        <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                           {tag.count} records
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{tag.name === 'Untagged' ? t('untagged') : tag.name}</h3>
                    
                    <div className="mt-auto pt-4 border-t border-gray-50 space-y-1">
                         <div className="flex justify-between text-xs text-gray-500">
                            <span>{t('lent')}</span>
                            <span className="font-medium text-gray-700">{formatCurrency(tag.lent, currencySymbol)}</span>
                         </div>
                         <div className="flex justify-between text-xs text-gray-500">
                            <span>{t('repaid')}</span>
                            <span className="font-medium text-gray-700">{formatCurrency(tag.repaid, currencySymbol)}</span>
                         </div>
                         <div className="pt-2 mt-2 border-t border-dashed border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase">{t('totalOutstanding')}</span>
                            <span className={`font-bold ${tag.balance > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatCurrency(tag.balance, currencySymbol)}
                            </span>
                         </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

// --- TransactionsView ---
interface TransactionsViewProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  searchQuery: string;
  filterType: 'ALL' | TransactionType;
  currencySymbol: string;
  t: (key: string, params?: any) => string;
  onEdit: (tx: Transaction) => void;
  onSearchChange?: (query: string) => void;
  onFilterChange?: (filter: 'ALL' | TransactionType) => void;
  language: Language;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ 
    transactions, 
    onDelete, 
    searchQuery, 
    filterType, 
    currencySymbol, 
    t, 
    onEdit,
    onSearchChange,
    onFilterChange,
    language
}) => {
    // New State for Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [groupBy, setGroupBy] = useState<'DATE' | 'CATEGORY'>('DATE');
    const [filterBorrower, setFilterBorrower] = useState<string>('ALL');
    const [showBorrowerFilter, setShowBorrowerFilter] = useState(false);
    const borrowerFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (borrowerFilterRef.current && !borrowerFilterRef.current.contains(event.target as Node)) {
                setShowBorrowerFilter(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // filtering logic
    const filtered = transactions.filter(tx => {
        const matchesSearch = tx.borrower.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
                              (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'ALL' ? true : tx.type === filterType;
        const matchesBorrower = filterBorrower === 'ALL' ? true : tx.borrower === filterBorrower;
        
        let matchesDate = true;
        if (startDate) {
            matchesDate = matchesDate && new Date(tx.date) >= new Date(startDate);
        }
        if (endDate) {
            matchesDate = matchesDate && new Date(tx.date) <= new Date(endDate);
        }

        return matchesSearch && matchesType && matchesDate && matchesBorrower;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Unique borrowers for dropdown
    const uniqueBorrowers = useMemo(() => Array.from(new Set(transactions.map(t => t.borrower))).sort(), [transactions]);

    // Grouping
    const grouped = useMemo(() => {
        if (groupBy === 'DATE') {
            // Group by month
            return filtered.reduce((acc, tx) => {
                const month = new Date(tx.date).toLocaleDateString('en-CA', {year: 'numeric', month: 'numeric'}); // YYYY-M
                if (!acc[month]) acc[month] = [];
                acc[month].push(tx);
                return acc;
            }, {} as Record<string, Transaction[]>);
        } else {
            // Group by Category
            return filtered.reduce((acc, tx) => {
                const cat = tx.category || 'Uncategorized';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(tx);
                return acc;
            }, {} as Record<string, Transaction[]>);
        }
    }, [filtered, groupBy]);

    // Sorting Keys for display
    const sortedKeys = Object.keys(grouped).sort((a,b) => {
        if (groupBy === 'DATE') return b.localeCompare(a); // Newest month first
        return a.localeCompare(b); // Alphabetical categories
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Controls */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                {/* Top Row: Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Group By Toggle */}
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setGroupBy('DATE')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${groupBy === 'DATE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <CalendarIcon size={14} />
                                {t('date')}
                            </button>
                            <button
                                onClick={() => setGroupBy('CATEGORY')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${groupBy === 'CATEGORY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Layers size={14} />
                                {t('category')}
                            </button>
                        </div>

                        {/* NEW: Borrower Filter */}
                        <div className="relative" ref={borrowerFilterRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBorrowerFilter(!showBorrowerFilter);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 h-full ${filterBorrower !== 'ALL' ? 'bg-ios-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                            >
                                <User size={14} />
                                {filterBorrower === 'ALL' ? t('borrower') : filterBorrower}
                                <ChevronDown size={14} />
                            </button>
                            {showBorrowerFilter && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div 
                                        onClick={() => {
                                            setFilterBorrower('ALL');
                                            setShowBorrowerFilter(false);
                                        }}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between group ${filterBorrower === 'ALL' ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        <span>{t('filterAll')}</span>
                                        {filterBorrower === 'ALL' && <Check size={14} />}
                                    </div>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {uniqueBorrowers.map(b => (
                                            <div 
                                                key={b}
                                                onClick={() => {
                                                    setFilterBorrower(b);
                                                    setShowBorrowerFilter(false);
                                                }}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-between group ${filterBorrower === b ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <span>{b}</span>
                                                {filterBorrower === b && <Check size={14} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transaction Type Toggle */}
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            {(['ALL', 'LEND', 'REPAYMENT'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => onFilterChange?.(type)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filterType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {type === 'ALL' ? t('filterAll') : type === 'LEND' ? t('filterLend') : t('filterRepay')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Date Range Row */}
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100 self-start">
                    <span className="font-medium px-2">{t('filterDate')}:</span>
                    <div className="relative">
                        <button 
                            onClick={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}
                            className={`px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-ios-blue transition-colors flex items-center gap-2 ${startDate ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                            {startDate || t('startDate')}
                            <CalendarIcon size={14} />
                        </button>
                        {showStartPicker && (
                            <CustomDatePicker 
                                value={startDate}
                                onChange={(d) => setStartDate(d)}
                                onClear={() => setStartDate('')}
                                onClose={() => setShowStartPicker(false)}
                                language={language}
                                className="left-0 mt-2"
                            />
                        )}
                    </div>
                    <span>-</span>
                    <div className="relative">
                        <button 
                            onClick={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}
                            className={`px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-ios-blue transition-colors flex items-center gap-2 ${endDate ? 'text-gray-900' : 'text-gray-400'}`}
                        >
                            {endDate || t('endDate')}
                            <CalendarIcon size={14} />
                        </button>
                        {showEndPicker && (
                            <CustomDatePicker 
                                value={endDate}
                                onChange={(d) => setEndDate(d)}
                                onClear={() => setEndDate('')}
                                onClose={() => setShowEndPicker(false)}
                                language={language}
                                className="left-0 mt-2"
                            />
                        )}
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-2 text-xs text-red-500 hover:underline">
                            {t('clearFilter')}
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('noTransactions')}</p>
                </div>
            ) : (
                sortedKeys.map((key) => {
                    const txs = grouped[key];
                    let label = key;
                    
                    if (groupBy === 'DATE') {
                        const dateObj = new Date(txs[0].date);
                        label = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                    } else {
                        label = getLocalizedCategory(key, t);
                    }
                    
                    return (
                        <div key={key} className="space-y-2">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-2">
                                {groupBy === 'CATEGORY' && <Layers size={14} />}
                                {groupBy === 'DATE' && <CalendarIcon size={14} />}
                                {label}
                                <span className="ml-auto text-xs font-normal bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{txs.length}</span>
                            </h3>
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('date')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('borrower')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('category')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('tags')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('amount')}</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {txs.map((tx) => {
                                                const overdue = isOverdue(tx);
                                                return (
                                                    <tr key={tx.id} className="hover:bg-gray-50 group transition-colors">
                                                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                                                            {new Date(tx.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                                            {tx.borrower}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {getLocalizedCategory(tx.category, t)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            <div className="flex flex-wrap gap-1">
                                                                {tx.tags?.map(tag => (
                                                                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">
                                                            {tx.type === 'LEND' && tx.dueDate ? (
                                                                <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                                                    {overdue && <Clock size={14} />}
                                                                    {overdue ? t('overdue') : new Date(tx.dueDate).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'LEND' ? 'text-gray-900' : 'text-ios-green'}`}>
                                                            {tx.type === 'LEND' ? '-' : '+'}{formatCurrency(tx.amount, currencySymbol)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex gap-2 justify-end">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEdit(tx);
                                                                    }}
                                                                    className="text-gray-300 hover:text-ios-blue opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDelete(tx.id);
                                                                    }}
                                                                    className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

// --- SettingsView ---
interface SettingsViewProps {
    onClearData: () => void;
    onExport: (format: 'xlsx' | 'csv') => void;
    onImport: (data: any) => void;
    settings: AppSettings;
    onUpdateSettings: (s: AppSettings) => void;
    t: (key: string, params?: any) => string;
    onDeleteCategory: (category: string) => void;
    accounts: Account[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearData, onExport, onImport, settings, onUpdateSettings, t, onDeleteCategory, accounts }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newCategory, setNewCategory] = useState('');
    
    // New state for custom currency dropdown
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
    const currencyDropdownRef = useRef<HTMLDivElement>(null);

    // Handle outside click for currency dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
                setShowCurrencyDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target?.result;
            
            // Check file type based on extension
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                 const workbook = XLSX.read(data, {type: 'array'});
                 const importedTransactions: Transaction[] = [];
                 const importedAccounts: Account[] = [];

                 workbook.SheetNames.forEach(sheetName => {
                     const worksheet = workbook.Sheets[sheetName];
                     const jsonData = XLSX.utils.sheet_to_json(worksheet);
                     
                     // Account Resolution
                     let targetAccountId: string;
                     const existingAccount = accounts.find(a => a.name === sheetName);
                     
                     if (existingAccount) {
                         targetAccountId = existingAccount.id;
                     } else {
                         // Check if we just created it in this import session
                         const newlyCreated = importedAccounts.find(a => a.name === sheetName);
                         if (newlyCreated) {
                             targetAccountId = newlyCreated.id;
                         } else {
                             const newAccount: Account = {
                                 id: generateId(),
                                 name: sheetName,
                                 avatarColor: 'bg-gray-500' // Default
                             };
                             importedAccounts.push(newAccount);
                             targetAccountId = newAccount.id;
                         }
                     }

                     // Map Excel Rows to Transactions
                     const sheetTransactions = jsonData.map((row: any) => {
                         // Support for English and Chinese localized headers
                         const dateVal = row['Date'] || row['日期'];
                         const borrowerVal = row['Borrower'] || row['对象'] || 'Unknown';
                         const categoryVal = row['Category'] || row['分类'] || 'Personal';
                         const tagsVal = row['Tags'] || row['标签'];
                         const statusVal = row['Status'] || row['状态']; // Can be 'LEND', 'REPAYMENT', '借出', '还款'
                         const amountVal = row['Amount'] || row['金额'];
                         const noteVal = row['Note'] || row['备注'] || '';
                         const dueDateVal = row['DueDate'] || row['到期日'];
                         
                         // Check for existing ID to prevent duplication on re-import
                         const idVal = row['ID'];

                         let type: TransactionType = 'LEND';
                         if (statusVal === 'REPAYMENT' || statusVal === '还款') {
                             type = 'REPAYMENT';
                         } else if (statusVal === 'LEND' || statusVal === '借出') {
                             type = 'LEND';
                         }

                         return {
                             id: idVal ? String(idVal) : generateId(), // Use existing ID if available, else new
                             accountId: targetAccountId,
                             date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
                             borrower: borrowerVal,
                             category: categoryVal,
                             tags: tagsVal ? tagsVal.split(',').map((s: string) => s.trim()) : [],
                             type: type,
                             amount: typeof amountVal === 'number' ? amountVal : parseFloat(amountVal) || 0,
                             note: noteVal,
                             dueDate: dueDateVal ? new Date(dueDateVal).toISOString() : undefined
                         };
                     });
                     
                     importedTransactions.push(...sheetTransactions);
                 });
                 
                 onImport({ transactions: importedTransactions, accounts: importedAccounts });
                 alert(t('importSuccess', {count: importedTransactions.length || 0}));

            } else if (fileName.endsWith('.json')) {
                 // Fallback for JSON
                 try {
                     const json = JSON.parse(data as string);
                     onImport(json);
                     alert(t('importSuccess', {count: json.transactions?.length || 0}));
                 } catch (err) {
                     alert(t('importError'));
                 }
            } else {
                alert(t('importError'));
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;
        if (settings.categories.includes(newCategory.trim())) return;
        
        onUpdateSettings({
            ...settings,
            categories: [...settings.categories, newCategory.trim()]
        });
        setNewCategory('');
    };

    const handleDeleteCategory = (catToDelete: string) => {
        onDeleteCategory(catToDelete);
    };

    const currencies = [
        { symbol: '$', label: 'USD ($)' },
        { symbol: '€', label: 'EUR (€)' },
        { symbol: '£', label: 'GBP (£)' },
        { symbol: '¥', label: 'CNY (¥)' },
        { symbol: '₹', label: 'INR (₹)' },
        { symbol: 'kr', label: 'KRW (kr)' },
    ];

    const currentCurrencyLabel = currencies.find(c => c.symbol === settings.currency)?.label || settings.currency;

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Preferences */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="p-6 border-b border-gray-50 rounded-t-3xl">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-gray-400" />
                        {t('preferences')}
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('language')}</label>
                            <div className="flex p-1 bg-gray-100 rounded-xl">
                                <button 
                                    onClick={() => onUpdateSettings({...settings, language: 'en'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.language === 'en' ? 'bg-white shadow-sm text-ios-blue' : 'text-gray-500'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => onUpdateSettings({...settings, language: 'zh'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.language === 'zh' ? 'bg-white shadow-sm text-ios-blue' : 'text-gray-500'}`}
                                >
                                    中文
                                </button>
                            </div>
                        </div>
                        <div className="relative" ref={currencyDropdownRef}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('currency')}</label>
                            <button 
                                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-ios-blue text-sm flex justify-between items-center text-left"
                            >
                                <span>{currentCurrencyLabel}</span>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>
                            
                            {showCurrencyDropdown && (
                                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                    {currencies.map(c => (
                                        <div 
                                            key={c.symbol}
                                            onClick={() => {
                                                onUpdateSettings({...settings, currency: c.symbol});
                                                setShowCurrencyDropdown(false);
                                            }}
                                            className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between ${settings.currency === c.symbol ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-100'}`}
                                        >
                                            {c.label}
                                            {settings.currency === c.symbol && <Check size={14} />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Management */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Layers size={20} className="text-gray-400" />
                        {t('category')}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Add new category..."
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button 
                            onClick={handleAddCategory}
                            disabled={!newCategory.trim()}
                            className="px-4 py-2 bg-ios-blue text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {settings.categories.map(cat => (
                            <div key={cat} className="group flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                <span>{getLocalizedCategory(cat, t)}</span>
                                <button 
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Data Management */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <ArrowDownLeft size={20} className="text-gray-400" />
                        {t('dataManagement')}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900">{t('exportReset')}</h4>
                            <p className="text-sm text-gray-500">{t('fullBackup')}</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onExport('xlsx')}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-ios-green font-medium rounded-xl shadow-sm hover:bg-green-50 transition-colors text-sm"
                            >
                                <FileText size={16} />
                                Excel
                            </button>
                            <button 
                                onClick={() => onExport('csv')}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-ios-blue font-medium rounded-xl shadow-sm hover:bg-blue-50 transition-colors text-sm"
                            >
                                <FileText size={16} />
                                CSV
                            </button>
                        </div>
                    </div>

                     <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-gray-900">{t('importCSV')}</h4>
                            <p className="text-sm text-gray-500">Excel / CSV / JSON</p>
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-xl shadow-sm hover:bg-gray-100 transition-colors text-sm"
                        >
                            <Upload size={16} />
                            Import
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json, .csv, .xlsx, .xls" 
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="p-4 bg-red-50 rounded-2xl flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-red-600">{t('clearData')}</h4>
                            <p className="text-sm text-red-400">{t('permDelete')}</p>
                        </div>
                        <button 
                            onClick={onClearData}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 font-medium rounded-xl shadow-sm hover:bg-red-50 transition-colors text-sm"
                        >
                            <Trash2 size={16} />
                            {t('clear')}
                        </button>
                    </div>
                </div>
            </section>
            
            <div className="text-center text-xs text-gray-400 pt-8">
                {t('appVersion')}
            </div>
        </div>
    );
};

// --- ReportsView ---
interface ReportsViewProps {
  transactions: Transaction[];
  currencySymbol: string;
  t: (key: string, params?: any) => string;
  language: Language;
  onDateClick: (date: Date) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, currencySymbol, t, language, onDateClick }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const today = new Date();

  // Pre-calculate activity for the entire year for O(1) lookups
  const activityMap = useMemo(() => {
    const map = new Map<string, { lent: boolean; repaid: boolean }>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === selectedYear) {
        const key = `${d.getMonth()}-${d.getDate()}`; // key: month-day (0-indexed month)
        const current = map.get(key) || { lent: false, repaid: false };
        if (t.type === 'LEND') current.lent = true;
        else current.repaid = true;
        map.set(key, current);
      }
    });
    return map;
  }, [transactions, selectedYear]);

  const renderMonth = (monthIndex: number) => {
      const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
      const firstDay = new Date(selectedYear, monthIndex, 1).getDay(); // 0-6 Sun-Sat
      const monthName = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', { month: 'short' }).format(new Date(selectedYear, monthIndex, 1));
      
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      return (
          <div key={monthIndex} className="flex flex-col h-full">
              <h4 className="text-sm font-bold mb-2 text-gray-800">{monthName}</h4>
              <div className="grid grid-cols-7 gap-0.5 text-center flex-1 content-start">
                  {/* Empty cells */}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  
                  {days.map(day => {
                      const key = `${monthIndex}-${day}`;
                      const activity = activityMap.get(key);
                      const isToday = day === today.getDate() && monthIndex === today.getMonth() && selectedYear === today.getFullYear();
                      
                      let bgClass = 'hover:bg-gray-100 bg-transparent';
                      let textClass = 'text-gray-900';
                      let style = {};

                      if (activity) {
                          textClass = 'text-white font-bold';
                          if (activity.lent && activity.repaid) {
                              style = { background: 'linear-gradient(135deg, #FF3B30 50%, #34C759 50%)' };
                              bgClass = 'shadow-sm';
                          } else if (activity.lent) {
                              bgClass = 'bg-ios-red shadow-sm';
                          } else if (activity.repaid) {
                              bgClass = 'bg-ios-green shadow-sm';
                          }
                      } else if (isToday) {
                          // Today with no activity
                           textClass = 'text-ios-red font-bold';
                      }

                      return (
                          <div 
                             key={day}
                             onClick={() => onDateClick(new Date(selectedYear, monthIndex, day))}
                             className={`
                                flex items-center justify-center rounded-sm cursor-pointer transition-all relative aspect-square text-[10px]
                                ${bgClass}
                             `}
                             style={style}
                          >
                              <span className={textClass}>
                                  {day}
                              </span>
                              {/* Ring for Today if there's activity overlapping it */}
                              {isToday && activity && (
                                  <div className="absolute inset-0 border border-white/50 rounded-sm"></div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-3xl font-bold text-ios-red tracking-tight flex items-baseline">
                {selectedYear}
                <span className="text-sm font-medium text-gray-400 ml-2 tracking-normal">
                    {language === 'zh' ? '年' : ''}
                </span>
            </h2>
            <div className="flex gap-2">
                <button 
                    onClick={() => setSelectedYear(y => y - 1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    onClick={() => setSelectedYear(y => y + 1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>

        {/* 12 Month Grid - Auto Height to maintain proportions */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-10">
            {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </div>
    </div>
  );
};
