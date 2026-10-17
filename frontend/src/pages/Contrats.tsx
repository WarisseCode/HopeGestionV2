// frontend/src/pages/Contrats.tsx
// Registre des contrats.
// Refonte T-068 (maquette T-067) : la gestion du bail (renouveler, résilier, échéancier) vit dans
// Baux & Locations ; cette page se concentre sur le document du contrat — PDF généré ou non,
// signé ou non, téléchargeable — avec la même structure que les autres pages refondues.

import React, { useState, useMemo, useRef, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion } from 'framer-motion';
import { Plus, FileText, Wrench, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import LoadErrorState from '../components/ui/LoadErrorState';
import SignatureModal from '../components/SignatureModal';
import RowMenu, { OUTLINE_BTN } from '../components/ui/RowMenu';
import { useUser } from '../contexts/UserContext';
import { useIsDesktop, isDesktop } from '../hooks/useIsDesktop';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';
import { locationApi, type Location, type CreateLocationData } from '../api/locationApi';
import { interventionApi } from '../api/interventionApi';
import { documentApi, type Document } from '../api/documentApi';
import { getLocataires } from '../api/locataireApi';
import { getLots } from '../api/bienApi';
import { EMPTY_FORM } from '../utils/contratUtils';
import { resolveFileUrl } from '../utils/fileUrl';
import CreateContratForm from '../components/contrats/CreateContratForm';

type TabKey = 'locations' | 'ventes' | 'interventions';
type Group = 'all' | 'generate' | 'sign' | 'signed' | 'ended';
type SortKey = 'todo' | 'recent' | 'name' | 'amount';
// État du PDF : prêt (document trouvé), absent, ou inconnu si la liste des documents n'a pas pu être lue
type DocState = 'ready' | 'none' | 'unknown';

// Forme minimale d'un ticket d'intervention telle que consommée ici
interface TicketRow {
  id: number;
  description?: string;
  ref_lot?: string;
  building_name?: string;
  date_creation?: string;
  provider_name?: string;
  statut?: string;
}

const ITEMS_PER_PAGE = 12;
const LIVE = ['actif', 'signe'];
const isLive = (l: Location) => LIVE.includes(l.statut);
const isSale = (l: Location) => l.type_contrat === 'vente';
// Le PDF généré par le serveur est un contrat de bail : proposé pour les locations en cours seulement
const canGenerateFor = (l: Location) => isLive(l) && !isSale(l);

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants      = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// Pastilles : teintes foncées sur fond pâle (≥ 4,5:1), l'inverse en thème sombre
const PILL = {
  ok:      'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  todo:    'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100',
  neutral: 'bg-base-200 text-base-content/80',
};

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');
const money = (amount: number | string | undefined, devise?: string) => {
  const n = Number(amount) || 0;
  if (!devise || devise === 'XOF') return `${fmt(n)} FCFA`;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise }).format(n);
};
const partyName = (l: Location) => [l.locataire_prenoms, l.locataire_nom].filter(Boolean).join(' ') || '—';
const amountOf = (l: Location) => Number(isSale(l) ? l.prix_vente : l.loyer_mensuel) || 0;
const amountText = (l: Location, t: TFunction) =>
  isSale(l) ? money(l.prix_vente, l.devise) : t('contracts.perMonth', { amount: money(l.loyer_mensuel, l.devise) });
const periodText = (l: Location, t: TFunction) =>
  l.date_fin ? `${fmtDate(l.date_debut)} → ${fmtDate(l.date_fin)}` : t('contracts.since', { date: fmtDate(l.date_debut) });

// Signature / fin de contrat : `actif` = en cours non signé, `signe` = signé (POST /locations/:id/sign)
const signOf = (l: Location, t: TFunction): { label: string; tone: string } => {
  if (l.statut === 'signe') return { label: t('contracts.signed'), tone: 'text-emerald-800 dark:text-emerald-200' };
  if (l.statut === 'actif') return { label: t('contracts.toSign'), tone: 'text-orange-800 dark:text-orange-200' };
  const ended = l.statut === 'expire' ? t('contracts.statusExpired') : l.statut === 'refuse' ? t('contracts.statusRefused') : l.statut === 'resilie' ? t('contracts.statusTerminated') : l.statut;
  return { label: ended || '—', tone: 'text-base-content/70' };
};

const ticketStatus = (s: string | undefined, t: TFunction) =>
  s === 'en_cours' ? t('contracts.ticketInProgress') : s === 'ferme' || s === 'termine' ? t('contracts.ticketClosed') : t('contracts.ticketOpen');

const ListSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="bg-base-100 rounded-2xl border border-base-300/70 divide-y divide-base-300/70">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse motion-reduce:animate-none!">
        <SkeletonLoader variant="rectangular" width={40} height={40} className="rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="35%" />
          <SkeletonLoader variant="text" width="20%" />
        </div>
        <SkeletonLoader variant="rectangular" width={96} height={24} className="rounded-full hidden sm:block" />
      </div>
    ))}
  </div>
);

const DocPill: React.FC<{ state: DocState; canWrite: boolean; lease: Location }> = ({ state, canWrite, lease }) => {
  const { t } = useTranslation();
  // Contrat terminé ou vente sans PDF : rien à faire, pas de pastille « à générer »
  if (state === 'unknown' || (state === 'none' && !canGenerateFor(lease))) return null;
  if (state === 'ready') return <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${PILL.ok}`}>{t('contracts.pdfReady')}</span>;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${canWrite ? PILL.todo : PILL.neutral}`}>{canWrite ? t('contracts.pdfToGenerate') : t('contracts.pdfMissing')}</span>;
};

// ── Panneau du contrat sélectionné ───────────────────────────────────────────────────────────

interface PanelProps {
  lease: Location;
  doc: Document | undefined;
  docState: DocState;
  canWrite: boolean;
  canManage: boolean;
  generating: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onSign: () => void;
  onManage: () => void;
  onSchedule: () => void;
}

const ContractPanel = forwardRef<HTMLElement, PanelProps>(
  ({ lease, doc, docState, canWrite, canManage, generating, onClose, onGenerate, onSign, onManage, onSchedule }, ref) => {
    const { t } = useTranslation();
    const sale = isSale(lease);
    const charges = Number(lease.charges_mensuelles) || 0;
    const rent = Number(lease.loyer_mensuel) || 0;
    const deposit = [Number(lease.caution) || 0, Number(lease.avance) || 0];
    const rows: [string, string][] = [
      [t('contracts.property'), [[lease.ref_lot, lease.lot_type].filter(Boolean).join(' · '), lease.immeuble_nom].filter(Boolean).join(' — ') || '—'],
      ...(lease.proprietaire_nom ? [[t('contracts.owner'), lease.proprietaire_nom] as [string, string]] : []),
      [t('contracts.period'), periodText(lease, t)],
      [sale ? t('contracts.price') : t('contracts.rent'), amountText(lease, t)],
      ...(!sale && charges > 0 ? [[t('contracts.charges'), money(charges, lease.devise)] as [string, string]] : []),
      ...(deposit.some(n => n > 0) ? [[t('contracts.deposit'), `${fmt(deposit[0])} · ${money(deposit[1], lease.devise)}`] as [string, string]] : []),
    ];

    return (
      <aside ref={ref} aria-label={t('contracts.panelLabel')}
        className="flex-[1_1_340px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 p-5 space-y-4 scroll-mt-4 lg:sticky lg:top-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-bold font-mono text-base-content/70 [overflow-wrap:anywhere]">
              {lease.reference_bail || t('contracts.noRef')} · {sale ? t('contracts.kindSale') : t('contracts.kindLocation')}
            </p>
            <h2 className="text-xl font-bold text-base-content break-words">{partyName(lease)}</h2>
            {lease.locataire_telephone && <p className="text-sm text-base-content/70 tabular-nums">{lease.locataire_telephone}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('contracts.closePanel')} className={`${OUTLINE_BTN} w-10 h-10 shrink-0`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Document : l'information que la page doit donner en premier */}
        <section className="space-y-2.5 p-3.5 rounded-xl border border-base-300/70">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-bold text-base-content">{t('contracts.document')}</h3>
            <DocPill state={docState} canWrite={canWrite} lease={lease} />
          </div>
          {docState === 'ready' && doc ? (
            <a href={resolveFileUrl(doc.url)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center h-11 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t('contracts.downloadPdf')}
            </a>
          ) : docState === 'none' && canWrite && canGenerateFor(lease) ? (
            <Button variant="primary" className="w-full h-11 text-sm" onClick={onGenerate} loading={generating} loadingText={t('contracts.generating')}>{t('contracts.generatePdf')}</Button>
          ) : docState === 'none' && canGenerateFor(lease) ? (
            <p className="text-sm text-base-content/70">{t('contracts.pdfNotGenerated')}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-base-300/70 text-sm">
            <span className="flex-[1_1_140px] text-base-content/80">
              {lease.statut === 'signe' ? t('contracts.signedText') : lease.statut === 'actif' ? t('contracts.notSignedText') : t('contracts.endedText')}
            </span>
            {lease.statut === 'actif' && canWrite && (
              <button type="button" onClick={onSign}
                className="h-10 px-3.5 rounded-lg bg-orange-800 text-white text-[13px] font-semibold hover:bg-orange-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-800">
                {t('contracts.sign')}
              </button>
            )}
          </div>
        </section>

        <dl className="space-y-2 px-3.5 py-3 rounded-xl bg-base-200/70 dark:bg-base-200 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-base-content/70 shrink-0">{k}</dt>
              <dd className="font-semibold tabular-nums text-right [overflow-wrap:anywhere]">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Garde-fou de saisie : cas réel de charges à 978 000 F pour un loyer de 80 000 F */}
        {!sale && rent > 0 && charges > rent && (
          <p className="px-3 py-2.5 rounded-lg border border-orange-200 bg-orange-50 text-[13px] text-orange-950 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-100">
            {t('contracts.chargesWarning')}
          </p>
        )}

        {canManage && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onManage} className={`${OUTLINE_BTN} h-11`}>{t('contracts.manageLease')}</button>
            <button type="button" onClick={onSchedule} className={`${OUTLINE_BTN} h-11`}>{t('contracts.schedule')}</button>
          </div>
        )}
      </aside>
    );
  }
);
ContractPanel.displayName = 'ContractPanel';

// ── Page ─────────────────────────────────────────────────────────────────────────────────────

const Contrats: React.FC = () => {
  const { user }    = useUser();
  const { t }       = useTranslation();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const userType    = user?.userType || '';
  const canWrite    = !['proprietaire', 'locataire'].includes(userType);
  // Baux & Locations et la fiche d'un bail ne sont ouverts qu'aux gestionnaires et propriétaires
  const canManage   = userType !== 'locataire';

  const [activeTab,       setActiveTab]       = useState<TabKey>('locations');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [group,           setGroup]           = useState<Group>('all');
  const [sortKey,         setSortKey]         = useState<SortKey>('todo');
  const [currentPage,     setCurrentPage]     = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm,      setCreateForm]      = useState<CreateLocationData & { owner_id: number }>({ ...EMPTY_FORM });
  const [signLeaseId,     setSignLeaseId]     = useState<number | null>(null);
  const [generatingId,    setGeneratingId]    = useState<number | null>(null);
  const [pickedId,        setPickedId]        = useState<number | null>(null);
  const [panelDismissed,  setPanelDismissed]  = useState(false);
  const desktop  = useIsDesktop();
  const panelRef = useRef<HTMLElement>(null);

  // Action rapide « Créer Contrat » du tableau de bord (?action=nouveau) : même effet que « Nouveau »
  // sur l'onglet Locations.
  useCreateFromUrl(true, () => {
    if (!canWrite) return;
    setActiveTab('locations');
    setCreateForm({ ...EMPTY_FORM, type_contrat: 'location' });
    setShowCreateModal(true);
  });

  const { data: allLeases = [], isLoading: leasesLoading, error: leasesError, refetch: refetchLeases } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn:  () => locationApi.getLocations(),
    staleTime: 30_000,
  });

  const { data: ticketsData, isLoading: ticketsLoading, error: ticketsError, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets', { limit: 200 }],
    queryFn:  () => interventionApi.getTickets({ limit: 200 }),
    staleTime: 30_000,
  });

  // PDF générés des baux (rangés dans Documents, catégorie « baux ») : un échec ne bloque pas la page,
  // l'état du document devient simplement inconnu.
  const { data: leaseDocs, isError: docsError } = useQuery<Document[]>({
    queryKey: ['documents', { entity_type: 'lease', categorie: 'baux' }],
    queryFn:  () => documentApi.getDocuments({ entity_type: 'lease', categorie: 'baux' }),
    staleTime: 30_000,
    retry: false,
  });

  const { data: locataires = [] } = useQuery({
    queryKey: ['locataires-list'],
    queryFn:  () => getLocataires(),
    enabled:  showCreateModal,
    staleTime: 60_000,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots-list'],
    queryFn:  () => getLots(),
    enabled:  showCreateModal,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLocationData) => locationApi.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Contrat créé avec succès !');
      setShowCreateModal(false);
      setCreateForm({ ...EMPTY_FORM });
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...createForm, tenant_id: Number(createForm.tenant_id), lot_id: Number(createForm.lot_id), owner_id: Number(createForm.owner_id) } as CreateLocationData);
  };

  // Dernier document par bail (la liste arrive triée du plus récent au plus ancien)
  const docByLease = useMemo(() => {
    const m = new Map<number, Document>();
    (leaseDocs ?? []).forEach(d => { if (d.entity_id != null && !m.has(Number(d.entity_id))) m.set(Number(d.entity_id), d); });
    return m;
  }, [leaseDocs]);
  const docStateOf = (l: Location): DocState => (docsError || !leaseDocs ? 'unknown' : docByLease.has(l.id) ? 'ready' : 'none');

  const handleGenerate = async (id: number) => {
    try {
      setGeneratingId(id);
      await documentApi.generateLease(id);
      toast.success(t('contracts.generated'));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      toast.error(data?.message || data?.error || t('contracts.generateError'));
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSaveSignature = async (signatureImage: string) => {
    if (!signLeaseId) return;
    try {
      await locationApi.signLease(signLeaseId, signatureImage);
      toast.success(t('contracts.signedToast'));
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (err) {
      toast.error((err as Error).message || t('contracts.signError'));
    } finally {
      setSignLeaseId(null);
    }
  };

  // ── Listes, compteurs, tri ──
  const tickets: TicketRow[] = ticketsData?.data ?? [];
  const tabLeases = useMemo(
    () => allLeases.filter(l => (activeTab === 'ventes' ? isSale(l) : !l.type_contrat || l.type_contrat === 'location')),
    [allLeases, activeTab]
  );
  const countLocations = allLeases.filter(l => !l.type_contrat || l.type_contrat === 'location').length;
  const countSales = allLeases.filter(isSale).length;

  const docsKnown = !docsError && !!leaseDocs;
  const inGroup = (l: Location, g: Group) => {
    switch (g) {
      case 'all': return true;
      case 'generate': return docsKnown && canGenerateFor(l) && !docByLease.has(l.id);
      case 'sign': return l.statut === 'actif';
      case 'signed': return l.statut === 'signe';
      case 'ended': return !isLive(l);
    }
  };
  const groupCount = (g: Group) => tabLeases.filter(l => inGroup(l, g)).length;

  // Rang « à traiter d'abord » : PDF à générer, puis à signer, puis en cours, puis terminés
  const todoRank = (l: Location) =>
    !isLive(l) ? 3 : docsKnown && canGenerateFor(l) && !docByLease.has(l.id) ? 0 : l.statut === 'actif' ? 1 : 2;
  const createdOf = (l: Location) => {
    const c = (l as Location & { created_at?: string }).created_at;
    return c ? new Date(c).getTime() : l.id;
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = tabLeases
    .filter(l => inGroup(l, group))
    .filter(l => !q || [l.reference_bail, l.locataire_nom, l.locataire_prenoms, l.immeuble_nom, l.ref_lot].some(v => v?.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sortKey === 'name') return partyName(a).localeCompare(partyName(b), 'fr');
      if (sortKey === 'amount') return amountOf(b) - amountOf(a);
      if (sortKey === 'recent') return createdOf(b) - createdOf(a);
      return todoRank(a) - todoRank(b) || createdOf(b) - createdOf(a);
    });
  const filteredTickets = tickets.filter(tk => !q || [tk.description, tk.building_name, tk.ref_lot, tk.provider_name].some(v => v?.toLowerCase().includes(q)));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const contracts = allLeases.filter(l => !l.type_contrat || l.type_contrat === 'location' || isSale(l));
  const headerToGenerate = docsKnown ? contracts.filter(l => canGenerateFor(l) && !docByLease.has(l.id)).length : 0;
  const headerToSign = contracts.filter(l => l.statut === 'actif').length;

  if (showCreateModal) {
    return (
      <CreateContratForm
        form={createForm}
        setForm={setCreateForm}
        locataires={locataires}
        lots={lots}
        onSubmit={handleCreateSubmit}
        onCancel={() => setShowCreateModal(false)}
        isPending={createMutation.isPending}
      />
    );
  }

  const isInter = activeTab === 'interventions';
  const openNew = () => {
    if (isInter) { navigate('/dashboard/interventions'); return; }
    setCreateForm({ ...EMPTY_FORM, type_contrat: activeTab === 'ventes' ? 'vente' : 'location' });
    setShowCreateModal(true);
  };
  const newLabel = isInter ? t('contracts.newIntervention') : activeTab === 'ventes' ? t('contracts.newSale') : t('contracts.newContract');

  const resetPaging = () => setCurrentPage(1);
  const pickedExists = pickedId != null && tabLeases.some(l => l.id === pickedId);
  const selectedId = pickedExists ? pickedId : (desktop && !panelDismissed ? paginated[0]?.id ?? null : null);
  const selected = !isInter && (!panelDismissed || pickedExists) ? tabLeases.find(l => l.id === selectedId) ?? null : null;
  const selectLease = (l: Location) => {
    setPickedId(l.id);
    setPanelDismissed(false);
    // Sous 1024 px le panneau passe sous la liste : on l'amène à l'écran
    if (!isDesktop()) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const total = filtered.length;
  const from = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(page * ITEMS_PER_PAGE, total);
  const tabError = isInter ? ticketsError : leasesError;
  const retryTab = () => { if (isInter) refetchTickets(); else refetchLeases(); };
  const isLoading = isInter ? ticketsLoading : leasesLoading;

  const groups: { key: Group; label: string; dot: string }[] = [
    { key: 'all', label: t('contracts.groupAll'), dot: 'bg-base-content/50' },
    ...(docsKnown && canWrite ? [{ key: 'generate' as const, label: t('contracts.groupGenerate'), dot: 'bg-orange-500' }] : []),
    { key: 'sign', label: t('contracts.groupSign'), dot: 'bg-amber-700' },
    { key: 'signed', label: t('contracts.groupSigned'), dot: 'bg-emerald-600' },
    { key: 'ended', label: t('contracts.groupEnded'), dot: 'bg-base-content/40' },
  ];

  const downloadOrGenerate = (l: Location) => {
    const state = docStateOf(l);
    const doc = docByLease.get(l.id);
    if (state === 'ready' && doc) {
      return (
        <a href={resolveFileUrl(doc.url)} target="_blank" rel="noopener noreferrer" aria-label={t('contracts.downloadOf', { ref: l.reference_bail })}
          className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>{t('contracts.download')}</a>
      );
    }
    if (state === 'none' && canWrite && canGenerateFor(l)) {
      return (
        <Button variant="primary" size="sm" className="h-10 px-3.5 text-[13px]" aria-label={t('contracts.generateOf', { ref: l.reference_bail })}
          onClick={() => handleGenerate(l.id)} loading={generatingId === l.id}>{t('contracts.generate')}</Button>
      );
    }
    return null;
  };

  return (
    <motion.div className="@container space-y-5 max-w-[1600px] mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* En-tête : ce que la page gère (les documents), une seule action */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">{t('contracts.title')}</h1>
          <p className="text-base-content/70 font-medium mt-1 tabular-nums">
            {leasesLoading || leasesError ? t('contracts.subtitle') : t('contracts.headerCounts', { count: contracts.length, toGenerate: headerToGenerate, toSign: headerToSign })}
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" onClick={openNew} className="h-11 px-5 gap-1.5">
            <Plus size={16} aria-hidden="true" /> {newLabel}
          </Button>
        )}
      </motion.div>

      {/* Barre d'outils unique : type de contrat, recherche, tri ; filtres par état du document */}
      <motion.div variants={itemVariants} className="bg-base-100 rounded-2xl p-4 border border-base-300/70 space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label={t('contracts.tabLabel')} className="flex w-full @2xl:w-auto gap-1 p-1 rounded-xl bg-base-200 dark:bg-base-300/60">
            {([
              { key: 'locations', label: t('contracts.tabLocations'), count: countLocations, loading: leasesLoading },
              { key: 'ventes', label: t('contracts.tabSales'), count: countSales, loading: leasesLoading },
              { key: 'interventions', label: t('contracts.tabInterventions'), count: tickets.length, loading: ticketsLoading },
            ] as const).map(tab => {
              const on = activeTab === tab.key;
              return (
                <button key={tab.key} type="button" role="tab" aria-selected={on}
                  onClick={() => { setActiveTab(tab.key); setGroup('all'); resetPaging(); }}
                  className={`h-9 px-1.5 @sm:px-3.5 min-w-0 flex-auto @2xl:flex-none justify-center rounded-lg text-[13px] @sm:text-sm font-semibold inline-flex items-center gap-1.5 @sm:gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/70 hover:text-base-content'}`}>
                  <span className="truncate">{tab.label}</span>
                  {!tab.loading && <span className={`hidden @md:inline text-xs px-2 py-px rounded-full tabular-nums ${on ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/80'}`}>{tab.count}</span>}
                </button>
              );
            })}
          </div>

          <SearchInput placeholder={t('contracts.searchPh')} value={searchQuery} onChange={v => { setSearchQuery(v); resetPaging(); }} className="flex-[1_1_240px] min-w-0" />

          {!isInter && (
            <label className="flex-[1_1_200px] @3xl:flex-none flex items-center gap-2 h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm text-base-content/70 focus-within:outline-2 focus-within:outline-primary">
              <span>{t('contracts.sortLabel')}</span>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="min-w-0 flex-1 bg-transparent font-semibold text-base-content outline-none">
                <option value="todo">{t('contracts.sortTodo')}</option>
                <option value="recent">{t('contracts.sortRecent')}</option>
                <option value="name">{t('contracts.sortName')}</option>
                <option value="amount">{t('contracts.sortAmount')}</option>
              </select>
            </label>
          )}
        </div>

        {!isInter && (
          <div role="group" aria-label={t('contracts.quickFilterLabel')} className="flex flex-wrap gap-2">
            {groups.map(g => {
              const on = group === g.key;
              return (
                <button key={g.key} type="button" aria-pressed={on} onClick={() => { setGroup(g.key); resetPaging(); }}
                  className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${on ? 'bg-primary-content' : g.dot}`} aria-hidden="true" />
                  {g.label}
                  <span className="tabular-nums opacity-80">{groupCount(g.key)}</span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <ListSkeleton />
      ) : tabError ? (
        // Échec du chargement : pas de faux « aucun contrat » (T-042)
        <div className="bg-base-100 rounded-2xl border border-base-300/70 p-6">
          <LoadErrorState message={(tabError as Error).message} onRetry={retryTab} />
        </div>
      ) : isInter ? (
        // Interventions : ce ne sont pas des contrats ; la liste reste consultable et renvoie vers leur page
        <section aria-label={t('contracts.interventionsTitle')} className="bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 @xl:px-5 py-4 border-b border-base-300/70">
            <p className="text-sm text-base-content/70 flex-[1_1_240px]">{t('contracts.interventionsDesc')}</p>
            <button type="button" onClick={() => navigate('/dashboard/interventions')} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>
              {t('contracts.openInterventions')} →
            </button>
          </div>
          {filteredTickets.length === 0 ? (
            <EmptyState icon={<Wrench size={40} />} title={t('contracts.noInterventions')} description={t('contracts.interventionsDesc')} className="border-none" />
          ) : (
            <ul className="divide-y divide-base-300/70">
              {filteredTickets.map(tk => (
                <li key={tk.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 @xl:px-5 py-3.5">
                  <span className="flex-[1_1_220px] min-w-0">
                    <span className="block text-[15px] font-bold text-base-content break-words">{tk.description || '—'}</span>
                    <span className="block text-xs font-semibold font-mono text-base-content/70">INT-{String(tk.id).padStart(4, '0')}</span>
                  </span>
                  <span className="flex-[1_1_140px] min-w-0 text-sm text-base-content/80 break-words">{[tk.ref_lot, tk.building_name].filter(Boolean).join(' · ') || '—'}</span>
                  <span className="flex-[1_1_140px] min-w-0 text-sm text-base-content/70">
                    {fmtDate(tk.date_creation)} · {tk.provider_name || t('contracts.unassigned')}
                  </span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${tk.statut === 'ferme' || tk.statut === 'termine' ? PILL.neutral : tk.statut === 'en_cours' ? PILL.todo : PILL.neutral}`}>
                    {ticketStatus(tk.statut, t)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <section aria-label={t('contracts.resultsLabel')} className="flex-[999_1_560px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
            {paginated.length === 0 ? (
              <EmptyState
                icon={<FileText size={40} />}
                title={tabLeases.length === 0 ? (activeTab === 'ventes' ? t('contracts.noSales') : t('contracts.noLocations')) : t('contracts.noContracts')}
                description={t('contracts.noContractsDesc')}
                actionLabel={canWrite ? newLabel : undefined}
                onAction={canWrite ? openNew : undefined}
                className="border-none"
              />
            ) : (
              <ul className="divide-y divide-base-300/70">
                {paginated.map(l => {
                  const name = partyName(l);
                  const sign = signOf(l, t);
                  const active = selected?.id === l.id;
                  const state = docStateOf(l);
                  const doc = docByLease.get(l.id);
                  return (
                    <li key={l.id} className={`flex flex-wrap items-center gap-x-3 gap-y-3 px-4 @xl:px-5 py-3.5 transition-colors ${active ? 'bg-primary/10' : 'hover:bg-base-200/60'}`}>
                      <button type="button" onClick={() => selectLease(l)} aria-label={t('contracts.openContract', { name })} aria-current={active ? 'true' : undefined}
                        className="flex-[1_1_140px] min-w-0 flex items-center gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-xl bg-base-200 dark:bg-base-300 text-primary inline-flex items-center justify-center">
                          <FileText size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-base-content break-words">{name}</span>
                          <span className="block text-xs font-semibold font-mono text-base-content/70 [overflow-wrap:anywhere]">{l.reference_bail || t('contracts.noRef')}</span>
                        </span>
                      </button>
                      <span className="flex-[1_1_100px] min-w-0">
                        <span className="block text-sm font-semibold text-base-content break-words">{l.ref_lot || '—'}</span>
                        <span className="block text-sm text-base-content/70 break-words">{l.immeuble_nom || ''}</span>
                      </span>
                      <span className="flex-[1_1_120px] min-w-0 tabular-nums">
                        <span className="block text-sm font-bold text-base-content">{amountText(l, t)}</span>
                        <span className="block text-xs text-base-content/70">{periodText(l, t)}</span>
                      </span>
                      <span className="shrink-0 flex flex-col items-start gap-1">
                        <DocPill state={state} canWrite={canWrite} lease={l} />
                        <span className={`text-xs font-semibold ${sign.tone}`}>{sign.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {downloadOrGenerate(l)}
                        <RowMenu
                          label={t('contracts.moreActions')}
                          items={[
                            { label: t('contracts.viewContract'), onSelect: () => selectLease(l) },
                            ...(state === 'ready' && doc ? [{ label: t('contracts.downloadPdf'), onSelect: () => window.open(resolveFileUrl(doc.url), '_blank', 'noopener') }] : []),
                            ...(state === 'none' && canWrite && canGenerateFor(l) ? [{ label: t('contracts.generatePdf'), onSelect: () => handleGenerate(l.id) }] : []),
                            ...(l.statut === 'actif' && canWrite ? [{ label: t('contracts.sign'), onSelect: () => setSignLeaseId(l.id) }] : []),
                            ...(canManage ? [
                              { label: t('contracts.schedule'), onSelect: () => navigate(`/dashboard/locations/${l.id}`) },
                              { label: t('contracts.manageLease'), onSelect: () => navigate('/dashboard/locations') },
                            ] : []),
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
                <span className="tabular-nums">{t('contracts.rangeInfo', { from, to, count: total })}</span>
                {totalPages > 1 && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setCurrentPage(Math.max(1, page - 1))} disabled={page === 1} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <ChevronLeft size={16} aria-hidden="true" /> {t('contracts.previous')}
                    </button>
                    <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {t('contracts.next')} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {selected && (
            <ContractPanel
              ref={panelRef}
              lease={selected}
              doc={docByLease.get(selected.id)}
              docState={docStateOf(selected)}
              canWrite={canWrite}
              canManage={canManage}
              generating={generatingId === selected.id}
              onClose={() => { setPanelDismissed(true); setPickedId(null); }}
              onGenerate={() => handleGenerate(selected.id)}
              onSign={() => setSignLeaseId(selected.id)}
              onManage={() => navigate('/dashboard/locations')}
              onSchedule={() => navigate(`/dashboard/locations/${selected.id}`)}
            />
          )}
        </div>
      )}

      <SignatureModal open={signLeaseId !== null} onClose={() => setSignLeaseId(null)} onSave={handleSaveSignature} />
    </motion.div>
  );
};

export default Contrats;
