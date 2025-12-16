import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { DailyData, BorrowerData } from '../types';

interface TrendChartProps {
  data: DailyData[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: '#8E8E93' }} 
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#8E8E93' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#007AFF" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface DistributionChartProps {
  data: BorrowerData[];
  topBorrowerLabel: string;
  noneLabel: string;
}

const COLORS = ['#007AFF', '#FF3B30', '#FF9500', '#34C759', '#AF52DE', '#5856D6'];

export const DistributionChart: React.FC<DistributionChartProps> = ({ data, topBorrowerLabel, noneLabel }) => {
  return (
    <div className="w-full h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as any}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend 
            verticalAlign="middle" 
            align="right" 
            layout="vertical" 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#8E8E93' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center Label Mockup */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pr-16">
        <div className="text-xs text-ios-gray">{topBorrowerLabel}</div>
        <div className="text-sm font-bold text-gray-800">{data[0]?.name || noneLabel}</div>
      </div>
    </div>
  );
};