import type { Locataire } from '../api/locataireApi';

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-green-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-700', 'bg-teal-400', 'bg-red-500',
];

export const getAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export type PaymentStatus = 'paid' | 'pending' | 'late' | 'unknown';

export const getPaymentStatus = (locataire: Locataire): PaymentStatus => {
  if (!locataire.loyer_actuel) return 'unknown';
  return (locataire as any).payment_status || 'unknown';
};
