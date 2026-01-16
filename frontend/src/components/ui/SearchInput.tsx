// src/components/ui/SearchInput.tsx
// Composant de recherche réutilisable avec debounce intégré
import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showClearButton?: boolean;
  autoFocus?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Rechercher...',
  value: externalValue,
  onChange,
  onSearch,
  debounceMs = 300,
  loading = false,
  className = '',
  size = 'md',
  showClearButton = true,
  autoFocus = false,
}) => {
  // État interne si non contrôlé
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const value = externalValue !== undefined ? externalValue : internalValue;

  // Debounce
  useEffect(() => {
    if (!onSearch || debounceMs <= 0) return;
    
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (externalValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [externalValue, onChange]);

  const handleClear = useCallback(() => {
    if (externalValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    onSearch?.('');
  }, [externalValue, onChange, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [value, onSearch, handleClear]);

  const sizeClasses = {
    sm: 'h-9 text-sm pl-9 pr-8',
    md: 'h-11 text-base pl-11 pr-10',
    lg: 'h-13 text-lg pl-12 pr-11',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const iconPositions = {
    sm: 'left-2.5',
    md: 'left-3.5',
    lg: 'left-4',
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Search Icon */}
      <Search 
        size={iconSizes[size]} 
        className={`absolute ${iconPositions[size]} top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none`}
      />
      
      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full ${sizeClasses[size]} 
          bg-white/80 backdrop-blur-sm
          border border-gray-200 
          rounded-full 
          focus:border-primary focus:ring-2 focus:ring-primary/20
          shadow-sm hover:shadow-md
          transition-all duration-200
          placeholder:text-gray-400
          outline-none
        `}
      />

      {/* Loading or Clear button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {loading ? (
          <Loader2 size={iconSizes[size]} className="text-primary animate-spin" />
        ) : (
          showClearButton && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={iconSizes[size] - 2} className="text-gray-400 hover:text-gray-600" />
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default SearchInput;
