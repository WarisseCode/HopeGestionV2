// frontend/src/components/CompteProprietaires.tsx
// Refonte T-064 (maquette T-063), même logique que Locataires (T-062) et Parc immobilier (T-060) :
// liste compacte, barre d'outils unique, filtres rapides, fiche rapide, menu « ⋯ ».
import React, { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '../api/accountApi';
import { getImmeubles } from '../api/bienApi';
import type { Immeuble } from '../api/bienApi';
import {
  Plus, X, Users, Send, ArrowLeft, MessageCircle, Phone, ChevronLeft, ChevronRight,
} from 'lucide-react';
import InvitationLinkModal from './ui/InvitationLinkModal';
import ProprietaireForm from './proprietaires/ProprietaireForm';
import SearchInput from './ui/SearchInput';
import SkeletonLoader from './ui/SkeletonLoader';
import Button from './ui/Button';
import RowMenu, { OUTLINE_BTN } from './ui/RowMenu';
import { useIsDesktop, isDesktop } from '../hooks/useIsDesktop';
import { withCreateAction } from '../hooks/useCreateFromUrl';
import toast from 'react-hot-toast';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import ConfirmModal from './ui/ConfirmModal';

interface Owner {
    id: number;
    name: string;
    first_name?: string;
    type: 'individual' | 'company';
    phone: string;
    email: string;
    address: string;
    city?: string;
    company_name?: string;
    rccm_number?: string;
    id_number?: string;
    mobile_money?: string;
    management_mode?: 'direct' | 'delegated';
    total_properties?: number;
    total_lots?: number;
    photo_url?: string;
    phone_secondary?: string;
}

interface CompteProprietairesProps {
    // Conservées pour compatibilité ; le titre et le sous-titre chiffré sont désormais fixes
    showStats?: boolean;
    title?: string;
    subtitle?: string;
}

type TypeFilter = 'all' | 'individual' | 'company';
type ModeFilter = 'all' | 'direct' | 'delegated';
type SortKey = 'name' | 'biens' | 'recent';

const ITEMS_PER_PAGE = 12;

const displayName = (o: Owner) =>
    o.type === 'company' ? (o.company_name || o.name) : `${o.name} ${o.first_name || ''}`.trim();
const typeLabel = (o: Owner) => (o.type === 'company' ? 'Société' : 'Particulier');
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// Couleur d'avatar stable par propriétaire (texte blanc ≥ 4,5:1 sur ces teintes foncées)
const AVATAR_BG = ['bg-sky-700', 'bg-violet-700', 'bg-rose-700', 'bg-amber-800', 'bg-teal-700', 'bg-emerald-700'];
const avatarBg = (id: number) => AVATAR_BG[id % AVATAR_BG.length];

const MODE_PILL = {
    direct: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
    delegated: 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100',
};

const Avatar: React.FC<{ owner: Owner; size: number }> = ({ owner, size }) =>
    owner.photo_url ? (
        <img src={owner.photo_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
    ) : (
        <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
            className={`shrink-0 rounded-full inline-flex items-center justify-center font-bold text-white ${avatarBg(owner.id)}`}>
            {(owner.name || '?').charAt(0).toUpperCase()}{(owner.type === 'company' ? '' : owner.first_name || '').charAt(0).toUpperCase()}
        </span>
    );

const ListSkeleton: React.FC = () => (
    <div role="status" aria-label="Chargement" className="bg-base-100 rounded-2xl border border-base-300/70 divide-y divide-base-300/70">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse motion-reduce:animate-none!">
                <SkeletonLoader variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                    <SkeletonLoader variant="text" width="35%" />
                    <SkeletonLoader variant="text" width="20%" />
                </div>
                <SkeletonLoader variant="rectangular" width={84} height={24} className="rounded-full hidden sm:block" />
            </div>
        ))}
    </div>
);

// ── Fiche rapide : contact, Mobile Money, ses biens (mêmes données que Parc immobilier) ──────

interface PanelProps {
    owner: Owner;
    buildings: Immeuble[] | null;
    buildingsError: boolean;
    onClose: () => void;
    onWhatsApp: () => void;
    onCall: () => void;
    onAddBuilding: () => void;
    onEdit: () => void;
    onSeeBuildings: () => void;
}

const OwnerPanel = forwardRef<HTMLElement, PanelProps>(
    ({ owner, buildings, buildingsError, onClose, onWhatsApp, onCall, onAddBuilding, onEdit, onSeeBuildings }, ref) => (
        <aside ref={ref} aria-label="Fiche rapide"
            className="flex-[1_1_340px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 p-5 space-y-4 scroll-mt-4 lg:sticky lg:top-4">
            <div className="flex items-start gap-3">
                <Avatar owner={owner} size={52} />
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-base-content break-words">{displayName(owner)}</h2>
                    <p className="text-sm text-base-content/70">
                        {typeLabel(owner)} · Gestion {owner.management_mode === 'delegated' ? 'déléguée' : 'directe'}
                    </p>
                </div>
                <button type="button" onClick={onClose} aria-label="Fermer la fiche" className={`${OUTLINE_BTN} w-10 h-10 shrink-0`}>
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <dl className="space-y-2 px-3.5 py-3 rounded-xl bg-base-200/70 dark:bg-base-200 text-sm">
                {([
                    ['Téléphone', owner.phone],
                    ['Email', owner.email],
                    ['Adresse', [owner.address, owner.city && owner.city !== owner.address ? owner.city : ''].filter(Boolean).join(', ')],
                    ['Mobile Money', owner.mobile_money],
                ] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                        <dt className="text-base-content/70 shrink-0">{k}</dt>
                        <dd className="font-semibold text-right break-all tabular-nums">{v || '—'}</dd>
                    </div>
                ))}
            </dl>

            <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={onWhatsApp} disabled={!owner.phone} className={`${OUTLINE_BTN} h-11 text-[13px] text-emerald-800 dark:text-emerald-200 disabled:opacity-40`}>WhatsApp</button>
                <button type="button" onClick={onCall} disabled={!owner.phone} className={`${OUTLINE_BTN} h-11 text-[13px] text-sky-800 dark:text-sky-200 disabled:opacity-40`}>Appeler</button>
                {owner.email
                    ? <a href={`mailto:${owner.email}`} className={`${OUTLINE_BTN} h-11 text-[13px]`}>Email</a>
                    : <button type="button" disabled className={`${OUTLINE_BTN} h-11 text-[13px] opacity-40`}>Email</button>}
            </div>

            <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold text-base-content">Ses biens</h3>
                <button type="button" onClick={onAddBuilding} className={`${OUTLINE_BTN} h-9 px-3 text-[13px]`}>
                    <Plus size={14} aria-hidden="true" /> Ajouter un bien
                </button>
            </div>

            {buildingsError ? (
                <p className="text-sm text-error">Impossible de charger les biens.</p>
            ) : buildings === null ? (
                <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-14 rounded-xl bg-base-200 animate-pulse motion-reduce:animate-none!" />)}</div>
            ) : buildings.length === 0 ? (
                <p className="p-3.5 rounded-xl border border-dashed border-base-300 text-sm text-base-content/80">Aucun bien enregistré pour ce propriétaire.</p>
            ) : (
                <ul className="space-y-2">
                    {buildings.map(b => {
                        const total = b.nbLots || 0;
                        const occ = (b as Immeuble & { lotsOccupes?: number }).lotsOccupes ?? 0;
                        return (
                            <li key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-base-300/70">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-base-content break-words">{b.nom}</span>
                                    <span className="block text-xs text-base-content/70">{[b.ville, plural(total, 'lot', 'lots')].filter(Boolean).join(' · ')}</span>
                                </span>
                                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums bg-base-200 text-base-content/80">
                                    {total ? `${occ} / ${total} occupés` : 'Aucun lot'}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-base-300/70">
                <Button variant="primary" className="flex-1 h-11" onClick={onEdit}>Modifier la fiche</Button>
                <button type="button" onClick={onSeeBuildings} className={`${OUTLINE_BTN} h-11 px-4`}>Voir ses biens</button>
            </div>
        </aside>
    )
);
OwnerPanel.displayName = 'OwnerPanel';

const CompteProprietaires: React.FC<CompteProprietairesProps> = () => {
    const navigate = useNavigate();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TypeFilter>('all');
    const [filterMode, setFilterMode] = useState<ModeFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [currentPage, setCurrentPage] = useState(1);

    const [editingProp, setEditingProp] = useState<any>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Immeubles (même source que Parc immobilier) pour la section « Ses biens » de la fiche rapide
    const [buildings, setBuildings] = useState<Immeuble[] | null>(null);
    const [buildingsError, setBuildingsError] = useState(false);

    // Propriétaire du panneau : premier de la page d'office sur grand écran (comme T-060/T-062)
    const [pickedId, setPickedId] = useState<number | null>(null);
    const [panelDismissed, setPanelDismissed] = useState(false);
    const desktop = useIsDesktop();
    const panelRef = useRef<HTMLElement>(null);

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger',
        action: async () => {}
    });

    useEffect(() => {
        loadOwners();
        loadSubscription();
        getImmeubles()
            .then(setBuildings)
            .catch(err => { console.error('Erreur chargement immeubles', err); setBuildingsError(true); });
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, filterMode, sortKey]);

    const loadSubscription = async () => {
        try {
            const status = await getSubscriptionStatus();
            setSubscriptionStatus(status);
        } catch (error) {
            console.error('Erreur lors du chargement du statut abonnement', error);
        }
    };

    const loadOwners = async () => {
        try {
            setLoading(true);
            const data = await accountApi.getProprietaires();

            // Harmoniser le mapping pour supporter les deux formats (backend/frontend)
            const mapped: Owner[] = data.map((o: any) => ({
                id: o.id,
                type: o.type,
                name: o.nom || o.name || '',
                first_name: o.prenom || o.first_name || '',
                phone: o.telephone || o.phone || '',
                email: o.email || '',
                address: o.adresse || o.address || '',
                city: o.ville || o.city || '',
                company_name: o.company_name || (o.type === 'company' ? (o.nom || o.name) : ''),
                rccm_number: o.id_number || o.rccm_number || o.rccmNumber || '',
                id_number: o.id_number || o.numeroPiece || '',
                mobile_money: o.mobile_money || o.mobileMoney || '',
                management_mode: o.management_mode || o.modeGestion || 'direct',
                // Renvoyés par l'API depuis T-064 (COUNT ::int)
                total_properties: Number(o.total_properties) || 0,
                total_lots: Number(o.total_lots) || 0,
                photo_url: o.photo_url || o.photo || '',
                phone_secondary: o.phone_secondary || o.telephoneSecondaire || ''
            }));

            setOwners(mapped);
        } catch (err) {
            toast.error("Impossible de charger les propriétaires.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // « Désactiver » et « Supprimer » appelaient le même endpoint : une seule action est gardée (T-064),
    // avec un message conforme à ce que fait l'API (désactivation, biens conservés).
    const handleDelete = (owner: Owner) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Supprimer ce propriétaire',
            message: `${displayName(owner)} sera retiré de la liste et n'aura plus accès à la plateforme. Ses biens restent enregistrés.`,
            type: 'danger',
            action: async () => {
                try {
                    await accountApi.deleteProprietaire(owner.id);
                    setOwners(prev => prev.filter(o => o.id !== owner.id));
                    toast.success("Propriétaire supprimé.");
                } catch {
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    const handleEdit = (owner: Owner) => {
        setEditingProp({
            ...owner,
            prenom: owner.first_name,
            photo_url: owner.photo_url,
            secondary_phone: owner.phone_secondary || '',
            id_number: owner.id_number || owner.rccm_number || ''
        });
        setShowForm(true);
    };

    const handleWhatsApp = (phone: string, name: string) => {
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${name}, `)}`, '_blank');
    };
    const handleCall = (phone: string) => { window.location.href = `tel:${phone}`; };

    const filteredOwners = useMemo(() => owners.filter(o => {
        // Filtre texte (ville et adresse ajoutées à la recherche)
        const search = searchTerm.toLowerCase();
        const fullName = `${o.name} ${o.first_name}`.toLowerCase();
        const company = (o.company_name || '').toLowerCase();
        const matchesSearch = fullName.includes(search) ||
               company.includes(search) ||
               o.email.toLowerCase().includes(search) ||
               o.phone.includes(search) ||
               (o.city || '').toLowerCase().includes(search) ||
               (o.address || '').toLowerCase().includes(search);

        if (!matchesSearch) return false;
        if (filterType !== 'all' && o.type !== filterType) return false;
        if (filterMode !== 'all' && o.management_mode !== filterMode) return false;
        return true;
    }).sort((a, b) => {
        if (sortKey === 'biens') return (b.total_properties || 0) - (a.total_properties || 0) || displayName(a).localeCompare(displayName(b), 'fr');
        if (sortKey === 'recent') return b.id - a.id;
        return displayName(a).localeCompare(displayName(b), 'fr');
    }), [owners, searchTerm, filterType, filterMode, sortKey]);

    const counts = useMemo(() => ({
        all: owners.length,
        individual: owners.filter(o => o.type !== 'company').length,
        company: owners.filter(o => o.type === 'company').length,
        direct: owners.filter(o => o.management_mode !== 'delegated').length,
        delegated: owners.filter(o => o.management_mode === 'delegated').length,
        biens: owners.reduce((sum, o) => sum + (o.total_properties || 0), 0),
    }), [owners]);

    // Déterminer si l'aide au blocage Multi-Agences s'applique
    const isEnterprisePlan = subscriptionStatus?.plan?.name?.toLowerCase().includes('entreprise');
    const hasReachedAgencyLimit = Boolean(!isEnterprisePlan && (subscriptionStatus?.usage?.current_agencies ?? 0) >= 1);

    const totalPages = Math.ceil(filteredOwners.length / ITEMS_PER_PAGE);
    const paginated = filteredOwners.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const total = filteredOwners.length;
    const from = total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const to = Math.min(currentPage * ITEMS_PER_PAGE, total);

    const pickedExists = pickedId != null && owners.some(o => o.id === pickedId);
    const selectedId = pickedExists ? pickedId : (desktop && !panelDismissed ? paginated[0]?.id ?? null : null);
    const selected = owners.find(o => o.id === selectedId) ?? null;
    const selectedBuildings = useMemo(
        () => (buildings && selected ? buildings.filter(b => b.owner_id === selected.id) : null),
        [buildings, selected]
    );

    const selectOwner = (owner: Owner) => {
        setPickedId(owner.id);
        setPanelDismissed(false);
        // Sous 1024 px le panneau passe sous la liste : on l'amène à l'écran
        if (!isDesktop()) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };

    const openNew = () => {
        if (hasReachedAgencyLimit) return;
        setEditingProp(null);
        setShowForm(true);
    };

    if (showForm) {
        // Le formulaire porte son propre titre (« Nouveau / Modifier le propriétaire ») : seul le retour est ajouté
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => { setShowForm(false); setEditingProp(null); }}
                        className="flex items-center gap-2 text-base-content/70 hover:text-base-content transition min-h-11">
                        <ArrowLeft size={20} aria-hidden="true" />
                        <span className="text-sm font-medium">Retour aux propriétaires</span>
                    </button>
                </div>
                <ProprietaireForm
                  owner={editingProp || undefined}
                  onSave={async (data) => {
                    try {
                      const saved = await accountApi.saveProprietaire(data);
                      toast.success(data.id ? "Propriétaire modifié avec succès" : "Propriétaire créé avec succès");
                      await loadOwners();
                      // Renvoyé au formulaire : permet de rattacher les documents en
                      // attente à l'owner créé. Le formulaire ferme lui-même via onCancel.
                      return saved;
                    } catch (err: any) {
                      console.error('Error saving owner:', err);
                      toast.error(err.message || "Erreur lors de l'enregistrement.");
                      throw err; // propage → le formulaire reste ouvert
                    }
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingProp(null);
                  }}
                />
            </div>
        );
    }

    const chip = (on: boolean) =>
        `h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`;

    return (
        <div className="@container space-y-5 animate-fade-in">
            {/* En-tête : chiffres en sous-titre (remplacent les 3 cartes), deux actions fixes */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-extrabold text-base-content tracking-tight">Propriétaires</h1>
                    <p className="text-base-content/70 font-medium mt-1 tabular-nums">
                        {loading ? 'Suivez et gérez les propriétaires de votre parc immobilier.'
                            : `${plural(counts.all, 'propriétaire', 'propriétaires')} · ${plural(counts.biens, 'bien géré', 'biens gérés')} · ${counts.delegated} en gestion déléguée`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setShowInviteModal(true)} title="Inviter un propriétaire à créer son compte" className={`${OUTLINE_BTN} h-11 px-4`}>
                        <Send size={16} aria-hidden="true" /> Inviter
                    </button>
                    <Button variant="primary" onClick={openNew} aria-disabled={hasReachedAgencyLimit}
                        title={hasReachedAgencyLimit ? 'Passez au plan Entreprise pour gérer plusieurs agences' : 'Créer une nouvelle agence / propriétaire'}
                        className={`h-11 px-5 gap-1.5 ${hasReachedAgencyLimit ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                        <Plus size={16} aria-hidden="true" /> Nouveau propriétaire
                    </Button>
                </div>
            </div>

            {/* Barre unique : recherche, tri, puis filtres rapides (remplacent « Filtres » et « Colonnes ») */}
            <div className="bg-base-100 rounded-2xl p-4 border border-base-300/70 space-y-3.5">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput placeholder="Rechercher un nom, une société, un téléphone, une ville…" value={searchTerm} onChange={setSearchTerm} className="flex-[1_1_300px] min-w-0" />
                    <label className="flex-[1_1_150px] @3xl:flex-none flex items-center gap-2 h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm text-base-content/70 focus-within:outline-2 focus-within:outline-primary">
                        <span>Trier</span>
                        <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-transparent font-semibold text-base-content outline-none">
                            <option value="name">Nom (A→Z)</option>
                            <option value="biens">Plus de biens</option>
                            <option value="recent">Plus récents</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
                        {([['all', 'Tous', counts.all], ['individual', 'Particuliers', counts.individual], ['company', 'Sociétés', counts.company]] as const).map(([k, label, n]) => (
                            <button key={k} type="button" aria-pressed={filterType === k} onClick={() => setFilterType(k)} className={chip(filterType === k)}>
                                {label} <span className="tabular-nums opacity-80">{n}</span>
                            </button>
                        ))}
                    </div>
                    <span aria-hidden="true" className="hidden @md:block w-px h-6 bg-base-300 mx-1" />
                    <div role="group" aria-label="Filtrer par mode de gestion" className="flex flex-wrap gap-2">
                        {([['all', 'Tous modes', counts.all, 'bg-base-content/50'], ['direct', 'Gestion directe', counts.direct, 'bg-emerald-600'], ['delegated', 'Déléguée', counts.delegated, 'bg-orange-500']] as const).map(([k, label, n, dot]) => (
                            <button key={k} type="button" aria-pressed={filterMode === k} onClick={() => setFilterMode(k)} className={chip(filterMode === k)}>
                                <span className={`w-2 h-2 rounded-full ${filterMode === k ? 'bg-primary-content' : dot}`} aria-hidden="true" />
                                {label} <span className="tabular-nums opacity-80">{n}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <ListSkeleton />
            ) : (
                <div className="flex flex-wrap items-start gap-5">
                    <section aria-label="Résultats" className="flex-[999_1_560px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
                        {paginated.length === 0 ? (
                            <div className="p-12 text-center text-base-content/70">
                                <Users size={40} className="mx-auto mb-3 opacity-40" aria-hidden="true" />
                                <p>Aucun propriétaire ne correspond à ces critères.</p>
                                {(searchTerm || filterType !== 'all' || filterMode !== 'all') && (
                                    <button type="button" onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterMode('all'); }}
                                        className="text-primary hover:underline text-sm font-semibold mt-2 min-h-11">
                                        Effacer la recherche et les filtres
                                    </button>
                                )}
                            </div>
                        ) : (
                            <ul className="divide-y divide-base-300/70">
                                {paginated.map(owner => {
                                    const name = displayName(owner);
                                    const active = selected?.id === owner.id;
                                    const place = owner.city || owner.address;
                                    const nb = owner.total_properties || 0;
                                    return (
                                        <li key={owner.id} className={`flex flex-wrap items-center gap-x-5 gap-y-3 px-4 @xl:px-5 py-3.5 transition-colors ${active ? 'bg-primary/10' : 'hover:bg-base-200/60'}`}>
                                            <button type="button" onClick={() => selectOwner(owner)} aria-label={`Ouvrir la fiche de ${name}`} aria-current={active ? 'true' : undefined}
                                                className="flex-[1_1_200px] min-w-0 flex items-center gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                                <Avatar owner={owner} size={40} />
                                                <span className="min-w-0">
                                                    <span className="block text-[15px] font-bold text-base-content break-words">{name}</span>
                                                    <span className="block text-sm text-base-content/70 break-words">{[typeLabel(owner), place].filter(Boolean).join(' · ')}</span>
                                                </span>
                                            </button>
                                            <span className="flex-[1_1_150px] min-w-0">
                                                <span className="block text-sm font-semibold text-base-content tabular-nums">{owner.phone || '—'}</span>
                                                <span className="block text-sm text-base-content/70 [overflow-wrap:anywhere]">{owner.email || '—'}</span>
                                            </span>
                                            {/* Patrimoine et mode empilés : avec le menu latéral, 5 colonnes ne tenaient pas sur une rangée */}
                                            <span className="flex-[0_0_130px] flex flex-col items-start gap-1.5">
                                                <span className="text-sm font-semibold text-base-content tabular-nums">
                                                    {nb ? `${plural(nb, 'bien', 'biens')} · ${plural(owner.total_lots || 0, 'lot', 'lots')}` : 'Aucun bien'}
                                                </span>
                                                <span className={`min-w-[84px] text-center px-2.5 py-1 rounded-full text-xs font-bold ${MODE_PILL[owner.management_mode === 'delegated' ? 'delegated' : 'direct']}`}>
                                                    {owner.management_mode === 'delegated' ? 'Déléguée' : 'Directe'}
                                                </span>
                                            </span>
                                            <div className="flex gap-1.5">
                                                <button type="button" aria-label={`WhatsApp ${name}`} title="WhatsApp" disabled={!owner.phone}
                                                    onClick={() => handleWhatsApp(owner.phone, owner.first_name || name)} className={`${OUTLINE_BTN} w-10 h-10 text-emerald-800 dark:text-emerald-200 disabled:opacity-40`}>
                                                    <MessageCircle size={16} aria-hidden="true" />
                                                </button>
                                                <button type="button" aria-label={`Appeler ${name}`} title="Appeler" disabled={!owner.phone}
                                                    onClick={() => handleCall(owner.phone)} className={`${OUTLINE_BTN} w-10 h-10 text-sky-800 dark:text-sky-200 disabled:opacity-40`}>
                                                    <Phone size={16} aria-hidden="true" />
                                                </button>
                                                <RowMenu
                                                    label="Plus d'actions"
                                                    items={[
                                                        { label: 'Modifier', onSelect: () => handleEdit(owner) },
                                                        { label: 'Supprimer', onSelect: () => handleDelete(owner), danger: true },
                                                    ]}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {total > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 @xl:px-5 py-3.5 border-t border-base-300/70 text-sm text-base-content/70">
                                <span className="tabular-nums">{from}–{to} sur {plural(total, 'propriétaire', 'propriétaires')}</span>
                                {totalPages > 1 && (
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                                            <ChevronLeft size={16} aria-hidden="true" /> Précédent
                                        </button>
                                        <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                                            Suivant <ChevronRight size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {selected && (
                        <OwnerPanel
                            ref={panelRef}
                            owner={selected}
                            buildings={selectedBuildings}
                            buildingsError={buildingsError}
                            onClose={() => { setPanelDismissed(true); setPickedId(null); }}
                            onWhatsApp={() => handleWhatsApp(selected.phone, selected.first_name || displayName(selected))}
                            onCall={() => handleCall(selected.phone)}
                            onAddBuilding={() => navigate(withCreateAction('/dashboard/biens'))}
                            onEdit={() => handleEdit(selected)}
                            onSeeBuildings={() => navigate('/dashboard/biens')}
                        />
                    )}
                </div>
            )}

            {/* Dynamic Confirm Modal */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmConfig.action();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
            />

            <InvitationLinkModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                type="owner"
            />
        </div>
    );
};

export default CompteProprietaires;
