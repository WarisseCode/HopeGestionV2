// frontend/src/components/dashboard/KPICard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  trend?: {
    value: string;
    label: string;
    positive: boolean;
  };
}

const colorClasses = {
  blue: {
    bg: 'bg-white dark:bg-base-100',
    border: 'border-blue-100 dark:border-blue-900/30',
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconText: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10',
    shadow: 'shadow-blue-500/5 hover:shadow-blue-500/10 dark:shadow-none'
  },
  green: {
    bg: 'bg-white dark:bg-base-100',
    border: 'border-green-100 dark:border-green-900/30',
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    iconText: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10',
    shadow: 'shadow-green-500/5 hover:shadow-green-500/10 dark:shadow-none'
  },
  purple: {
    bg: 'bg-white dark:bg-base-100',
    border: 'border-purple-100 dark:border-purple-900/30',
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    iconText: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500/10 to-purple-500/5 dark:from-purple-500/20 dark:to-purple-500/10',
    shadow: 'shadow-purple-500/5 hover:shadow-purple-500/10 dark:shadow-none'
  },
  orange: {
    bg: 'bg-white dark:bg-base-100',
    border: 'border-orange-100 dark:border-orange-900/30',
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
    iconText: 'text-orange-600 dark:text-orange-400',
    gradient: 'from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10',
    shadow: 'shadow-orange-500/5 hover:shadow-orange-500/10 dark:shadow-none'
  },
  pink: {
    bg: 'bg-white dark:bg-base-100',
    border: 'border-pink-100 dark:border-pink-900/30',
    iconBg: 'bg-pink-50 dark:bg-pink-900/20',
    iconText: 'text-pink-600 dark:text-pink-400',
    gradient: 'from-pink-500/10 to-pink-500/5 dark:from-pink-500/20 dark:to-pink-500/10',
    shadow: 'shadow-pink-500/5 hover:shadow-pink-500/10 dark:shadow-none'
  }
};

const KPICard: React.FC<KPICardProps> = ({ icon: Icon, label, value, color, trend }) => {
  const classes = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 border ${classes.border} ${classes.bg} shadow-lg transition-all duration-300 hover:scale-[1.02] ${classes.shadow}`}>
      {/* Background Gradient Decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${classes.gradient} rounded-bl-full -mr-8 -mt-8`} />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className={`${classes.iconBg} p-3 rounded-xl ring-4 ring-white dark:ring-base-200 transition-all`}>
            <Icon className={`w-6 h-6 ${classes.iconText}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              trend.positive ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-base-content/60 mb-1 transition-colors">{label}</p>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-base-content tracking-tight transition-colors">{value}</h3>
          {trend && (
            <p className="text-xs text-gray-400 dark:text-base-content/40 mt-2 transition-colors">
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
