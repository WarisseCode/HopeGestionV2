// frontend/src/pages/EmergencyDisablePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';

const EmergencyDisablePage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/public/maintenance/emergency-disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/admin'), 2500);
      } else if (res.status === 429) {
        setError('Trop de tentatives. Réessayez dans 1 heure.');
      } else {
        setAttempts(a => a + 1);
        const remaining = Math.max(0, 5 - (attempts + 1));
        setError(
          data.message
            ? `${data.message}${remaining > 0 ? ` (${remaining} tentative(s) restante(s))` : ''}`
            : 'Token invalide.'
        );
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        color: '#fff',
      }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: success ? 'rgba(34,197,94,0.2)' : 'rgba(220,38,38,0.2)',
            border: `2px solid ${success ? '#22c55e' : '#dc2626'}`,
            marginBottom: '12px',
          }}>
            {success
              ? <CheckCircle2 size={32} color="#22c55e" />
              : <ShieldAlert size={32} color="#dc2626" />
            }
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            {success ? 'Maintenance désactivée !' : 'Accès d\'urgence'}
          </h1>
          <p style={{ margin: '8px 0 0', opacity: 0.7, fontSize: '14px' }}>
            {success
              ? 'Redirection vers l\'espace admin…'
              : 'Saisissez le token de secours affiché au démarrage du serveur.'
            }
          </p>
        </div>

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Token input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="emergency-token"
                style={{ display: 'block', fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}
              >
                Token de secours
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
                />
                <input
                  id="emergency-token"
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="HOPE-XXXXXX-XXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#fca5a5',
              }}>
                <AlertCircle size={14} strokeWidth={2.5} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token.trim()}
              style={{
                width: '100%',
                padding: '11px',
                background: loading || !token.trim()
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Vérification…</>
                : 'Désactiver la maintenance'
              }
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', opacity: 0.5 }}>
          Limitée à 5 tentatives par heure • Actions auditées
        </p>
      </div>
    </div>
  );
};

export default EmergencyDisablePage;
