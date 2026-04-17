// frontend/src/components/ui/InvitationLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Loader2, X, Link } from 'lucide-react';
import { API_URL } from '../../config';

interface InvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'owner' | 'tenant';
  entityId: number;
  entityName: string;
}

const InvitationLinkModal: React.FC<InvitationLinkModalProps> = ({
  isOpen, onClose, type, entityId, entityName
}) => {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLink('');
    setError('');
    setCopied(false);
    generateLink();
  }, [isOpen, type, entityId]);

  const generateLink = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const body: Record<string, any> = { type };
      if (type === 'tenant') body.tenant_id = entityId;
      if (type === 'owner') body.owner_id = entityId;

      const r = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Erreur lors de la génération du lien');
        return;
      }
      setLink(data.link);
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Bonjour ${entityName},\n\nVous êtes invité(e) à accéder à votre espace ${type === 'owner' ? 'propriétaire' : 'locataire'} sur Hope Gestion.\n\nCliquez sur ce lien pour créer votre compte :\n${link}\n\nCe lien est valable 7 jours.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (!isOpen) return null;

  const roleLabel = type === 'owner' ? 'Propriétaire' : 'Locataire';
  const roleColor = type === 'owner' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleColor}`}>
              <Link size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base-content">Lien d'invitation</h3>
              <p className="text-xs text-base-content/60">Espace {roleLabel} — {entityName}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-6 text-base-content/50">
              <Loader2 className="animate-spin" size={20} />
              <span>Génération du lien...</span>
            </div>
          )}

          {error && !loading && (
            <div className="alert alert-error text-sm">
              <span>{error}</span>
              <button onClick={generateLink} className="btn btn-xs btn-ghost ml-auto">Réessayer</button>
            </div>
          )}

          {link && !loading && (
            <>
              <p className="text-sm text-base-content/60">
                Partagez ce lien avec <strong>{entityName}</strong>. Il permettra de créer un compte et d'accéder à son espace directement.
              </p>

              <div className="bg-base-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-xs font-mono text-base-content/70 flex-1 truncate">{link}</span>
                <button
                  onClick={handleCopy}
                  className={`btn btn-sm btn-ghost shrink-0 ${copied ? 'text-success' : ''}`}
                  title="Copier"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className={`btn btn-outline btn-sm gap-2 ${copied ? 'btn-success' : ''}`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="btn btn-sm gap-2 bg-green-500 hover:bg-green-600 text-white border-none"
                >
                  <Share2 size={16} />
                  Envoyer via WhatsApp
                </button>
              </div>

              <p className="text-xs text-base-content/40 text-center">
                Ce lien expire dans 7 jours
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationLinkModal;
