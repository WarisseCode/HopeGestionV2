// src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  headerActions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions,
  variant = 'elevated',
  hoverable = false,
  onClick,
  padding = 'md',
  headerActions,
}) => {
  const variantClasses = {
    elevated: 'bg-white shadow-lg border border-gray-100',
    outlined: 'bg-white border-2 border-gray-200 shadow-none',
    flat: 'bg-gray-50 border-none shadow-none',
  };

  const hoverClasses = hoverable 
    ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1' 
    : '';

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const contentPaddingClasses = {
    none: '',
    sm: 'px-4',
    md: 'px-6',
    lg: 'px-8',
  };

  return (
    <div 
      className={`
        rounded-2xl overflow-hidden 
        ${variantClasses[variant]} 
        ${hoverClasses} 
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {(title || subtitle || headerActions) && (
        <div className={`${contentPaddingClasses[padding]} pt-6 pb-4 flex items-start justify-between`}>
          <div>
            {title && (
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className={`${contentPaddingClasses[padding]} ${title || subtitle ? 'pb-6' : paddingClasses[padding]}`}>
        {children}
      </div>
      {actions && (
        <div className={`${contentPaddingClasses[padding]} pb-6 pt-2 flex justify-end gap-3 border-t border-gray-100`}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card;