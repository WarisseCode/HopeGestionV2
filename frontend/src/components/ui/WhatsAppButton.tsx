import React from 'react';
import { MessageCircle } from 'lucide-react';
import Button from './Button';

interface WhatsAppButtonProps {
    phoneNumber?: string;
    message?: string;
    label?: string;
    variant?: 'primary' | 'outline' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
    phoneNumber,
    message = 'Bonjour, je vous contacte via Hope Immo.',
    label = 'WhatsApp',
    variant = 'success',
    size = 'sm',
    className = ''
}) => {

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!phoneNumber) {
            console.warn('No phone number provided for WhatsApp button');
            return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (!phoneNumber) return null;

    return (
        <Button
            variant={variant === 'success' ? 'primary' : variant} // Fallback to primary if success not defined in Button
            size={size}
            onClick={handleClick}
            className={`bg-green-500 hover:bg-green-600 text-white border-green-500 ${className}`}
        >
            <MessageCircle size={16} className="mr-1" />
            {label}
        </Button>
    );
};

export default WhatsAppButton;
