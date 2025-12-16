
import React from 'react';
import { Transaction, Language } from '../types';
import { X, ArrowUpRight, ArrowDownLeft, Plus, Calendar, Edit2, Clock } from 'lucide-react';

interface DayDetailModalProps {
  isOpen: boolean;
  date: Date | null;
  transactions: Transaction[];
  onClose: () => void;
  onAddTransaction: (date: Date) => void;
  currencySymbol: string;
  language: Language;
  onEditTransaction: (tx: Transaction) => void;
}

const formatCurrency = (amount: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount).replace('$', symbol);
};

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ 
    isOpen, 
    date, 
    transactions, 
    onClose, 
    onAddTransaction,
    currencySymbol,
    language,
    onEditTransaction
}) => {
  if (!isOpen || !date) return null;

  const locale = language === 'en' ? 'en-US' : 'zh-CN';

  // Filter transactions for this day
  const dayTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getDate() === date.getDate() && 
             d.getMonth() === date.getMonth() && 
             d.getFullYear() === date.getFullYear();
  });

  const dailySummary = dayTransactions.reduce((acc, t) => {
      if(t.type === 'LEND') acc.lent += t.amount;
      else acc.repaid += t.amount;
      return acc;
  }, { lent: 0, repaid: 0 });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
         {/* Header */}
         <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-start">
             <div>
                 <div className="flex items-center gap-2 text-ios-blue font-medium text-sm mb-1">
                     <Calendar size={16} />
                     {date.toLocaleDateString(locale, { weekday: 'long' })}
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900">
                     {date.toLocaleDateString(locale, { month: 'long', day: 'numeric' })}
                 </h2>
             </div>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={24} />
             </button>
         </div>

         {/* Summary for the day */}
         <div className="grid grid-cols-2 gap-4 p-6 bg-white border-b border-gray-50">
             <div className="bg-red-50 p-3 rounded-2xl">
                 <div className="text-xs text-red-500 font-bold uppercase tracking-wide">{language === 'en' ? 'Total Lent' : '今日借出'}</div>
                 <div className="text-lg font-bold text-gray-900">{formatCurrency(dailySummary.lent, currencySymbol)}</div>
             </div>
             <div className="bg-green-50 p-3 rounded-2xl">
                 <div className="text-xs text-green-500 font-bold uppercase tracking-wide">{language === 'en' ? 'Total Repaid' : '今日收回'}</div>
                 <div className="text-lg font-bold text-gray-900">{formatCurrency(dailySummary.repaid, currencySymbol)}</div>
             </div>
         </div>

         {/* List */}
         <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
             {dayTransactions.length === 0 ? (
                 <div className="text-center py-10 text-gray-400">
                     <p>{language === 'en' ? 'No activity recorded' : '无交易记录'}</p>
                 </div>
             ) : (
                 <div className="space-y-1">
                     {dayTransactions.map(t => {
                         const overdue = t.type === 'LEND' && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0));
                         return (
                         <div key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'REPAYMENT' ? 'bg-green-100 text-ios-green' : 'bg-red-100 text-ios-red'}`}>
                                    {t.type === 'REPAYMENT' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm truncate">{t.borrower}</h4>
                                    <div className="flex flex-wrap gap-1 text-xs text-gray-500 items-center">
                                        <span>{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span>•</span>
                                        <span>{t.category}</span>
                                        {t.type === 'LEND' && t.dueDate && (
                                            <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-500 font-medium' : ''}`}>
                                                {overdue ? (language === 'en' ? 'Overdue' : '已逾期') : ''}
                                                {overdue && <Clock size={10} />}
                                            </span>
                                        )}
                                    </div>
                                    {t.tags && t.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                            {t.tags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-gray-100 px-1 rounded text-gray-600">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pl-2">
                                <div className="text-right">
                                    <div className={`font-bold ${t.type === 'LEND' ? 'text-gray-900' : 'text-ios-green'}`}>
                                        {t.type === 'LEND' ? '-' : '+'}{formatCurrency(t.amount, currencySymbol)}
                                    </div>
                                    {t.note && <div className="text-xs text-gray-400 max-w-[100px] truncate">{t.note}</div>}
                                </div>
                                <button 
                                    onClick={() => onEditTransaction(t)}
                                    className="p-1.5 text-gray-300 hover:text-ios-blue hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                         </div>
                     )})}
                 </div>
             )}
         </div>

         {/* Footer Action */}
         <div className="p-4 border-t border-gray-100 bg-gray-50">
             <button 
                onClick={() => onAddTransaction(date)}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg"
             >
                 <Plus size={18} />
                 {language === 'en' ? 'Add Record for This Day' : '补录当日账单'}
             </button>
         </div>

      </div>
    </div>
  );
};
