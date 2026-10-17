// frontend/src/pages/EdlList.tsx
// États des lieux.
// Refonte T-072 (maquette T-071) : suivi par logement (entrée puis sortie) plutôt qu'une liste à
// plat ; chaque document montre son étape (Brouillon → Signé → Clôturé → Archivé) et un seul
// bouton pour l'étape suivante. La comparaison n'est proposée que si l'entrée et la sortie existent.
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Plus, LogIn, LogOut, Search as SearchIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiCall } from '../utils/apiUtils';
import { resolveComparison } from '../utils/edlCompare';
import { API_URL } from '../config';
import { useUser } from '../contexts/UserContext';
import SearchInput from '../components/ui/SearchInput';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import LoadErrorState from '../components/ui/LoadErrorState';
import ConfirmModal from '../components/ui/ConfirmModal';
import Button from '../components/ui/Button';
import RowMenu, { OUTLINE_BTN } from '../components/ui/RowMenu';
import EdlSteps from '../components/edl/EdlSteps';
import { edlTypeLabel } from '../utils/edlStatus';

interface EdlInspection {
    id: number;
    ref_edl: string;
    lot_id: number;
    ref_lot: string;
    lot_type: string;
    type_edl: 'entree' | 'sortie' | 'intermediaire';
    date_realisation: string;
    agent_name: string;
    locataire_name: string;
    statut: 'brouillon' | 'signe' | 'cloture' | 'archive';
    item_count: number;
}

type Filter = 'all' | 'brouillon' | 'signe' | 'done';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const EdlList: React.FC = () => {
    const { user } = useUser();
    const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');
    const [edls, setEdls] = useState<EdlInspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [confirm, setConfirm] = useState<{ kind: 'archive' | 'delete'; edl: EdlInspection } | null>(null);
    const navigate = useNavigate();

    useEffect(() => { loadEdls(); }, []);

    const loadEdls = async () => {
        setLoadError(null);
        try {
            const data = await apiCall<EdlInspection[]>(`${API_URL}/edl`);
            setEdls(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading EDL:', error);
            setLoadError((error as Error)?.message || 'Impossible de charger les états des lieux.');
        } finally {
            setLoading(false);
        }
    };

    // Changement d'étape (clôture, archivage) : transition validée côté serveur
    const changeStatus = async (edl: EdlInspection, statut: 'cloture' | 'archive') => {
        setBusyId(edl.id);
        try {
            await apiCall(`${API_URL}/edl/${edl.id}`, { method: 'PUT', body: JSON.stringify({ statut }) });
            toast.success(statut === 'cloture' ? 'État des lieux clôturé.' : 'État des lieux archivé.');
            loadEdls();
        } catch (e) {
            console.error(e);
            toast.error(statut === 'cloture' ? 'Échec de la clôture.' : "Échec de l'archivage.");
        } finally {
            setBusyId(null);
        }
    };

    // Déplace un EDL vers la corbeille (soft-delete, restaurable)
    const deleteEdl = async (edl: EdlInspection) => {
        try {
            await apiCall(`${API_URL}/edl/${edl.id}`, { method: 'DELETE' });
            toast.success('État des lieux déplacé vers la corbeille.');
            loadEdls();
        } catch (e) {
            console.error(e);
            toast.error('Échec de la suppression.');
        }
    };

    // Ouvre la comparaison en résolvant l'EDL opposé (entrée↔sortie) du même bail/lot
    const handleCompare = async (id: number) => {
        try {
            const pair = await resolveComparison(id);
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

    const matchFilter = (e: EdlInspection, f: Filter) =>
        f === 'all' ? true : f === 'done' ? e.statut === 'cloture' || e.statut === 'archive' : e.statut === f;

    const counts = {
        all: edls.length,
        brouillon: edls.filter(e => matchFilter(e, 'brouillon')).length,
        signe: edls.filter(e => matchFilter(e, 'signe')).length,
        done: edls.filter(e => matchFilter(e, 'done')).length,
    };

    // Regroupement par logement ; les logements avec une étape à faire passent en premier
    const groups = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const visible = edls.filter(e => matchFilter(e, filter) && (!q ||
            [e.ref_edl, e.agent_name, e.locataire_name, e.ref_lot].some(v => v?.toLowerCase().includes(q))));
        const map = new Map<number, EdlInspection[]>();
        visible.forEach(e => { const k = e.lot_id ?? -e.id; map.set(k, [...(map.get(k) || []), e]); });
        const all = new Map<number, EdlInspection[]>();
        edls.forEach(e => { const k = e.lot_id ?? -e.id; all.set(k, [...(all.get(k) || []), e]); });
        const typeOrder = { entree: 0, intermediaire: 1, sortie: 2 } as const;
        return [...map.entries()].map(([lotKey, list]) => {
            const lotAll = all.get(lotKey) || list;
            const sorted = [...list].sort((a, b) => (typeOrder[a.type_edl] ?? 9) - (typeOrder[b.type_edl] ?? 9) || +new Date(a.date_realisation) - +new Date(b.date_realisation));
            const latest = [...lotAll].sort((a, b) => +new Date(b.date_realisation) - +new Date(a.date_realisation))[0];
            return {
                lotKey,
                lotId: list[0].lot_id,
                ref: list[0].ref_lot || '—',
                tenant: latest?.locataire_name || '',
                edls: sorted,
                hasEntry: lotAll.some(e => e.type_edl === 'entree'),
                hasExit: lotAll.some(e => e.type_edl === 'sortie'),
                todo: lotAll.some(e => e.statut === 'brouillon' || e.statut === 'signe'),
                lastDate: +new Date(latest?.date_realisation || 0),
            };
        }).sort((a, b) => Number(b.todo) - Number(a.todo) || b.lastDate - a.lastDate);
    }, [edls, filter, searchTerm]);

    const lotCount = new Set(edls.map(e => e.lot_id)).size;
    const chips: { key: Filter; label: string }[] = [
        { key: 'all', label: 'Tous' },
        { key: 'brouillon', label: 'À finaliser' },
        { key: 'signe', label: 'À clôturer' },
        { key: 'done', label: 'Terminés' },
    ];

    // Seule prochaine action d'un document selon son étape
    const nextAction = (e: EdlInspection) => {
        if (!canWrite) return null;
        if (e.statut === 'brouillon') return { label: 'Finaliser et signer', run: () => navigate(`/dashboard/etats-des-lieux/${e.id}/signer`) };
        if (e.statut === 'signe') return { label: 'Clôturer', run: () => changeStatus(e, 'cloture') };
        if (e.statut === 'cloture') return { label: 'Archiver', run: () => setConfirm({ kind: 'archive', edl: e }) };
        return null;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="@container max-w-[1080px] mx-auto space-y-5">
            {/* En-tête */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-extrabold text-base-content tracking-tight">États des lieux</h1>
                    <p className="text-base-content/70 font-medium mt-1 tabular-nums">
                        {loading || loadError ? 'Inspections d’entrée et de sortie' : (
                            <>
                                {counts.all} état{counts.all > 1 ? 's' : ''} des lieux · {lotCount} logement{lotCount > 1 ? 's' : ''}
                                {counts.brouillon > 0 && <> · <strong className="text-base-content">{counts.brouillon} à finaliser</strong></>}
                            </>
                        )}
                    </p>
                </div>
                {canWrite && (
                    <Link to="/dashboard/etats-des-lieux/nouveau" className={`inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 ${FOCUS}`}>
                        <Plus size={16} aria-hidden="true" /> Nouvel état des lieux
                    </Link>
                )}
            </div>

            {/* Recherche + filtres par étape */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-base-100 border border-base-300/70">
                <SearchInput placeholder="Logement, locataire ou référence…" value={searchTerm} onChange={setSearchTerm} className="flex-[1_1_260px] min-w-0" />
                <div role="group" aria-label="Filtrer par étape" className="flex flex-wrap gap-2">
                    {chips.map(c => {
                        const on = filter === c.key;
                        return (
                            <button key={c.key} type="button" aria-pressed={on} onClick={() => setFilter(c.key)}
                                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors ${FOCUS}
                                    ${on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}>
                                {c.label} <span className="tabular-nums opacity-80">{counts[c.key]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div role="status" aria-label="Chargement" className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="bg-base-100 rounded-2xl border border-base-300/70 p-5 flex items-center gap-4 animate-pulse motion-reduce:animate-none!">
                            <SkeletonLoader variant="rectangular" width={42} height={42} className="rounded-xl" />
                            <div className="flex-1 space-y-2"><SkeletonLoader variant="text" width="35%" /><SkeletonLoader variant="text" width="20%" /></div>
                        </div>
                    ))}
                </div>
            ) : loadError ? (
                <div className="bg-base-100 rounded-2xl border border-base-300/70 p-6"><LoadErrorState message={loadError} onRetry={() => { setLoading(true); loadEdls(); }} /></div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-5 py-10 rounded-2xl border border-dashed border-base-300 bg-base-100 text-center">
                    {edls.length === 0 ? <ClipboardCheck size={36} aria-hidden="true" className="text-base-content/40" /> : <SearchIcon size={32} aria-hidden="true" className="text-base-content/40" />}
                    <p className="text-base font-bold text-base-content">{edls.length === 0 ? 'Aucun état des lieux pour le moment' : 'Aucun état des lieux à cette étape'}</p>
                    {edls.length === 0 && canWrite && (
                        <Link to="/dashboard/etats-des-lieux/nouveau" className={`${OUTLINE_BTN} h-10 px-4 mt-1`}>Créer le premier</Link>
                    )}
                </div>
            ) : (
                <div className="space-y-3.5">
                    {groups.map(g => (
                        <section key={g.lotKey} aria-label={`Logement ${g.ref}`} className="bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
                            <header className="flex flex-wrap items-center justify-between gap-2.5 px-4 @xl:px-5 py-3.5 border-b border-base-300/70">
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-base-content break-words">{g.ref}</h2>
                                    {g.tenant && <p className="text-sm text-base-content/70 break-words">Locataire : {g.tenant}</p>}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {g.hasEntry && g.hasExit ? (
                                        <button type="button" onClick={() => handleCompare(g.edls[0].id)} className={`${OUTLINE_BTN} h-9 px-3 text-[13px]`}>Comparer entrée et sortie</button>
                                    ) : g.hasEntry ? (
                                        <span className="text-xs text-base-content/70">Comparaison possible après la sortie</span>
                                    ) : null}
                                    {canWrite && g.hasEntry && !g.hasExit && g.lotId && (
                                        <button type="button" onClick={() => navigate(`/dashboard/etats-des-lieux/nouveau?lot=${g.lotId}&type=sortie`)} className={`${OUTLINE_BTN} h-9 px-3 text-[13px]`}>
                                            <Plus size={14} aria-hidden="true" /> État des lieux de sortie
                                        </button>
                                    )}
                                </div>
                            </header>
                            <ul className="divide-y divide-base-300/70">
                                {g.edls.map(e => {
                                    const next = nextAction(e);
                                    const exit = e.type_edl === 'sortie';
                                    return (
                                        <li key={e.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 @xl:px-5 py-4">
                                            <Link to={`/dashboard/etats-des-lieux/${e.id}`} className={`flex-[1_1_220px] min-w-0 flex items-center gap-3 rounded-lg ${FOCUS}`}>
                                                <span aria-hidden="true" className="w-[42px] h-[42px] shrink-0 rounded-xl bg-primary/10 text-primary dark:text-base-content inline-flex items-center justify-center">
                                                    {exit ? <LogOut size={20} /> : e.type_edl === 'entree' ? <LogIn size={20} /> : <ClipboardCheck size={20} />}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-[15px] font-bold text-base-content break-words">{edlTypeLabel(e.type_edl)}</span>
                                                    <span className="block text-sm text-base-content/70 tabular-nums break-words">
                                                        {e.ref_edl} · {new Date(e.date_realisation).toLocaleDateString('fr-FR')} · {Number(e.item_count) || 0} élément{Number(e.item_count) > 1 ? 's' : ''}
                                                    </span>
                                                </span>
                                            </Link>
                                            <EdlSteps statut={e.statut} className="flex-[2_1_260px] min-w-0" />
                                            <div className="flex items-center gap-1.5">
                                                {next && (
                                                    <Button variant="primary" size="sm" className="h-10 px-3.5 text-[13px]" loading={busyId === e.id} onClick={next.run}>{next.label}</Button>
                                                )}
                                                <Link to={`/dashboard/etats-des-lieux/${e.id}`} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>Ouvrir</Link>
                                                <RowMenu
                                                    label="Plus d'actions"
                                                    items={[
                                                        ...(g.hasEntry && g.hasExit ? [{ label: 'Comparer entrée et sortie', onSelect: () => handleCompare(e.id) }] : []),
                                                        ...(canWrite && e.statut !== 'archive' && e.statut !== 'cloture' ? [{ label: 'Archiver', onSelect: () => setConfirm({ kind: 'archive', edl: e }) }] : []),
                                                        ...(canWrite ? [{ label: 'Mettre à la corbeille…', onSelect: () => setConfirm({ kind: 'delete', edl: e }), danger: true }] : []),
                                                        { label: 'Ouvrir', onSelect: () => navigate(`/dashboard/etats-des-lieux/${e.id}`) },
                                                    ]}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={!!confirm}
                onClose={() => setConfirm(null)}
                onConfirm={() => {
                    if (confirm?.kind === 'archive') changeStatus(confirm.edl, 'archive');
                    else if (confirm) deleteEdl(confirm.edl);
                    setConfirm(null);
                }}
                title={confirm?.kind === 'archive' ? 'Archiver cet état des lieux ?' : 'Mettre à la corbeille ?'}
                message={confirm?.kind === 'archive'
                    ? 'Il restera consultable mais figé.'
                    : 'Il sera restaurable depuis la Corbeille.'}
                confirmLabel={confirm?.kind === 'archive' ? 'Archiver' : 'Mettre à la corbeille'}
                type={confirm?.kind === 'archive' ? 'warning' : 'danger'}
            />
        </motion.div>
    );
};

export default EdlList;
