// src/components/ui/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  actions
}) => {
  return (
    <div className={`bg-base-100 rounded-xl shadow-md border border-base-200 overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 pt-6 pb-4">
          {title && <h3 className="text-lg font-semibold text-base-content">{title}</h3>}
          {subtitle && <p className="text-sm text-base-content/70 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className={`px-6 ${title || subtitle ? 'pb-6' : 'py-6'}`}>
        {children}
      </div>
      {actions && (
        <div className="px-6 pb-6 pt-2 flex justify-end gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card;