// frontend/src/components/ui/InvitationLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Loader2, X, Send } from 'lucide-react';
import { API_URL } from '../../config';

interface InvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'owner' | 'tenant';
}

type Step = 'form' | 'submitting' | 'link';

const InvitationLinkModal: React.FC<InvitationLinkModalProps> = ({ isOpen, onClose, type }) => {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '' });
  const [link, setLink] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('form');
    setForm({ nom: '', prenom: '', telephone: '', email: '' });
    setLink('');
    setError('');
    setCopied(false);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.telephone) {
      setError('Nom et téléphone sont requis');
      return;
    }
    setError('');
    setStep('submitting');

    try {
      const token = localStorage.getItem('userToken');
      const r = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          nom: form.nom,
          prenom: form.prenom || undefined,
          telephone: form.telephone,
          email: form.email || undefined
        })
      });

      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Erreur lors de la création');
        setStep('form');
        return;
      }

      setLink(data.link);
      setInviteeName(`${form.prenom || ''} ${form.nom}`.trim());
      setStep('link');
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
      setStep('form');
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
      `Bonjour ${inviteeName},\n\nVous êtes invité(e) à accéder à votre espace ${roleLabel} sur Hope Gestion.\n\nCliquez sur ce lien pour créer votre compte :\n${link}\n\nCe lien est valable 7 jours.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (!isOpen) return null;

  const roleLabel = type === 'owner' ? 'Propriétaire' : 'Locataire';
  const accentColor = type === 'owner' ? 'text-blue-600' : 'text-green-600';
  const accentBg = type === 'owner' ? 'bg-blue-50' : 'bg-green-50';

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
                {step === 'link' ? `Lien généré pour ${inviteeName}` : 'Renseignez les informations de la personne'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        </div>

        {/* Formulaire */}
        {(step === 'form' || step === 'submitting') && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="alert alert-error text-sm py-2">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">Nom <span className="text-error">*</span></span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="Dupont"
                  required
                  disabled={step === 'submitting'}
                />
              </div>
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">Prénom(s)</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={form.prenom}
                  onChange={e => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Jean"
                  disabled={step === 'submitting'}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Téléphone <span className="text-error">*</span></span>
              </label>
              <input
                type="tel"
                className="input input-bordered w-full"
                value={form.telephone}
                onChange={e => setForm({ ...form, telephone: e.target.value })}
                placeholder="+229 01 00 00 00"
                required
                disabled={step === 'submitting'}
              />
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered w-full"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="jean@exemple.com"
                disabled={step === 'submitting'}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1" disabled={step === 'submitting'}>
                Annuler
              </button>
              <button
                type="submit"
                className={`btn flex-1 ${type === 'owner' ? 'btn-primary' : 'btn-success text-white'}`}
                disabled={step === 'submitting'}
              >
                {step === 'submitting'
                  ? <><Loader2 className="animate-spin mr-2" size={16} />Création...</>
                  : <><Send size={16} className="mr-2" />Générer le lien</>}
              </button>
            </div>
          </form>
        )}

        {/* Lien généré */}
        {step === 'link' && (
          <div className="p-6 space-y-4">
            <div className={`${accentBg} rounded-xl p-3 flex items-center gap-2`}>
              <span className={`text-xs font-bold ${accentColor}`}>✓ {roleLabel} créé(e)</span>
              <span className="text-xs text-base-content/60">— {inviteeName}</span>
            </div>

            <p className="text-sm text-base-content/60">
              Partagez ce lien avec <strong>{inviteeName}</strong> pour qu'il/elle crée son compte et accède à son espace.
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
              onClick={() => { setStep('form'); setForm({ nom: '', prenom: '', telephone: '', email: '' }); }}
              className="btn btn-ghost btn-sm w-full"
            >
              + Inviter une autre personne
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationLinkModal;
