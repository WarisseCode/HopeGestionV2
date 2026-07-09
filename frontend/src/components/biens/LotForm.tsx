// frontend/src/components/biens/LotForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Wallet, Image as ImageIcon, Calendar,
  Save, Trash2, Check, ArrowRight, ArrowLeft,
  Building2, Tag, Hash, Layers, SquareStack,
  Banknote, ChevronRight, Info, FileImage
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import type { Lot, Immeuble } from '../../api/bienApi';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LotFormProps {
  lot: Partial<Lot>;
  immeubles: Immeuble[];
  onSave: (lot: Partial<Lot>) => Promise<void>;
  onStatusChange?: (lot: Partial<Lot>, newStatus: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 0,
    title: 'Identification',
    subtitle: 'Immeuble, référence et type',
    icon: Home,
    required: true,
  },
  {
    id: 1,
    title: 'Caractéristiques',
    subtitle: 'Superficie, pièces et description',
    icon: Layers,
    required: false,
  },
  {
    id: 2,
    title: 'Finances',
    subtitle: 'Loyer, caution et option de vente',
    icon: Wallet,
    required: false,
  },
  {
    id: 3,
    title: 'Médias',
    subtitle: 'Photos et disponibilité',
    icon: ImageIcon,
    required: false,
  },
];

const TYPES_LOT = [
  { value: 'Appartement', label: 'Appartement' },
  { value: 'Studio',      label: 'Studio' },
  { value: 'Chambre',     label: 'Chambre' },
  { value: 'Boutique',    label: 'Boutique' },
  { value: 'Bureau',      label: 'Bureau' },
  { value: 'Dépôt',       label: 'Dépôt' },
  { value: 'Terrain',     label: 'Terrain nu' },
];

const PERIODICITES = [
  { value: 'mensuel',      label: 'Mensuel' },
  { value: 'trimestriel',  label: 'Trimestriel' },
  { value: 'semestriel',   label: 'Semestriel' },
  { value: 'annuel',       label: 'Annuel' },
];

const MODALITES_VENTE = [
  { value: 'comptant',   label: 'Paiement comptant' },
  { value: 'echelonne',  label: 'Paiement échelonné' },
];

const STATUTS = [
  { value: 'disponible',   label: 'Libre — Disponible à la location' },
  { value: 'reserve',     label: 'Réservé — En cours de signature' },
  { value: 'occupe',      label: 'Loué — Bail en cours' },
  { value: 'vendu',       label: 'Vendu' },
  { value: 'hors_service', label: 'Hors service — Indisponible' },
];

// ─── Validation ────────────────────────────────────────────────────────────────

const validateField = (field: string, value: any): string => {
  switch (field) {
    case 'reference':   return !value?.trim() ? 'La référence du lot est requise' : '';
    case 'building_id': return !value ? "L'immeuble de rattachement est requis" : '';
    default:            return '';
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────

const LotForm: React.FC<LotFormProps> = ({
  lot,
  immeubles,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection]     = useState(0);
  const [touched, setTouched]         = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showVente, setShowVente]     = useState(!!lot.prix_vente);

  const buildDefaults = (base: Partial<Lot> = {}): Partial<Lot> => ({
    type:        'Appartement',
    nbPieces:    1,
    periodicite: 'mensuel',
    statut:      'disponible',
    avance:      1,
    ...base,
  });

  const [formData, setFormData] = useState<Partial<Lot>>(() => {
    const data = buildDefaults(lot);
    if (!data.building_id && immeubles.length === 1) {
      data.building_id = immeubles[0].id;
      if (!data.owner_id) data.owner_id = immeubles[0].owner_id;
    }
    return data;
  });

  const [photoPreviews, setPhotoPreviews] = useState<string[]>(lot.photos || []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const data = buildDefaults(lot);
    if (!data.building_id && immeubles.length === 1) {
      data.building_id = immeubles[0].id;
      if (!data.owner_id) data.owner_id = immeubles[0].owner_id;
    }
    setFormData(data);
    setPhotoPreviews(lot.photos || []);
    setShowVente(!!lot.prix_vente);
  }, [lot.id, immeubles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback((field: keyof Lot, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field]);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, [formData]);

  const getError = (field: string) =>
    touched[field] ? fieldErrors[field] || '' : '';

  // Photo gallery
  const handlePhotoAdd = (url: string) => {
    if (photoPreviews.length >= 10 || photoPreviews.includes(url)) return;
    const newPhotos = [...photoPreviews, url];
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  const handlePhotoRemove = (index: number) => {
    const newPhotos = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const isStepValid = (step = currentStep): boolean => {
    if (step === 0) {
      return !!formData.reference?.trim() && !!formData.building_id;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      const newErrors: Record<string, string> = {};
      const newTouched: Record<string, boolean> = {};
      ['reference', 'building_id'].forEach(f => {
        const err = validateField(f, (formData as any)[f]);
        if (err) newErrors[f] = err;
        newTouched[f] = true;
      });
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      setTouched(prev => ({ ...prev, ...newTouched }));
      if (Object.keys(newErrors).length > 0) return;
    }
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    const reachable = step < currentStep
      || step === currentStep
      || (step === currentStep + 1 && isStepValid());
    if (!reachable) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const progress   = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;

  const selectedImmeuble = immeubles.find(b => b.id === formData.building_id);

  const slide = {
    enter:  (d: number) => ({ x: d > 0 ? 56 : -56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d < 0 ? 56 : -56, opacity: 0 }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-base-100">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-base-200 flex-shrink-0">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-base-content leading-snug">
            {lot.id ? 'Modifier le lot' : 'Nouveau lot'}
          </h2>
          <p className="text-sm text-base-content/50 mt-0.5">
            {STEPS[currentStep].subtitle}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-xs text-base-content/40">
            <span className="font-medium">{STEPS[currentStep].title}</span>
            <span>Étape {currentStep + 1} / {STEPS.length}</span>
          </div>
          <div className="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stepper tabs */}
        <div className="flex gap-1.5" role="tablist" aria-label="Étapes du formulaire">
          {STEPS.map((step, index) => {
            const StepIcon  = step.icon;
            const completed = currentStep > index;
            const current   = currentStep === index;
            const reachable = index <= currentStep
              || (index === currentStep + 1 && isStepValid());

            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-current={current ? "true" : undefined}
                aria-label={`${step.title}${completed ? ' — complété' : ''}`}
                onClick={() => goToStep(step.id)}
                disabled={!reachable}
                className={[
                  'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  current   ? 'bg-primary text-primary-content shadow-sm' : '',
                  completed ? 'bg-success/10 text-success cursor-pointer hover:bg-success/20' : '',
                  !current && !completed ? 'text-base-content/35' : '',
                  !reachable ? 'cursor-default' : '',
                ].join(' ')}
              >
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  current   ? 'bg-white/20' : '',
                  completed ? 'bg-success text-white' : '',
                ].join(' ')}>
                  {completed ? <Check size={13} /> : <StepIcon size={13} />}
                </div>
                <span className="hidden sm:block leading-none">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-2xl mx-auto p-6 pb-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >

              {/* ════════════ STEP 0 — IDENTIFICATION ════════════ */}
              {currentStep === 0 && (
                <div className="space-y-5">

                  {/* Immeuble de rattachement */}
                  {immeubles.length === 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                      <Info size={16} className="text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-warning">Aucun immeuble disponible</p>
                        <p className="text-xs text-warning/70 mt-0.5">
                          Vous devez d'abord créer un immeuble avant d'ajouter des lots.
                        </p>
                      </div>
                    </div>
                  ) : immeubles.length === 1 ? (
                    <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-xl">
                      <div>
                        <p className="text-xs font-semibold text-success/80 uppercase tracking-wide">
                          Immeuble lié
                        </p>
                        <p className="font-bold text-base-content mt-0.5">{immeubles[0].nom}</p>
                        {immeubles[0].ville && (
                          <p className="text-xs text-base-content/50 mt-0.5">{immeubles[0].ville}</p>
                        )}
                      </div>
                      <Building2 size={20} className="text-success" />
                    </div>
                  ) : (
                    <Select
                      label="Immeuble de rattachement"
                      required
                      placeholder="Sélectionner un immeuble…"
                      value={formData.building_id ?? ''}
                      onChange={e => {
                        const bid = e.target.value ? parseInt(e.target.value) : undefined;
                        const imm = immeubles.find(b => b.id === bid);
                        setFormData(prev => ({
                          ...prev,
                          building_id: bid,
                          owner_id: imm?.owner_id ?? prev.owner_id,
                        }));
                        setFieldErrors(prev => ({ ...prev, building_id: '' }));
                      }}
                      options={immeubles.map(b => ({
                        value: b.id,
                        label: `${b.nom}${b.ville ? ' — ' + b.ville : ''}`,
                      }))}
                      error={getError('building_id')}
                      searchable
                    />
                  )}

                  {/* Référence + Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Référence du lot"
                      placeholder="Ex : A01, B12…"
                      value={formData.reference || ''}
                      onChange={e => handleChange('reference', e.target.value)}
                      onBlur={() => handleBlur('reference')}
                      required
                      startIcon={<Hash size={16} />}
                      error={getError('reference')}
                      helperText="Identifiant unique dans l'immeuble"
                    />
                    <Select
                      label="Type de lot"
                      value={formData.type || 'Appartement'}
                      onChange={e => handleChange('type', e.target.value)}
                      options={TYPES_LOT}
                    />
                  </div>

                  {/* Emplacement */}
                  <div>
                    <p className="text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                      <SquareStack size={14} /> Emplacement dans l'immeuble
                      <span className="text-xs font-normal text-base-content/40">(optionnel)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Étage"
                        placeholder="Ex : RDC, 1er, 2e…"
                        value={formData.etage || ''}
                        onChange={e => handleChange('etage', e.target.value)}
                      />
                      <Input
                        label="Bloc / Escalier"
                        placeholder="Ex : A, B…"
                        value={formData.bloc || ''}
                        onChange={e => handleChange('bloc', e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-base-content/40">
                    Les champs marqués <span className="text-error">*</span> sont obligatoires.
                  </p>
                </div>
              )}

              {/* ════════════ STEP 1 — CARACTÉRISTIQUES ════════════ */}
              {currentStep === 1 && (
                <div className="space-y-5">

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Superficie (m²)"
                      type="number"
                      min={0}
                      placeholder="Ex : 45"
                      value={formData.superficie || ''}
                      onChange={e => handleChange('superficie',
                        e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      startIcon={<Tag size={16} />}
                    />
                    <Input
                      label="Nombre de pièces"
                      type="number"
                      min={1}
                      value={formData.nbPieces || 1}
                      onChange={e => handleChange('nbPieces', parseInt(e.target.value) || 1)}
                      helperText="Chambres + salon"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                      Description détaillée
                    </label>
                    <div className="rounded-xl border-2 border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-base-100">
                      <textarea
                        className="w-full px-4 py-3 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none placeholder:text-base-content/50 text-base-content"
                        rows={5}
                        value={formData.description || ''}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Équipements inclus, particularités, état général…"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════ STEP 2 — FINANCES ════════════ */}
              {currentStep === 2 && (
                <div className="space-y-5">

                  {/* Loyer + Charges + Périodicité */}
                  <div>
                    <p className="text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
                      <Banknote size={14} /> Configuration locative
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Loyer mensuel (FCFA)"
                        type="number"
                        min={0}
                        placeholder="Ex : 50 000"
                        value={formData.loyer || ''}
                        onChange={e => handleChange('loyer',
                          e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        startIcon={<Banknote size={16} />}
                      />
                      <Input
                        label="Charges (FCFA)"
                        type="number"
                        min={0}
                        placeholder="Ex : 5 000"
                        value={formData.charges || ''}
                        onChange={e => handleChange('charges',
                          e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                      <Select
                        label="Périodicité"
                        value={formData.periodicite || 'mensuel'}
                        onChange={e => handleChange('periodicite', e.target.value)}
                        options={PERIODICITES}
                      />
                    </div>
                  </div>

                  {/* Caution + Avance */}
                  <div>
                    <p className="text-sm font-semibold text-base-content mb-3">
                      Conditions d'entrée
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Caution (FCFA)"
                        type="number"
                        min={0}
                        placeholder="Ex : 100 000"
                        value={formData.caution || ''}
                        onChange={e => handleChange('caution',
                          e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        startIcon={<Banknote size={16} />}
                        helperText="Habituellement 2-3 mois de loyer"
                      />
                      <Input
                        label="Avance (mois)"
                        type="number"
                        min={0}
                        value={formData.avance ?? 1}
                        onChange={e => handleChange('avance', parseInt(e.target.value) || 0)}
                        helperText="Mois payés d'avance à l'entrée"
                      />
                    </div>
                  </div>

                  {/* Option de vente — toggle card */}
                  <div>
                    <div
                      role="checkbox"
                      aria-checked={showVente ? "true" : undefined}
                      tabIndex={0}
                      onClick={() => {
                        setShowVente(v => !v);
                        if (showVente) {
                          handleChange('prix_vente', null);
                          handleChange('modalite_vente', null);
                          handleChange('duree_echelonnement', null);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setShowVente(v => !v);
                        }
                      }}
                      className={[
                        'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                        showVente
                          ? 'border-success bg-success/5'
                          : 'border-base-300 hover:border-base-400',
                      ].join(' ')}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${showVente ? 'text-success' : 'text-base-content'}`}>
                          Option de vente
                        </p>
                        <p className="text-xs text-base-content/50 mt-0.5">
                          Activer si ce lot est également disponible à l'achat
                        </p>
                      </div>
                      {/* Toggle visuel */}
                      <div className={[
                        'w-11 h-6 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 ml-4',
                        showVente ? 'bg-success justify-end' : 'bg-base-300 justify-start',
                      ].join(' ')}>
                        <motion.div layout className="w-5 h-5 rounded-full bg-white shadow" />
                      </div>
                    </div>

                    {/* Champs vente */}
                    <AnimatePresence>
                      {showVente && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 p-4 bg-success/5 border border-success/20 rounded-xl space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input
                                label="Prix de vente (FCFA)"
                                type="number"
                                min={0}
                                placeholder="Ex : 15 000 000"
                                value={formData.prix_vente || ''}
                                onChange={e => handleChange('prix_vente',
                                  e.target.value === '' ? null : parseFloat(e.target.value))}
                                startIcon={<Banknote size={16} />}
                              />
                              <Select
                                label="Modalité de paiement"
                                value={formData.modalite_vente || 'comptant'}
                                onChange={e => handleChange('modalite_vente', e.target.value)}
                                options={MODALITES_VENTE}
                              />
                            </div>

                            <AnimatePresence>
                              {formData.modalite_vente === 'echelonne' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <Input
                                    label="Durée d'échelonnement (mois)"
                                    type="number"
                                    min={1}
                                    placeholder="Ex : 12"
                                    value={formData.duree_echelonnement || ''}
                                    onChange={e => handleChange('duree_echelonnement',
                                      parseInt(e.target.value) || null)}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* ════════════ STEP 3 — MÉDIAS ════════════ */}
              {currentStep === 3 && (
                <div className="space-y-6">

                  {/* Galerie photos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-base-content flex items-center gap-2">
                        <FileImage size={15} /> Photos du lot
                      </p>
                      <span className="text-xs text-base-content/40">
                        {photoPreviews.length} / 10
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {photoPreviews.map((url, index) => (
                        <div
                          key={index}
                          className="relative group rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-base-300 transition-all"
                        >
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handlePhotoRemove(index)}
                              className="w-7 h-7 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/80 transition"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {photoPreviews.length < 10 && (
                        <div className="aspect-square rounded-xl overflow-hidden border-2 border-dashed border-base-300 hover:border-primary/40 transition-colors bg-base-50">
                          <ImageUpload
                            onChange={handlePhotoAdd}
                            folder="property"
                            label=""
                            clearOnSuccess
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Disponibilité + Statut */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-base-content flex items-center gap-2">
                      <Calendar size={14} /> Disponibilité & Statut
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Date de disponibilité"
                        type="date"
                        value={formData.date_disponibilite || ''}
                        onChange={e => handleChange('date_disponibilite', e.target.value)}
                        startIcon={<Calendar size={16} />}
                        helperText="Laissez vide si disponible immédiatement"
                      />
                      <Select
                        label="Statut actuel"
                        value={formData.statut || 'disponible'}
                        onChange={e => handleChange('statut', e.target.value)}
                        options={STATUTS}
                      />
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  {(formData.reference || selectedImmeuble) && (
                    <div className="p-4 bg-base-200 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                        Récapitulatif
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] text-base-content/50">Référence</p>
                          <p className="font-medium">{formData.reference || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Immeuble</p>
                          <p className="font-medium truncate">{selectedImmeuble?.nom || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Type</p>
                          <p className="font-medium">{formData.type}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Loyer</p>
                          <p className="font-medium">
                            {formData.loyer
                              ? `${formData.loyer.toLocaleString()} FCFA`
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { label: 'Identification', step: 0 },
                          { label: 'Caractéristiques', step: 1 },
                          { label: 'Finances', step: 2 },
                        ].map(({ label, step }) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => goToStep(step)}
                            className="text-xs text-base-content/50 hover:text-primary flex items-center gap-1 transition-colors"
                          >
                            <ChevronRight size={11} /> Modifier {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-base-200 bg-base-50 flex-shrink-0">

        <Button
          variant="ghost"
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {currentStep === 0 ? 'Annuler' : 'Précédent'}
        </Button>

        <div className="flex items-center gap-3">
          {/* Info étape facultative */}
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <span className="text-xs text-base-content/40 hidden sm:block">
              Étape facultative
            </span>
          )}

          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={currentStep === 0 && !isStepValid()}
              className="flex items-center gap-2"
            >
              Suivant
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => onSave(formData)}
              disabled={loading}
              className="flex items-center gap-2 min-w-[120px] justify-center"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save size={16} />
                  {lot.id ? 'Modifier' : 'Terminer'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LotForm;
