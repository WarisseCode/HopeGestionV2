import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Printer, ArrowRight, TrendingDown, TrendingUp,
    Minus, AlertTriangle, PlusCircle, GitCompareArrows
} from 'lucide-react';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';

// Couleurs d'état alignées sur la saisie (neuf→hs).
const ETAT_BADGE: Record<string, string> = {
    neuf: 'bg-green-100 text-green-700',
    bon: 'bg-teal-100 text-teal-700',
    usager: 'bg-yellow-100 text-yellow-700',
    moyen: 'bg-yellow-100 text-yellow-700',
    mauvais: 'bg-orange-100 text-orange-700',
    hs: 'bg-red-100 text-red-700',
};

// Présentation par statut de comparaison.
const STATUT_META: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
    degradation:  { label: 'Dégradation', className: 'border-red-300 bg-red-50',       Icon: TrendingDown },
    manquant:     { label: 'Manquant',    className: 'border-orange-300 bg-orange-50', Icon: AlertTriangle },
    ajoute:       { label: 'Ajouté',      className: 'border-blue-300 bg-blue-50',     Icon: PlusCircle },
    amelioration: { label: 'Amélioration',className: 'border-green-300 bg-green-50',   Icon: TrendingUp },
    inchange:     { label: 'Inchangé',    className: 'border-base-300 bg-base-100',    Icon: Minus },
};

const EtatBadge: React.FC<{ etat: string | null }> = ({ etat }) =>
    etat ? (
        <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${ETAT_BADGE[etat.toLowerCase()] || 'bg-base-300'}`}>{etat}</span>
    ) : (
        <span className="px-2 py-0.5 rounded text-xs text-base-content/40">—</span>
    );

interface CompItem {
    piece: string; nom: string; statut: string; delta: number;
    etat_entree: string | null; etat_sortie: string | null;
    observation_entree: string | null; observation_sortie: string | null;
    photos_entree: string[]; photos_sortie: string[];
}
interface CompareData {
    entree: any; sortie: any;
    comparison: CompItem[];
    summary: { total: number; degradations: number; ameliorations: number; inchanges: number; manquants: number; ajoutes: number };
}

const EdlCompare: React.FC = () => {
    const { idEntree, idSortie } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<CompareData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiCall<CompareData>(`${API_URL}/edl/compare/${idEntree}/${idSortie}`)
            .then(setData)
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [idEntree, idSortie]);

    if (loading) return <div className="p-12 text-center">Chargement de la comparaison…</div>;
    if (!data) return <div className="p-12 text-center">Comparaison indisponible.</div>;

    const { entree, sortie, comparison, summary } = data;
    const degradations = comparison.filter((c) => c.statut === 'degradation' || c.statut === 'manquant');

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto print:p-0">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content">
                    <ArrowLeft size={20} /> Retour
                </button>
                <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
                    <Printer size={18} /> Imprimer
                </button>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-6 lg:p-8 print:shadow-none print:border-none">
                <h1 className="text-2xl font-bold text-base-content flex items-center gap-2 mb-1">
                    <GitCompareArrows className="text-teal-600" /> Comparaison Entrée / Sortie
                </h1>
                <p className="text-base-content/60 mb-6">{entree?.ref_lot || sortie?.ref_lot}</p>

                {/* En-têtes des deux EDL comparés */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border border-base-200 p-4">
                        <p className="text-xs uppercase font-bold text-base-content/50">Entrée 🔑</p>
                        <p className="font-mono text-sm">{entree?.ref_edl}</p>
                        <p className="text-sm text-base-content/60">{entree?.date_realisation && new Date(entree.date_realisation).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="rounded-xl border border-base-200 p-4">
                        <p className="text-xs uppercase font-bold text-base-content/50">Sortie 🚪</p>
                        <p className="font-mono text-sm">{sortie?.ref_edl}</p>
                        <p className="text-sm text-base-content/60">{sortie?.date_realisation && new Date(sortie.date_realisation).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                {/* Synthèse des écarts */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {([
                        ['Dégradations', summary.degradations, 'text-red-600'],
                        ['Manquants', summary.manquants, 'text-orange-600'],
                        ['Ajoutés', summary.ajoutes, 'text-blue-600'],
                        ['Améliorations', summary.ameliorations, 'text-green-600'],
                        ['Inchangés', summary.inchanges, 'text-base-content/60'],
                    ] as const).map(([label, value, color]) => (
                        <div key={label} className="rounded-xl border border-base-200 p-3 text-center">
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-base-content/50">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Base du rapport de retenue : dégradations & manquants en tête */}
                {degradations.length > 0 && (
                    <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4">
                        <h2 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                            <AlertTriangle size={18} /> Points de retenue potentiels ({degradations.length})
                        </h2>
                        <ul className="text-sm text-red-800 space-y-1">
                            {degradations.map((c, i) => (
                                <li key={i}>• <strong>{c.piece}</strong> — {c.nom} : {c.statut === 'manquant' ? 'élément manquant à la sortie' : `${c.etat_entree} → ${c.etat_sortie}`}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Détail complet, trié (dégradations d'abord par le backend) */}
                <div className="space-y-3">
                    {comparison.map((c, i) => {
                        const meta = STATUT_META[c.statut] || STATUT_META.inchange;
                        const Icon = meta.Icon;
                        return (
                            <div key={i} className={`rounded-xl border p-4 ${meta.className}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-base-content">
                                        <span className="text-base-content/50 text-xs uppercase mr-2">{c.piece}</span>
                                        {c.nom}
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-bold">
                                        <Icon size={14} /> {meta.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <EtatBadge etat={c.etat_entree} />
                                    <ArrowRight size={14} className="text-base-content/40" />
                                    <EtatBadge etat={c.etat_sortie} />
                                </div>
                                {(c.observation_entree || c.observation_sortie) && (
                                    <div className="grid grid-cols-2 gap-3 mt-2 text-xs text-base-content/70">
                                        <div>{c.observation_entree && <>📝 {c.observation_entree}</>}</div>
                                        <div>{c.observation_sortie && <>📝 {c.observation_sortie}</>}</div>
                                    </div>
                                )}
                                {(c.photos_entree?.length > 0 || c.photos_sortie?.length > 0) && (
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div className="flex gap-1">
                                            {(c.photos_entree || []).slice(0, 3).map((src, k) => (
                                                <img key={k} src={src} className="w-14 h-14 rounded border border-base-300 object-cover" alt="" />
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            {(c.photos_sortie || []).slice(0, 3).map((src, k) => (
                                                <img key={k} src={src} className="w-14 h-14 rounded border border-base-300 object-cover" alt="" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EdlCompare;
