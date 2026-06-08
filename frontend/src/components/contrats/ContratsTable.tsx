import React from 'react';
import { Eye, Download, Home, Wrench, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Table, { type Column } from '../ui/Table';
import { statutBadge } from '../../utils/contratUtils';
import type { Location } from '../../api/locationApi';
import toast from 'react-hot-toast';

type TabKey = 'locations' | 'ventes' | 'interventions';

// Forme minimale d'un ticket d'intervention telle que consommée par ce tableau.
// (Le module Interventions n'expose pas encore de type partagé — on type ici les
// seuls champs lus, ce qui suffit à supprimer le `any` et garde l'autocomplétion.)
interface TicketRow {
  id: number;
  description?: string;
  ref_lot?: string;
  building_name?: string;
  date_creation?: string;
  provider_name?: string;
  statut?: string;
}

interface Props {
  activeTab: TabKey;
  isLoading: boolean;
  locations: Location[];
  ventes: Location[];
  tickets: TicketRow[];
  searchQuery: string;
  statutFilter: string;
  onViewLease: (item: Location) => void;
}

// Cellule "entité & bien" partagée par les onglets location/vente (deux lignes).
const EntityCell: React.FC<{ nom?: string; prenoms?: string; refLot?: string; immeuble?: string }> = ({
  nom, prenoms, refLot, immeuble,
}) => (
  <>
    <div className="font-bold text-base-content/90">
      {[nom, prenoms].filter(Boolean).join(' ') || '—'}
    </div>
    <div className="text-xs text-base-content/50 flex items-center gap-1">
      <Home size={10} />
      {[refLot, immeuble].filter(Boolean).join(' · ') || '—'}
    </div>
  </>
);

const ContratsTable: React.FC<Props> = ({
  activeTab, isLoading, locations, ventes, tickets, searchQuery, statutFilter, onViewLease,
}) => {
  const navigate = useNavigate();
  const hasFilters = Boolean(searchQuery || statutFilter);

  const openOrToast = (url: string | undefined) => {
    if (url) window.open(url, '_blank');
    else toast('Aucun document signé disponible pour ce contrat.');
  };

  // Bouton d'action icône réutilisé — stopPropagation pour ne pas déclencher un
  // éventuel onRowClick (aucun ici, mais robuste si on en ajoute un plus tard).
  const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({
    label, onClick, children,
  }) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {children}
    </Button>
  );

  // ── Colonnes par onglet ──────────────────────────────────────────────────
  // Chaque jeu de colonnes est typé sur la forme de sa donnée. On définit
  // `sortAccessor` là où un tri a du sens (référence, date, montant, statut).
  const locationColumns: Column<Location>[] = [
    {
      key: 'ref', header: 'Référence', width: 'pl-2',
      className: 'font-mono text-sm font-medium text-base-content',
      sortAccessor: (r) => r.reference_bail,
      render: (r) => r.reference_bail,
    },
    {
      key: 'entity', header: 'Locataire & Bien',
      sortAccessor: (r) => r.locataire_nom,
      render: (r) => <EntityCell nom={r.locataire_nom} prenoms={r.locataire_prenoms} refLot={r.ref_lot} immeuble={r.immeuble_nom} />,
    },
    {
      key: 'periode', header: 'Période',
      className: 'text-sm text-base-content/70',
      sortAccessor: (r) => (r.date_debut ? new Date(r.date_debut) : null),
      render: (r) => (
        <>
          {new Date(r.date_debut).toLocaleDateString('fr-FR')}
          {r.date_fin && ` → ${new Date(r.date_fin).toLocaleDateString('fr-FR')}`}
        </>
      ),
    },
    {
      key: 'loyer', header: 'Loyer/mois', align: 'left',
      className: 'font-bold text-primary',
      sortAccessor: (r) => r.loyer_mensuel ?? 0,
      render: (r) => `${r.loyer_mensuel?.toLocaleString()} F`,
    },
    {
      key: 'statut', header: 'Statut',
      sortAccessor: (r) => r.statut,
      render: (r) => <span className={`badge badge-sm ${statutBadge(r.statut)}`}>{r.statut?.toUpperCase()}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <IconAction label={`Voir ${r.reference_bail}`} onClick={() => onViewLease(r)}><Eye size={20} /></IconAction>
          <IconAction label={`Télécharger ${r.reference_bail}`} onClick={() => openOrToast(r.signature_url)}><Download size={20} /></IconAction>
        </div>
      ),
    },
  ];

  const venteColumns: Column<Location>[] = [
    {
      key: 'ref', header: 'Référence', width: 'pl-2',
      className: 'font-mono text-sm font-medium text-base-content',
      sortAccessor: (r) => r.reference_bail,
      render: (r) => r.reference_bail,
    },
    {
      key: 'entity', header: 'Acheteur & Bien',
      sortAccessor: (r) => r.locataire_nom,
      render: (r) => <EntityCell nom={r.locataire_nom} prenoms={r.locataire_prenoms} refLot={r.ref_lot} immeuble={r.immeuble_nom} />,
    },
    {
      key: 'signe', header: 'Signé le',
      className: 'text-sm text-base-content/70',
      sortAccessor: (r) => (r.date_debut ? new Date(r.date_debut) : null),
      render: (r) => new Date(r.date_debut).toLocaleDateString('fr-FR'),
    },
    {
      key: 'prix', header: 'Prix', align: 'left',
      className: 'font-bold text-success',
      sortAccessor: (r) => r.prix_vente ?? 0,
      render: (r) => `${r.prix_vente?.toLocaleString()} F`,
    },
    {
      key: 'statut', header: 'Statut',
      sortAccessor: (r) => r.statut,
      render: (r) => <span className={`badge badge-sm ${statutBadge(r.statut)}`}>{r.statut?.toUpperCase()}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <IconAction label={`Voir ${r.reference_bail}`} onClick={() => onViewLease(r)}><Eye size={20} /></IconAction>
          <IconAction label={`Télécharger ${r.reference_bail}`} onClick={() => openOrToast(r.signature_url)}><Download size={20} /></IconAction>
        </div>
      ),
    },
  ];

  const ticketColumns: Column<TicketRow>[] = [
    {
      key: 'ref', header: 'Référence', width: 'pl-2',
      className: 'font-mono text-sm font-medium text-base-content',
      sortAccessor: (r) => r.id,
      render: (r) => `INT-${String(r.id).padStart(4, '0')}`,
    },
    {
      key: 'desc', header: 'Description & Bien',
      sortAccessor: (r) => r.description,
      render: (r) => (
        <>
          <div className="font-bold text-base-content/90 flex items-center gap-1.5">
            <Wrench size={14} className="text-base-content/40 shrink-0" />
            {r.description || '—'}
          </div>
          <div className="text-xs text-base-content/50 flex items-center gap-1">
            <Home size={10} />
            {[r.ref_lot, r.building_name].filter(Boolean).join(' · ') || '—'}
          </div>
        </>
      ),
    },
    {
      key: 'date', header: 'Date',
      className: 'text-sm text-base-content/70',
      sortAccessor: (r) => (r.date_creation ? new Date(r.date_creation) : null),
      render: (r) => (r.date_creation ? new Date(r.date_creation).toLocaleDateString('fr-FR') : '—'),
    },
    {
      key: 'prestataire', header: 'Prestataire',
      className: 'text-sm text-base-content/70',
      sortAccessor: (r) => r.provider_name,
      render: (r) => r.provider_name || <span className="italic opacity-50">Non assigné</span>,
    },
    {
      key: 'statut', header: 'Statut',
      sortAccessor: (r) => r.statut,
      render: (r) => <span className={`badge badge-sm ${statutBadge(r.statut)}`}>{r.statut?.toUpperCase() || 'OUVERT'}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <IconAction label={`Voir ticket INT-${String(r.id).padStart(4, '0')}`} onClick={() => navigate('/dashboard/interventions')}>
          <Eye size={20} />
        </IconAction>
      ),
    },
  ];

  const emptyFor = (entity: string, plural: string) =>
    hasFilters ? `Aucun ${entity} ne correspond aux filtres.` : `Aucun ${plural} enregistré.`;

  // Le composant Table absorbe wrapper scrollable, skeleton, état vide et hover.
  if (activeTab === 'ventes') {
    return (
      <Table<Location>
        columns={venteColumns} data={ventes} loading={isLoading}
        rowKey={(r) => r.id} emptyIcon={<FileText size={36} className="opacity-50" />}
        emptyMessage={emptyFor('contrat', 'contrat de vente')}
      />
    );
  }
  if (activeTab === 'interventions') {
    return (
      <Table<TicketRow>
        columns={ticketColumns} data={tickets} loading={isLoading}
        rowKey={(r) => r.id} emptyIcon={<Wrench size={36} className="opacity-50" />}
        emptyMessage={hasFilters ? 'Aucune intervention ne correspond aux filtres.' : 'Aucune intervention enregistrée.'}
      />
    );
  }
  return (
    <Table<Location>
      columns={locationColumns} data={locations} loading={isLoading}
      rowKey={(r) => r.id} emptyIcon={<FileText size={36} className="opacity-50" />}
      emptyMessage={emptyFor('contrat', 'contrat de location')}
    />
  );
};

export default ContratsTable;
