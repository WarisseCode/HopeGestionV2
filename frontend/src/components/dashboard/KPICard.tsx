// frontend/src/components/dashboard/KPICard.tsx
import React from 'react';

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    border: 'border-blue-100',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100',
    border: 'border-green-100',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
    border: 'border-purple-100',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    border: 'border-orange-100',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600'
  }
};

const KPICard: React.FC<KPICardProps> = ({ icon: Icon, label, value, color }) => {
  const classes = colorClasses[color];
  
  return (
    <div className={`${classes.bg} rounded-2xl p-6 border ${classes.border} shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className={`${classes.iconBg} p-3 rounded-xl`}>
          <Icon className={classes.iconText} />
        </div>
        <div>
          <p className="text-sm text-base-content/60">{label}</p>
          <p className="font-bold text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
