// frontend/src/pages/InventoryForm.tsx
// Page d'inventaire : contexte (colonne gauche) + éléments (colonne droite) + modal ajout
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Save, Plus, Trash2, Camera, ChevronLeft,
  AlertCircle, Building2, Home, Box, Check, X, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getToken } from '../api/authApi';
import { toast } from 'react-hot-toast';
import { API_URL, API_BASE } from '../config';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

// ==============================
// Types
// ==============================
interface InventoryItem {
  id?: number;
  categorie: string;
  nom: string;
  etat: 'neuf' | 'bon' | 'usager' | 'mauvais' | 'hs';
  quantite: number;
  description: string;
  observation: string;
  photos: string[];
}

const CATEGORIES = [
  'Menuiserie', 'Électricité', 'Plomberie', 'Sols / Murs',
  'Cuisine', 'Salle de bain', 'Mobilier', 'Électroménager', 'Autre',
];

const ETATS: { value: InventoryItem['etat']; label: string; badge: string; dot: string }[] = [
  { value: 'neuf',    label: 'Neuf',         badge: 'bg-success/10 text-success border-success/30',       dot: 'bg-success' },
  { value: 'bon',     label: 'Bon état',      badge: 'bg-info/10 text-info border-info/30',               dot: 'bg-info' },
  { value: 'usager',  label: 'Usagé',         badge: 'bg-warning/10 text-warning border-warning/30',      dot: 'bg-warning' },
  { value: 'mauvais', label: 'Mauvais',       badge: 'bg-orange-100 text-orange-700 border-orange-200',   dot: 'bg-orange-500' },
  { value: 'hs',      label: 'Hors service',  badge: 'bg-error/10 text-error border-error/30',            dot: 'bg-error' },
];

const TYPE_INVENTAIRE = [
  { value: 'entree',         label: 'État des lieux d\'entrée' },
  { value: 'sortie',         label: 'État des lieux de sortie' },
  { value: 'intermediaire',  label: 'Contrôle intermédiaire' },
  { value: 'mobilier',       label: 'Inventaire mobilier' },
];

const BLANK_ITEM: InventoryItem = {
  categorie: 'Menuiserie',
  nom: '',
  etat: 'bon',
  quantite: 1,
  description: '',
  observation: '',
  photos: [],
};

// ==============================
// Composant principal
// ==============================
const InventoryForm: React.FC = () => {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = !!id;

  const [saving, setSaving]         = useState(false);
  const [showModal, setShowModal]   = useState(false);

  // Header
  const [header, setHeader] = useState({
    entity_type:      'lot',
    entity_id:        0,
    date_realisation: new Date().toISOString().split('T')[0],
    type_inventaire:  'entree',
    commentaires:     '',
  });

  // Items — items déjà persistés (avec id) chargés en édition ; retirés de la liste
  // s'ils sont supprimés, pour pouvoir les DELETE côté serveur au moment d'enregistrer.
  const [items, setItems]             = useState<InventoryItem[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<number[]>([]);
  const [currentItem, setCurrentItem] = useState<InventoryItem>({ ...BLANK_ITEM });
  const [editIdx, setEditIdx]         = useState<number | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(isEdit);

  // Entity lists
  const [buildings, setBuildings] = useState<any[]>([]);
  const [lots, setLots]           = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);

  // Expanded categories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    // Les routes biens sont montées sous /api/biens et renvoient un objet enveloppe
    // ({ immeubles } / { lots }), d'où le déballage ci-dessous vers des tableaux.
    Promise.all([
      fetch(`${API_URL}/biens/immeubles`, { headers }).then(r => r.ok ? r.json() : {}),
      fetch(`${API_URL}/biens/lots`,      { headers }).then(r => r.ok ? r.json() : {}),
    ])
      .then(([b, l]: [any, any]) => { setBuildings(b.immeubles || []); setLots(l.lots || []); })
      .catch(() => {})
      .finally(() => setLoadingEntities(false));
  }, []);

  // En édition, charger l'inventaire existant (header + items) : sans ce chargement,
  // le formulaire restait vierge et "Enregistrer" recréait un doublon au lieu de modifier.
  useEffect(() => {
    if (!isEdit) return;
    const token = getToken();
    fetch(`${API_URL}/inventories/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Inventaire introuvable')))
      .then((data) => {
        if (data.statut !== 'brouillon') {
          toast.error('Cet inventaire est verrouillé (déjà signé) : modification impossible.');
          navigate(`/dashboard/inventories/${id}`);
          return;
        }
        setHeader({
          entity_type:      data.entity_type,
          entity_id:        data.entity_id,
          date_realisation: (data.date_realisation || '').split('T')[0],
          type_inventaire:  data.type_inventaire,
          commentaires:     data.commentaires || '',
        });
        setItems((data.items || []).map((it: any) => ({
          id: it.id,
          categorie: it.categorie,
          nom: it.nom,
          etat: it.etat,
          quantite: it.quantite,
          description: it.description || '',
          observation: it.observation || '',
          photos: it.photos || [],
        })));
      })
      .catch(() => {
        toast.error('Erreur lors du chargement de l\'inventaire');
        navigate('/dashboard/inventories');
      })
      .finally(() => setLoadingInventory(false));
  }, [id, isEdit]);

  const setH = (field: string, value: any) =>
    setHeader(p => ({ ...p, [field]: value }));

  const setCI = (field: string, value: any) =>
    setCurrentItem(p => ({ ...p, [field]: value }));

  // --- Options ---
  const buildingOptions = buildings.map(b => ({ value: b.id, label: b.nom }));
  // /biens/lots renvoie 'reference' (alias de ref_lot) et 'immeuble' — pas 'ref_lot'.
  const lotOptions      = lots.map(l => ({
    value: l.id,
    label: [l.reference, l.immeuble, l.type].filter(Boolean).join(' · ') || `Lot #${l.id}`,
  }));
  const entityOptions   = header.entity_type === 'lot' ? lotOptions : buildingOptions;

  // --- Photo upload ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append('type', 'inventory');
    fd.append('file', e.target.files[0]);
    try {
      const res  = await fetch(`${API_URL}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const url = `${API_BASE}${data.files[0].path}`;
        setCI('photos', [...currentItem.photos, url]);
      }
    } catch {
      toast.error('Échec de l\'upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Gestion items ---
  const openAdd = () => {
    setCurrentItem({ ...BLANK_ITEM });
    setEditIdx(null);
    setShowModal(true);
  };

  const openEdit = (idx: number) => {
    setCurrentItem({ ...items[idx] });
    setEditIdx(idx);
    setShowModal(true);
  };

  const handleSaveItem = () => {
    if (!currentItem.nom.trim()) return;
    if (editIdx !== null) {
      setItems(p => p.map((it, i) => i === editIdx ? currentItem : it));
    } else {
      setItems(p => [...p, currentItem]);
    }
    setShowModal(false);
    // Auto-expand the category
    setExpandedCats(p => ({ ...p, [currentItem.categorie]: true }));
  };

  const handleDeleteItem = (idx: number) => {
    const item = items[idx];
    if (item.id) setRemovedItemIds(p => [...p, item.id!]);
    setItems(p => p.filter((_, i) => i !== idx));
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!header.entity_id) { toast.error('Sélectionnez un lot ou immeuble'); return; }
    setSaving(true);
    try {
      const token = getToken();
      const h     = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      if (isEdit) {
        const res = await fetch(`${API_URL}/inventories/${id}`, {
          method: 'PUT', headers: h, body: JSON.stringify({ commentaires: header.commentaires }),
        });
        if (!res.ok) throw new Error('Erreur mise à jour inventaire');

        for (const itemId of removedItemIds) {
          await fetch(`${API_URL}/inventories/${id}/items/${itemId}`, { method: 'DELETE', headers: h });
        }
        for (const item of items) {
          if (item.id) {
            await fetch(`${API_URL}/inventories/${id}/items/${item.id}`, {
              method: 'PUT', headers: h, body: JSON.stringify(item),
            });
          } else {
            await fetch(`${API_URL}/inventories/${id}/items`, {
              method: 'POST', headers: h, body: JSON.stringify(item),
            });
          }
        }

        toast.success('Inventaire mis à jour !');
        navigate(`/dashboard/inventories/${id}`);
        return;
      }

      const res = await fetch(`${API_URL}/inventories`, {
        method: 'POST', headers: h, body: JSON.stringify(header),
      });
      if (!res.ok) throw new Error('Erreur création inventaire');
      const inv = await res.json();

      for (const item of items) {
        await fetch(`${API_URL}/inventories/${inv.id}/items`, {
          method: 'POST', headers: h, body: JSON.stringify(item),
        });
      }

      toast.success('Inventaire enregistré !');
      navigate('/dashboard/inventories');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // --- Groupes par catégorie ---
  const grouped = CATEGORIES.reduce<Record<string, InventoryItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.categorie === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  const etatOf = (v: string) => ETATS.find(e => e.value === v);

  // ==============================
  // Render
  // ==============================
  if (loadingInventory) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-base-content/50">
        <Loader2 size={20} className="animate-spin" /> Chargement de l'inventaire…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200/40 pb-16">
      {/* Topbar */}
      <div className="sticky top-0 z-20 bg-base-100 border-b border-base-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/dashboard/inventories')}
          className="flex items-center gap-2 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
        >
          <ChevronLeft size={18} /> Retour
        </button>

        <h1 className="text-base font-bold text-base-content">
          {isEdit ? 'Modifier l\'inventaire' : 'Nouvel inventaire'}
        </h1>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || items.length === 0 || !header.entity_id}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-content text-sm font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:shadow-none"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ============ COLONNE GAUCHE : CONTEXTE ============ */}
        <div className="lg:col-span-1">
          <div className="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-5 space-y-5 sticky top-24">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary" />
              <h2 className="font-bold text-base-content">Contexte</h2>
            </div>

            {/* Type d'inventaire — fixé à la création (non modifiable côté serveur) */}
            <Select
              label="Type d'inventaire"
              options={TYPE_INVENTAIRE}
              value={header.type_inventaire}
              onChange={e => setH('type_inventaire', e.target.value)}
              disabled={isEdit}
            />

            {/* Type de bien — fixé à la création (non modifiable côté serveur) */}
            <div>
              <p className="text-sm font-semibold text-base-content/80 mb-2">Type de bien</p>
              <div className="flex bg-base-200 p-1 rounded-xl gap-1">
                {[
                  { value: 'lot',      label: 'Lot',      icon: Home },
                  { value: 'building', label: 'Immeuble', icon: Building2 },
                ].map(opt => {
                  const active = header.entity_type === opt.value;
                  const Icon   = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isEdit}
                      onClick={() => { setH('entity_type', opt.value); setH('entity_id', 0); }}
                      className={[
                        'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                        active
                          ? 'bg-base-100 shadow text-primary font-bold'
                          : 'text-base-content/50 hover:text-base-content/80',
                      ].join(' ')}
                    >
                      <Icon size={15} /> {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sélection bien — fixée à la création (non modifiable côté serveur) */}
            <Select
              label={header.entity_type === 'lot' ? 'Lot' : 'Immeuble'}
              required
              searchable
              placeholder={loadingEntities ? 'Chargement…' : 'Sélectionner…'}
              options={entityOptions}
              value={header.entity_id || ''}
              onChange={e => setH('entity_id', parseInt(e.target.value) || 0)}
              disabled={loadingEntities || isEdit}
            />

            {/* Date — fixée à la création (non modifiable côté serveur) */}
            <Input
              label="Date de réalisation"
              type="date"
              value={header.date_realisation}
              onChange={e => setH('date_realisation', e.target.value)}
              disabled={isEdit}
            />

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                Commentaire global
                <span className="ml-1 text-xs font-normal text-base-content/40">(optionnel)</span>
              </label>
              <div className="rounded-xl border-2 border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-base-100">
                <textarea
                  rows={3}
                  value={header.commentaires}
                  onChange={e => setH('commentaires', e.target.value)}
                  placeholder="Remarques générales sur l'état du bien…"
                  className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm placeholder:text-base-content/40 resize-none"
                />
              </div>
            </div>

            {/* Compteur items */}
            {items.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-xl text-sm">
                <Check size={14} className="text-success" />
                <span className="text-success font-semibold">{items.length} élément{items.length > 1 ? 's' : ''} ajouté{items.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ============ COLONNE DROITE : ÉLÉMENTS ============ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header colonne */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base-content flex items-center gap-2">
              <Box size={18} className="text-primary" />
              Éléments inventoriés
              {items.length > 0 && (
                <span className="text-xs font-normal px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {items.length}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-content text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-sm"
            >
              <Plus size={16} /> Ajouter un élément
            </button>
          </div>

          {/* Empty state */}
          {items.length === 0 ? (
            <div className="bg-base-100 rounded-2xl border-2 border-dashed border-base-300 p-16 flex flex-col items-center text-center">
              <ClipboardList size={48} className="text-base-content/15 mb-4" />
              <p className="font-semibold text-base-content/50">Aucun élément ajouté</p>
              <p className="text-sm text-base-content/30 mt-1">Commencez par ajouter une pièce, un équipement ou un meuble</p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-base-300 text-sm font-semibold text-base-content/60 hover:border-primary hover:text-primary transition-all"
              >
                <Plus size={16} /> Ajouter le premier élément
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, catItems]) => {
                const expanded = expandedCats[cat] !== false; // ouvert par défaut
                return (
                  <div key={cat} className="bg-base-100 rounded-2xl border border-base-200 shadow-sm overflow-hidden">
                    {/* Catégorie header */}
                    <button
                      type="button"
                      onClick={() => setExpandedCats(p => ({ ...p, [cat]: !expanded }))}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-base-200/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">{cat}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-base-200 rounded-full text-base-content/50 font-medium">
                          {catItems.length}
                        </span>
                      </div>
                      {expanded ? <ChevronUp size={16} className="text-base-content/40" /> : <ChevronDown size={16} className="text-base-content/40" />}
                    </button>

                    {/* Items */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="divide-y divide-base-200">
                            {catItems.map((item, relIdx) => {
                              const absIdx = items.indexOf(item);
                              const etat   = etatOf(item.etat);
                              return (
                                <div key={absIdx} className="flex items-start gap-3 px-5 py-3 group hover:bg-base-200/30 transition-colors">
                                  {/* Photo ou placeholder */}
                                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-base-200">
                                    {item.photos[0] ? (
                                      <img src={item.photos[0]} alt={item.nom} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Camera size={18} className="text-base-content/25" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm text-base-content">{item.nom}</span>
                                      {item.quantite > 1 && (
                                        <span className="text-xs text-base-content/40">×{item.quantite}</span>
                                      )}
                                      {etat && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${etat.badge}`}>
                                          {etat.label}
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-base-content/50 mt-0.5 truncate">{item.description}</p>
                                    )}
                                    {item.observation && (
                                      <p className="text-xs text-error mt-1 flex items-center gap-1">
                                        <AlertCircle size={11} className="flex-shrink-0" />
                                        {item.observation}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => openEdit(absIdx)}
                                      className="p-1.5 rounded-lg hover:bg-base-300 text-base-content/50 hover:text-base-content transition-colors text-xs font-medium"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      title="Supprimer"
                                      onClick={() => handleDeleteItem(absIdx)}
                                      className="p-1.5 rounded-lg hover:bg-error/10 text-base-content/40 hover:text-error transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ MODAL AJOUT / ÉDITION ITEM ============ */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0,  opacity: 1, scale: 1 }}
              exit={{   y: 60, opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-base-100 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-base-200 bg-base-100 sticky top-0">
                <h3 className="font-bold text-base-content">
                  {editIdx !== null ? 'Modifier l\'élément' : 'Ajouter un élément'}
                </h3>
                <button
                  type="button"
                  title="Fermer"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg hover:bg-base-200 text-base-content/50 hover:text-base-content transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Corps modal */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Catégorie + Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Catégorie"
                    required
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                    value={currentItem.categorie}
                    onChange={e => setCI('categorie', e.target.value)}
                  />
                  <Input
                    label="Nom / Désignation"
                    required
                    placeholder="Ex : Porte, Prise, Fenêtre…"
                    value={currentItem.nom}
                    onChange={e => setCI('nom', e.target.value)}
                  />
                </div>

                {/* État */}
                <div>
                  <p className="text-sm font-semibold text-base-content/80 mb-2">État</p>
                  <div className="grid grid-cols-5 gap-2">
                    {ETATS.map(etat => {
                      const active = currentItem.etat === etat.value;
                      return (
                        <button
                          key={etat.value}
                          type="button"
                          onClick={() => setCI('etat', etat.value)}
                          className={[
                            'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                            active
                              ? `${etat.badge} ring-2 ring-offset-1 ring-current`
                              : 'border-base-200 text-base-content/50 hover:border-base-300',
                          ].join(' ')}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${active ? etat.dot : 'bg-base-300'}`} />
                          <span className="text-center leading-tight">{etat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantité + Description */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantité"
                    type="number"
                    min={1}
                    value={currentItem.quantite}
                    onChange={e => setCI('quantite', parseInt(e.target.value) || 1)}
                  />
                  <Input
                    label="Description / Marque"
                    placeholder="Ex : Bois massif, Legrand…"
                    value={currentItem.description}
                    onChange={e => setCI('description', e.target.value)}
                  />
                </div>

                {/* Observation */}
                <div>
                  <label className="block text-sm font-semibold text-error/80 mb-1.5">
                    Observation <span className="text-xs font-normal text-base-content/40">(défauts, dégâts)</span>
                  </label>
                  <div className="rounded-xl border-2 border-error/20 focus-within:border-error/50 focus-within:ring-2 focus-within:ring-error/10 transition-all bg-error/5">
                    <textarea
                      rows={2}
                      value={currentItem.observation}
                      onChange={e => setCI('observation', e.target.value)}
                      placeholder="Décrire les défauts éventuels…"
                      className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm placeholder:text-base-content/40 resize-none"
                    />
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <p className="text-sm font-semibold text-base-content/80 mb-2 flex items-center gap-1.5">
                    <Camera size={15} /> Photos
                    <span className="text-xs font-normal text-base-content/40">({currentItem.photos.length})</span>
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {currentItem.photos.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-base-200 group">
                        <img src={src} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          title="Supprimer cette photo"
                          onClick={() => setCI('photos', currentItem.photos.filter((_, pi) => pi !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-error/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {/* Bouton ajout photo */}
                    <label className="aspect-square rounded-xl border-2 border-dashed border-base-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all gap-1">
                      {uploadingPhoto ? (
                        <Loader2 size={18} className="animate-spin text-primary" />
                      ) : (
                        <>
                          <Plus size={18} className="text-base-content/40" />
                          <span className="text-[10px] text-base-content/40 text-center leading-tight">Photo</span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer modal */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-base-200 bg-base-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-base-content/60 hover:bg-base-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={!currentItem.nom.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-content text-sm font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-40"
                >
                  <Check size={15} />
                  {editIdx !== null ? 'Mettre à jour' : 'Ajouter l\'élément'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryForm;
