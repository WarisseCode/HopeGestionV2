// src/components/ui/Button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-content hover:bg-primary-focus focus:ring-primary shadow-md hover:shadow-lg',
    secondary: 'bg-secondary text-secondary-content hover:bg-secondary-focus focus:ring-secondary shadow-md hover:shadow-lg',
    success: 'bg-success text-success-content hover:bg-success-focus focus:ring-success shadow-md hover:shadow-lg',
    warning: 'bg-warning text-warning-content hover:bg-warning-focus focus:ring-warning shadow-md hover:shadow-lg',
    error: 'bg-error text-error-content hover:bg-error-focus focus:ring-error shadow-md hover:shadow-lg',
    ghost: 'bg-transparent border border-transparent text-base-content hover:bg-base-200 focus:ring-base-300',
    link: 'bg-transparent text-primary hover:text-primary-focus underline-offset-4 hover:underline focus:ring-transparent'
  };
  
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5'
  };

  const spinnerSizes = {
    sm: 14,
    md: 16,
    lg: 18
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${loading ? 'cursor-wait' : ''} ${className}`;
  
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={spinnerSizes[size]} className="animate-spin" />
          {loadingText || children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
};

export default Button;