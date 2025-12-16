import React, { useMemo } from 'react';
import { Transaction, Language } from '../types';

interface CalendarWidgetProps {
  transactions: Transaction[];
  onDateClick: (date: Date) => void;
  language: Language;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ transactions, onDateClick, language }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const locale = language === 'en' ? 'en-US' : 'zh-CN';

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  
  // Generate localized weekday names dynamically
  const days = useMemo(() => {
    const baseDate = new Date(2023, 0, 1); // Jan 1 2023 is a Sunday
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        weekDays.push(baseDate.toLocaleDateString(locale, { weekday: 'short' }));
        baseDate.setDate(baseDate.getDate() + 1);
    }
    return weekDays;
  }, [locale]);

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Group transactions by day
  const dailyActivity = useMemo(() => {
    const map = new Map<number, { lent: number; repaid: number }>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        const current = map.get(day) || { lent: 0, repaid: 0 };
        if (t.type === 'LEND') current.lent += t.amount;
        else current.repaid += t.amount;
        map.set(day, current);
      }
    });
    return map;
  }, [transactions, currentMonth, currentYear]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">
          {today.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
           <button 
            onClick={() => onDateClick(new Date())}
            className="p-1 rounded-full bg-gray-50 hover:bg-gray-100 text-ios-blue px-3 py-1 transition-colors"
           >
             <span className="text-xs font-bold">{language === 'en' ? 'Today' : '今天'}</span>
           </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {days.map(d => (
          <div key={d} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center flex-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {currentMonthDays.map(day => {
            const activity = dailyActivity.get(day);
            const isToday = day === today.getDate();
            const hasActivity = !!activity;
            
            return (
              <div 
                key={day} 
                onClick={() => {
                   const clickedDate = new Date(currentYear, currentMonth, day);
                   onDateClick(clickedDate);
                }}
                className="flex flex-col items-center justify-start py-2 min-h-[3.5rem] rounded-lg hover:bg-gray-100 cursor-pointer transition-colors relative group border border-transparent hover:border-gray-200"
              >
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-ios-blue text-white shadow-md' : 'text-gray-700'}`}>
                  {day}
                </span>
                {hasActivity && (
                    <div className="flex gap-1 mt-1.5">
                        {activity.lent > 0 && <div className="w-1.5 h-1.5 rounded-full bg-ios-red"></div>}
                        {activity.repaid > 0 && <div className="w-1.5 h-1.5 rounded-full bg-ios-green"></div>}
                    </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};