import React from 'react';

export type BadgeVariant =
  | 'success' | 'error' | 'warning' | 'info'
  | 'neutral' | 'ghost' | 'primary' | 'secondary';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success:   'badge-success',
  error:     'badge-error',
  warning:   'badge-warning',
  info:      'badge-info',
  neutral:   'badge-neutral',
  ghost:     'badge-ghost',
  primary:   'badge-primary',
  secondary: 'badge-secondary',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'badge-sm text-[11px]',
  md: '',
  lg: 'badge-lg',
};

// Maps common status strings to variants so callers avoid duplicating switch/maps.
const STATUS_MAP: Record<string, BadgeVariant> = {
  actif: 'success', active: 'success', payé: 'success', paid: 'success',
  inactif: 'neutral', inactive: 'neutral',
  en_attente: 'warning', pending: 'warning', 'en attente': 'warning',
  retard: 'error', late: 'error', impayé: 'error',
  expiré: 'error', expire: 'error', resilié: 'error',
  signe: 'info', signé: 'info',
  termine: 'neutral', terminé: 'neutral',
};

/** Resolve a plain status string to a BadgeVariant. */
export function statusToVariant(status: string): BadgeVariant {
  return STATUS_MAP[status?.toLowerCase()] ?? 'ghost';
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'ghost',
  size = 'md',
  children,
  className = '',
  dot = false,
}) => (
  <span className={`badge font-semibold ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />}
    {children}
  </span>
);

export default Badge;
