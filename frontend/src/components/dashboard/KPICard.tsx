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
    bg: 'bg-white',
    border: 'border-blue-100',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    gradient: 'from-blue-500/10 to-blue-500/5',
    shadow: 'shadow-blue-500/5 hover:shadow-blue-500/10'
  },
  green: {
    bg: 'bg-white',
    border: 'border-green-100',
    iconBg: 'bg-green-50',
    iconText: 'text-green-600',
    gradient: 'from-green-500/10 to-green-500/5',
    shadow: 'shadow-green-500/5 hover:shadow-green-500/10'
  },
  purple: {
    bg: 'bg-white',
    border: 'border-purple-100',
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-600',
    gradient: 'from-purple-500/10 to-purple-500/5',
    shadow: 'shadow-purple-500/5 hover:shadow-purple-500/10'
  },
  orange: {
    bg: 'bg-white',
    border: 'border-orange-100',
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-600',
    gradient: 'from-orange-500/10 to-orange-500/5',
    shadow: 'shadow-orange-500/5 hover:shadow-orange-500/10'
  },
  pink: {
    bg: 'bg-white',
    border: 'border-pink-100',
    iconBg: 'bg-pink-50',
    iconText: 'text-pink-600',
    gradient: 'from-pink-500/10 to-pink-500/5',
    shadow: 'shadow-pink-500/5 hover:shadow-pink-500/10'
  }
};

const KPICard: React.FC<KPICardProps> = ({ icon: Icon, label, value, color, trend }) => {
  const classes = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 border ${classes.border} bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] ${classes.shadow}`}>
      {/* Background Gradient Decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${classes.gradient} rounded-bl-full -mr-8 -mt-8`} />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className={`${classes.iconBg} p-3 rounded-xl ring-4 ring-white`}>
            <Icon className={`w-6 h-6 ${classes.iconText}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {trend.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</h3>
          {trend && (
            <p className="text-xs text-gray-400 mt-2">
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
