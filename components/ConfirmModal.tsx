import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  validationString?: string;
  validationInstruction?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  validationString,
  validationInstruction
}) => {
  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = validationString ? inputValue !== validationString : false;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden scale-100 transform transition-all">
        <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {message}
            </p>

            {validationString && (
              <div className="w-full mb-6">
                <label className="block text-xs font-semibold text-gray-500 mb-2 text-left">
                  {validationInstruction || `Type "${validationString}" to confirm`}
                </label>
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={validationString}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-center font-medium"
                  autoFocus
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                    onClick={onCancel}
                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                    {cancelText}
                </button>
                <button 
                    onClick={onConfirm}
                    disabled={isConfirmDisabled}
                    className={`w-full py-3 rounded-xl font-semibold shadow-lg transition-colors ${
                      isConfirmDisabled 
                        ? 'bg-red-200 text-white cursor-not-allowed shadow-none' 
                        : 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
                    }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};