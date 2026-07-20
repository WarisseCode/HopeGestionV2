import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { apiCall } from '../utils/apiUtils';
import { API_URL, API_BASE } from '../config';
import { toast } from 'react-hot-toast';
import { Check, X, ArrowLeft, PenTool, User, Building, Loader2 } from 'lucide-react';

// Convertit un canvas de signature en PNG et l'uploade ; renvoie l'URL persistante.
async function uploadSignature(canvas: HTMLCanvasElement, role: string): Promise<string> {
    const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas vide'))), 'image/png')
    );
    const formData = new FormData();
    formData.append('type', 'document'); // 'type' AVANT 'file' (lecture Multer)
    formData.append('file', new File([blob], `signature-inv-${role}-${Date.now()}.png`, { type: 'image/png' }));
    const resp = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Upload signature échoué');
    return `${API_BASE}${data.files[0].path}`;
}

const InventorySignature: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loadingInventory, setLoadingInventory] = useState(true);
    // Un inventaire d'immeuble (parties communes) n'a pas de locataire associé : seule la
    // signature de l'agent est demandée. Un inventaire de lot demande les deux (ou un refus).
    const [entityType, setEntityType] = useState<'lot' | 'building'>('lot');

    useEffect(() => {
        apiCall<any>(`${API_URL}/inventories/${id}`)
            .then((data) => {
                if (data.statut !== 'brouillon') {
                    toast.error('Cet inventaire est déjà signé ou verrouillé.');
                    navigate(`/dashboard/inventories/${id}`);
                    return;
                }
                setEntityType(data.entity_type === 'building' ? 'building' : 'lot');
            })
            .catch(() => {
                toast.error('Inventaire introuvable');
                navigate('/dashboard/inventories');
            })
            .finally(() => setLoadingInventory(false));
    }, [id]);

    // Refs pour les canvas de signature
    const agentSigRef = useRef<SignatureCanvas>(null);
    const locataireSigRef = useRef<SignatureCanvas>(null);

    const [agentSigned, setAgentSigned] = useState(false);
    const [locataireSigned, setLocataireSigned] = useState(false);

    const [locataireRefuse, setLocataireRefuse] = useState(false);
    const [refusReason, setRefusReason] = useState('');

    const clearSignature = (ref: React.RefObject<SignatureCanvas | null>, setSigned: (val: boolean) => void) => {
        ref.current?.clear();
        setSigned(false);
    };

    const handleSave = async () => {
        if (agentSigRef.current?.isEmpty()) {
            toast.error("La signature de l'agent / gestionnaire est requise");
            return;
        }
        if (entityType === 'lot' && !locataireRefuse && locataireSigRef.current?.isEmpty()) {
            toast.error("Signature du locataire requise (ou cochez « refuse de signer »)");
            return;
        }

        setLoading(true);
        try {
            const agentUrl = await uploadSignature(agentSigRef.current!.getCanvas(), 'agent');

            const signatures: any = {
                agent: { signature_url: agentUrl, date: new Date().toISOString() },
            };

            if (entityType === 'lot') {
                signatures.locataire = locataireRefuse
                    ? { refused: true, reason: refusReason.trim() || null, date: new Date().toISOString() }
                    : { signature_url: await uploadSignature(locataireSigRef.current!.getCanvas(), 'locataire'), date: new Date().toISOString() };
            }

            await apiCall(`${API_URL}/inventories/${id}/sign`, {
                method: 'PUT',
                body: JSON.stringify({ signatures })
            });

            toast.success(locataireRefuse
                ? 'Inventaire finalisé — refus de signature du locataire consigné.'
                : 'Inventaire signé et finalisé !');
            navigate(`/dashboard/inventories/${id}`);
        } catch (error) {
            console.error(error);
            toast.error('Erreur serveur');
        } finally {
            setLoading(false);
        }
    };

    if (loadingInventory) {
        return (
            <div className="min-h-screen flex items-center justify-center gap-2 text-base-content/50">
                <Loader2 size={20} className="animate-spin" /> Chargement…
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-base-content/60 hover:text-base-content mb-6"
            >
                <ArrowLeft size={20} /> Retour
            </button>

            <div className="bg-base-100 p-8 rounded-2xl shadow-sm border border-base-200">
                <h1 className="text-2xl font-bold text-base-content mb-2 flex items-center gap-2">
                    <PenTool className="text-teal-600" />
                    Signature de l'Inventaire
                </h1>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8 flex items-start gap-3">
                    <Building className="text-teal-600 mt-1 shrink-0" size={20} />
                    <div>
                        <h3 className="font-bold text-teal-900 text-sm">Signature en présentiel</h3>
                        <p className="text-sm text-teal-800 mt-1">
                            Cette page est conçue pour être utilisée sur tablette lors de l'inventaire.
                            {entityType === 'lot'
                                ? ' Le gestionnaire et le locataire signent successivement sur le même appareil pour valider le constat immédiatement.'
                                : ' Cet inventaire porte sur un immeuble (parties communes) : seule la signature de l\'agent est requise.'}
                        </p>
                    </div>
                </div>

                <div className={`grid gap-12 ${entityType === 'lot' ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'}`}>
                    {/* Agent Signature */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-base-content/80">
                            <Building size={18} /> Signature Agent / Gestionnaire
                        </div>
                        <div className="border-2 border-dashed border-base-300 rounded-xl bg-base-200 relative h-64">
                            <SignatureCanvas
                                ref={agentSigRef}
                                canvasProps={{className: 'w-full h-full rounded-xl'}}
                                onEnd={() => setAgentSigned(true)}
                                backgroundColor="rgba(255,255,255,0)"
                            />
                            {!agentSigned && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-base-content/50 text-sm">
                                    Signer ici
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => clearSignature(agentSigRef, setAgentSigned)}
                                className="text-sm text-red-500 hover:text-red-700 underline"
                            >
                                Effacer
                            </button>
                        </div>
                    </div>

                    {/* Locataire Signature — seulement pour un inventaire de lot */}
                    {entityType === 'lot' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-base-content/80">
                                    <User size={18} /> Signature Locataire
                                </div>
                                <label className="flex items-center gap-1.5 text-xs text-base-content/70 cursor-pointer">
                                    <input type="checkbox" checked={locataireRefuse}
                                        onChange={(e) => setLocataireRefuse(e.target.checked)}
                                        className="w-3.5 h-3.5 accent-orange-500" />
                                    Refuse de signer
                                </label>
                            </div>

                            {locataireRefuse ? (
                                <div className="border-2 border-dashed border-orange-300 bg-orange-50 rounded-xl h-64 p-4 flex flex-col">
                                    <p className="text-sm font-bold text-orange-800 flex items-center gap-1.5">
                                        <X size={16} /> Le locataire refuse de signer
                                    </p>
                                    <p className="text-xs text-orange-700 mt-1">
                                        Le constat reste valable, signé par le gestionnaire. Précisez le motif si possible.
                                    </p>
                                    <textarea
                                        className="mt-3 flex-1 w-full p-2 rounded-lg border border-orange-200 bg-white/70 text-sm resize-none outline-none focus:ring-2 focus:ring-orange-300"
                                        placeholder="Motif du refus (optionnel)..."
                                        value={refusReason}
                                        onChange={(e) => setRefusReason(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="border-2 border-dashed border-base-300 rounded-xl bg-base-200 relative h-64">
                                        <SignatureCanvas
                                            ref={locataireSigRef}
                                            canvasProps={{ className: 'w-full h-full rounded-xl' }}
                                            onEnd={() => setLocataireSigned(true)}
                                            backgroundColor="rgba(255,255,255,0)"
                                        />
                                        {!locataireSigned && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-base-content/50 text-sm">
                                                Signer ici
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="button"
                                            onClick={() => clearSignature(locataireSigRef, setLocataireSigned)}
                                            className="text-sm text-red-500 hover:text-red-700 underline"
                                        >
                                            Effacer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-base-200 flex justify-end gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-ghost"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 px-8"
                    >
                        {loading ? 'Enregistrement...' : <><Check size={18} /> Valider les Signatures</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventorySignature;
