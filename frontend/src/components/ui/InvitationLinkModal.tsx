// frontend/src/components/ui/InvitationLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Loader2, X, Send } from 'lucide-react';
import { API_URL } from '../../config';

interface InvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'owner' | 'tenant';
}

type Step = 'idle' | 'generating' | 'link' | 'error';

const InvitationLinkModal: React.FC<InvitationLinkModalProps> = ({ isOpen, onClose, type }) => {
  const [step, setStep] = useState<Step>('idle');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('idle');
    setLink('');
    setError('');
    setCopied(false);
  }, [isOpen]);

  const handleGenerate = async () => {
    setError('');
    setStep('generating');

    try {
      const token = localStorage.getItem('userToken');
      const r = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Erreur lors de la création');
        setStep('error');
        return;
      }

      setLink(data.link);
      setStep('link');
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
      setStep('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const roleLabel = type === 'owner' ? 'propriétaire' : 'locataire';
    const msg = encodeURIComponent(
      `Bonjour,\n\nVous êtes invité(e) à accéder à votre espace ${roleLabel} sur Hope Gestion.\n\nCliquez sur ce lien pour créer votre compte :\n${link}\n\nCe lien est valable 7 jours.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (!isOpen) return null;

  const roleLabel = type === 'owner' ? 'Propriétaire' : 'Locataire';
  const accentColor = type === 'owner' ? 'text-blue-600' : 'text-green-600';
  const accentBg = type === 'owner' ? 'bg-blue-50' : 'bg-green-50';
  const btnClass = type === 'owner' ? 'btn-primary' : 'btn-success text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accentBg} ${accentColor}`}>
              <Send size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base-content">Inviter un {roleLabel.toLowerCase()}</h3>
              <p className="text-xs text-base-content/60">
                {step === 'link'
                  ? 'Lien généré — partagez-le avec la personne'
                  : `Générez un lien d'invitation pour un nouveau ${roleLabel.toLowerCase()}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* État idle / generating */}
          {(step === 'idle' || step === 'generating') && (
            <>
              <p className="text-sm text-base-content/60">
                Cliquez sur le bouton ci-dessous pour générer un lien unique.
                La personne recevra ce lien et devra remplir ses informations pour créer son compte.
              </p>
              <p className="text-xs text-base-content/40">Le lien sera valide pendant 7 jours.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1" disabled={step === 'generating'}>
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className={`btn flex-1 ${btnClass}`}
                  disabled={step === 'generating'}
                >
                  {step === 'generating'
                    ? <><Loader2 className="animate-spin mr-2" size={16} />Génération...</>
                    : <><Send size={16} className="mr-2" />Générer le lien</>}
                </button>
              </div>
            </>
          )}

          {/* Erreur */}
          {step === 'error' && (
            <>
              <div className="alert alert-error text-sm py-2">{error}</div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Fermer</button>
                <button type="button" onClick={() => setStep('idle')} className={`btn flex-1 ${btnClass}`}>Réessayer</button>
              </div>
            </>
          )}

          {/* Lien généré */}
          {step === 'link' && (
            <>
              <div className={`${accentBg} rounded-xl p-3 flex items-center gap-2`}>
                <span className={`text-xs font-bold ${accentColor}`}>✓ Lien généré</span>
                <span className="text-xs text-base-content/60">— à partager avec le/la {roleLabel.toLowerCase()}</span>
              </div>

              <p className="text-sm text-base-content/60">
                Partagez ce lien. La personne devra remplir ses informations complètes pour finaliser son inscription.
              </p>

              <div className="bg-base-200 rounded-xl p-3 flex items-center gap-2">
                <span className="text-xs font-mono text-base-content/70 flex-1 truncate">{link}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copier le lien"
                  className={`btn btn-sm btn-ghost shrink-0 ${copied ? 'text-success' : ''}`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`btn btn-outline btn-sm gap-2 ${copied ? 'btn-success' : ''}`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copié !' : 'Copier le lien'}
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="btn btn-sm gap-2 bg-green-500 hover:bg-green-600 text-white border-none"
                >
                  <Share2 size={16} />
                  WhatsApp
                </button>
              </div>

              <p className="text-xs text-base-content/40 text-center">Ce lien expire dans 7 jours</p>

              <button
                type="button"
                onClick={() => { setStep('idle'); setLink(''); }}
                className="btn btn-ghost btn-sm w-full"
              >
                + Générer un autre lien
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationLinkModal;
