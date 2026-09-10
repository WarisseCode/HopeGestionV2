/**
 * @hopegestion/utils — Formatage et utilitaires partagés
 * Compatible web + mobile (pas de DOM, pas de window)
 */

// ─── Devises ─────────────────────────────────────────────────────────────────

const DEFAULT_CURRENCY = 'XOF'; // Franc CFA Afrique de l'Ouest

/**
 * Formate un montant en devise locale (FCFA par défaut).
 * Utilise Intl.NumberFormat (disponible sur Web et React Native).
 */
export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY,
  locale = 'fr-BJ'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR');
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en format lisible (ex: "15 septembre 2026")
 */
export function formatDate(dateStr: string | undefined | null, locale = 'fr-FR'): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Formate une date en format court (ex: "15/09/2026")
 */
export function formatDateShort(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

/**
 * Retourne "Il y a X jours/heures" (relative time)
 */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return formatDateShort(dateStr);
}

// ─── Texte ────────────────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getInitials(nom: string, prenoms?: string): string {
  const firstInitial = nom?.charAt(0)?.toUpperCase() || '';
  const secondInitial = prenoms?.charAt(0)?.toUpperCase() || '';
  return `${firstInitial}${secondInitial}`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

// ─── Statuts ──────────────────────────────────────────────────────────────────

export const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif',
  inactif: 'Inactif',
  disponible: 'Disponible',
  occupe: 'Occupé',
  maintenance: 'En maintenance',
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  ferme: 'Fermé',
  paid: 'Payé',
  late: 'En retard',
  pending: 'En attente',
};

export function getStatutLabel(statut: string): string {
  return STATUT_LABELS[statut] || capitalize(statut.replace(/_/g, ' '));
}

// ─── Téléphone ────────────────────────────────────────────────────────────────

/**
 * Génère le lien tel: pour un appel téléphonique natif
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  return `tel:${cleaned}`;
}

/**
 * Génère le lien WhatsApp deep link
 */
export function getWhatsAppLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/[\s+]/g, '');
  const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleaned}${encodedMsg}`;
}
