// src/components/ui/Alert.tsx
import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  onClose,
  className = ''
}) => {
  const variantClasses = {
    info: 'bg-info/10 text-info border-info/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20'
  };

  const textClasses = {
    info: 'text-base-content',
    success: 'text-base-content',
    warning: 'text-base-content',
    error: 'text-base-content'
  };

  const iconMap = {
    info: <Info className="w-5 h-5 text-info" />,
    success: <CheckCircle2 className="w-5 h-5 text-success" />,
    warning: <AlertCircle className="w-5 h-5 text-warning" />,
    error: <XCircle className="w-5 h-5 text-error" />
  };
  
  const icon = iconMap[variant];
  
  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className={`ml-3 flex-1 ${textClasses[variant]}`}>
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          <div className={`text-sm mt-1 ${title ? '' : 'mt-0'}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 text-base-content/50 hover:text-base-content/70 focus:outline-none"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;