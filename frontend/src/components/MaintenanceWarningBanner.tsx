// frontend/src/components/MaintenanceWarningBanner.tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  scheduledAt: string;   // ISO timestamp
  message: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}

const SESSION_KEY = 'maintenance_warning_dismissed';

const MaintenanceWarningBanner: React.FC<Props> = ({ scheduledAt, message }) => {
  const [remaining, setRemaining] = useState<number>(0);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === scheduledAt;
  });

  useEffect(() => {
    const target = new Date(scheduledAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      setRemaining(Math.max(0, diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduledAt]);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, scheduledAt);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '14px',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <AlertTriangle size={18} strokeWidth={2.5} />
        <span>
          <strong>Maintenance prévue</strong> dans{' '}
          <strong
            style={{
              fontSize: '16px',
              fontVariantNumeric: 'tabular-nums',
              background: 'rgba(0,0,0,0.2)',
              padding: '1px 8px',
              borderRadius: '4px',
            }}
          >
            {formatCountdown(remaining)}
          </strong>
          {' '}— Sauvegardez votre travail.
        </span>
        <span style={{ opacity: 0.85, fontSize: '12px' }}>{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Ignorer ce message"
        style={{
          background: 'rgba(0,0,0,0.15)',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <X size={14} /> Ignorer
      </button>
    </div>
  );
};

export default MaintenanceWarningBanner;
