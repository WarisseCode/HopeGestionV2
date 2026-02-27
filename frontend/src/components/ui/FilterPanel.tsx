// src/components/ui/FilterPanel.tsx
// Panneau de filtres dynamique et réutilisable
import React, { useState, useCallback } from 'react';
import { Filter, X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

export interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multi-select' | 'range' | 'date-range' | 'toggle';
  options?: FilterOption[];
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: string | number | boolean | string[] | number[] | { min?: number; max?: number } | { start?: string; end?: string };
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showActiveCount?: boolean;
  layout?: 'horizontal' | 'vertical';
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  onClear,
  className = '',
  collapsible = true,
  defaultExpanded = false,
  showActiveCount = true,
  layout = 'horizontal',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Compte les filtres actifs
  const activeFiltersCount = Object.entries(values).filter(([, v]) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === 'object' && !Array.isArray(v)) {
      return Object.values(v).some(val => val !== null && val !== undefined && val !== '');
    }
    return true;
  }).length;

  const handleFilterChange = useCallback((filterId: string, newValue: FilterValues[string]) => {
    onChange({ ...values, [filterId]: newValue });
  }, [values, onChange]);

  const handleClearAll = useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      // Reset par défaut
      const clearedValues: FilterValues = {};
      filters.forEach(filter => {
        clearedValues[filter.id] = filter.type === 'multi-select' ? [] : '';
      });
      onChange(clearedValues);
    }
  }, [filters, onChange, onClear]);

  const renderFilter = (filter: FilterConfig) => {
    const currentValue = values[filter.id];

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={currentValue as string || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="select select-bordered select-sm w-full bg-white focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="">{filter.placeholder || `Tous les ${filter.label.toLowerCase()}`}</option>
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {option.count !== undefined && `(${option.count})`}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        const selectedValues = (currentValue as string[]) || [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {filter.options?.map((option) => {
              const isSelected = selectedValues.includes(String(option.value));
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== String(option.value))
                      : [...selectedValues, String(option.value)];
                    handleFilterChange(filter.id, newValues);
                  }}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-full transition-all
                    ${isSelected
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {option.label}
                  {option.count !== undefined && (
                    <span className={`ml-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                      ({option.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'toggle':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue as boolean || false}
              onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
            <span className="text-sm text-gray-600">{filter.placeholder || filter.label}</span>
          </label>
        );

      case 'range':
        const rangeValue = (currentValue as { min?: number; max?: number }) || {};
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={rangeValue.min || ''}
              min={filter.min}
              max={filter.max}
              onChange={(e) => handleFilterChange(filter.id, { ...rangeValue, min: e.target.value ? Number(e.target.value) : undefined })}
              className="input input-bordered input-sm w-24"
            />
            <span className="text-gray-400">—</span>
            <input
              type="number"
              placeholder="Max"
              value={rangeValue.max || ''}
              min={filter.min}
              max={filter.max}
              onChange={(e) => handleFilterChange(filter.id, { ...rangeValue, max: e.target.value ? Number(e.target.value) : undefined })}
              className="input input-bordered input-sm w-24"
            />
          </div>
        );

      case 'date-range':
        const dateValue = (currentValue as { start?: string; end?: string }) || {};
        return (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateValue.start || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...dateValue, start: e.target.value })}
              className="input input-bordered input-sm"
            />
            <span className="text-gray-400">—</span>
            <input
              type="date"
              value={dateValue.end || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...dateValue, end: e.target.value })}
              className="input input-bordered input-sm"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const filterContent = (
    <div className={`${layout === 'horizontal' ? 'flex flex-wrap items-end gap-4' : 'space-y-4'}`}>
      {filters.map((filter) => (
        <div key={filter.id} className={layout === 'horizontal' ? 'min-w-[180px]' : ''}>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {filter.label}
          </label>
          {renderFilter(filter)}
        </div>
      ))}
      
      {/* Clear button */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="text-gray-500 hover:text-error"
        >
          <RotateCcw size={14} className="mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <div className={`bg-white rounded-xl p-4 border border-gray-100 ${className}`}>
        {filterContent}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary" />
          <span className="font-semibold text-gray-700">Filtres</span>
          {showActiveCount && activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {/* Active filters badges (when collapsed) */}
      {!isExpanded && activeFiltersCount > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {Object.entries(values).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            const filter = filters.find(f => f.id === key);
            if (!filter) return null;

            let displayValue = '';
            if (Array.isArray(value)) {
              displayValue = value.map(v => 
                filter.options?.find(o => String(o.value) === v)?.label || v
              ).join(', ');
            } else if (typeof value === 'boolean') {
              displayValue = value ? 'Oui' : 'Non';
            } else if (typeof value === 'object') {
              displayValue = Object.entries(value)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => `${k}: ${v}`)
                .join(' - ');
            } else {
              displayValue = filter.options?.find(o => String(o.value) === String(value))?.label || String(value);
            }

            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
              >
                {filter.label}: {displayValue}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFilterChange(key, filter.type === 'multi-select' ? [] : '');
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-gray-100">
              {filterContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterPanel;
