import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { PaymentStatus } from '../../utils/locataireUtils';

const CONFIGS: Record<PaymentStatus, { icon: React.ElementType | null; label: string; className: string }> = {
  paid:    { icon: CheckCircle2, label: 'Payé',       className: 'bg-green-100 text-green-700' },
  pending: { icon: Clock,        label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  late:    { icon: AlertCircle,  label: 'En retard',  className: 'bg-red-100 text-red-700' },
  unknown: { icon: null,         label: '-',          className: 'bg-base-300 text-base-content/60' },
};

const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const { icon: Icon, label, className } = CONFIGS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${className}`}>
      {Icon && <Icon size={12} />}
      {label}
    </span>
  );
};

export default PaymentStatusBadge;
