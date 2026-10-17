// frontend/src/pages/ReservationsList.tsx
// Réservations reçues depuis le site public.
// Refonte T-072 (maquette T-071) : une boîte de réception plutôt qu'un annuaire — onglets
// À traiter / Validées / Refusées, une carte par demande à traiter avec la décision en gros
// boutons et le contact direct, puis « Créer le bail » pour les demandes acceptées.
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, Phone, MessageCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';
import LoadErrorState from '../components/ui/LoadErrorState';
import ConfirmModal from '../components/ui/ConfirmModal';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import Button from '../components/ui/Button';
import { OUTLINE_BTN } from '../components/ui/RowMenu';
import { getAvatarColor } from '../utils/locataireUtils';

interface Reservation {
    id: number;
    reference_bail: string;
    statut: string;
    date_debut: string;
    created_at: string;
    conditions_particulieres?: string;
    loyer_actuel: number;
    montant_depot: number;
    locataire_nom: string;
    locataire_prenoms: string;
    telephone_principal: string;
    ref_lot: string;
    immeuble_nom: string;
}

type Tab = 'en_attente' | 'actif' | 'refuse';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// Le serveur range la demande web dans un texte unique :
// « [Immeuble: X. ]Réservation Web - Projet: location. Message: … » (reservationRoutes, POST /public).
// On en extrait les morceaux pour les afficher séparément ; un texte libre reste affiché tel quel.
const parseRequest = (raw?: string) => {
    const text = raw || '';
    const building = text.match(/Immeuble:\s*(.*?)\.\s/)?.[1]?.trim() || null;
    const project = text.match(/Projet:\s*([^.]+)\./)?.[1]?.trim() || null;
    const isWeb = /Réservation Web/.test(text);
    const message = isWeb
        ? (text.match(/Message:\s*([\s\S]*?)(\n\[Transformé|$)/)?.[1] || '').trim()
        : text.trim();
    return { building, project, message, isWeb };
};

const fullName = (r: Reservation) => [r.locataire_prenoms, r.locataire_nom].filter(Boolean).join(' ') || '—';
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

// « reçue il y a 3 h » / « il y a 2 j »
const ago = (iso?: string) => {
    if (!iso) return '';
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.round(mins / 60);
    if (h < 24) return `il y a ${h} h`;
    return `il y a ${Math.round(h / 24)} j`;
};

// Logement demandé : le serveur renvoie « Immeuble Complet » / « Non assigné » quand la demande
// porte sur un immeuble entier ; le vrai nom de l'immeuble est alors dans le texte de la demande.
const housingOf = (r: Reservation) => {
    const req = parseRequest(r.conditions_particulieres);
    const wholeBuilding = !r.ref_lot || r.ref_lot === 'Immeuble Complet';
    const building = req.building || (r.immeuble_nom && r.immeuble_nom !== 'Non assigné' ? r.immeuble_nom : null);
    return {
        title: building || (wholeBuilding ? 'Immeuble non précisé' : r.ref_lot),
        sub: [wholeBuilding ? 'immeuble entier' : r.ref_lot !== building ? r.ref_lot : null, req.project].filter(Boolean).join(' · '),
    };
};

const Initials: React.FC<{ r: Reservation; size?: number }> = ({ r, size = 44 }) => (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size / 3.2) }}
        className={`shrink-0 rounded-full inline-flex items-center justify-center font-bold text-white ${getAvatarColor(r.locataire_nom || '?')}`}>
        {r.locataire_prenoms?.charAt(0)}{r.locataire_nom?.charAt(0)}
    </span>
);

const ContactButtons: React.FC<{ r: Reservation; size?: 'sm' | 'md' }> = ({ r, size = 'md' }) => {
    const phone = r.telephone_principal || '';
    const h = size === 'md' ? 'h-11' : 'h-10';
    return (
        <>
            <a href={phone ? `tel:${phone}` : undefined} aria-disabled={!phone} aria-label={`Appeler ${fullName(r)}`}
                className={`${OUTLINE_BTN} ${h} px-3.5 text-sky-800 dark:text-sky-200 ${phone ? '' : 'opacity-40 pointer-events-none'}`}>
                <Phone size={16} aria-hidden="true" /> Appeler
            </a>
            <a href={phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${r.locataire_prenoms || ''}, `)}` : undefined}
                target="_blank" rel="noopener noreferrer" aria-disabled={!phone} aria-label={`Écrire à ${fullName(r)} sur WhatsApp`}
                className={`${OUTLINE_BTN} ${h} px-3.5 text-emerald-800 dark:text-emerald-200 ${phone ? '' : 'opacity-40 pointer-events-none'}`}>
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp
            </a>
        </>
    );
};

const ReservationsList: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    // Échec du chargement : distinct de « Aucune réservation » (T-042)
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('en_attente');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [refuseTarget, setRefuseTarget] = useState<Reservation | null>(null);
    const [openedId, setOpenedId] = useState<number | null>(null);

    const loadReservations = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const data = await apiCall<Reservation[]>(`${API_URL}/reservations`);
            setReservations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            const message = (err as Error)?.message || 'Erreur lors du chargement des réservations';
            setLoadError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReservations(); }, []);

    const handleValidate = async (r: Reservation, action: 'accept' | 'refuse') => {
        setActionLoading(r.id);
        try {
            const newStatus = action === 'accept' ? 'actif' : 'refuse';
            await apiCall(`${API_URL}/reservations/${r.id}/validate`, {
                method: 'POST',
                body: JSON.stringify({ statut: newStatus })
            });
            toast.success(action === 'accept'
                ? `Demande de ${fullName(r)} acceptée : vous pouvez créer le bail.`
                : `Demande de ${fullName(r)} refusée.`);
            loadReservations();
        } catch {
            toast.error('Erreur lors de la validation');
        } finally {
            setActionLoading(null);
        }
    };

    // Transformation en bail (inchangée côté serveur)
    const [transformModalOpen, setTransformModalOpen] = useState(false);
    const [transformingReservation, setTransformingReservation] = useState<Reservation | null>(null);
    const [transformData, setTransformData] = useState({
        date_fin: '',
        caution: '',
        avance: '1',
        periodicite: 'mensuel'
    });
    const [transformLoading, setTransformLoading] = useState(false);

    const openTransformModal = (reservation: Reservation) => {
        setTransformingReservation(reservation);
        // Fin par défaut : un an après la date d'entrée
        const startDate = new Date(reservation.date_debut);
        startDate.setFullYear(startDate.getFullYear() + 1);
        setTransformData({
            date_fin: startDate.toISOString().split('T')[0],
            caution: '',
            avance: '1',
            periodicite: 'mensuel'
        });
        setTransformModalOpen(true);
    };

    const handleTransform = async () => {
        if (!transformingReservation) return;
        setTransformLoading(true);
        try {
            const data = await apiCall<{ reference: string }>(`${API_URL}/reservations/${transformingReservation.id}/transform`, {
                method: 'POST',
                body: JSON.stringify({
                    date_fin: transformData.date_fin || null,
                    caution: transformData.caution ? parseFloat(transformData.caution) : null,
                    avance: parseInt(transformData.avance) || 1,
                    periodicite: transformData.periodicite
                })
            });
            toast.success(`Bail créé : ${data.reference}`);
            setTransformModalOpen(false);
            setTransformingReservation(null);
            loadReservations();
        } catch (err) {
            toast.error((err as Error).message || 'Erreur lors de la transformation');
        } finally {
            setTransformLoading(false);
        }
    };

    const counts = {
        en_attente: reservations.filter(r => r.statut === 'en_attente').length,
        actif: reservations.filter(r => r.statut === 'actif').length,
        refuse: reservations.filter(r => r.statut === 'refuse').length,
    };
    const list = reservations.filter(r => r.statut === tab);
    const headline = counts.en_attente > 0
        ? `${counts.en_attente} demande${counts.en_attente > 1 ? 's' : ''} à traiter · ${reservations.length} réservation${reservations.length > 1 ? 's' : ''} reçue${reservations.length > 1 ? 's' : ''} au total`
        : `Aucune demande à traiter · ${reservations.length} réservation${reservations.length > 1 ? 's' : ''} reçue${reservations.length > 1 ? 's' : ''} au total`;

    const tabs: { key: Tab; label: string }[] = [
        { key: 'en_attente', label: 'À traiter' },
        { key: 'actif', label: 'Validées' },
        { key: 'refuse', label: 'Refusées' },
    ];

    const EMPTY: Record<Tab, { title: string; text: string }> = {
        en_attente: { title: 'Aucune demande à traiter', text: 'Les nouvelles demandes envoyées depuis votre page publique arrivent ici.' },
        actif: { title: 'Aucune réservation validée en attente de bail', text: 'Une fois acceptée, une demande arrive ici avec le bouton « Créer le bail », qui reprend le client, le logement et la date d’entrée.' },
        refuse: { title: 'Aucune demande refusée', text: 'Les demandes que vous refusez restent consultables ici.' },
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="@container max-w-[980px] mx-auto space-y-5">
            {/* En-tête : une phrase qui dit ce qui attend */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-extrabold text-base-content tracking-tight">Réservations</h1>
                    <p className="text-base-content/70 font-medium mt-1 tabular-nums">
                        {loading || loadError ? 'Gérez les demandes de réservation en ligne' : headline}
                    </p>
                </div>
                <button type="button" onClick={loadReservations} disabled={loading} className={`${OUTLINE_BTN} h-11 px-4 disabled:opacity-60`}>
                    <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} /> Actualiser
                </button>
            </div>

            {/* Onglets de la boîte */}
            <div role="tablist" aria-label="Réservations" className="flex gap-1 p-1 rounded-xl bg-base-200 dark:bg-base-300/60 w-full @md:w-fit">
                {tabs.map(t => {
                    const on = tab === t.key;
                    return (
                        <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.key)}
                            className={`h-10 px-2 @sm:px-4 flex-1 @md:flex-none min-w-0 justify-center rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 @sm:gap-2 whitespace-nowrap transition-colors ${FOCUS}
                                ${on ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/70 hover:text-base-content'}`}>
                            {t.label}
                            {!loading && <span className={`text-xs px-2 py-px rounded-full tabular-nums ${on ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/80'}`}>{counts[t.key]}</span>}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div role="status" aria-label="Chargement" className="space-y-3">
                    {[0, 1].map(i => (
                        <div key={i} className="bg-base-100 rounded-2xl border border-base-300/70 p-5 flex items-center gap-4 animate-pulse motion-reduce:animate-none!">
                            <SkeletonLoader variant="circular" width={44} height={44} />
                            <div className="flex-1 space-y-2"><SkeletonLoader variant="text" width="40%" /><SkeletonLoader variant="text" width="25%" /></div>
                        </div>
                    ))}
                </div>
            ) : loadError ? (
                <div className="bg-base-100 rounded-2xl border border-base-300/70 p-6"><LoadErrorState message={loadError} onRetry={loadReservations} /></div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-5 py-10 rounded-2xl border border-dashed border-base-300 bg-base-100 text-center">
                    <p className="text-base font-bold text-base-content">{EMPTY[tab].title}</p>
                    <p className="text-sm text-base-content/70 max-w-[460px]">{EMPTY[tab].text}</p>
                </div>
            ) : tab === 'refuse' ? (
                // Refusées : liste compacte, la demande se déplie
                <ul className="bg-base-100 rounded-2xl border border-base-300/70 divide-y divide-base-300/70 overflow-hidden">
                    {list.map(r => {
                        const housing = housingOf(r);
                        const req = parseRequest(r.conditions_particulieres);
                        const open = openedId === r.id;
                        return (
                            <li key={r.id}>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 @xl:px-5 py-4">
                                    <Initials r={r} size={40} />
                                    <span className="flex-[1_1_180px] min-w-0">
                                        <span className="block text-[15px] font-bold text-base-content break-words">{fullName(r)}</span>
                                        <span className="block text-sm text-base-content/70 tabular-nums">{r.telephone_principal || '—'}</span>
                                    </span>
                                    <span className="flex-[1_1_180px] min-w-0">
                                        <span className="block text-sm font-semibold text-base-content break-words">{[housing.title, housing.sub].filter(Boolean).join(' · ')}</span>
                                        <span className="block text-sm text-base-content/70 tabular-nums">Entrée souhaitée le {fmtDate(r.date_debut)}</span>
                                    </span>
                                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-100">Refusée</span>
                                    <button type="button" onClick={() => setOpenedId(open ? null : r.id)} aria-expanded={open} className={`${OUTLINE_BTN} h-10 px-3 text-[13px]`}>
                                        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                                        {open ? 'Masquer' : 'Voir la demande'}
                                    </button>
                                </div>
                                {open && (
                                    <div className="mx-4 @xl:mx-5 mb-4 px-3.5 py-3 rounded-xl bg-base-200/70 dark:bg-base-200 text-sm text-base-content/80 space-y-1">
                                        <p>Demande du {fmtDate(r.created_at)}{req.project ? ` · Projet : ${req.project}` : ''}{req.building ? ` · Immeuble demandé : ${req.building}` : ''}</p>
                                        <p>{req.message ? `« ${req.message} »` : 'Aucun message laissé par le client.'}</p>
                                        <div className="flex flex-wrap gap-2 pt-2"><ContactButtons r={r} size="sm" /></div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                // À traiter et Validées : une carte par demande
                <div className="space-y-3.5">
                    {list.map(r => {
                        const housing = housingOf(r);
                        const req = parseRequest(r.conditions_particulieres);
                        const pending = r.statut === 'en_attente';
                        const days = Math.ceil((new Date(r.date_debut).getTime() - Date.now()) / 86400000);
                        const busy = actionLoading === r.id;
                        return (
                            <article key={r.id} className="bg-base-100 rounded-2xl border border-base-300/70 p-4 @xl:p-5 space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Initials r={r} />
                                        <div className="min-w-0">
                                            <h2 className="text-[17px] font-bold text-base-content break-words">{fullName(r)}</h2>
                                            <p className="text-sm text-base-content/70 tabular-nums">{r.telephone_principal || '—'} · demande reçue {ago(r.created_at)}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${pending
                                        ? 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100'
                                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100'}`}>
                                        {pending ? 'À traiter' : 'Validée'}
                                    </span>
                                </div>

                                <dl className="grid grid-cols-1 @md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-base-200/70 dark:bg-base-200">
                                    <div className="min-w-0"><dt className="text-xs font-semibold text-base-content/70">Logement demandé</dt><dd className="text-[15px] font-bold text-base-content break-words">{housing.title}</dd>{housing.sub && <dd className="text-sm text-base-content/70">{housing.sub}</dd>}</div>
                                    <div><dt className="text-xs font-semibold text-base-content/70">Entrée souhaitée</dt><dd className="text-[15px] font-bold text-base-content tabular-nums">{fmtDate(r.date_debut)}</dd>{days > 0 && <dd className="text-sm text-base-content/70">dans {days} jour{days > 1 ? 's' : ''}</dd>}</div>
                                    <div><dt className="text-xs font-semibold text-base-content/70">Dépôt versé</dt><dd className="text-[15px] font-bold text-base-content tabular-nums">{Number(r.montant_depot) > 0 ? `${Number(r.montant_depot).toLocaleString('fr-FR')} FCFA` : 'Aucun'}</dd>{Number(r.montant_depot) > 0 && <dd className="text-sm text-base-content/70">5 % du loyer</dd>}</div>
                                </dl>

                                {req.message && (
                                    <blockquote className="pl-3.5 border-l-[3px] border-base-300 text-sm text-base-content/80 break-words">« {req.message} »</blockquote>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    {pending ? (
                                        <>
                                            <Button variant="primary" className="flex-[1_1_150px] h-11 text-[15px]" loading={busy} onClick={() => handleValidate(r, 'accept')}>
                                                <CheckCircle size={18} aria-hidden="true" /> Accepter
                                            </Button>
                                            <button type="button" disabled={busy} onClick={() => setRefuseTarget(r)}
                                                className={`${OUTLINE_BTN} flex-[1_1_150px] h-11 text-[15px] font-bold border-red-200 text-red-800 hover:bg-red-50 dark:border-red-400/30 dark:text-red-200 dark:hover:bg-red-400/10 disabled:opacity-50`}>
                                                <X size={18} aria-hidden="true" /> Refuser…
                                            </button>
                                        </>
                                    ) : (
                                        <Button variant="primary" className="flex-[1_1_200px] h-11 text-[15px]" onClick={() => openTransformModal(r)}>Créer le bail</Button>
                                    )}
                                    <span aria-hidden="true" className="hidden @md:block w-px h-7 bg-base-300" />
                                    <ContactButtons r={r} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Le parcours d'une demande en 3 étapes */}
            <ol className="grid grid-cols-1 @2xl:grid-cols-3 gap-2.5">
                {[
                    ['Demande reçue', 'depuis votre page publique'],
                    ['Acceptée ou refusée', 'après échange avec le client'],
                    ['Bail créé', 'la réservation devient un bail'],
                ].map(([title, text], i) => (
                    <li key={title} className="flex items-start gap-3 p-3.5 rounded-xl bg-base-100 border border-base-300/70">
                        <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-primary text-primary-content inline-flex items-center justify-center text-[13px] font-bold tabular-nums">{i + 1}</span>
                        <span className="text-sm"><strong className="text-base-content">{title}</strong><br /><span className="text-base-content/70">{text}</span></span>
                    </li>
                ))}
            </ol>

            {/* Refus : confirmation, la décision n'est pas réversible depuis l'interface */}
            <ConfirmModal
                isOpen={!!refuseTarget}
                onClose={() => setRefuseTarget(null)}
                onConfirm={() => { if (refuseTarget) handleValidate(refuseTarget, 'refuse'); setRefuseTarget(null); }}
                title="Refuser cette demande ?"
                message={refuseTarget ? `La demande de ${fullName(refuseTarget)} passera dans « Refusées ». Pensez à prévenir le client.` : ''}
                confirmLabel="Refuser la demande"
                type="danger"
            />

            {/* Création du bail à partir d'une réservation validée */}
            {transformModalOpen && transformingReservation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setTransformModalOpen(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="transform-title"
                        className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 id="transform-title" className="text-xl font-bold text-base-content mb-1">Créer le bail</h2>
                        <p className="text-sm text-base-content/70 mb-6">{housingOf(transformingReservation).title} · {fullName(transformingReservation)}</p>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="block text-sm font-medium text-base-content/80 mb-1">Date de fin du bail</span>
                                <input type="date" value={transformData.date_fin}
                                    onChange={(e) => setTransformData({ ...transformData, date_fin: e.target.value })}
                                    className="w-full h-11 px-3 border border-base-300 rounded-xl bg-base-100" />
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className="block text-sm font-medium text-base-content/80 mb-1">Caution (FCFA)</span>
                                    <input type="number" placeholder="Auto = 1 mois" value={transformData.caution}
                                        onChange={(e) => setTransformData({ ...transformData, caution: e.target.value })}
                                        className="w-full h-11 px-3 border border-base-300 rounded-xl bg-base-100" />
                                </label>
                                <label className="block">
                                    <span className="block text-sm font-medium text-base-content/80 mb-1">Avance (mois)</span>
                                    <input type="number" min="1" value={transformData.avance}
                                        onChange={(e) => setTransformData({ ...transformData, avance: e.target.value })}
                                        className="w-full h-11 px-3 border border-base-300 rounded-xl bg-base-100" />
                                </label>
                            </div>
                            <label className="block">
                                <span className="block text-sm font-medium text-base-content/80 mb-1">Périodicité</span>
                                <select value={transformData.periodicite}
                                    onChange={(e) => setTransformData({ ...transformData, periodicite: e.target.value })}
                                    className="w-full h-11 px-3 border border-base-300 rounded-xl bg-base-100">
                                    <option value="mensuel">Mensuel</option>
                                    <option value="trimestriel">Trimestriel</option>
                                    <option value="semestriel">Semestriel</option>
                                    <option value="annuel">Annuel</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setTransformModalOpen(false)} className={`${OUTLINE_BTN} flex-1 h-11`}>Annuler</button>
                            <Button variant="primary" className="flex-1 h-11" onClick={handleTransform} loading={transformLoading} loadingText="Création…">
                                <CheckCircle size={16} aria-hidden="true" /> Confirmer
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ReservationsList;
