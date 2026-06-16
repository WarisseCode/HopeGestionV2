import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { apiCall } from '../utils/apiUtils';
import { API_URL, API_BASE } from '../config';
import { toast } from 'react-hot-toast';
import { Check, X, ArrowLeft, PenTool, User, Building } from 'lucide-react';

// Convertit un canvas de signature en PNG et l'uploade ; renvoie l'URL persistante.
async function uploadSignature(canvas: HTMLCanvasElement, role: string): Promise<string> {
    const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas vide'))), 'image/png')
    );
    const formData = new FormData();
    formData.append('type', 'document'); // 'type' AVANT 'file' (lecture Multer)
    formData.append('file', new File([blob], `signature-${role}-${Date.now()}.png`, { type: 'image/png' }));
    const resp = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Upload signature échoué');
    return `${API_BASE}${data.files[0].path}`;
}

const EdlSignature: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Refs pour les canvas de signature
    const agentSigRef = useRef<SignatureCanvas>(null);
    const locataireSigRef = useRef<SignatureCanvas>(null);

    const [agentSigned, setAgentSigned] = useState(false);
    const [locataireSigned, setLocataireSigned] = useState(false);

    // CdC VIII.5 — le locataire peut refuser de signer : l'EDL reste valable (signé par
    // l'agent) avec mention du refus consignée dans signatures_json.
    const [locataireRefuse, setLocataireRefuse] = useState(false);
    const [refusReason, setRefusReason] = useState('');

    // Fonction pour effacer
    const clearSignature = (ref: React.RefObject<SignatureCanvas | null>, setSigned: (val: boolean) => void) => {
        ref.current?.clear();
        setSigned(false);
    };

    const handleSave = async () => {
        if (agentSigRef.current?.isEmpty()) {
            toast.error("La signature de l'agent / gestionnaire est requise");
            return;
        }
        if (!locataireRefuse && locataireSigRef.current?.isEmpty()) {
            toast.error("Signature du locataire requise (ou cochez « refuse de signer »)");
            return;
        }

        setLoading(true);
        try {
            // Signature(s) uploadée(s) en PNG (signatures_json reste léger).
            const agentUrl = await uploadSignature(agentSigRef.current!.getCanvas(), 'agent');

            const locataire = locataireRefuse
                ? { refused: true, reason: refusReason.trim() || null, date: new Date().toISOString() }
                : { signature_url: await uploadSignature(locataireSigRef.current!.getCanvas(), 'locataire'), date: new Date().toISOString() };

            const signatures = {
                agent: { signature_url: agentUrl, date: new Date().toISOString() },
                locataire
            };

            await apiCall(`${API_URL}/edl/${id}/sign`, {
                method: 'PUT',
                body: JSON.stringify({ signatures })
            });

            toast.success(locataireRefuse
                ? 'EDL finalisé — refus de signature du locataire consigné.'
                : 'État des lieux signé et finalisé !');
            navigate(`/dashboard/etats-des-lieux/${id}`);
        } catch (error) {
            console.error(error);
            toast.error('Erreur serveur');
        } finally {
            setLoading(false);
        }
    };

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
                    Signature de l'État des Lieux
                </h1>
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8 flex items-start gap-3">
                    <Building className="text-teal-600 mt-1 shrink-0" size={20} />
                    <div>
                        <h3 className="font-bold text-teal-900 text-sm">Signature en présentiel</h3>
                        <p className="text-sm text-teal-800 mt-1">
                            Cette page est conçue pour être utilisée sur tablette lors de l'état des lieux. 
                            Le gestionnaire et le locataire signent successivement sur le même appareil pour valider le constat immédiatement.
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
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

                    {/* Locataire Signature */}
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

export default EdlSignature;
