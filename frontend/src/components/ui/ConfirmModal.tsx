import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'danger',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    isLoading = false
}) => {
    // Configuration selon le type
    const config = {
        danger: {
            icon: Trash2,
            color: 'text-red-600',
            bgIcon: 'bg-red-100',
            btn: 'bg-red-600 hover:bg-red-700 text-white',
            ring: 'focus:ring-red-500'
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgIcon: 'bg-orange-100',
            btn: 'bg-orange-600 hover:bg-orange-700 text-white',
            ring: 'focus:ring-orange-500'
        },
        info: {
            icon: Info,
            color: 'text-blue-600',
            bgIcon: 'bg-blue-100',
            btn: 'bg-blue-600 hover:bg-blue-700 text-white',
            ring: 'focus:ring-blue-500'
        }
    };

    const currentConfig = config[type];
    const Icon = currentConfig.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10"
                    >
                        {/* Close button */}
                        {!isLoading && (
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                            >
                                <X size={20} />
                            </button>
                        )}

                        <div className="p-6 text-center">
                            {/* Animated Icon */}
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
                                className={`mx-auto w-16 h-16 rounded-full ${currentConfig.bgIcon} flex items-center justify-center mb-4`}
                            >
                                <Icon size={32} className={currentConfig.color} />
                            </motion.div>

                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {title}
                            </h3>
                            
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                {message}
                            </p>

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={() => !isLoading && onConfirm()}
                                    disabled={isLoading}
                                    className={`px-6 py-2 text-sm font-medium rounded-lg transition shadow-md flex items-center gap-2 ${currentConfig.btn} ${currentConfig.ring} disabled:opacity-70`}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs"></span>
                                            Chargement...
                                        </>
                                    ) : (
                                        confirmLabel
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {/* Progress bar for 'danger' actions purely visual */}
                        {type === 'danger' && !isLoading && (
                            <div className="h-1 bg-red-50 w-full">
                                <div className="h-full bg-red-100 w-full" />
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
