import React from 'react';
import { motion } from 'framer-motion';
import Button from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ''
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center p-12 text-center bg-base-100 rounded-2xl border border-base-200 border-dashed ${className}`}
    >
      <div className="w-20 h-20 mb-6 rounded-full bg-base-200/50 flex items-center justify-center text-base-content/60 ring-8 ring-base-100/50">
        {icon}
      </div>
      
      <h3 className="text-xl font-bold text-base-content mb-2">{title}</h3>
      <p className="text-base-content/60 max-w-md mb-8 leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          variant="primary" 
          onClick={onAction}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold px-8"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
