// frontend/src/components/AdminMaintenanceBanner.tsx
import React, { useState } from 'react';
import { ShieldAlert, PowerOff, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

function getToken(): string | null {
  return localStorage.getItem('userToken');
}

interface Props {
  /** Callback appelé après désactivation réussie pour re-vérifier l'état */
  onDisabled: () => void;
}

const AdminMaintenanceBanner: React.FC<Props> = ({ onDisabled }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDisable = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/maintenance/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Erreur ${res.status}`);
        return;
      }
      onDisabled();
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #dc2626 0%, #991b1b 100%)',
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        fontSize: '14px',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldAlert size={18} strokeWidth={2.5} />
        <span>
          <strong>MODE MAINTENANCE ACTIF</strong>
          {' '}— Le site est inaccessible pour les utilisateurs.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {error && (
          <span style={{ fontSize: '12px', opacity: 0.9, color: '#fca5a5' }}>{error}</span>
        )}
        <button
          onClick={handleDisable}
          disabled={loading}
          aria-label="Désactiver le mode maintenance"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '5px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.25)'; }}
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Désactivation…</>
            : <><PowerOff size={14} /> Désactiver</>
          }
        </button>
      </div>
    </div>
  );
};

export default AdminMaintenanceBanner;
