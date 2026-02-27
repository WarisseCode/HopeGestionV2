// src/components/ui/SkeletonLoader.tsx
// Composant de skeleton loading réutilisable avec variantes
import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'table-row';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
  lines?: number; // Pour le variant 'text', nombre de lignes
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  animate = true,
  lines = 1,
}) => {
  const baseClasses = `bg-gray-200 ${animate ? 'animate-pulse' : ''} ${className}`;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'avatar':
        return 'w-12 h-12 rounded-full';
      case 'card':
        return 'rounded-xl';
      case 'table-row':
        return 'h-12 rounded';
      case 'rectangular':
      default:
        return 'rounded-lg';
    }
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || undefined,
  };

  // Pour le variant 'text' avec plusieurs lignes
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantStyles()}`}
            style={{
              ...style,
              // La dernière ligne est plus courte
              width: index === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  // Pour le variant 'card'
  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${getVariantStyles()} p-4`} style={{ width, height: height || 200 }}>
        <div className="flex items-center gap-4 mb-4">
          <SkeletonLoader variant="avatar" animate={animate} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" width="60%" animate={animate} />
            <SkeletonLoader variant="text" width="40%" animate={animate} />
          </div>
        </div>
        <SkeletonLoader variant="text" lines={3} animate={animate} />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantStyles()}`}
      style={style}
    />
  );
};

// Composant utilitaire pour un skeleton de liste
export const SkeletonList: React.FC<{
  count?: number;
  variant?: SkeletonLoaderProps['variant'];
  gap?: number;
  className?: string;
}> = ({ count = 3, variant = 'rectangular', gap = 3, className = '' }) => {
  return (
    <div className={`space-y-${gap} ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader key={index} variant={variant} />
      ))}
    </div>
  );
};

// Composant utilitaire pour un skeleton de KPI
export const SkeletonKPI: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader variant="circular" width={48} height={48} />
        <SkeletonLoader variant="text" width={60} height={24} />
      </div>
      <SkeletonLoader variant="text" width="80%" className="mb-2" />
      <SkeletonLoader variant="text" width="40%" height={32} />
    </div>
  );
};

// Composant utilitaire pour un skeleton de tableau
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl overflow-hidden border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} variant="text" height={16} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 flex gap-4 border-t border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} variant="text" height={20} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
