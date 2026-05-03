// frontend/src/components/SubscriptionBadge.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Zap, Star, AlertCircle } from 'lucide-react';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';

const SubscriptionBadge: React.FC = () => {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getSubscriptionStatus();
                setStatus(data);
            } catch (error) {
                console.error('Error fetching subscription:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, []);

    if (loading || !status) return null;

    const getIcon = () => {
        switch (status.plan?.name) {
            case 'pro': return <Crown className="text-amber-500" size={14} />;
            case 'enterprise': return <Star className="text-teal-500" size={14} />;
            default: return <Zap className="text-base-content/50" size={14} />;
        }
    };

    const getBadgeStyle = () => {
        switch (status.plan?.name) {
            case 'pro': return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200';
            case 'enterprise': return 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border-teal-200';
            default: return 'bg-base-300 text-base-content/70 border-base-300';
        }
    };

    const isExpiringSoon = status.days_remaining !== null && status.days_remaining !== undefined && status.days_remaining <= 7;

    return (
        <Link 
            to="/dashboard/abonnement" 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition hover:shadow-md ${getBadgeStyle()}`}
            title={status.days_remaining ? `Expire dans ${status.days_remaining} jours` : 'Gérer votre abonnement'}
        >
            {getIcon()}
            <span>{status.plan?.display_name || 'Gratuit'}</span>
            {isExpiringSoon && (
                <AlertCircle className="text-orange-500 animate-pulse" size={12} />
            )}
        </Link>
    );
};

export default SubscriptionBadge;
