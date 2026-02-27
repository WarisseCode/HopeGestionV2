// frontend/src/components/ui/Modal.tsx
import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Compteur global pour gérer le z-index des modales empilées
let modalCount = 0;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  blurBackdrop?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md', 
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  blurBackdrop = true,
}) => {
  const [zIndex, setZIndex] = React.useState(50);

  // Gestion du z-index pour les modales empilées
  useEffect(() => {
    if (isOpen) {
      modalCount++;
      setZIndex(50 + modalCount * 10);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      if (isOpen) {
        modalCount--;
        if (modalCount === 0) {
          document.body.style.overflow = '';
        }
      }
    };
  }, [isOpen]);

  // Fermeture avec Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] h-[90vh]'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 bg-black/60 ${blurBackdrop ? 'backdrop-blur-sm' : ''}`}
            style={{ zIndex: zIndex - 1 }}
            onClick={handleBackdropClick}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 overflow-y-auto"
            style={{ zIndex }}
            onClick={handleBackdropClick}
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`
                  relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} 
                  ${size === 'full' ? 'flex flex-col' : 'max-h-[90vh]'}
                  overflow-hidden
                `}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:rotate-90"
                      aria-label="Fermer"
                    >
                      <X size={20} className="text-gray-500" />
                    </button>
                  )}
                </div>
                
                {/* Content */}
                <div className={`p-6 overflow-y-auto ${size === 'full' ? 'flex-1' : 'max-h-[calc(90vh-180px)]'}`}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
