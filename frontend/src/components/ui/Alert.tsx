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
    info: 'bg-info/10 text-info-content border-info/20',
    success: 'bg-success/10 text-success-content border-success/20',
    warning: 'bg-warning/10 text-warning-content border-warning/20',
    error: 'bg-error/10 text-error-content border-error/20'
  };
  
  const iconMap = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle2 className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />
  };
  
  const icon = iconMap[variant];
  
  return (
    <div className={`border rounded-lg p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3 flex-1">
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