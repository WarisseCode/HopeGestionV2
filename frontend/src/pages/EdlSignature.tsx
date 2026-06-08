import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';
import { toast } from 'react-hot-toast';
import { Check, X, ArrowLeft, PenTool, User, Building } from 'lucide-react';

const EdlSignature: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Refs pour les canvas de signature
    const agentSigRef = useRef<SignatureCanvas>(null);
    const locataireSigRef = useRef<SignatureCanvas>(null);

    const [agentSigned, setAgentSigned] = useState(false);
    const [locataireSigned, setLocataireSigned] = useState(false);

    // Fonction pour effacer
    const clearSignature = (ref: React.RefObject<SignatureCanvas | null>, setSigned: (val: boolean) => void) => {
        ref.current?.clear();
        setSigned(false);
    };

    const handleSave = async () => {
        if (agentSigRef.current?.isEmpty() || locataireSigRef.current?.isEmpty()) {
            toast.error("Les deux signatures sont requises");
            return;
        }

        setLoading(true);
        try {
            const signatures = {
                agent: {
                    signature_url: agentSigRef.current?.getCanvas().toDataURL('image/png'),
                    date: new Date().toISOString()
                },
                locataire: {
                    signature_url: locataireSigRef.current?.getCanvas().toDataURL('image/png'),
                    date: new Date().toISOString()
                }
            };

            await apiCall(`${API_URL}/edl/${id}/sign`, {
                method: 'PUT',
                body: JSON.stringify({ signatures })
            });

            toast.success('État des lieux signé et finalisé !');
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
                        <div className="flex items-center gap-2 font-bold text-base-content/80">
                            <User size={18} /> Signature Locataire
                        </div>
                        <div className="border-2 border-dashed border-base-300 rounded-xl bg-base-200 relative h-64">
                            <SignatureCanvas 
                                ref={locataireSigRef}
                                canvasProps={{className: 'w-full h-full rounded-xl'}}
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
                            <button 
                                onClick={() => clearSignature(locataireSigRef, setLocataireSigned)}
                                className="text-sm text-red-500 hover:text-red-700 underline"
                            >
                                Effacer
                            </button>
                        </div>
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
