
import React, { useState, useRef, useEffect } from 'react';
import { Account, Language } from '../types';
import { ChevronDown, Plus, Edit2, Check, CheckCircle2, Trash2 } from 'lucide-react';

interface AccountSwitcherProps {
  accounts: Account[];
  currentAccount: Account;
  onSwitch: (accountId: string) => void;
  onCreate: (name: string, color: string) => void;
  onUpdate: (account: Account) => void;
  onDelete: (accountId: string) => void;
  language: Language;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-800'
];

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  accounts, 
  currentAccount, 
  onSwitch, 
  onCreate, 
  onUpdate,
  onDelete,
  language 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [nameInput, setNameInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setNameInput(currentAccount.name);
      setSelectedColor(currentAccount.avatarColor);
      setIsEditing(true);
      setIsCreating(false);
  };

  const openCreate = () => {
      setNameInput('');
      setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
      setIsCreating(true);
      setIsEditing(false);
  };

  const handleSave = () => {
      if (!nameInput.trim()) return;

      if (isEditing) {
          onUpdate({
              ...currentAccount,
              name: nameInput,
              avatarColor: selectedColor
          });
          setIsEditing(false);
      } else if (isCreating) {
          onCreate(nameInput, selectedColor);
          setIsCreating(false);
      }
      setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, accountId: string) => {
      e.stopPropagation();
      // Directly call onDelete, parent will handle the safe delete modal
      onDelete(accountId);
  };

  const t = (key: string) => {
      const dict: any = {
          'editProfile': { en: 'Edit Profile', zh: '编辑资料' },
          'switchAccount': { en: 'Switch Account', zh: '切换账号' },
          'addAccount': { en: 'Add Account', zh: '新建账号' },
          'name': { en: 'Name', zh: '名称' },
          'save': { en: 'Save', zh: '保存' },
          'create': { en: 'Create', zh: '创建' },
          'cancel': { en: 'Cancel', zh: '取消' },
          'selectColor': { en: 'Color', zh: '颜色' },
          'accounts': { en: 'My Accounts', zh: '我的账本' },
      };
      return dict[key][language] || key;
  };

  return (
    <div className="relative mb-8 z-[60]" ref={dropdownRef}>
        {/* Main Trigger Button */}
        <button 
            onClick={() => {
                setIsOpen(!isOpen);
                setIsEditing(false);
                setIsCreating(false);
            }}
            className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-100/80 transition-all group"
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${currentAccount.avatarColor}`}>
                {currentAccount.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
                <h3 className="text-sm font-bold text-gray-900 leading-tight">{currentAccount.name}</h3>
                <p className="text-xs text-gray-500 font-medium group-hover:text-ios-blue transition-colors">
                    {t('switchAccount')}
                </p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu - Increased Z-Index substantially */}
        {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-2">
                
                {/* Mode: List Accounts */}
                {!isEditing && !isCreating && (
                    <>
                        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                            <span>{t('accounts')}</span>
                            <button onClick={openEdit} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-ios-blue" title={t('editProfile')}>
                                <Edit2 size={12} />
                            </button>
                        </div>
                        
                        <div className="space-y-1 mb-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {accounts.map(acc => (
                                <div
                                    key={acc.id}
                                    onClick={() => {
                                        onSwitch(acc.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer group ${acc.id === currentAccount.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${acc.avatarColor}`}>
                                        {acc.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`text-sm font-medium flex-1 text-left ${acc.id === currentAccount.id ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {acc.name}
                                    </span>
                                    {acc.id === currentAccount.id ? (
                                        <Check size={14} className="text-ios-blue" />
                                    ) : (
                                        <button 
                                            onClick={(e) => handleDelete(e, acc.id)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-gray-100 my-1"></div>

                        <button 
                            onClick={openCreate}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-ios-blue font-medium text-sm transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-ios-blue/30 flex items-center justify-center">
                                <Plus size={16} />
                            </div>
                            {t('addAccount')}
                        </button>
                    </>
                )}

                {/* Mode: Edit or Create */}
                {(isEditing || isCreating) && (
                    <div className="p-2">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 px-1">
                            {isEditing ? t('editProfile') : t('addAccount')}
                        </h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">{t('name')}</label>
                                <input 
                                    type="text" 
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-ios-blue focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">{t('selectColor')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {AVATAR_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-8 h-8 rounded-full ${color} flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-300 scale-110' : ''}`}
                                        >
                                            {selectedColor === color && <CheckCircle2 size={16} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={() => {
                                        setIsEditing(false);
                                        setIsCreating(false);
                                    }}
                                    className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    {t('cancel')}
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={!nameInput.trim()}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-ios-blue hover:bg-blue-600 rounded-lg disabled:opacity-50"
                                >
                                    {isEditing ? t('save') : t('create')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
