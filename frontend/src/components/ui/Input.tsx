// src/components/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  startIcon,
  endIcon,
  className = '',
  ...props
}) => {
  const hasError = !!error;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-base-content mb-1">
          {label}
        </label>
      )}
      <div className={`relative rounded-lg ${hasError ? 'border-error' : 'border-base-300'} border ${hasError ? 'focus-within:border-error' : 'focus-within:border-primary'} focus-within:ring-1 ${hasError ? 'focus-within:ring-error/50' : 'focus-within:ring-primary/50'} transition-colors`}>
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/50">
            {startIcon}
          </div>
        )}
        <input
          {...props}
          className={`w-full py-2.5 px-3 ${startIcon ? 'pl-10' : ''} ${endIcon ? 'pr-10' : ''} bg-transparent border-0 focus:ring-0 focus:outline-none text-base-content placeholder-base-content/50 ${className}`}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/50">
            {endIcon}
          </div>
        )}
      </div>
      {helperText && !hasError && (
        <p className="mt-1 text-sm text-base-content/60">{helperText}</p>
      )}
      {hasError && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export default Input;