// frontend/src/pages/EdlDetails.tsx
// Fiche d'un état des lieux.
// Refonte T-072 (maquette T-071) : bandeau d'étape avec la seule prochaine action en tête,
// actions secondaires dans un menu, résumé des constats avant le détail, états en clair.
// Le document (sous le bandeau) reste celui qu'on imprime.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiCall } from '../utils/apiUtils';
import { resolveComparison } from '../utils/edlCompare';
import { downloadPdf } from '../utils/downloadPdf';
import { API_URL } from '../config';
import { useUser } from '../contexts/UserContext';
import Button from '../components/ui/Button';
import ConfirmModal from '../components/ui/ConfirmModal';
import RowMenu from '../components/ui/RowMenu';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import EdlSteps from '../components/edl/EdlSteps';
import { ITEM_ETATS, itemEtat, edlTypeLabel } from '../utils/edlStatus';

interface EdlItem {
    id: number;
    piece: string;
    nom: string;
    description?: string;
    etat: string;
    observation?: string;
    photos?: string[];
}

interface EdlDetail {
    id: number;
    ref_edl: string;
    type_edl: string;
    statut: string;
    date_realisation: string;
    ref_lot?: string;
    lot_type?: string;
    ref_location?: string;
    location_id?: number | null;
    agent_name?: string;
    locataire_name?: string;
    locataire_present?: boolean;
    commentaires?: string;
    items?: EdlItem[];
    signatures_json?: {
        agent?: { signature_url?: string };
        locataire?: { signature_url?: string; refused?: boolean; reason?: string };
    };
}

const EdlDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');
    const [edl, setEdl] = useState<EdlDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [hasCounterpart, setHasCounterpart] = useState(false);
    const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

    useEffect(() => {
        loadData();
        // La comparaison n'est proposée que si l'EDL opposé (entrée↔sortie) existe
        resolveComparison(id!).then(pair => setHasCounterpart(!!pair)).catch(() => setHasCounterpart(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            const data = await apiCall<EdlDetail>(`${API_URL}/edl/${id}`);
            setEdl(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCompare = async () => {
        try {
            const pair = await resolveComparison(id!);
            if (!pair) {
                toast('Aucun EDL opposé (entrée/sortie) trouvé pour ce bien.');
                return;
            }
            navigate(`/dashboard/etats-des-lieux/compare/${pair.idEntree}/${pair.idSortie}`);
        } catch (e) {
            console.error(e);
            toast.error('Erreur lors de la recherche de comparaison.');
        }
    };

    const handleDownloadPdf = async () => {
        setPdfLoading(true);
        try {
            await downloadPdf(`${API_URL}/edl/${id}/pdf`, `${edl?.ref_edl || 'EDL'}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error('Erreur lors de la génération du PDF.');
        } finally {
            setPdfLoading(false);
        }
    };

    // Transition de statut (clôture / archivage). Le backend valide la transition.
    const changeStatus = async (statut: 'cloture' | 'archive') => {
        setBusy(true);
        try {
            await apiCall(`${API_URL}/edl/${id}`, { method: 'PUT', body: JSON.stringify({ statut }) });
            toast.success(statut === 'cloture' ? 'État des lieux clôturé.' : 'État des lieux archivé.');
            loadData();
        } catch (e) {
            console.error(e);
            toast.error('Échec de la mise à jour du statut.');
        } finally {
            setBusy(false);
        }
    };

    const deleteEdl = async () => {
        try {
            await apiCall(`${API_URL}/edl/${id}`, { method: 'DELETE' });
            toast.success('État des lieux déplacé vers la corbeille.');
            navigate('/dashboard/etats-des-lieux');
        } catch (e) {
            console.error(e);
            toast.error('Échec de la suppression.');
        }
    };

    // Pièces dans l'ordre de saisie, et résumé des constats par état
    const { rooms, summary, photoCount } = useMemo(() => {
        const items = edl?.items || [];
        const map = new Map<string, EdlItem[]>();
        items.forEach(it => map.set(it.piece || 'Autre', [...(map.get(it.piece || 'Autre') || []), it]));
        return {
            rooms: [...map.entries()],
            summary: ITEM_ETATS.map(e => ({ ...e, count: items.filter(i => i.etat === e.value).length })),
            photoCount: items.reduce((n, i) => n + (Array.isArray(i.photos) ? i.photos.length : 0), 0),
        };
    }, [edl]);

    if (loading) {
        return (
            <div role="status" aria-label="Chargement" className="max-w-[900px] mx-auto space-y-4">
                <SkeletonLoader variant="rectangular" height={150} className="rounded-2xl" />
                <SkeletonLoader variant="rectangular" height={360} className="rounded-2xl" />
            </div>
        );
    }
    if (!edl) {
        return (
            <div className="max-w-[900px] mx-auto p-10 text-center space-y-3">
                <p className="text-lg font-bold text-base-content">État des lieux introuvable</p>
                <Link to="/dashboard/etats-des-lieux" className="text-primary font-semibold">← États des lieux</Link>
            </div>
        );
    }

    const itemCount = edl.items?.length || 0;
    const next = !canWrite ? null
        : edl.statut === 'brouillon' ? { label: 'Finaliser et signer', run: () => navigate(`/dashboard/etats-des-lieux/${id}/signer`) }
            : edl.statut === 'signe' ? { label: 'Clôturer', run: () => changeStatus('cloture') }
                : edl.statut === 'cloture' ? { label: 'Archiver', run: () => setConfirm('archive') }
                    : null;
    const agentSig = edl.signatures_json?.agent;
    const tenantSig = edl.signatures_json?.locataire;

    return (
        <div className="@container max-w-[900px] mx-auto space-y-4 print:max-w-none print:space-y-0">
            <Link to="/dashboard/etats-des-lieux" className="inline-flex items-center gap-1.5 min-h-10 text-sm font-semibold text-primary print:hidden">
                <ArrowLeft size={16} aria-hidden="true" /> États des lieux
            </Link>

            {/* Bandeau d'étape : où en est le document et la seule prochaine action */}
            <div className="bg-base-100 rounded-2xl border border-base-300/70 p-4 @xl:p-5 space-y-4 print:hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                        <p className="text-[13px] font-bold font-mono text-base-content/70">{edl.ref_edl}</p>
                        <h1 className="text-2xl font-bold text-base-content tracking-tight">{edlTypeLabel(edl.type_edl)}</h1>
                        <p className="text-sm text-base-content/70 tabular-nums break-words">
                            {[edl.ref_lot, edl.locataire_name, new Date(edl.date_realisation).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {next && <Button variant="primary" className="h-11 px-5 font-bold" loading={busy} onClick={next.run}>{next.label}</Button>}
                        <RowMenu
                            label="Plus d'actions"
                            items={[
                                { label: pdfLoading ? 'PDF en préparation…' : 'Télécharger le PDF', onSelect: handleDownloadPdf },
                                { label: 'Imprimer', onSelect: () => window.print() },
                                ...(hasCounterpart ? [{ label: edl.type_edl === 'sortie' ? 'Comparer avec l’entrée' : 'Comparer avec la sortie', onSelect: handleCompare }] : []),
                                ...(canWrite && edl.statut === 'signe' ? [{ label: 'Archiver', onSelect: () => setConfirm('archive') }] : []),
                                ...(canWrite ? [{ label: 'Mettre à la corbeille…', onSelect: () => setConfirm('delete'), danger: true }] : []),
                            ]}
                        />
                    </div>
                </div>
                <EdlSteps statut={edl.statut} withHints />
                {!hasCounterpart && edl.type_edl === 'entree' && (
                    <p className="text-xs text-base-content/70">La comparaison sera possible une fois l'état des lieux de sortie réalisé.</p>
                )}
            </div>

            {/* Le document (imprimé tel quel) */}
            <article className="bg-base-100 rounded-2xl border border-base-300/70 p-5 @xl:p-8 space-y-6 print:border-none print:p-0">
                <header className="hidden print:block border-b border-base-300 pb-4">
                    <h1 className="text-2xl font-bold">{edlTypeLabel(edl.type_edl)}</h1>
                    <p className="text-sm">{edl.ref_edl} · {new Date(edl.date_realisation).toLocaleDateString('fr-FR')}</p>
                </header>

                <dl className="grid grid-cols-1 @lg:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-base-200/70 dark:bg-base-200 min-w-0">
                        <dt className="text-xs font-semibold text-base-content/70">Logement</dt>
                        <dd className="text-[15px] font-bold text-base-content break-words">{[edl.ref_lot, edl.lot_type].filter(Boolean).join(' · ') || '—'}</dd>
                        {edl.ref_location && (
                            <dd>
                                {edl.location_id
                                    ? <Link to={`/dashboard/locations/${edl.location_id}`} className="text-[13px] font-semibold text-primary print:text-base-content">{edl.ref_location} →</Link>
                                    : <span className="text-[13px] text-base-content/70">{edl.ref_location}</span>}
                            </dd>
                        )}
                    </div>
                    <div className="p-3.5 rounded-xl bg-base-200/70 dark:bg-base-200 min-w-0">
                        <dt className="text-xs font-semibold text-base-content/70">Locataire</dt>
                        <dd className="text-[15px] font-bold text-base-content break-words">{edl.locataire_name || '—'}</dd>
                        {edl.locataire_name && edl.locataire_present !== undefined && (
                            <dd className="text-[13px] text-base-content/70">{edl.locataire_present ? 'présent' : 'absent'}</dd>
                        )}
                    </div>
                    <div className="p-3.5 rounded-xl bg-base-200/70 dark:bg-base-200 min-w-0">
                        <dt className="text-xs font-semibold text-base-content/70">Réalisé par</dt>
                        {edl.agent_name
                            ? <dd className="text-[15px] font-bold text-base-content break-words">{edl.agent_name}</dd>
                            : <dd className="text-[15px] font-semibold text-red-800 dark:text-red-200">Agent non renseigné</dd>}
                    </div>
                </dl>

                {/* Résumé : l'état général avant le détail */}
                <section className="space-y-2.5">
                    <h2 className="text-lg font-bold text-base-content">Résumé des constats</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        {summary.map(s => (
                            <span key={s.value} className={`px-3 py-1.5 rounded-full text-[13px] tabular-nums ${s.count > 0 ? `font-bold ${s.pill}` : 'font-semibold bg-base-200 text-base-content/70'}`}>
                                {s.count} {s.label.toLowerCase()}
                            </span>
                        ))}
                        <span className="text-[13px] text-base-content/70 tabular-nums">
                            · {rooms.length} pièce{rooms.length > 1 ? 's' : ''} · {itemCount} élément{itemCount > 1 ? 's' : ''} · {photoCount} photo{photoCount > 1 ? 's' : ''}
                        </span>
                    </div>
                </section>

                {/* Pièces : une ligne par élément, l'état en clair */}
                <section className="space-y-2.5">
                    <h2 className="text-lg font-bold text-base-content">Pièces</h2>
                    {rooms.length === 0 ? (
                        <p className="text-sm text-base-content/70">Aucun constat saisi.</p>
                    ) : rooms.map(([piece, items]) => (
                        <div key={piece} className="rounded-xl border border-base-300/70 overflow-hidden break-inside-avoid">
                            <div className="flex items-center justify-between gap-2.5 px-3.5 py-3 bg-base-200/70 dark:bg-base-200">
                                <h3 className="text-[15px] font-bold text-base-content">{piece}</h3>
                                <span className="text-[13px] text-base-content/70">{items.length} élément{items.length > 1 ? 's' : ''}</span>
                            </div>
                            <ul className="divide-y divide-base-300/70">
                                {items.map(item => {
                                    const etat = itemEtat(item.etat);
                                    return (
                                        <li key={item.id} className="px-3.5 py-3 space-y-2">
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                <span className="flex-[1_1_220px] min-w-0">
                                                    <span className="block text-[15px] font-semibold text-base-content break-words">{item.nom}</span>
                                                    <span className="block text-[13px] text-base-content/70 break-words">{item.description || (item.observation ? '' : 'Aucune observation')}</span>
                                                </span>
                                                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${etat?.pill || 'bg-base-200 text-base-content/80'}`}>
                                                    {etat?.label || item.etat || '—'}
                                                </span>
                                            </div>
                                            {item.observation && (
                                                <p className="text-sm text-orange-900 dark:text-orange-100 bg-orange-50 dark:bg-orange-400/10 rounded-lg px-3 py-2 break-words">{item.observation}</p>
                                            )}
                                            {Array.isArray(item.photos) && item.photos.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.photos.map((src, idx) => (
                                                        <a key={idx} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Photo ${idx + 1} de ${item.nom}`}>
                                                            <img src={src} alt="" className="w-16 h-16 rounded-lg border border-base-300 object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </section>

                {edl.commentaires && (
                    <section className="p-4 rounded-xl bg-base-200/70 dark:bg-base-200 space-y-1">
                        <h2 className="text-[15px] font-bold text-base-content">Commentaires</h2>
                        <p className="text-sm text-base-content/80 whitespace-pre-line break-words">{edl.commentaires}</p>
                    </section>
                )}

                {/* Signatures */}
                <section className="space-y-2.5 break-inside-avoid">
                    <h2 className="text-lg font-bold text-base-content">Signatures</h2>
                    <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
                        {[
                            { who: 'Agent', url: agentSig?.signature_url, refused: false, reason: undefined as string | undefined },
                            { who: 'Locataire', url: tenantSig?.signature_url, refused: !!tenantSig?.refused, reason: tenantSig?.reason },
                        ].map(sig => (
                            <div key={sig.who} className={`min-h-[120px] p-3.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center ${sig.url ? 'border border-base-300' : 'border border-dashed border-base-300'}`}>
                                <strong className="text-sm text-base-content">{sig.who}</strong>
                                {sig.url ? (
                                    <img src={sig.url} alt={`Signature ${sig.who.toLowerCase()}`} className="h-20 w-full object-contain" />
                                ) : sig.refused ? (
                                    <>
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100">Refus de signature</span>
                                        {sig.reason && <span className="text-xs text-base-content/70 italic">« {sig.reason} »</span>}
                                    </>
                                ) : (
                                    <span className="text-[13px] text-base-content/70">en attente de signature</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <p className="hidden print:block text-center text-xs text-base-content/60">
                    Document généré électroniquement via HopeGestion. Fait foi conformément aux CGU.
                </p>
            </article>

            <ConfirmModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={() => { if (confirm === 'archive') changeStatus('archive'); else if (confirm === 'delete') deleteEdl(); setConfirm(null); }}
                title={confirm === 'archive' ? 'Archiver cet état des lieux ?' : 'Mettre à la corbeille ?'}
                message={confirm === 'archive' ? 'Il restera consultable mais figé.' : 'Il sera restaurable depuis la Corbeille.'}
                confirmLabel={confirm === 'archive' ? 'Archiver' : 'Mettre à la corbeille'}
                type={confirm === 'archive' ? 'warning' : 'danger'}
            />
        </div>
    );
};

export default EdlDetails;
