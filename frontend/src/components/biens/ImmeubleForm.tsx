// frontend/src/components/biens/ImmeubleForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Users, Image as ImageIcon,
  Save, Plus, Trash2, Star, Check,
  ArrowRight, ArrowLeft, Info,
  Video, FileImage, ChevronRight
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import type { Immeuble } from '../../api/bienApi';
import type { Proprietaire, Utilisateur } from '../../api/accountApi';
import { useUser } from '../../contexts/UserContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ImmeubleFormProps {
  immeuble: Partial<Immeuble>;
  proprietaires: Proprietaire[];
  gestionnaires?: Utilisateur[];
  onSave: (immeuble: Partial<Immeuble>) => Promise<void>;
  onSaveAndAddLots?: (immeuble: Partial<Immeuble>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 0,
    title: 'Identité',
    subtitle: 'Informations générales du bien',
    icon: Building2,
    required: true,
  },
  {
    id: 1,
    title: 'Localisation',
    subtitle: 'Adresse et coordonnées',
    icon: MapPin,
    required: true,
  },
  {
    id: 2,
    title: 'Gestion',
    subtitle: 'Propriétaire et gestionnaire',
    icon: Users,
    required: true,
  },
  {
    id: 3,
    title: 'Médias',
    subtitle: 'Photos et paramètres',
    icon: ImageIcon,
    required: false,
  },
];

const TYPES_IMMEUBLE = [
  { value: 'Maison',     label: 'Maison' },
  { value: 'Immeuble',  label: 'Immeuble collectif' },
  { value: 'Résidence', label: 'Résidence' },
  { value: 'Commerce',  label: 'Commerce' },
  { value: 'Villa',     label: 'Villa' },
];

const COUNTRIES = [
  'Bénin', 'Togo', "Côte d'Ivoire", 'Sénégal', 'Mali',
  'Burkina Faso', 'Niger', 'Ghana', 'Nigéria', 'Cameroun',
  'Gabon', 'Congo', 'France', 'Autre',
];

// ─── Validation ────────────────────────────────────────────────────────────────

const validateField = (field: string, value: any): string => {
  switch (field) {
    case 'nom':        return !value?.trim() ? "Le nom de l'immeuble est requis" : '';
    case 'total_lots': return (!value || value < 1) ? 'Le nombre de lots est requis (min. 1)' : '';
    case 'ville':      return !value?.trim() ? 'La ville est requise' : '';
    case 'owner_id':   return !value ? 'Le propriétaire est requis' : '';
    default:           return '';
  }
};

const STEP_REQUIRED_FIELDS: Record<number, string[]> = {
  0: ['nom', 'total_lots'],
  1: ['ville'],
  2: ['owner_id'],
};

// ─── Component ─────────────────────────────────────────────────────────────────

const ImmeubleForm: React.FC<ImmeubleFormProps> = ({
  immeuble,
  proprietaires,
  gestionnaires = [],
  onSave,
  onSaveAndAddLots,
  onCancel,
  loading = false,
}) => {
  const { user } = useUser();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection]     = useState(0);
  const [touched, setTouched]         = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const buildDefaults = (base: Partial<Immeuble> = {}): Partial<Immeuble> => ({
    type:          'Immeuble',
    nombre_etages: 0,
    statut:        'actif',
    pays:          'Bénin',
    ...base,
  });

  const [formData, setFormData] = useState<Partial<Immeuble>>(buildDefaults(immeuble));
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(immeuble.photos || []);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const updated = buildDefaults(immeuble);

    if (!updated.owner_id && proprietaires.length === 1) {
      updated.owner_id = proprietaires[0].id;
    }

    // Pré-sélection du gestionnaire à la création : l'utilisateur connecté est le cas
    // courant (on crée un immeuble que l'on gère soi-même). Il reste libre de choisir
    // un autre gestionnaire ou « Géré directement par le propriétaire ».
    // Distinction volontaire undefined / null : `undefined` = pas encore choisi,
    // `null` = « le propriétaire gère » sélectionné explicitement. Le test strict
    // évite donc d'écraser ce choix. On ne pré-remplit qu'en création, et seulement
    // si l'utilisateur figure bien dans la liste des gestionnaires assignables.
    if (!immeuble.id
        && updated.gestionnaire_id === undefined
        && user?.id
        && gestionnaires.some(g => g.id === user.id)) {
      updated.gestionnaire_id = user.id;
    }

    if (!updated.photo && immeuble.photos && immeuble.photos.length > 0) {
      updated.photo = immeuble.photos[0];
    }

    setFormData(updated);
    setPhotoPreviews(immeuble.photos || []);
  }, [immeuble.id, proprietaires.length, gestionnaires.length, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback((field: keyof Immeuble, value: any) => {
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

  // Photo gallery handlers
  const handlePhotoAdd = (url: string) => {
    if (photoPreviews.length >= 10 || photoPreviews.includes(url)) return;
    const newPhotos = [...photoPreviews, url];
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
    if (newPhotos.length === 1 || !formData.photo) handleChange('photo', url);
  };

  const handlePhotoRemove = (index: number) => {
    const removed   = photoPreviews[index];
    const newPhotos = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
    if (formData.photo === removed) {
      handleChange('photo', newPhotos.length > 0 ? newPhotos[0] : '');
    }
  };

  const handleSetMainPhoto = (url: string) => {
    handleChange('photo', url);
    const newPhotos = [url, ...photoPreviews.filter(p => p !== url)];
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const isStepValid = (step = currentStep): boolean => {
    const fields = STEP_REQUIRED_FIELDS[step];
    if (!fields) return true;
    return fields.every(f => !validateField(f, (formData as any)[f]));
  };

  const handleNext = () => {
    const fields = STEP_REQUIRED_FIELDS[currentStep] || [];
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    fields.forEach(f => {
      const err = validateField(f, (formData as any)[f]);
      if (err) newErrors[f] = err;
      newTouched[f] = true;
    });

    setFieldErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({ ...prev, ...newTouched }));
    if (Object.keys(newErrors).length > 0) return;

    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const goToStep = (step: number) => {
    const reachable = step < currentStep
      || step === currentStep
      || (step === currentStep + 1 && isStepValid());
    if (!reachable) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const handleSubmit = async (addLots = false) => {
    if (addLots && onSaveAndAddLots) await onSaveAndAddLots(formData);
    else await onSave(formData);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const progress   = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;
  const isOptional = !STEPS[currentStep].required && !isLastStep;

  const selectedOwner = proprietaires.find(p => p.id === formData.owner_id);
  const ownerLabel = (p: Proprietaire) =>
    p.type === 'individual' ? `${p.nom} ${p.prenom || ''}`.trim() : p.nom;

  const slide = {
    enter:  (d: number) => ({ x: d > 0 ? 56 : -56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d < 0 ? 56 : -56, opacity: 0 }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render — conserve la structure flex-col full-height pour le scroll interne
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-base-100">

      {/* ── Header : titre + stepper + progress ─────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-base-200 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-base-content leading-snug">
              {immeuble.id ? "Modifier l'immeuble" : 'Nouvel immeuble'}
            </h2>
            <p className="text-sm text-base-content/50 mt-0.5">
              {STEPS[currentStep].subtitle}
            </p>
          </div>
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

              {/* ════════════ STEP 0 — IDENTITÉ ════════════ */}
              {currentStep === 0 && (
                <div className="space-y-5">

                  <Input
                    label="Nom de l'immeuble"
                    placeholder="Ex : Résidence Les Palmiers"
                    value={formData.nom || ''}
                    onChange={e => handleChange('nom', e.target.value)}
                    onBlur={() => handleBlur('nom')}
                    required
                    startIcon={<Building2 size={16} />}
                    error={getError('nom')}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Type de bien"
                      value={formData.type || 'Immeuble'}
                      onChange={e => handleChange('type', e.target.value)}
                      options={TYPES_IMMEUBLE}
                      required
                    />
                    <Input
                      label="Nombre d'étages"
                      type="number"
                      min={0}
                      value={formData.nombre_etages ?? 0}
                      onChange={e => handleChange('nombre_etages',
                        e.target.value === '' ? 0 : parseInt(e.target.value))}
                      helperText="0 si plain-pied"
                    />
                  </div>

                  <Input
                    label="Nombre total de lots"
                    type="number"
                    min={1}
                    placeholder="Ex : 12"
                    value={formData.total_lots ?? ''}
                    onChange={e => handleChange('total_lots',
                      e.target.value === '' ? undefined : parseInt(e.target.value))}
                    onBlur={() => handleBlur('total_lots')}
                    required
                    error={getError('total_lots')}
                    helperText="Nombre total d'appartements / locaux dans ce bien"
                  />

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                      Description
                    </label>
                    <div className="rounded-xl border-2 border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-base-100">
                      <textarea
                        className="w-full px-4 py-3 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none placeholder:text-base-content/50 text-base-content"
                        rows={4}
                        value={formData.description || ''}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Équipements, atouts, informations complémentaires…"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-base-content/40">
                    Les champs marqués <span className="text-error">*</span> sont obligatoires.
                  </p>
                </div>
              )}

              {/* ════════════ STEP 1 — LOCALISATION ════════════ */}
              {currentStep === 1 && (
                <div className="space-y-5">

                  <Input
                    label="Adresse complète"
                    placeholder="Ex : 123 Rue de la Paix"
                    value={formData.adresse || ''}
                    onChange={e => handleChange('adresse', e.target.value)}
                    startIcon={<MapPin size={16} />}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Quartier"
                      placeholder="Ex : Akpakpa"
                      value={formData.quartier || ''}
                      onChange={e => handleChange('quartier', e.target.value)}
                    />
                    <Input
                      label="Ville"
                      placeholder="Ex : Cotonou"
                      value={formData.ville || ''}
                      onChange={e => handleChange('ville', e.target.value)}
                      onBlur={() => handleBlur('ville')}
                      required
                      error={getError('ville')}
                    />
                  </div>

                  <Select
                    label="Pays"
                    value={formData.pays || 'Bénin'}
                    onChange={e => handleChange('pays', e.target.value)}
                    options={COUNTRIES.map(c => ({ value: c, label: c }))}
                  />

                  {/* GPS optionnel */}
                  <div>
                    <div className="flex items-start gap-2.5 p-3.5 bg-base-200 rounded-xl mb-3">
                      <Info size={15} className="text-base-content/50 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-base-content/60 leading-snug">
                        Les coordonnées GPS sont <strong>facultatives</strong> et permettront
                        d'afficher le bien sur une carte.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Latitude"
                        type="number"
                        step="any"
                        placeholder="6.3702"
                        value={formData.latitude ?? ''}
                        onChange={e => handleChange('latitude',
                          e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                      <Input
                        label="Longitude"
                        type="number"
                        step="any"
                        placeholder="2.3912"
                        value={formData.longitude ?? ''}
                        onChange={e => handleChange('longitude',
                          e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════ STEP 2 — GESTION ════════════ */}
              {currentStep === 2 && (
                <div className="space-y-5">

                  {/* Propriétaire */}
                  {proprietaires.length === 0 ? (
                    <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-xl">
                      <Info size={16} className="text-error mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-error">Aucun propriétaire trouvé</p>
                        <p className="text-xs text-error/70 mt-0.5">
                          Vous devez d'abord créer un profil propriétaire.
                        </p>
                      </div>
                    </div>
                  ) : proprietaires.length === 1 ? (
                    <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-xl">
                      <div>
                        <p className="text-xs font-semibold text-success/80 uppercase tracking-wide">
                          Propriétaire assigné
                        </p>
                        <p className="font-bold text-base-content mt-0.5">
                          {ownerLabel(proprietaires[0])}
                        </p>
                      </div>
                      <Check size={18} className="text-success" />
                    </div>
                  ) : (
                    <Select
                      label="Propriétaire"
                      required
                      placeholder="Sélectionner un propriétaire…"
                      value={formData.owner_id ?? ''}
                      onChange={e => handleChange('owner_id',
                        e.target.value ? parseInt(e.target.value) : undefined)}
                      options={proprietaires.map(p => ({
                        value: p.id,
                        label: ownerLabel(p),
                      }))}
                      error={getError('owner_id')}
                    />
                  )}

                  {/* Gestionnaire — pré-rempli avec l'utilisateur connecté (cf. effet ci-dessus).
                      Le choix « Géré directement par le propriétaire » vient du placeholder de
                      Select, rendu comme <option value="">, et ne doit PAS être répété dans
                      `options` sous peine de doubler l'entrée dans la liste. */}
                  {gestionnaires.length > 0 && (
                    <Select
                      label="Gestionnaire"
                      placeholder="Géré directement par le propriétaire"
                      value={formData.gestionnaire_id ?? ''}
                      onChange={e => handleChange('gestionnaire_id',
                        e.target.value ? parseInt(e.target.value) : null)}
                      options={gestionnaires.map(g => ({ value: g.id, label: g.nom }))}
                      helperText="Modifiable — choisissez « Géré directement par le propriétaire » si personne ne gère le bien"
                    />
                  )}

                  {/* Rappel des données saisies */}
                  {(formData.nom || formData.ville) && (
                    <div className="p-4 bg-base-200 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">
                        Récapitulatif partiel
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] text-base-content/50">Nom</p>
                          <p className="font-medium truncate">{formData.nom || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Type</p>
                          <p className="font-medium">{formData.type}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Localisation</p>
                          <p className="font-medium truncate">
                            {[formData.quartier, formData.ville, formData.pays]
                              .filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-base-content/50">Lots</p>
                          <p className="font-medium">{formData.total_lots ?? '—'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[{ label: 'Identité', step: 0 }, { label: 'Localisation', step: 1 }].map(
                          ({ label, step }) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => goToStep(step)}
                              className="text-xs text-base-content/50 hover:text-primary flex items-center gap-1 transition-colors"
                            >
                              <ChevronRight size={11} /> Modifier {label}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════ STEP 3 — MÉDIAS ════════════ */}
              {currentStep === 3 && (
                <div className="space-y-6">

                  {/* Galerie photos */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-base-content flex items-center gap-2">
                        <FileImage size={15} /> Photos
                      </p>
                      <span className="text-xs text-base-content/40">
                        {photoPreviews.length} / 10 — cliquez
                        <Star size={10} className="inline mx-0.5 text-warning" fill="currentColor" />
                        pour définir la principale
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {photoPreviews.map((url, index) => {
                        const isMain = url === formData.photo || (!formData.photo && index === 0);
                        return (
                          <div
                            key={index}
                            className={[
                              'relative group rounded-xl overflow-hidden aspect-square border-2 transition-all',
                              isMain ? 'border-primary shadow-md' : 'border-transparent hover:border-base-300',
                            ].join(' ')}
                          >
                            <img
                              src={url}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Actions overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetMainPhoto(url)}
                                className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center hover:bg-primary/80 transition"
                                title="Définir comme principale"
                              >
                                <Star size={13} fill="currentColor" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePhotoRemove(index)}
                                className="w-7 h-7 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/80 transition"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isMain && (
                              <div className="absolute bottom-0 w-full bg-primary text-primary-content text-[9px] font-bold text-center py-0.5 uppercase tracking-wide">
                                Principale
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Zone d'ajout */}
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

                  {/* Compléments */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-base-content flex items-center gap-2">
                      <Video size={15} /> Compléments (optionnel)
                    </p>
                    <Input
                      label="URL Vidéo (YouTube / Vimeo)"
                      placeholder="https://…"
                      value={formData.video_url || ''}
                      onChange={e => handleChange('video_url', e.target.value)}
                      startIcon={<Video size={16} />}
                    />
                    <Input
                      label="URL Plan de masse"
                      placeholder="https://…"
                      value={formData.plan_masse_url || ''}
                      onChange={e => handleChange('plan_masse_url', e.target.value)}
                      startIcon={<FileImage size={16} />}
                    />
                  </div>

                  {/* Statut */}
                  <Select
                    label="État du bien"
                    value={formData.statut || 'actif'}
                    onChange={e => handleChange('statut', e.target.value)}
                    options={[
                      { value: 'actif',   label: 'Actif — Bien opérationnel' },
                      { value: 'inactif', label: 'Inactif — Temporairement désactivé' },
                    ]}
                  />
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
          {/* Passer (étapes optionnelles non-dernières) */}
          {currentStep === 3 && (
            <span className="text-xs text-base-content/40">
              Les médias sont facultatifs
            </span>
          )}

          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex items-center gap-2"
              title={!isStepValid() ? 'Complétez les champs requis' : undefined}
            >
              Suivant
              <ArrowRight size={16} />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {/* Bouton Enregistrer & Ajouter Lots (création uniquement) */}
              {!immeuble.id && onSaveAndAddLots && (
                <Button
                  variant="ghost"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="flex items-center gap-2 border border-primary text-primary hover:bg-primary/5"
                >
                  <Plus size={15} />
                  Enregistrer & Ajouter lots
                </Button>
              )}

              <Button
                variant="primary"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="flex items-center gap-2 min-w-[130px] justify-center"
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {immeuble.id ? 'Modifier' : 'Terminer'}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImmeubleForm;
