// src/components/ui/Select.tsx
// Composant Select amélioré avec recherche et rétrocompatibilité complète
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Interface compatible avec l'ancienne version
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  required,
  error,
  helperText,
  startIcon,
  options,
  placeholder = 'Sélectionner...',
  value,
  onChange,
  searchable = false,
  searchPlaceholder = 'Rechercher...',
  clearable = false,
  disabled = false,
  className = '',
  ...nativeProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const hasError = !!error;

  // Si pas searchable, utiliser le select natif pour la rétrocompatibilité
  const useNativeSelect = !searchable;

  // Fermer quand on clique en dehors
  useEffect(() => {
    if (!useNativeSelect) {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [useNativeSelect]);

  // Focus sur l'input de recherche à l'ouverture
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Handler pour le select custom qui simule un event natif
  const handleCustomSelect = useCallback((newValue: string | number) => {
    if (!onChange || !selectRef.current) return;
    
    // Créer un event synthétique qui ressemble à un ChangeEvent<HTMLSelectElement>
    const nativeEvent = new Event('change', { bubbles: true });
    Object.defineProperty(nativeEvent, 'target', {
      writable: false,
      value: { value: String(newValue), name: nativeProps.name }
    });
    
    // Mettre à jour la valeur du select caché
    selectRef.current.value = String(newValue);
    
    // Déclencher l'onChange avec un event qui a target.value
    onChange(nativeEvent as unknown as React.ChangeEvent<HTMLSelectElement>);
    
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange, nativeProps.name]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleCustomSelect('');
  }, [handleCustomSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
    if (e.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  // ========== RENDU SELECT NATIF (mode par défaut pour rétrocompatibilité) ==========
  if (useNativeSelect) {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {label} {required && <span className="text-error">*</span>}
          </label>
        )}
        <div
          className={`
            relative rounded-xl 
            ${hasError ? 'border-error' : 'border-gray-200'} 
            border-2
            ${hasError ? 'focus-within:border-error focus-within:ring-error/20' : 'focus-within:border-primary focus-within:ring-primary/20'} 
            focus-within:ring-2
            transition-all duration-200
            bg-white
          `}
        >
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              {startIcon}
            </div>
          )}
          <select
            ref={selectRef}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`
              w-full py-3 px-4 
              ${startIcon ? 'pl-11' : ''} 
              pr-10 
              bg-transparent border-0 
              focus:ring-0 focus:outline-none 
              text-gray-900 
              appearance-none cursor-pointer
              disabled:opacity-60 disabled:cursor-not-allowed
              text-sm
            `}
            {...nativeProps}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <ChevronDown size={18} />
          </div>
        </div>
        {helperText && !hasError && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
        {hasError && (
          <p className="mt-1.5 text-sm text-error font-medium">{error}</p>
        )}
      </div>
    );
  }

  // ========== RENDU SELECT CUSTOM (searchable=true) ==========
  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      {/* Select caché pour la gestion de la valeur */}
      <select
        ref={selectRef}
        value={value}
        onChange={onChange}
        style={{ display: 'none' }}
        {...nativeProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Trigger Button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          relative rounded-xl cursor-pointer
          ${hasError ? 'border-error' : 'border-gray-200'} 
          border-2
          ${isOpen ? (hasError ? 'border-error ring-2 ring-error/20' : 'border-primary ring-2 ring-primary/20') : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white hover:border-gray-300'}
          transition-all duration-200
        `}
      >
        <div className="flex items-center">
          {startIcon && (
            <div className="pl-3.5 flex items-center text-gray-400">
              {startIcon}
            </div>
          )}
          
          <div className={`flex-1 py-3 px-4 ${startIcon ? 'pl-2' : ''} text-sm truncate`}>
            {selectedOption ? (
              <span className="text-gray-900">{selectedOption.label}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center pr-3 gap-1">
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <ChevronDown 
              size={18} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Options List */}
            <ul 
              role="listbox" 
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 text-center">
                  Aucun résultat
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = String(option.value) === String(value);
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => !option.disabled && handleCustomSelect(option.value)}
                      className={`
                        px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between
                        ${option.disabled ? 'text-gray-300 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}
                        transition-colors
                      `}
                    >
                      {/* Highlight search match */}
                      {searchQuery ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: option.label.replace(
                              new RegExp(`(${searchQuery})`, 'gi'),
                              '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>'
                            ),
                          }}
                        />
                      ) : (
                        <span>{option.label}</span>
                      )}
                      {isSelected && <Check size={16} className="text-primary" />}
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper/Error Text */}
      {helperText && !hasError && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
      {hasError && (
        <p className="mt-1.5 text-sm text-error font-medium">{error}</p>
      )}
    </div>
  );
};

export default Select;
