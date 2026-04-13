// frontend/src/components/locataires/LocataireForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, FileText, Wallet, ShieldCheck,
  Mail, MapPin, Calendar, CreditCard,
  ArrowLeft, ArrowRight, Save, Check,
  Info, Banknote, Smartphone, HandCoins,
  Building2, ChevronRight
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import PhoneInput from '../ui/PhoneInput';
import type { Locataire } from '../../api/locataireApi';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Proprietaire {
  id: number;
  nom: string;
  prenom?: string;
}

interface LocataireFormProps {
  locataire?: Partial<Locataire>;
  onSave: (data: Partial<Locataire>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  proprietaires?: Proprietaire[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'hopegestion_locataire_draft';

const STEPS = [
  {
    id: 0,
    title: 'Identité',
    subtitle: 'Informations personnelles et contact',
    icon: User,
    required: true,
  },
  {
    id: 1,
    title: 'Documents',
    subtitle: "Pièce d'identité",
    icon: FileText,
    required: false,
  },
  {
    id: 2,
    title: 'Finances',
    subtitle: 'Conditions financières',
    icon: Wallet,
    required: false,
  },
  {
    id: 3,
    title: 'Confirmation',
    subtitle: 'Vérification avant enregistrement',
    icon: ShieldCheck,
    required: false,
  },
];

const NATIONALITIES = [
  'Béninoise', 'Togolaise', 'Nigériane', 'Ivoirienne', 'Sénégalaise',
  'Malienne', 'Burkinabè', 'Ghanéenne', 'Camerounaise', 'Congolaise',
  'Gabonaise', 'Tchadienne', 'Nigérienne', 'Française', 'Autre',
];

const PAYMENT_MODES = [
  { value: 'Mobile Money', label: 'Mobile Money', description: 'MTN, Moov, Wave', icon: Smartphone },
  { value: 'Espèces',      label: 'Espèces',      description: 'Paiement cash',    icon: HandCoins },
  { value: 'Virement',     label: 'Virement',     description: 'Transfert bancaire', icon: Building2 },
  { value: 'Chèque',       label: 'Chèque',       description: 'Chèque bancaire',   icon: CreditCard },
];

const ID_TYPES = [
  { value: 'CNI',      label: "Carte Nationale d'Identité (CNI)" },
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Permis',   label: 'Permis de conduire' },
  { value: 'CIP',      label: "Carte d'Identité Professionnelle" },
];

const PROFILE_TYPES = ['Locataire', 'Acheteur', 'Prospect'] as const;

// ─── Validation ────────────────────────────────────────────────────────────────

const REQUIRED_STEP0 = ['nom', 'prenoms', 'telephone_principal'] as const;

const validateField = (field: string, value: any): string => {
  switch (field) {
    case 'nom':
      return !value?.trim() ? 'Le nom de famille est requis' : '';
    case 'prenoms':
      return !value?.trim() ? 'Les prénoms sont requis' : '';
    case 'telephone_principal':
      return !value ? 'Le téléphone principal (WhatsApp) est requis' : '';
    case 'email':
      if (!value?.trim()) return '';
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Adresse email invalide' : '';
    default:
      return '';
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────

const LocataireForm: React.FC<LocataireFormProps> = ({
  locataire,
  onSave,
  onCancel,
  loading = false,
  proprietaires = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection]     = useState(0);
  const [touched, setTouched]         = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftSaved, setDraftSaved]   = useState(false);
  const didPopulateRef = useRef(false);

  // ── Initial form state ────────────────────────────────────────────────────

  const buildDefaults = useCallback(() => ({
    type: 'Locataire' as const,
    nom: '',
    prenoms: '',
    telephone_principal: '',
    telephone_secondaire: '',
    email: '',
    nationalite: 'Béninoise',
    owner_id: locataire?.owner_id ?? (proprietaires.length === 1 ? proprietaires[0].id : undefined),
    adresse_actuelle: '',
    type_piece: 'CNI',
    numero_piece: '',
    date_expiration_piece: '',
    photo_piece_url: '',
    photo_profil_url: '',
    mode_paiement_preferentiel: 'Mobile Money',
    caution: 0,
    avance: 0,
    paiement_echelonne: false,
    statut: 'Actif' as const,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [formData, setFormData] = useState<ReturnType<typeof buildDefaults>>(() => {
    if (!locataire?.id) {
      const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (draft) {
        try { return JSON.parse(draft); } catch {}
      }
    }
    return buildDefaults();
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  // Set single owner on load
  useEffect(() => {
    if (proprietaires.length === 1 && !formData.owner_id) {
      setFormData(prev => ({ ...prev, owner_id: proprietaires[0].id }));
    }
  }, [proprietaires]); // eslint-disable-line react-hooks/exhaustive-deps

  // Populate form when editing
  useEffect(() => {
    if (locataire?.id && !didPopulateRef.current) {
      didPopulateRef.current = true;
      setFormData(prev => ({
        ...prev,
        ...(locataire as any),
        date_expiration_piece: locataire.date_expiration_piece
          ? new Date(locataire.date_expiration_piece).toISOString().split('T')[0]
          : '',
      }));
    }
  }, [locataire?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft (creation only)
  useEffect(() => {
    if (!locataire?.id) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [formData, locataire?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback((field: string, value: any) => {
    let formatted = value;
    if (field === 'nom' && typeof value === 'string') {
      formatted = value.toUpperCase();
    } else if (field === 'prenoms' && typeof value === 'string') {
      formatted = value.replace(/\b\w/g, c => c.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [field]: formatted }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field]);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, [formData]);

  const getError = (field: string): string =>
    touched[field] ? fieldErrors[field] || '' : '';

  // ── Step navigation ───────────────────────────────────────────────────────

  const isStep0Valid = (): boolean => {
    const basicValid = !!formData.nom?.trim()
      && !!formData.prenoms?.trim()
      && !!formData.telephone_principal;
    const ownerValid = proprietaires.length <= 1 || !!formData.owner_id;
    return basicValid && ownerValid;
  };

  const isStepValid = (step = currentStep): boolean =>
    step === 0 ? isStep0Valid() : true;

  const handleNext = () => {
    if (currentStep === 0) {
      // Touch & validate all required fields
      const newErrors: Record<string, string> = {};
      const newTouched: Record<string, boolean> = {};
      REQUIRED_STEP0.forEach(f => {
        const err = validateField(f, (formData as any)[f]);
        if (err) newErrors[f] = err;
        newTouched[f] = true;
      });
      if (proprietaires.length > 1 && !formData.owner_id) {
        newTouched['owner_id'] = true;
      }
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      setTouched(prev => ({ ...prev, ...newTouched }));
      if (Object.keys(newErrors).length > 0 || (proprietaires.length > 1 && !formData.owner_id)) {
        return;
      }
    }
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

  const handleSubmit = async () => {
    await onSave(formData as any);
    if (!locataire?.id) localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Enter key on inputs → go next (except textarea)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Enter'
      && e.target instanceof HTMLInputElement
      && currentStep < STEPS.length - 1
    ) {
      e.preventDefault();
      handleNext();
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const selectedOwner = proprietaires.find(p => p.id === formData.owner_id);
  const isLastStep = currentStep === STEPS.length - 1;
  const isOptionalStep = currentStep > 0 && !isLastStep;

  // ── Variants ──────────────────────────────────────────────────────────────

  const slide = {
    enter:  (d: number) => ({ x: d > 0 ? 56 : -56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d < 0 ? 56 : -56, opacity: 0 }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden"
      onKeyDown={handleKeyDown}
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-base-content leading-snug">
              {locataire?.id ? 'Modifier le locataire' : 'Nouveau locataire'}
            </h2>
            <p className="text-sm text-base-content/50 mt-0.5">
              {STEPS[currentStep].subtitle}
            </p>
          </div>

          {/* Draft indicator */}
          <AnimatePresence>
            {!locataire?.id && draftSaved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-shrink-0 text-xs text-success flex items-center gap-1 pt-1"
              >
                <Check size={12} /> Brouillon sauvegardé
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
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
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1.5 px-6 pb-4"
        role="tablist"
        aria-label="Étapes du formulaire"
      >
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
              aria-selected={current ? "true" : "false"}
              aria-label={`${step.title}${!step.required ? ' (facultatif)' : ''}${completed ? ' — complété' : ''}`}
              onClick={() => goToStep(step.id)}
              disabled={!reachable}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-all',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                current   ? 'bg-primary text-primary-content shadow-sm' : '',
                completed ? 'bg-success/10 text-success cursor-pointer hover:bg-success/20' : '',
                !current && !completed ? 'text-base-content/35' : '',
                !reachable ? 'cursor-default' : '',
                reachable && !current ? 'cursor-pointer' : '',
              ].join(' ')}
            >
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center',
                current   ? 'bg-white/20' : '',
                completed ? 'bg-success text-white' : '',
              ].join(' ')}>
                {completed ? <Check size={14} /> : <StepIcon size={15} />}
              </div>
              <span className="hidden sm:block leading-none">{step.title}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-base-200" />

      {/* ── Form content ────────────────────────────────────────────────── */}
      <div className="p-6 min-h-[440px]">
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

            {/* ════════════════ STEP 0 — IDENTITÉ ════════════════ */}
            {currentStep === 0 && (
              <div className="space-y-5">

                {/* Proprietaire card-selector */}
                {proprietaires.length > 1 && (
                  <div>
                    <p className="text-sm font-semibold text-base-content mb-2">
                      Attribuer à un propriétaire
                      <span className="text-error ml-0.5">*</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {proprietaires.map(p => {
                        const selected = formData.owner_id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleChange('owner_id', p.id)}
                            aria-pressed={selected ? "true" : "false"}
                            className={[
                              'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                              selected
                                ? 'border-primary bg-primary/5'
                                : 'border-base-300 hover:border-primary/50',
                            ].join(' ')}
                          >
                            <div className={[
                              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                              'text-sm font-bold uppercase',
                              selected ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/50',
                            ].join(' ')}>
                              {p.nom.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${selected ? 'text-primary' : 'text-base-content'}`}>
                                {p.nom}
                              </p>
                              {p.prenom && (
                                <p className="text-xs text-base-content/50 truncate">{p.prenom}</p>
                              )}
                            </div>
                            {selected && (
                              <Check size={16} className="flex-shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {touched['owner_id'] && !formData.owner_id && (
                      <p role="alert" className="text-xs text-error mt-1.5 flex items-center gap-1">
                        Veuillez sélectionner un propriétaire
                      </p>
                    )}
                  </div>
                )}

                {/* Type de profil */}
                <div>
                  <p className="text-sm font-semibold text-base-content mb-2">Type de profil</p>
                  <div className="flex gap-2">
                    {PROFILE_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleChange('type', type)}
                        aria-pressed={formData.type === type ? "true" : "false"}
                        className={[
                          'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium text-center transition-all',
                          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                          formData.type === type
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-base-300 hover:border-primary/40 text-base-content/60',
                        ].join(' ')}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo + Nom/Prénoms */}
                <div className="flex gap-4 items-start">
                  {/* Avatar upload */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-4 border-base-200 shadow bg-base-200">
                      <ImageUpload
                        value={formData.photo_profil_url}
                        onChange={url => handleChange('photo_profil_url', url)}
                        folder="avatar"
                        label=""
                        clearOnSuccess={false}
                        className="w-full h-full [&_div]:border-none [&_div]:rounded-none [&_div]:h-full [&_div]:bg-transparent"
                      />
                    </div>
                    <span className="text-[10px] text-base-content/40 text-center leading-tight">
                      Photo<br />profil
                    </span>
                  </div>

                  {/* Nom + Prénoms */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <Input
                      label="Nom de famille"
                      placeholder="Ex : AGOSSOU"
                      value={formData.nom}
                      onChange={e => handleChange('nom', e.target.value)}
                      onBlur={() => handleBlur('nom')}
                      required
                      startIcon={<User size={16} />}
                      error={getError('nom')}
                      helperText="Sera affiché en majuscules"
                    />
                    <Input
                      label="Prénoms"
                      placeholder="Ex : Jean-Baptiste"
                      value={formData.prenoms}
                      onChange={e => handleChange('prenoms', e.target.value)}
                      onBlur={() => handleBlur('prenoms')}
                      required
                      startIcon={<User size={16} />}
                      error={getError('prenoms')}
                    />
                  </div>
                </div>

                {/* Téléphones */}
                <div className="space-y-3">
                  <PhoneInput
                    label="Téléphone principal (WhatsApp) *"
                    value={formData.telephone_principal}
                    onChange={full => handleChange('telephone_principal', full)}
                    required
                  />
                  {getError('telephone_principal') && (
                    <p role="alert" className="text-xs text-error -mt-2">
                      {getError('telephone_principal')}
                    </p>
                  )}
                  <PhoneInput
                    label="Téléphone secondaire"
                    value={formData.telephone_secondaire || ''}
                    onChange={full => handleChange('telephone_secondaire', full)}
                  />
                </div>

                {/* Email + Adresse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email"
                    placeholder="exemple@email.com"
                    type="email"
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    startIcon={<Mail size={16} />}
                    error={getError('email')}
                  />
                  <Input
                    label="Adresse actuelle"
                    placeholder="Quartier, Ville"
                    value={formData.adresse_actuelle || ''}
                    onChange={e => handleChange('adresse_actuelle', e.target.value)}
                    startIcon={<MapPin size={16} />}
                  />
                </div>

                {/* Nationalité */}
                <Select
                  label="Nationalité"
                  value={formData.nationalite}
                  onChange={e => handleChange('nationalite', e.target.value)}
                  options={NATIONALITIES.map(n => ({ value: n, label: n }))}
                />

                <p className="text-xs text-base-content/40">
                  Les champs marqués <span className="text-error">*</span> sont obligatoires.
                </p>
              </div>
            )}

            {/* ════════════════ STEP 1 — DOCUMENTS ════════════════ */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-start gap-2.5 p-3.5 bg-base-200 rounded-xl">
                  <Info size={16} className="text-base-content/50 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-base-content/60 leading-snug">
                    Ces informations sont <strong>facultatives</strong> mais recommandées
                    pour la vérification d'identité du locataire.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Type de pièce d'identité"
                    value={formData.type_piece || 'CNI'}
                    onChange={e => handleChange('type_piece', e.target.value)}
                    options={ID_TYPES}
                  />
                  <Input
                    label="Numéro de la pièce"
                    placeholder="Ex : 1234567890"
                    value={formData.numero_piece || ''}
                    onChange={e => handleChange('numero_piece', e.target.value)}
                    startIcon={<CreditCard size={16} />}
                  />
                </div>

                <Input
                  label="Date d'expiration"
                  type="date"
                  value={formData.date_expiration_piece || ''}
                  onChange={e => handleChange('date_expiration_piece', e.target.value)}
                  startIcon={<Calendar size={16} />}
                />

                {/* Scan de la pièce */}
                <div>
                  <p className="text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                    <FileText size={15} />
                    Scan / Photo de la pièce
                  </p>
                  <div className="border-2 border-dashed border-base-300 rounded-xl p-4 bg-base-50 hover:border-primary/40 transition-colors">
                    <ImageUpload
                      value={formData.photo_piece_url}
                      onChange={url => handleChange('photo_piece_url', url)}
                      folder="document"
                      label=""
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STEP 2 — FINANCES ════════════════ */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-start gap-2.5 p-3.5 bg-base-200 rounded-xl">
                  <Info size={16} className="text-base-content/50 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-base-content/60 leading-snug">
                    Ces informations sont visibles par le locataire dans son portail
                    en <strong>lecture seule</strong>.
                  </p>
                </div>

                {/* Mode de paiement — card grid */}
                <div>
                  <p className="text-sm font-semibold text-base-content mb-2">
                    Mode de paiement préféré
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(mode => {
                      const ModeIcon = mode.icon;
                      const selected = formData.mode_paiement_preferentiel === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => handleChange('mode_paiement_preferentiel', mode.value)}
                          aria-pressed={selected ? "true" : "false"}
                          className={[
                            'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-base-300 hover:border-primary/40',
                          ].join(' ')}
                        >
                          <ModeIcon
                            size={18}
                            className={selected ? 'text-primary' : 'text-base-content/40'}
                          />
                          <div>
                            <p className={`text-sm font-medium leading-none ${selected ? 'text-primary' : 'text-base-content'}`}>
                              {mode.label}
                            </p>
                            <p className="text-xs text-base-content/50 mt-0.5">{mode.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Caution + Avance */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Caution (FCFA)"
                    type="number"
                    value={formData.caution || 0}
                    onChange={e => handleChange('caution', parseFloat(e.target.value) || 0)}
                    startIcon={<Banknote size={16} />}
                    helperText="Dépôt de garantie"
                  />
                  <Input
                    label="Avance (FCFA)"
                    type="number"
                    value={formData.avance || 0}
                    onChange={e => handleChange('avance', parseFloat(e.target.value) || 0)}
                    startIcon={<Banknote size={16} />}
                    helperText="Mois payés en avance"
                  />
                </div>

                {/* Paiement échelonné — toggle card */}
                <div
                  role="checkbox"
                  aria-checked={formData.paiement_echelonne ? "true" : "false"}
                  tabIndex={0}
                  onClick={() => handleChange('paiement_echelonne', !formData.paiement_echelonne)}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleChange('paiement_echelonne', !formData.paiement_echelonne);
                    }
                  }}
                  className={[
                    'flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                    formData.paiement_echelonne
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/40',
                  ].join(' ')}
                >
                  <div>
                    <p className="text-sm font-semibold text-base-content">
                      Paiement échelonné autorisé
                    </p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      Le locataire peut régler en plusieurs fois
                    </p>
                  </div>
                  {/* Toggle visuel */}
                  <div className={[
                    'w-11 h-6 rounded-full flex items-center px-0.5 transition-all flex-shrink-0 ml-4',
                    formData.paiement_echelonne ? 'bg-primary justify-end' : 'bg-base-300 justify-start',
                  ].join(' ')}>
                    <motion.div
                      layout
                      className="w-5 h-5 rounded-full bg-white shadow"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STEP 3 — CONFIRMATION ════════════════ */}
            {currentStep === 3 && (
              <div className="space-y-5">

                {/* Summary card */}
                <div className="bg-base-200 rounded-xl overflow-hidden">
                  {/* Identity header */}
                  <div className="flex items-center gap-4 p-4 border-b border-base-300">
                    {formData.photo_profil_url ? (
                      <img
                        src={formData.photo_profil_url}
                        alt="Photo de profil"
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
                        {formData.nom?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-base font-bold text-base-content leading-snug">
                        {formData.nom || '—'} {formData.prenoms || ''}
                      </p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        {formData.type}
                        {' · '}{formData.nationalite}
                        {selectedOwner && ` · ${selectedOwner.nom}`}
                      </p>
                    </div>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-0 divide-x divide-base-300">
                    {[
                      { label: 'Téléphone', value: formData.telephone_principal || '—' },
                      { label: 'Email',     value: formData.email || '—' },
                      { label: 'Adresse',   value: formData.adresse_actuelle || '—' },
                      { label: 'Paiement',  value: formData.mode_paiement_preferentiel },
                    ].map((item, i) => (
                      <div
                        key={item.label}
                        className={`px-4 py-3 ${i >= 2 ? 'border-t border-base-300' : ''}`}
                      >
                        <p className="text-[11px] text-base-content/50 uppercase tracking-wide">
                          {item.label}
                        </p>
                        <p className="text-sm font-medium text-base-content mt-0.5 truncate">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Finances row (only if set) */}
                  {(formData.caution > 0 || formData.avance > 0) && (
                    <div className="px-4 py-3 border-t border-base-300 flex items-center gap-1.5 text-sm">
                      <Banknote size={14} className="text-base-content/40" />
                      <span className="text-base-content/60">Finances :</span>
                      {formData.caution > 0 && (
                        <span className="font-medium">
                          Caution {formData.caution.toLocaleString()} FCFA
                        </span>
                      )}
                      {formData.caution > 0 && formData.avance > 0 && <span>·</span>}
                      {formData.avance > 0 && (
                        <span className="font-medium">
                          Avance {formData.avance.toLocaleString()} FCFA
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Retourner corriger un champ */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Identité',   step: 0 },
                    { label: 'Documents',  step: 1 },
                    { label: 'Finances',   step: 2 },
                  ].map(({ label, step }) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => goToStep(step)}
                      className="text-xs text-base-content/50 hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight size={12} />
                      Modifier {label}
                    </button>
                  ))}
                </div>

                {/* Statut */}
                <Select
                  label="Statut du profil"
                  value={formData.statut || 'Actif'}
                  onChange={e => handleChange('statut', e.target.value as any)}
                  options={[
                    { value: 'Actif',    label: 'Actif — Profil opérationnel' },
                    { value: 'Inactif',  label: 'Inactif — Temporairement désactivé' },
                    { value: 'Expiré',   label: 'Expiré — Contrat terminé' },
                    { value: 'Archivé',  label: 'Archivé — Hors système' },
                  ]}
                />

                {/* Portail info */}
                <div className="flex items-start gap-3 p-3.5 bg-purple-50 border border-purple-100 rounded-xl">
                  <ShieldCheck size={17} className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700 leading-snug">
                    L'accès au portail locataire sera configuré après l'enregistrement du profil.
                  </p>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-base-200 bg-base-50">

        {/* Gauche : Annuler / Précédent */}
        <Button
          variant="ghost"
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {currentStep === 0 ? 'Annuler' : 'Précédent'}
        </Button>

        {/* Droite : Passer + Suivant/Enregistrer */}
        <div className="flex items-center gap-3">
          {isOptionalStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-base-content/40 hover:text-base-content/70 transition-colors focus-visible:outline-none focus-visible:underline"
            >
              Passer cette étape
            </button>
          )}

          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={currentStep === 0 && !isStepValid()}
              className="flex items-center gap-2"
              title={currentStep === 0 && !isStepValid() ? 'Complétez les champs requis' : undefined}
            >
              Suivant
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 min-w-[140px] justify-center"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save size={16} />
                  {locataire?.id ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocataireForm;
