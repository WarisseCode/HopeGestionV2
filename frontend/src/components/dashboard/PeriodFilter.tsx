// src/components/dashboard/PeriodFilter.tsx
// Composant de filtrage par période pour les dashboards
import React from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export type Period = '7d' | '30d' | '90d' | '1y' | 'all';

interface PeriodOption {
  value: Period;
  label: string;
  shortLabel?: string;
}

const periods: PeriodOption[] = [
  { value: '7d', label: '7 derniers jours', shortLabel: '7j' },
  { value: '30d', label: '30 derniers jours', shortLabel: '30j' },
  { value: '90d', label: '90 derniers jours', shortLabel: '90j' },
  { value: '1y', label: 'Cette année', shortLabel: 'Année' },
  { value: 'all', label: 'Tout', shortLabel: 'Tout' },
];

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
}

const PeriodFilter: React.FC<PeriodFilterProps> = ({
  value,
  onChange,
  className = '',
  compact = false,
  showIcon = true,
}) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && (
        <Calendar size={16} className="text-gray-400 mr-1 hidden sm:block" />
      )}
      <div className="flex bg-gray-100 rounded-full p-1 gap-0.5">
        {periods.map((period) => {
          const isActive = value === period.value;
          return (
            <button
              key={period.value}
              onClick={() => onChange(period.value)}
              className={`
                relative px-3 py-1.5 text-xs font-semibold rounded-full
                transition-all duration-200 whitespace-nowrap
                ${isActive 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="periodIndicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-md"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {compact ? period.shortLabel : (
                  <>
                    <span className="hidden md:inline">{period.label}</span>
                    <span className="md:hidden">{period.shortLabel}</span>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Utility function to get date range from period
export const getDateRangeFromPeriod = (period: Period): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear(), 0, 1); // Start of year
      break;
    case 'all':
      start.setFullYear(2000, 0, 1); // Very old date
      break;
  }
  
  return { start, end };
};

export default PeriodFilter;
