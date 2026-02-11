// src/components/ui/Input.tsx
import React, { useState, useEffect, useId } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  showErrorIcon?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  required,
  error,
  helperText,
  startIcon,
  endIcon,
  showErrorIcon = true,
  className = '',
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const hasError = !!error;
  const [shake, setShake] = useState(false);

  // Déclenche l'animation shake quand une nouvelle erreur apparaît
  useEffect(() => {
    if (hasError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error, hasError]);
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      <div 
        className={`
          relative rounded-xl 
          ${hasError ? 'border-error' : 'border-gray-200'} 
          border-2
          ${hasError ? 'focus-within:border-error' : 'focus-within:border-primary'} 
          focus-within:ring-2 
          ${hasError ? 'focus-within:ring-error/20' : 'focus-within:ring-primary/20'} 
          transition-all duration-200
          bg-white
          ${shake ? 'animate-shake' : ''}
        `}
      >
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            {startIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          {...props}
          className={`
            w-full py-3 px-4 
            ${startIcon ? 'pl-11' : ''} 
            ${endIcon || (hasError && showErrorIcon) ? 'pr-11' : ''} 
            bg-transparent border-0 
            focus:ring-0 focus:outline-none 
            text-gray-900 
            placeholder:text-gray-400
            text-sm
            ${className}
          `}
        />
        {hasError && showErrorIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-error">
            <AlertCircle size={18} />
          </div>
        ) : endIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400">
            {endIcon}
          </div>
        ) : null}
      </div>
      {helperText && !hasError && (
        <p id={helperId} className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
      {hasError && (
        <p id={errorId} className="mt-1.5 text-sm text-error flex items-center gap-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
