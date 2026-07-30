// frontend/src/pages/Corbeille.tsx
// Module Corbeille / Archivage (CdC §XVII) : consultation, restauration et
// suppression définitive des éléments supprimés (soft-delete).
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, RotateCcw, Search, Filter, AlertTriangle, Inbox } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { trashApi } from '../api/trashApi';
import type { TrashItem, TrashImpact } from '../api/trashApi';
import { getToken } from '../api/authApi';
import { API_URL } from '../config';
import { useUser } from '../contexts/UserContext';
import toast from 'react-hot-toast';

// Modules du registre backend (clé -> libellé). Sert au filtre latéral.
const MODULES: { value: string; label: string }[] = [
  { value: '', label: 'Tous les modules' },
  { value: 'biens', label: 'Biens' },
  { value: 'lots', label: 'Lots' },
  { value: 'locataires', label: 'Locataires' },
  { value: 'contrats', label: 'Contrats' },
  { value: 'documents', label: 'Documents' },
  { value: 'edl', label: 'États des lieux' },
  { value: 'interventions', label: 'Interventions' },
  { value: 'taches', label: 'Tâches' },
  { value: 'messages', label: 'Messages' },
];

const keyOf = (it: TrashItem) => `${it.module}:${it.id}`;

// Carte mobile avec geste de swipe : glisser à droite = restaurer, à gauche = supprimer.
// Le swipe n'est actif que pour les utilisateurs autorisés (canWrite).
const SwipeRow: React.FC<{
  item: TrashItem;
  canWrite: boolean;
  onRestore: () => void;
  onDelete: () => void;
  formatDate: (d: string) => string;
}> = ({ item, canWrite, onRestore, onDelete, formatDate }) => {
  const [dx, setDx] = useState(0);
  const startX = useRef(0);
  const THRESHOLD = 80;

  const onStart = (e: React.TouchEvent) => { startX.current = e.touches[0]?.clientX ?? 0; };
  const onMove = (e: React.TouchEvent) => { if (canWrite) setDx((e.touches[0]?.clientX ?? 0) - startX.current); };
  const onEnd = () => {
    if (canWrite && dx > THRESHOLD) onRestore();
    else if (canWrite && dx < -THRESHOLD) onDelete();
    setDx(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Indices d'action révélés sous la carte pendant le swipe */}
      <div className="absolute inset-0 flex justify-between items-center px-4 text-sm font-bold">
        <span className="text-green-600 flex items-center gap-1"><RotateCcw size={16} /> Restaurer</span>
        <span className="text-red-600 flex items-center gap-1">Supprimer <Trash2 size={16} /></span>
      </div>
      <div
        className="relative bg-base-100 border border-base-200 rounded-xl p-4"
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s' : 'none' }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="font-bold text-base-content/90 truncate">{item.label}</p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="bg-base-300 px-2 py-0.5 rounded font-semibold text-base-content/70">{item.type_label}</span>
              <span className="text-base-content/60">{item.module_label}</span>
            </div>
            <p className="text-xs text-base-content/60 mt-1">Par {item.deleted_by_name} · {formatDate(item.deleted_at)}</p>
          </div>
          {canWrite && (
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button type="button" onClick={onRestore} aria-label="Restaurer" className="text-green-700 p-1 hover:bg-green-50 rounded"><RotateCcw size={18} /></button>
              <button type="button" onClick={onDelete} aria-label="Supprimer définitivement" className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Corbeille: React.FC = () => {
  const { user } = useUser();
  // Écriture (restaurer / supprimer définitivement) : admin + gestionnaire (CdC §XVII.3).
  const canWrite = ['admin', 'gestionnaire'].includes(user?.userType || '');

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletedByText, setDeletedByText] = useState(''); // filtré côté client

  // Sélection multiple
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Confirmation suppression définitive (saisie du nom)
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [bulkPurge, setBulkPurge] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);

  // Impact en cascade de la suppression définitive, chargé à l'ouverture de la modale.
  const [impact, setImpact] = useState<TrashImpact[]>([]);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, startDate, endDate]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await trashApi.list({
        module: moduleFilter || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setItems(data);
      setSelected(new Set());
    } catch (error: any) {
      toast.error(error.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // Filtre client additionnel : "supprimé par".
  const visibleItems = useMemo(
    () => items.filter(it => !deletedByText || (it.deleted_by_name || '').toLowerCase().includes(deletedByText.toLowerCase())),
    [items, deletedByText]
  );

  const allSelected = visibleItems.length > 0 && visibleItems.every(it => selected.has(keyOf(it)));
  const toggleAll = () => {
    if (allSelected) { setSelected(new Set()); return; }
    setSelected(new Set(visibleItems.map(keyOf)));
  };
  const toggleOne = (it: TrashItem) => {
    const next = new Set(selected);
    const k = keyOf(it);
    next.has(k) ? next.delete(k) : next.add(k);
    setSelected(next);
  };

  const selectedItems = visibleItems.filter(it => selected.has(keyOf(it)));

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Export (mêmes filtres serveur que la liste) — téléchargement authentifié via blob.
  const exportFile = async (format: 'excel' | 'pdf') => {
    try {
      const p = new URLSearchParams();
      if (moduleFilter) p.set('module', moduleFilter);
      if (search) p.set('search', search);
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
      const res = await fetch(`${API_URL}/trash/export/${format}?${p.toString()}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Export impossible');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Corbeille_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`; a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'export");
    }
  };

  // ── Restauration (réversible → pas de saisie du nom) ──
  const restoreOne = async (it: TrashItem) => {
    try {
      await trashApi.restore(it.module, it.id);
      toast.success(`« ${it.label} » restauré`);
      loadItems();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de restauration');
    }
  };

  const restoreSelected = async () => {
    if (selectedItems.length === 0) return;
    setWorking(true);
    let ok = 0;
    for (const it of selectedItems) {
      try { await trashApi.restore(it.module, it.id); ok++; } catch { /* on continue le lot */ }
    }
    setWorking(false);
    toast.success(`${ok}/${selectedItems.length} élément(s) restauré(s)`);
    loadItems();
  };

  // ── Suppression définitive (impact affiché + confirmation par saisie) ──

  // Agrège les impacts de plusieurs éléments par libellé. Les totaux peuvent se
  // recouper (sélectionner un immeuble ET l'un de ses lots compte deux fois les
  // mêmes baux) — d'où la mention « estimé » dans la modale.
  const loadImpact = async (targets: TrashItem[]) => {
    setImpact([]);
    if (targets.length === 0) return;
    setImpactLoading(true);
    try {
      const results = await Promise.all(targets.map(it => trashApi.impact(it.module, it.id)));
      const totals = new Map<string, number>();
      for (const rows of results) {
        for (const r of rows) totals.set(r.label, (totals.get(r.label) || 0) + r.count);
      }
      setImpact([...totals].map(([label, count]) => ({ table: label, label, count })));
    } catch {
      // L'impact est indicatif : son échec ne doit pas empêcher d'ouvrir la modale.
      // Le serveur reste la garde ultime (409 si des dépendances existent).
      setImpact([]);
    } finally {
      setImpactLoading(false);
    }
  };

  const openPurgeOne = (it: TrashItem) => {
    setPurgeTarget(it); setBulkPurge(false); setConfirmText('');
    loadImpact([it]);
  };
  const openPurgeBulk = () => {
    if (selectedItems.length === 0) return;
    setBulkPurge(true); setPurgeTarget(null); setConfirmText('');
    loadImpact(selectedItems);
  };
  const closePurge = () => {
    setPurgeTarget(null); setBulkPurge(false); setConfirmText('');
    setImpact([]); setImpactLoading(false);
  };

  // Le texte attendu : le nom exact (suppression unitaire) ou "SUPPRIMER" (lot).
  const expectedConfirm = bulkPurge ? 'SUPPRIMER' : (purgeTarget?.label || '');
  const confirmValid = confirmText.trim() === expectedConfirm.trim() && expectedConfirm.trim().length > 0;

  const doPurge = async () => {
    if (!confirmValid) return;
    setWorking(true);
    try {
      // force = true : l'impact en cascade a été affiché et confirmé par saisie ci-dessus.
      if (bulkPurge) {
        let ok = 0;
        for (const it of selectedItems) {
          try { await trashApi.purge(it.module, it.id, true); ok++; } catch { /* on continue */ }
        }
        toast.success(`${ok}/${selectedItems.length} élément(s) supprimé(s) définitivement`);
      } else if (purgeTarget) {
        await trashApi.purge(purgeTarget.module, purgeTarget.id, true);
        toast.success(`« ${purgeTarget.label} » supprimé définitivement`);
      }
      closePurge();
      loadItems();
    } catch (error: any) {
      toast.error(error.message || 'Erreur de suppression');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1500px] mx-auto">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-content/90 flex items-center gap-2">
            <Trash2 size={24} className="text-primary" /> Corbeille
          </h1>
          <p className="text-base-content/60">Éléments supprimés — restauration ou suppression définitive</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportFile('excel')} className="rounded-full" disabled={items.length === 0}>Excel</Button>
          <Button variant="ghost" onClick={() => exportFile('pdf')} className="rounded-full" disabled={items.length === 0}>PDF</Button>
          <Button variant="ghost" onClick={loadItems} className="rounded-full">Actualiser</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panneau latéral de filtres */}
        <aside className="lg:col-span-1">
          <Card className="space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-base-content/80"><Filter size={16} /> Filtres</h3>

            <div>
              <label className="block text-xs font-semibold text-base-content/70 mb-1">Module</label>
              <select
                aria-label="Module"
                className="select select-bordered w-full bg-base-200 border p-2 rounded text-sm"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-content/70 mb-1">Recherche (nom)</label>
              <div className="flex gap-2">
                <input
                  className="input input-bordered w-full bg-base-200 border p-2 rounded text-sm"
                  placeholder="Mot-clé..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadItems(); }}
                />
                <Button variant="ghost" onClick={loadItems} className="px-3" title="Rechercher"><Search size={16} /></Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-content/70 mb-1">Supprimé par</label>
              <input
                className="input input-bordered w-full bg-base-200 border p-2 rounded text-sm"
                placeholder="Nom de l'utilisateur..."
                value={deletedByText}
                onChange={(e) => setDeletedByText(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-content/70 mb-1">Supprimé entre</label>
              <input type="date" aria-label="Date de début" className="input input-bordered w-full bg-base-200 border p-2 rounded text-sm mb-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" aria-label="Date de fin" className="input input-bordered w-full bg-base-200 border p-2 rounded text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </Card>
        </aside>

        {/* Tableau central */}
        <section className="lg:col-span-3 space-y-4">
          {/* Barre d'actions de masse */}
          {canWrite && selectedItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <span className="text-sm font-semibold text-base-content/80">{selectedItems.length} sélectionné(s)</span>
              <Button variant="ghost" className="text-green-700 border-green-200 hover:bg-green-50" onClick={restoreSelected} disabled={working}>
                <RotateCcw size={16} className="mr-1" /> Restaurer
              </Button>
              <Button variant="ghost" className="text-red-600 border-red-200 hover:bg-red-50" onClick={openPurgeBulk} disabled={working}>
                <Trash2 size={16} className="mr-1" /> Supprimer définitivement
              </Button>
            </div>
          )}

          {/* Vue mobile : liste verticale avec swipe (glisser à droite = restaurer, gauche = supprimer) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>
            ) : visibleItems.length === 0 ? (
              <Card className="text-center py-12">
                <Inbox size={40} className="mx-auto text-base-content/30 mb-3" />
                <p className="text-base-content/70 font-semibold text-sm">La corbeille est vide</p>
              </Card>
            ) : (
              <>
                {canWrite && <p className="text-xs text-base-content/50 px-1">Astuce : glissez une carte vers la droite pour restaurer, vers la gauche pour supprimer.</p>}
                {visibleItems.map(it => (
                  <SwipeRow key={keyOf(it)} item={it} canWrite={canWrite} formatDate={formatDate} onRestore={() => restoreOne(it)} onDelete={() => openPurgeOne(it)} />
                ))}
              </>
            )}
          </div>

          {/* Vue desktop : tableau */}
          <Card className="p-0 overflow-hidden hidden md:block">
            {loading ? (
              <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-20">
                <Inbox size={48} className="mx-auto text-base-content/30 mb-4" />
                <h3 className="font-bold text-base-content/80">La corbeille est vide</h3>
                <p className="text-base-content/60 mt-1 text-sm">Aucun élément supprimé ne correspond aux filtres.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead className="bg-base-200/60">
                    <tr className="text-xs uppercase tracking-wider text-base-content/60">
                      {canWrite && (
                        <th className="p-3 w-10">
                          <input type="checkbox" aria-label="Tout sélectionner" className="checkbox checkbox-sm" checked={allSelected} onChange={toggleAll} />
                        </th>
                      )}
                      <th className="p-3">Nom</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Supprimé par</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200">
                    {visibleItems.map(it => (
                      <tr key={keyOf(it)} className="hover:bg-base-200/50">
                        {canWrite && (
                          <td className="p-3">
                            <input type="checkbox" aria-label={`Sélectionner ${it.label}`} className="checkbox checkbox-sm" checked={selected.has(keyOf(it))} onChange={() => toggleOne(it)} />
                          </td>
                        )}
                        <td className="p-3 font-medium text-base-content/90">{it.label}</td>
                        <td className="p-3 text-sm">
                          <span className="bg-base-300 px-2 py-0.5 rounded text-xs font-semibold text-base-content/70">{it.type_label}</span>
                        </td>
                        <td className="p-3 text-sm text-base-content/70">{it.module_label}</td>
                        <td className="p-3 text-sm text-base-content/70">{it.deleted_by_name}</td>
                        <td className="p-3 text-sm text-base-content/60">{formatDate(it.deleted_at)}</td>
                        <td className="p-3 text-right">
                          {canWrite ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" title="Restaurer" className="text-green-700 hover:bg-green-50" onClick={() => restoreOne(it)}>
                                <RotateCcw size={16} />
                              </Button>
                              <Button variant="ghost" size="sm" title="Supprimer définitivement" className="text-red-600 hover:bg-red-50" onClick={() => openPurgeOne(it)}>
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-base-content/40">Consultation</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Modal de confirmation suppression définitive */}
      <Modal
        isOpen={!!purgeTarget || bulkPurge}
        onClose={closePurge}
        title="Suppression définitive"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePurge}>Annuler</Button>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700 border-none" disabled={!confirmValid || working} onClick={doPurge}>
              {working ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <p>Cette action est <strong>irréversible</strong>. Les éléments seront supprimés définitivement de la base de données.</p>
          </div>

          {/* Impact en cascade — affiché AVANT la saisie de confirmation, pour qu'aucune
              donnée liée (baux, historique de paiements…) ne disparaisse silencieusement. */}
          {impactLoading ? (
            <p className="text-sm text-base-content/60 flex items-center gap-2">
              <span className="loading loading-spinner loading-xs" /> Analyse des données liées...
            </p>
          ) : impact.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                Ces données liées seront supprimées aussi
              </p>
              <ul className="mt-2 space-y-1">
                {impact.map(i => (
                  <li key={i.label} className="flex justify-between text-sm text-orange-900">
                    <span>{i.label}</span>
                    <strong className="tabular-nums">{i.count}</strong>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-orange-700/80 mt-2">
                Y compris les éléments encore actifs (un lot en corbeille peut avoir un bail en cours).
                {bulkPurge && ' Totaux estimés : des éléments sélectionnés peuvent se recouper.'}
              </p>
            </div>
          )}

          {bulkPurge ? (
            <p className="text-sm text-base-content/80">
              Vous allez supprimer définitivement <strong>{selectedItems.length}</strong> élément(s).
              Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous.
            </p>
          ) : (
            <p className="text-sm text-base-content/80">
              Pour confirmer, tapez le nom exact de l'élément : <strong>{purgeTarget?.label}</strong>
            </p>
          )}

          <input
            className="input input-bordered w-full bg-base-200 border p-2 rounded"
            aria-label="Confirmation"
            placeholder={bulkPurge ? 'SUPPRIMER' : purgeTarget?.label || ''}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default Corbeille;
