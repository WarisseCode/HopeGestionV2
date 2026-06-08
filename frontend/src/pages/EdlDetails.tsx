import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Printer, Edit, ArrowLeft, Calendar, User, 
    ClipboardCheck, Building, CheckCircle, FileSignature
} from 'lucide-react';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';

const EdlDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [edl, setEdl] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const data = await apiCall<any>(`${API_URL}/edl/${id}`);
            setEdl(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center">Chargement...</div>;
    if (!edl) return <div className="p-12 text-center">Introuvable</div>;

    const groupItemsByPiece = () => {
        const groups: {[key: string]: any[]} = {};
        (edl.items || []).forEach((item: any) => {
            if (!groups[item.piece]) groups[item.piece] = [];
            groups[item.piece].push(item);
        });
        return groups;
    };

    const groupedItems = groupItemsByPiece();

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'entree': return 'État des lieux d\'Entrée';
            case 'sortie': return 'État des lieux de Sortie';
            case 'intermediaire': return 'Contrôle Intermédiaire';
            default: return type;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'signe':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={12} /> Signé</span>;
            case 'brouillon':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Brouillon</span>;
            case 'cloture':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700">Clôturé</span>;
            default:
                return null;
        }
    };

    return (
        <div className="p-6 lg:p-12 max-w-4xl mx-auto print:p-0">
            {/* Nav & Actions */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <Link to="/dashboard/etats-des-lieux" className="flex items-center gap-2 text-base-content/60 hover:text-base-content">
                    <ArrowLeft size={20} /> Retour
                </Link>
                <div className="flex gap-3">
                    <button 
                        onClick={() => window.print()} 
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Printer size={18} /> Imprimer
                    </button>
                    {edl.statut === 'brouillon' && (
                        <button 
                            className="btn-primary flex items-center gap-2"
                            onClick={() => navigate(`/dashboard/etats-des-lieux/${id}/signer`)}
                        >
                            <FileSignature size={18} /> Finaliser & Signer
                        </button>
                    )}
                </div>
            </div>

            {/* Document Layout */}
            <div className="bg-base-100 p-8 rounded-2xl shadow-sm border border-base-200 print:shadow-none print:border-none">
                {/* Header */}
                <div className="border-b border-base-200 pb-6 mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-base-content mb-2">{getTypeLabel(edl.type_edl)}</h1>
                        <p className="text-base-content/60 uppercase tracking-widest font-medium text-sm">
                            Document Officiel
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-base-300 rounded text-sm font-mono mb-2">
                             {edl.ref_edl}
                        </div>
                        <div className="mb-2">{getStatusBadge(edl.statut)}</div>
                        <p className="text-sm text-base-content/60">{new Date(edl.date_realisation).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-base-200 p-6 rounded-xl print:bg-base-100 print:border print:border-base-300">
                    <div>
                        <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-3">Bien Concerné</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Building size={16} className="text-teal-500" />
                                <span className="font-medium text-base-content">{edl.ref_lot}</span>
                            </div>
                            {edl.ref_location && (
                                <div className="text-sm text-base-content/70">
                                    Contrat: {edl.ref_location}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider mb-3">Parties Présentes</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-teal-500" />
                                <div>
                                    <div className="font-medium text-base-content">Agent: {edl.agent_name}</div>
                                    {edl.locataire_name && (
                                        <div className="text-sm text-base-content/70">Locataire: {edl.locataire_name}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items List by Room */}
                <div className="space-y-8">
                    <h2 className="text-xl font-bold text-base-content border-b pb-2">Constats par Pièce</h2>
                    {Object.entries(groupedItems).map(([piece, items]) => (
                        <div key={piece}>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-base-content border-b border-base-300 pb-2 mb-4">
                                <ClipboardCheck className="text-teal-500" size={20} /> 
                                {piece}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {(items as any[]).map((item: any) => (
                                    <div key={item.id} className="bg-base-200/50 p-4 rounded-lg hover:bg-base-200 transition print:bg-base-100 print:border-b">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-base-content">{item.nom}</h4>
                                                {item.description && (
                                                    <p className="text-xs text-base-content/60">{item.description}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold capitalize 
                                                ${item.etat === 'neuf' ? 'bg-green-100 text-green-700' : ''}
                                                ${item.etat === 'bon' ? 'bg-teal-100 text-teal-700' : ''}
                                                ${item.etat === 'usager' ? 'bg-yellow-100 text-yellow-700' : ''}
                                                ${item.etat === 'mauvais' ? 'bg-orange-100 text-orange-700' : ''}
                                                ${item.etat === 'hs' ? 'bg-red-100 text-red-700' : ''}
                                            `}>
                                                {item.etat}
                                            </span>
                                        </div>
                                        
                                        {item.observation && (
                                            <div className="text-sm text-orange-600 mb-2 italic">
                                                ⚠️ {item.observation}
                                            </div>
                                        )}

                                        {item.photos && Array.isArray(item.photos) && item.photos.length > 0 && (
                                            <div className="flex gap-1 mt-2">
                                                {item.photos.slice(0, 3).map((src: string, idx: number) => (
                                                    <img key={idx} src={src} className="w-16 h-16 rounded border border-base-300 object-cover" alt="" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Comments */}
                {edl.commentaires && (
                    <div className="mt-8 p-4 bg-teal-50 rounded-xl">
                        <h3 className="font-bold text-teal-900 mb-2">Commentaires</h3>
                        <p className="text-sm text-teal-800">{edl.commentaires}</p>
                    </div>
                )}

                {/* Signatures */}
                <div className="mt-12 pt-8 border-t border-base-300 grid grid-cols-2 gap-12">
                    <div className="border rounded-xl h-32 p-4 relative">
                        <span className="text-xs text-base-content/50 uppercase font-bold absolute top-3 left-3">Signature Agent</span>
                        {edl.signatures_json?.agent?.signature_url && (
                            <img src={edl.signatures_json.agent.signature_url} className="h-full w-full object-contain" alt="Signature Agent" />
                        )}
                    </div>
                    <div className="border rounded-xl h-32 p-4 relative">
                        <span className="text-xs text-base-content/50 uppercase font-bold absolute top-3 left-3">Signature Locataire</span>
                        {edl.signatures_json?.locataire?.signature_url && (
                            <img src={edl.signatures_json.locataire.signature_url} className="h-full w-full object-contain" alt="Signature Locataire" />
                        )}
                    </div>
                </div>
                
                <div className="mt-8 text-center text-xs text-base-content/50 print:block hidden">
                    Document généré électroniquement via HopeGestion. Fait foi conformément aux CGU.
                </div>
            </div>
        </div>
    );
};

export default EdlDetails;
