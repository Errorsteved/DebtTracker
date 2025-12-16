import React from 'react';
import { Transaction, Language } from '../types';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface TransactionListModalProps {
  isOpen: boolean;
  title: string;
  transactions: Transaction[];
  onClose: () => void;
  currencySymbol: string;
  language: Language;
}

const formatCurrency = (amount: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount).replace('$', symbol);
};

export const TransactionListModal: React.FC<TransactionListModalProps> = ({ 
    isOpen, 
    title, 
    transactions, 
    onClose, 
    currencySymbol,
    language
}) => {
  if (!isOpen) return null;

  const locale = language === 'en' ? 'en-US' : 'zh-CN';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
         {/* Header */}
         <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
             <h2 className="text-xl font-bold text-gray-900">
                 {title}
             </h2>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={24} />
             </button>
         </div>

         {/* List */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
             {transactions.length === 0 ? (
                 <div className="text-center py-20 text-gray-400">
                     <p>{language === 'en' ? 'No transactions found' : '无交易记录'}</p>
                 </div>
             ) : (
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Date' : '日期'}</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{language === 'en' ? 'Borrower' : '借款人'}</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{language === 'en' ? 'Amount' : '金额'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="font-medium text-gray-900">{new Date(tx.date).toLocaleDateString(locale)}</div>
                                    <div className="text-xs text-gray-400">{tx.category}</div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${tx.type === 'LEND' ? 'bg-red-50 text-ios-red' : 'bg-green-50 text-ios-green'}`}>
                                            {tx.type === 'REPAYMENT' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                        </div>
                                        {tx.borrower}
                                    </div>
                                </td>
                                <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'LEND' ? 'text-gray-900' : 'text-ios-green'}`}>
                                    {tx.type === 'LEND' ? '-' : '+'}{formatCurrency(tx.amount, currencySymbol)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             )}
         </div>
      </div>
    </div>
  );
};