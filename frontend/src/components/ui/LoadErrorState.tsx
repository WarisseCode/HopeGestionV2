// src/components/ui/LoadErrorState.tsx
// État "échec du chargement" à afficher À LA PLACE de l'état vide quand une liste
// n'a pas pu être chargée (T-042). Sans lui, une erreur serveur se présentait comme
// « Aucun élément trouvé », ce qui fait croire à l'utilisateur que ses données ont disparu.
// Simple variante d'EmptyState (même carte, même bouton) pour rester dans le design system.
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';

interface LoadErrorStateProps {
  /** Message renvoyé par le serveur (ou message de repli). */
  message?: string | null;
  /** Relance le chargement ; le bouton « Réessayer » n'apparaît que si fourni. */
  onRetry?: () => void;
  className?: string;
}

const LoadErrorState: React.FC<LoadErrorStateProps> = ({ message, onRetry, className = '' }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<AlertTriangle size={40} className="text-error" />}
      title={t('common.loadError')}
      description={message || t('common.loadError')}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
      className={className}
    />
  );
};

export default LoadErrorState;
