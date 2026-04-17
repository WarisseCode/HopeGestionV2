// frontend/src/components/ui/InvitationLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Loader2, X, Link, Search, ChevronRight } from 'lucide-react';
import { API_URL } from '../../config';

interface Entity {
  id: number;
  name: string;
}

interface InvitationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'owner' | 'tenant';
  entities: Entity[];
}

const InvitationLinkModal: React.FC<InvitationLinkModalProps> = ({
  isOpen, onClose, type, entities
}) => {
  const [step, setStep] = useState<'select' | 'link'>('select');
  const [selected, setSelected] = useState<Entity | null>(null);
  const [search, setSearch] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('select');
    setSelected(null);
    setSearch('');
    setLink('');
    setError('');
    setCopied(false);
  }, [isOpen]);

  const filtered = entities.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (entity: Entity) => {
    setSelected(entity);
    setStep('link');
    setLoading(true);
    setLink('');
    setError('');

    try {
      const token = localStorage.getItem('userToken');
      const body: Record<string, any> = { type };
      if (type === 'tenant') body.tenant_id = entity.id;
      if (type === 'owner') body.owner_id = entity.id;

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
      `Bonjour ${selected?.name},\n\nVous êtes invité(e) à accéder à votre espace ${type === 'owner' ? 'propriétaire' : 'locataire'} sur Hope Gestion.\n\nCliquez sur ce lien pour créer votre compte :\n${link}\n\nCe lien est valable 7 jours.`
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
              <h3 className="font-bold text-base-content">Inviter un {roleLabel.toLowerCase()}</h3>
              <p className="text-xs text-base-content/60">
                {step === 'select' ? 'Sélectionnez la personne à inviter' : `Lien pour ${selected?.name}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — Sélection */}
        {step === 'select' && (
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input input-bordered w-full pl-9 input-sm"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-base-content/40 py-6 text-sm">Aucun résultat</p>
              ) : filtered.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => handleSelect(entity)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-base-200 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${roleColor}`}>
                      {entity.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{entity.name}</span>
                  </div>
                  <ChevronRight size={16} className="text-base-content/30 group-hover:text-base-content/60 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Lien généré */}
        {step === 'link' && (
          <div className="p-6 space-y-4">
            {loading && (
              <div className="flex items-center justify-center gap-3 py-8 text-base-content/50">
                <Loader2 className="animate-spin" size={20} />
                <span>Génération du lien...</span>
              </div>
            )}

            {error && !loading && (
              <div className="alert alert-error text-sm">
                <span>{error}</span>
                <button onClick={() => selected && handleSelect(selected)} className="btn btn-xs btn-ghost ml-auto">
                  Réessayer
                </button>
              </div>
            )}

            {link && !loading && (
              <>
                <p className="text-sm text-base-content/60">
                  Partagez ce lien avec <strong>{selected?.name}</strong> pour qu'il crée son compte et accède à son espace.
                </p>

                <div className="bg-base-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-xs font-mono text-base-content/70 flex-1 truncate">{link}</span>
                  <button
                    onClick={handleCopy}
                    className={`btn btn-sm btn-ghost shrink-0 ${copied ? 'text-success' : ''}`}
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
                    WhatsApp
                  </button>
                </div>

                <p className="text-xs text-base-content/40 text-center">Ce lien expire dans 7 jours</p>
              </>
            )}

            <button
              onClick={() => { setStep('select'); setLink(''); setError(''); }}
              className="btn btn-ghost btn-sm w-full"
            >
              ← Choisir un autre {roleLabel.toLowerCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationLinkModal;
