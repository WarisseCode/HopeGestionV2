// frontend/src/components/proprietaires/ProprietaireForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, FileText, Settings, Check,
  ArrowRight, ArrowLeft, Save,
  Mail, MapPin, Banknote, Calendar,
  Building2, Hash, Info, ChevronRight,
  MessageCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import PhoneInput from '../ui/PhoneInput';
import AvatarUpload from '../ui/AvatarUpload';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Owner {
  id?: number;
  type: 'individual' | 'company';
  name: string;
  prenom?: string;
  phone: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
  country?: string;
  company_name?: string;
  rccm_number?: string;
  mobile_money?: string;
  management_mode: 'direct' | 'delegated';
  delegation_start_date?: string;
  delegation_end_date?: string;
  photo_url?: string;
}

interface ProprietaireFormProps {
  owner?: Partial<Owner>;
  onSave: (owner: Partial<Owner>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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
    subtitle: 'Contrats et pièces légales',
    icon: FileText,
    required: false,
  },
  {
    id: 2,
    title: 'Paramètres',
    subtitle: 'Mode de gestion et confirmation',
    icon: Settings,
    required: false,
  },
];

const COUNTRIES = [
  'Bénin', 'Togo', 'Côte d\'Ivoire', 'Sénégal', 'Mali',
  'Burkina Faso', 'Niger', 'Ghana', 'Nigéria', 'Cameroun',
  'Gabon', 'Congo', 'France', 'Autre',
];

// ─── Validation ────────────────────────────────────────────────────────────────

const validateField = (field: string, value: any, type: 'individual' | 'company'): string => {
  switch (field) {
    case 'name':
      return type === 'individual' && !value?.trim() ? 'Le nom est requis' : '';
    case 'company_name':
      return type === 'company' && !value?.trim() ? 'La raison sociale est requise' : '';
    case 'phone':
      return !value ? 'Le téléphone principal est requis' : '';
    case 'email':
      if (!value?.trim()) return '';
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Email invalide' : '';
    default:
      return '';
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────

const ProprietaireForm: React.FC<ProprietaireFormProps> = ({
  owner,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection]     = useState(0);
  const [touched, setTouched]         = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const buildDefaults = (): Partial<Owner> => ({
    type: 'individual',
    management_mode: 'direct',
    name: '',
    prenom: '',
    phone: '',
    secondary_phone: '',
    email: '',
    address: '',
    country: 'Bénin',
    company_name: '',
    rccm_number: '',
    mobile_money: '',
    delegation_start_date: '',
    delegation_end_date: '',
    photo_url: '',
  });

  const [formData, setFormData] = useState<Partial<Owner>>(() => ({
    ...buildDefaults(),
    ...owner,
    delegation_start_date: owner?.delegation_start_date
      ? owner.delegation_start_date.split('T')[0] : '',
    delegation_end_date: owner?.delegation_end_date
      ? owner.delegation_end_date.split('T')[0] : '',
  }));

  useEffect(() => {
    if (owner) {
      setFormData({
        ...buildDefaults(),
        ...owner,
        delegation_start_date: owner.delegation_start_date
          ? owner.delegation_start_date.split('T')[0] : '',
        delegation_end_date: owner.delegation_end_date
          ? owner.delegation_end_date.split('T')[0] : '',
      });
    }
  }, [owner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = useCallback(<K extends keyof Owner>(field: K, value: Owner[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field], formData.type!);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  }, [formData]);

  const getError = (field: string): string =>
    touched[field] ? fieldErrors[field] || '' : '';

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  // ── Step navigation ───────────────────────────────────────────────────────

  const getRequiredFields = () =>
    formData.type === 'individual' ? ['name', 'phone'] : ['company_name', 'phone'];

  const isStep0Valid = (): boolean => {
    if (formData.type === 'individual') return !!formData.name?.trim() && !!formData.phone;
    return !!formData.company_name?.trim() && !!formData.phone;
  };

  const isStepValid = (step = currentStep): boolean =>
    step === 0 ? isStep0Valid() : true;

  const handleNext = () => {
    if (currentStep === 0) {
      const newErrors: Record<string, string> = {};
      const newTouched: Record<string, boolean> = {};
      getRequiredFields().forEach(f => {
        const err = validateField(f, (formData as any)[f], formData.type!);
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
    await onSave(formData);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const progress     = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep   = currentStep === STEPS.length - 1;
  const isOptional   = currentStep > 0 && !isLastStep;
  const displayName  = formData.type === 'individual'
    ? `${formData.name || '—'} ${formData.prenom || ''}`.trim()
    : formData.company_name || '—';

  const slide = {
    enter:  (d: number) => ({ x: d > 0 ? 56 : -56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d < 0 ? 56 : -56, opacity: 0 }),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-base-content leading-snug">
              {owner?.id ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
            </h2>
            <p className="text-sm text-base-content/50 mt-0.5">
              {STEPS[currentStep].subtitle}
            </p>
          </div>
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
              aria-current={current ? "true" : undefined}
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
      <div className="p-6 min-h-[420px]">
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

                {/* Type de propriétaire */}
                <div>
                  <p className="text-sm font-semibold text-base-content mb-2">
                    Type de propriétaire
                  </p>
                  <div className="flex gap-2">
                    {([
                      { value: 'individual', label: 'Particulier', icon: User },
                      { value: 'company',    label: 'Entreprise',  icon: Building2 },
                    ] as const).map(opt => {
                      const Icon = opt.icon;
                      const selected = formData.type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('type', opt.value)}
                          aria-current={selected ? "true" : undefined}
                          className={[
                            'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2',
                            'text-sm font-medium transition-all',
                            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                            selected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-base-300 hover:border-primary/40 text-base-content/60',
                          ].join(' ')}
                        >
                          <Icon size={15} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Photo centrée */}
                <div className="flex justify-center pt-1 pb-1">
                  <AvatarUpload
                    value={formData.photo_url}
                    onChange={url => handleChange('photo_url', url)}
                  />
                </div>

                {/* Identité selon type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formData.type === 'individual' ? (
                    <>
                      <Input
                        label="Nom"
                        placeholder="Ex : KOFFI"
                        value={formData.name || ''}
                        onChange={e => handleChange('name', e.target.value.toUpperCase())}
                        onBlur={() => handleBlur('name')}
                        required
                        startIcon={<User size={16} />}
                        error={getError('name')}
                        helperText="Affiché en majuscules"
                      />
                      <Input
                        label="Prénom"
                        placeholder="Ex : Adjoua"
                        value={formData.prenom || ''}
                        onChange={e => handleChange('prenom', e.target.value)}
                        startIcon={<User size={16} />}
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        label="Raison sociale"
                        placeholder="Ex : IMMO SA"
                        value={formData.company_name || ''}
                        onChange={e => handleChange('company_name', e.target.value)}
                        onBlur={() => handleBlur('company_name')}
                        required
                        startIcon={<Building2 size={16} />}
                        error={getError('company_name')}
                      />
                      <Input
                        label="Numéro RCCM"
                        placeholder="Ex : RB/COT/2020/A/1234"
                        value={formData.rccm_number || ''}
                        onChange={e => handleChange('rccm_number', e.target.value)}
                        startIcon={<Hash size={16} />}
                      />
                    </>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  {/* Téléphone principal */}
                  <div>
                    <PhoneInput
                      label="Téléphone principal *"
                      value={formData.phone || ''}
                      onChange={full => handleChange('phone', full)}
                      required
                    />
                    {formData.phone && (
                      <button
                        type="button"
                        onClick={() => openWhatsApp(formData.phone!)}
                        className="mt-1 text-xs text-success flex items-center gap-1 hover:underline"
                      >
                        <MessageCircle size={12} /> Ouvrir sur WhatsApp
                      </button>
                    )}
                    {getError('phone') && (
                      <p role="alert" className="text-xs text-error mt-1">{getError('phone')}</p>
                    )}
                  </div>

                  {/* Téléphone secondaire */}
                  <div>
                    <PhoneInput
                      label="Téléphone secondaire"
                      value={formData.secondary_phone || ''}
                      onChange={full => handleChange('secondary_phone', full)}
                    />
                    {formData.secondary_phone && (
                      <button
                        type="button"
                        onClick={() => openWhatsApp(formData.secondary_phone!)}
                        className="mt-1 text-xs text-success flex items-center gap-1 hover:underline"
                      >
                        <MessageCircle size={12} /> Ouvrir sur WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {/* Email + Mobile Money */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
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
                  </div>
                  <Input
                    label="Mobile Money"
                    placeholder="+229 01 XX XX XX"
                    value={formData.mobile_money || ''}
                    onChange={e => handleChange('mobile_money', e.target.value)}
                    startIcon={<Banknote size={16} />}
                    helperText="Numéro de réception des paiements"
                  />
                </div>

                {/* Adresse + Pays */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Adresse"
                    placeholder="Quartier, Ville"
                    value={formData.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    startIcon={<MapPin size={16} />}
                  />
                  <Select
                    label="Pays"
                    value={formData.country || 'Bénin'}
                    onChange={e => handleChange('country', e.target.value)}
                    options={COUNTRIES.map(c => ({ value: c, label: c }))}
                  />
                </div>

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
                    Ajoutez ici les contrats de mandat, pièces d'identité et autres
                    documents légaux du propriétaire.
                  </p>
                </div>

                <div className="h-52 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-base-300 rounded-xl bg-base-50 text-base-content/40">
                  <FileText size={40} className="opacity-40" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Documents légaux</p>
                    <p className="text-xs mt-1">Fonctionnalité à venir</p>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STEP 2 — PARAMÈTRES ════════════════ */}
            {currentStep === 2 && (
              <div className="space-y-5">

                {/* Mode de gestion */}
                <div>
                  <p className="text-sm font-semibold text-base-content mb-2">
                    Mode de gestion
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      {
                        value: 'direct' as const,
                        label: 'Gestion directe',
                        description: 'Le propriétaire gère lui-même ses biens sur la plateforme.',
                        color: 'success',
                      },
                      {
                        value: 'delegated' as const,
                        label: 'Gestion déléguée',
                        description: 'La gestion est confiée à l\'agence via un mandat.',
                        color: 'warning',
                      },
                    ]).map(opt => {
                      const selected = formData.management_mode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleChange('management_mode', opt.value)}
                          aria-current={selected ? "true" : undefined}
                          className={[
                            'flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all',
                            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                            selected
                              ? `border-${opt.color} bg-${opt.color}/5`
                              : 'border-base-300 hover:border-base-400',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between w-full">
                            <p className={`text-sm font-semibold ${selected ? `text-${opt.color}` : 'text-base-content'}`}>
                              {opt.label}
                            </p>
                            {selected && (
                              <Check size={15} className={`text-${opt.color}`} />
                            )}
                          </div>
                          <p className="text-xs text-base-content/50 leading-snug">
                            {opt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates de mandat (si délégué) */}
                <AnimatePresence>
                  {formData.management_mode === 'delegated' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                        <Input
                          label="Début du mandat"
                          type="date"
                          value={formData.delegation_start_date || ''}
                          onChange={e => handleChange('delegation_start_date', e.target.value)}
                          startIcon={<Calendar size={16} />}
                        />
                        <Input
                          label="Fin du mandat (optionnel)"
                          type="date"
                          value={formData.delegation_end_date || ''}
                          onChange={e => handleChange('delegation_end_date', e.target.value)}
                          startIcon={<Calendar size={16} />}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Récapitulatif */}
                <div className="bg-base-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 p-4 border-b border-base-300">
                    {formData.photo_url ? (
                      <img
                        src={formData.photo_url}
                        alt="Photo"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {(formData.type === 'individual' ? formData.name : formData.company_name)?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-base-content truncate">{displayName}</p>
                      <p className="text-xs text-base-content/50 mt-0.5">
                        {formData.type === 'individual' ? 'Particulier' : 'Entreprise'}
                        {' · '}{formData.country}
                        {' · '}{formData.management_mode === 'direct' ? 'Gestion directe' : 'Gestion déléguée'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0 divide-x divide-base-300">
                    {[
                      { label: 'Téléphone', value: formData.phone || '—' },
                      { label: 'Email',     value: formData.email || '—' },
                      { label: 'Adresse',   value: formData.address || '—' },
                      { label: 'Mobile Money', value: formData.mobile_money || '—' },
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
                </div>

                {/* Liens retour */}
                <div className="flex flex-wrap gap-2">
                  {[{ label: 'Identité', step: 0 }, { label: 'Documents', step: 1 }].map(({ label, step }) => (
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
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-base-200 bg-base-50">

        <Button
          variant="ghost"
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {currentStep === 0 ? 'Annuler' : 'Précédent'}
        </Button>

        <div className="flex items-center gap-3">
          {isOptional && (
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
              className="flex items-center gap-2 min-w-[150px] justify-center"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save size={16} />
                  {owner?.id ? 'Mettre à jour' : 'Créer le propriétaire'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProprietaireForm;
