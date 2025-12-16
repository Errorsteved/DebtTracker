
import React, { useState, useEffect, useRef } from 'react';
import { TransactionType, Language, Transaction } from '../types';
import { X, Tag, Calendar, ChevronDown, Check } from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: string; borrower: string; amount: number; type: TransactionType; note: string; category: string; date: string; dueDate?: string; tags?: string[] }) => void;
  initialData?: Partial<Transaction>;
  currencySymbol: string;
  existingBorrowers: string[];
  categories: string[];
  existingTags?: string[];
  t: (key: string) => string;
  language?: Language;
}

// Helper to translate categories safely for display
const getLocalizedCategory = (rawCategory: string, t: (key: string) => string) => {
    const key = `cat${rawCategory}`;
    const translated = t(key);
    return translated !== key ? translated : rawCategory;
};

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    currencySymbol, 
    existingBorrowers, 
    categories, 
    existingTags = [], 
    t, 
    language = 'en' 
}) => {
  const [type, setType] = useState<TransactionType>('LEND');
  const [amount, setAmount] = useState('');
  const [borrower, setBorrower] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');

  // Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const borrowerRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setAmount(initialData?.amount ? String(initialData.amount) : '');
        setNote(initialData?.note || '');
        setDueDate(initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
        setTags(initialData?.tags ? initialData.tags.join(', ') : '');
        setDate(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setType(initialData?.type || 'LEND');
        setBorrower(initialData?.borrower || '');
        // Default to first category if available
        setCategory(initialData?.category || (categories.length > 0 ? categories[0] : 'Personal'));
        
        setShowDatePicker(false);
        setShowDueDatePicker(false);
        setShowBorrowerDropdown(false);
        setShowCategoryDropdown(false);
        setShowTagsDropdown(false);
    }
  }, [isOpen, initialData, categories]);

  // Handle outside clicks
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (borrowerRef.current && !borrowerRef.current.contains(event.target as Node)) {
              setShowBorrowerDropdown(false);
          }
          if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
              setShowCategoryDropdown(false);
          }
          if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
              setShowTagsDropdown(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagArray = tags.split(',').map(tr => tr.trim()).filter(tr => tr.length > 0);
    onSave({
      id: initialData?.id,
      borrower,
      amount: parseFloat(amount),
      type,
      note,
      category,
      date: new Date(date).toISOString(),
      dueDate: type === 'LEND' && dueDate ? new Date(dueDate).toISOString() : undefined,
      tags: tagArray
    });
    onClose();
  };

  const addTag = (tag: string) => {
      const currentTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (!currentTags.includes(tag)) {
          const newTags = [...currentTags, tag].join(', ');
          setTags(newTags);
      }
      setShowTagsDropdown(false);
  }

  const filteredBorrowers = existingBorrowers.filter(b => 
      b.toLowerCase().includes(borrower.toLowerCase()) && b !== borrower
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      {/* Removed overflow-hidden to allow DatePicker to pop out. Added rounded corners to header explicitly. */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200" onClick={() => {
          setShowDatePicker(false);
          setShowDueDatePicker(false);
      }}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-gray-900">{initialData?.id ? t('edit') : t('newTransaction')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Type Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                    type="button"
                    onClick={() => setType('LEND')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'LEND' ? 'bg-white text-ios-red shadow-sm' : 'text-gray-500'}`}
                >
                    {t('lendOut')}
                </button>
                <button
                    type="button"
                    onClick={() => setType('REPAYMENT')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'REPAYMENT' ? 'bg-white text-ios-green shadow-sm' : 'text-gray-500'}`}
                >
                    {t('repayment')}
                </button>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('amount')}</label>
                <div className="relative">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold ${type === 'LEND' ? 'text-ios-red' : 'text-ios-green'}`}>{currencySymbol}</span>
                    <input 
                        type="number" 
                        required
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ios-blue/20 focus:border-ios-blue outline-none text-xl font-bold text-gray-800 transition-all"
                        placeholder="0.00"
                        autoFocus
                    />
                </div>
            </div>

            {/* Main Details */}
            <div className="grid grid-cols-2 gap-4">
                {/* Custom Borrower Input with Dropdown */}
                <div ref={borrowerRef} className="relative">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('borrower')}</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required
                            value={borrower}
                            onChange={e => {
                                setBorrower(e.target.value);
                                setShowBorrowerDropdown(true);
                            }}
                            onFocus={() => setShowBorrowerDropdown(true)}
                            className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm h-[38px] transition-all"
                            placeholder={t('borrower')}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowBorrowerDropdown(!showBorrowerDropdown)}
                            className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    {showBorrowerDropdown && filteredBorrowers.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {filteredBorrowers.map(b => (
                                <div 
                                    key={b}
                                    onClick={() => {
                                        setBorrower(b);
                                        setShowBorrowerDropdown(false);
                                    }}
                                    className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center justify-between"
                                >
                                    {b}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('date')}</label>
                    <div className="relative w-full">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                             <Calendar size={16} />
                         </div>
                         <div 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 setShowDatePicker(!showDatePicker);
                                 setShowDueDatePicker(false);
                             }}
                             className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm text-gray-700 h-[38px] cursor-pointer flex items-center select-none"
                         >
                             {date}
                         </div>
                         {showDatePicker && (
                             <CustomDatePicker 
                                value={date}
                                onChange={(d) => setDate(d)}
                                onClear={() => {}}
                                onClose={() => setShowDatePicker(false)}
                                language={language}
                                className="left-0"
                             />
                         )}
                    </div>
                </div>
            </div>

            {/* Additional Info Row */}
            <div className="grid grid-cols-2 gap-4">
                 {/* Custom Category Dropdown */}
                 <div ref={categoryRef} className="relative">
                     <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('category')}</label>
                     <div 
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm text-gray-700 h-[38px] flex items-center justify-between cursor-pointer"
                     >
                         <span>{getLocalizedCategory(category, t)}</span>
                         <ChevronDown size={14} className="text-gray-400" />
                     </div>
                     {showCategoryDropdown && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar p-1">
                            {categories.map(cat => (
                                <div 
                                    key={cat}
                                    onClick={() => {
                                        setCategory(cat);
                                        setShowCategoryDropdown(false);
                                    }}
                                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between ${category === cat ? 'bg-blue-50 text-ios-blue' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {getLocalizedCategory(cat, t)}
                                    {category === cat && <Check size={14} />}
                                </div>
                            ))}
                        </div>
                     )}
                </div>

                {type === 'LEND' && (
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('dueDate')}</label>
                        <div className="relative w-full">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                 <Calendar size={16} />
                             </div>
                             <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDueDatePicker(!showDueDatePicker);
                                    setShowDatePicker(false);
                                }}
                                className={`w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm h-[38px] cursor-pointer flex items-center select-none ${dueDate ? 'text-gray-700' : 'text-gray-400'}`}
                             >
                                 {dueDate || t('dueDate')}
                             </div>
                             {showDueDatePicker && (
                                 <CustomDatePicker 
                                    value={dueDate}
                                    onChange={(d) => setDueDate(d)}
                                    onClear={() => setDueDate('')}
                                    onClose={() => setShowDueDatePicker(false)}
                                    language={language}
                                    className="left-0"
                                 />
                             )}
                        </div>
                    </div>
                )}
            </div>

            {/* Tags */}
            <div ref={tagsRef} className="relative">
                 <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('tags')}</label>
                 <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input 
                        type="text" 
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        onFocus={() => setShowTagsDropdown(true)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm"
                        placeholder="Urgent, Cash..."
                    />
                    {existingTags.length > 0 && (
                        <button 
                            type="button" 
                            onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <ChevronDown size={14} />
                        </button>
                    )}
                 </div>
                 {showTagsDropdown && existingTags.length > 0 && (
                     <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-32 overflow-y-auto custom-scrollbar p-1">
                         {existingTags.map(tag => (
                             <div 
                                key={tag} 
                                onClick={() => addTag(tag)}
                                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center justify-between"
                             >
                                {tag}
                                {tags.includes(tag) && <Check size={14} className="text-ios-blue"/>}
                             </div>
                         ))}
                     </div>
                 )}
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('note')}</label>
                <textarea 
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-ios-blue outline-none text-sm resize-none"
                    placeholder={t('notePlaceholder')}
                />
            </div>

            <button 
                type="submit" 
                className={`w-full py-3.5 rounded-xl text-white font-semibold shadow-lg active:scale-95 transition-transform ${type === 'LEND' ? 'bg-ios-red shadow-ios-red/30' : 'bg-ios-green shadow-ios-green/30'}`}
            >
                {t('save')}
            </button>
        </form>
      </div>
    </div>
  );
};
