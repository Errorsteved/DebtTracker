
import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../types';

interface CustomDatePickerProps {
  value: string | undefined; // ISO Date string YYYY-MM-DD
  onChange: (date: string) => void;
  onClear: () => void;
  onClose: () => void;
  language: Language;
  className?: string; // Allow overriding positioning
}

type ViewMode = 'days' | 'months' | 'years';

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClear, onClose, language, className = "right-0" }) => {
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
  const [mode, setMode] = useState<ViewMode>('days');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  // --- Navigation Handlers ---
  
  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'days') {
        setViewDate(new Date(year, month - 1, 1));
    } else if (mode === 'months') {
        setViewDate(new Date(year - 1, month, 1));
    } else if (mode === 'years') {
        setViewDate(new Date(year - 12, month, 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === 'days') {
        setViewDate(new Date(year, month + 1, 1));
    } else if (mode === 'months') {
        setViewDate(new Date(year + 1, month, 1));
    } else if (mode === 'years') {
        setViewDate(new Date(year + 12, month, 1));
    }
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (mode === 'days') {
          setMode('years');
      } else if (mode === 'months') {
          setMode('years');
      } else {
          setMode('days');
      }
  };

  const handleYearSelect = (y: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setViewDate(new Date(y, month, 1));
      setMode('months');
  };

  const handleMonthSelect = (m: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setViewDate(new Date(year, m, 1));
      setMode('days');
  };

  const handleDaySelect = (d: number, targetMonth: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newDate = new Date(year, targetMonth, d);
      onChange(toDateString(newDate));
      onClose(); // Close on selection
  };

  const handleJumpToToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    onChange(toDateString(today));
    onClose();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClear();
    onClose();
  };

  const toDateString = (date: Date) => {
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  };

  // --- Rendering Helpers ---

  const getHeaderLabel = () => {
      if (mode === 'days') {
          return language === 'en'
            ? viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : `${year}年${String(month + 1).padStart(2, '0')}月`;
      } else if (mode === 'months') {
          return `${year}`;
      } else {
          // Year range
          const startYear = Math.floor(year / 12) * 12;
          const endYear = startYear + 11;
          return `${startYear} - ${endYear}`;
      }
  };

  const renderDays = () => {
    const days = [];
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon start
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
        days.push({ day: daysInPrevMonth - startOffset + i + 1, type: 'prev' });
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
        days.push({ day: i, type: 'current' });
    }
    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, type: 'next' });
    }

    const weekDays = language === 'en' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['一', '二', '三', '四', '五', '六', '日'];

    return (
        <>
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
                {days.map((d, idx) => {
                    const targetMonth = d.type === 'prev' ? month - 1 : d.type === 'next' ? month + 1 : month;
                    const dateStr = toDateString(new Date(year, targetMonth, d.day));
                    const isSelected = value === dateStr;
                    const isCurrentMonth = d.type === 'current';
                    
                    return (
                        <div 
                            key={idx}
                            onClick={(e) => handleDaySelect(d.day, targetMonth, e)}
                            className={`
                                h-8 w-8 text-sm flex items-center justify-center rounded-lg cursor-pointer transition-all
                                ${isSelected ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/30 font-bold' : ''}
                                ${!isSelected && isCurrentMonth ? 'text-gray-900 hover:bg-black/5' : ''}
                                ${!isSelected && !isCurrentMonth ? 'text-gray-300' : ''}
                            `}
                        >
                            {d.day}
                        </div>
                    )
                })}
            </div>
        </>
    );
  };

  const renderMonths = () => {
      const months = Array.from({ length: 12 }, (_, i) => i);
      return (
          <div className="grid grid-cols-3 gap-3 mb-4 h-[240px]">
              {months.map(m => {
                  const isSelected = m === month;
                  const monthName = new Date(year, m, 1).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', { month: 'short' });
                  return (
                      <div 
                        key={m}
                        onClick={(e) => handleMonthSelect(m, e)}
                        className={`
                            flex items-center justify-center rounded-xl cursor-pointer transition-all text-sm font-medium
                            ${isSelected ? 'bg-ios-blue text-white shadow-md' : 'text-gray-700 hover:bg-black/5'}
                        `}
                      >
                          {monthName}
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderYears = () => {
      const startYear = Math.floor(year / 12) * 12;
      const years = Array.from({ length: 12 }, (_, i) => startYear + i);
      return (
          <div className="grid grid-cols-3 gap-3 mb-4 h-[240px]">
              {years.map(y => {
                  const isSelected = y === year;
                  return (
                      <div 
                        key={y}
                        onClick={(e) => handleYearSelect(y, e)}
                        className={`
                            flex items-center justify-center rounded-xl cursor-pointer transition-all text-sm font-medium
                            ${isSelected ? 'bg-ios-blue text-white shadow-md' : 'text-gray-700 hover:bg-black/5'}
                        `}
                      >
                          {y}
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div 
        ref={pickerRef}
        className={`absolute top-full mt-2 bg-[#F2F2F7]/95 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-2xl p-4 w-[280px] z-50 select-none animate-in fade-in zoom-in-95 duration-150 ${className}`}
        style={{ transformOrigin: className.includes('right') ? 'top right' : 'top left' }}
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-1">
            <div 
                onClick={handleHeaderClick}
                className="text-sm font-bold text-gray-900 flex items-center cursor-pointer hover:bg-black/5 rounded px-2 py-1 transition-colors"
            >
                {getHeaderLabel()}
                <span className="text-[10px] ml-1 opacity-50">▼</span>
            </div>
            <div className="flex gap-1">
                <button type="button" onClick={handlePrev} className="p-1 rounded hover:bg-black/5 text-gray-600 transition-colors">
                    <ChevronLeft size={18} strokeWidth={2} />
                </button>
                <button type="button" onClick={handleNext} className="p-1 rounded hover:bg-black/5 text-gray-600 transition-colors">
                    <ChevronRight size={18} strokeWidth={2} />
                </button>
            </div>
        </div>

        {mode === 'days' && renderDays()}
        {mode === 'months' && renderMonths()}
        {mode === 'years' && renderYears()}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
            <button 
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-red-500 hover:opacity-70 transition-opacity"
            >
                {language === 'en' ? 'Clear' : '清除'}
            </button>
            <button 
                type="button"
                onClick={handleJumpToToday}
                className="text-xs font-medium text-ios-blue hover:opacity-70 transition-opacity"
            >
                {language === 'en' ? 'Today' : '今天'}
            </button>
        </div>
    </div>
  );
};
