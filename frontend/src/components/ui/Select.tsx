// src/components/ui/Select.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  required,
  error,
  helperText,
  startIcon,
  options,
  placeholder,
  className = '',
  ...props
}) => {
  const hasError = !!error;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-base-content mb-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div
        className={`relative rounded-lg ${hasError ? 'border-error' : 'border-base-300'} border ${hasError ? 'focus-within:border-error' : 'focus-within:border-primary'} focus-within:ring-1 ${hasError ? 'focus-within:ring-error/50' : 'focus-within:ring-primary/50'} transition-colors bg-base-100`}
      >
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/50">
            {startIcon}
          </div>
        )}
        <select
          {...props}
          className={`w-full py-2.5 px-3 ${startIcon ? 'pl-10' : ''} pr-10 bg-transparent border-0 focus:ring-0 focus:outline-none text-base-content appearance-none cursor-pointer ${className}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-base-content/50">
          <ChevronDown size={16} />
        </div>
      </div>
      {helperText && !hasError && (
        <p className="mt-1 text-sm text-base-content/60">{helperText}</p>
      )}
      {hasError && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

export default Select;
