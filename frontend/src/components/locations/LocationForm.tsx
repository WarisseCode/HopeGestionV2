// frontend/src/components/locations/LocationForm.tsx
// Wizard 3 étapes : Parties & Bien → Finances → Paiement & Confirmation
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Home, DollarSign, CreditCard, Check, ArrowRight, ArrowLeft,
  Calendar, Building2, Info, AlertCircle, ChevronRight
} from 'lucide-react';
import type { CreateLocationData } from '../../api/locationApi';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface LocationFormProps {
  onSubmit: (data: CreateLocationData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateLocationData>;
  locataires: any[];
  lots: any[];
  owners: any[];
  loading?: boolean;
}

const STEPS = [
  { id: 'parties',  label: 'Parties & Bien', icon: Users },
  { id: 'finances', label: 'Finances',        icon: DollarSign },
  { id: 'payment',  label: 'Paiement',        icon: CreditCard },
];

const DEVISES = [
  { value: 'XOF', label: 'XOF — FCFA' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar' },
  { value: 'GNF', label: 'GNF — Franc guinéen' },
  { value: 'MAD', label: 'MAD — Dirham' },
];

const FREQUENCES = [
  { value: 'mensuel',      label: 'Mensuel' },
  { value: 'bimensuel',    label: 'Bimensuel (2×/mois)' },
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'trimestriel',  label: 'Trimestriel' },
];

const TYPE_CHARGES = [
  { value: 'forfaitaire', label: 'Forfaitaire' },
  { value: 'provision',   label: 'Provision sur charges' },
  { value: 'reelle',      label: 'Remboursement au réel' },
];

const slideVariants = (direction: number) => ({
  initial: { x: direction > 0 ? 40 : -40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit:    { x: direction > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
});

const LocationForm: React.FC<LocationFormProps> = ({
  onSubmit, onCancel, initialData, locataires, lots, owners, loading = false,
}) => {
  const isEditing = !!initialData?.tenant_id;

  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState(1);
  const [touched, setTouched]     = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<CreateLocationData>(() => ({
    tenant_id:           initialData?.tenant_id           ?? 0,
    lot_id:              initialData?.lot_id              ?? 0,
    owner_id:            initialData?.owner_id            ?? 0,
    date_debut:          initialData?.date_debut
                           ? new Date(initialData.date_debut).toISOString().split('T')[0]
                           : new Date().toISOString().split('T')[0],
    date_fin:            initialData?.date_fin
                           ? new Date(initialData.date_fin).toISOString().split('T')[0]
                           : '',
    duree_contrat:       initialData?.duree_contrat       ?? 12,
    loyer_mensuel:       initialData?.loyer_mensuel       ?? 0,
    caution:             initialData?.caution             ?? 0,
    avance:              initialData?.avance              ?? 0,
    charges_mensuelles:  initialData?.charges_mensuelles  ?? 0,
    type_charges:        initialData?.type_charges        ?? 'forfaitaire',
    devise:              initialData?.devise              ?? 'XOF',
    type_paiement:       initialData?.type_paiement       ?? 'classique',
    frequence_paiement:  initialData?.frequence_paiement  ?? 'mensuel',
    nombre_echeances:    initialData?.nombre_echeances    ?? 12,
    jour_echeance:       initialData?.jour_echeance       ?? 5,
    penalite_retard:     initialData?.penalite_retard     ?? 0,
    tolerance_jours:     initialData?.tolerance_jours     ?? 3,
    conditions_particulieres: initialData?.conditions_particulieres ?? '',
  }));

  // --- Options pour les selects ---
  const locataireOptions = useMemo(() => locataires.map(l => ({
    value: l.id,
    label: `${l.prenoms ?? ''} ${l.nom ?? ''}`.trim() || `Locataire #${l.id}`,
  })), [locataires]);

  const lotOptions = useMemo(() => lots.map(l => {
    // Le backend retourne ref_lot sous l'alias "reference" (bienRoutes.ts l.ref_lot as reference)
    const ref = l.reference
      || (l.type ? `${l.type}${l.etage ? ` · Ét.${l.etage}` : ''}` : `Lot #${l.id}`);
    return {
      value: l.id,
      label: `${ref} — ${l.immeuble ?? ''} (${l.statut ?? ''})`,
      disabled: l.statut !== 'libre' && l.id !== initialData?.lot_id,
    };
  }), [lots, initialData?.lot_id]);

  const ownerOptions = useMemo(() => owners.map(o => ({
    value: o.id,
    label: o.nom ?? o.name ?? `Propriétaire #${o.id}`,
  })), [owners]);

  // --- Auto-sélection propriétaire unique ---
  useEffect(() => {
    if (!form.owner_id && owners.length === 1) {
      setForm(p => ({ ...p, owner_id: owners[0].id }));
    }
  }, [owners]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-fill depuis le lot sélectionné ---
  useEffect(() => {
    if (!form.lot_id) return;
    const lot = lots.find(l => l.id === form.lot_id);
    if (!lot) return;
    setForm(p => ({
      ...p,
      owner_id:           lot.owner_id            || p.owner_id,
      loyer_mensuel:      lot.loyer_mensuel ?? lot.loyer ?? p.loyer_mensuel,
      charges_mensuelles: lot.charges_mensuelles ?? lot.charges ?? p.charges_mensuelles,
    }));
  }, [form.lot_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-calc date_fin ---
  useEffect(() => {
    if (!form.date_debut || !form.duree_contrat) return;
    const start = new Date(form.date_debut);
    const end   = new Date(start);
    end.setMonth(end.getMonth() + form.duree_contrat);
    end.setDate(end.getDate() - 1);
    setForm(p => ({ ...p, date_fin: end.toISOString().split('T')[0] }));
  }, [form.date_debut, form.duree_contrat]);

  // --- Preview échéancier ---
  const previewSchedule = useMemo(() => {
    if (form.type_paiement !== 'echelonne' || !form.loyer_mensuel) return [];
    const count  = Math.min(form.nombre_echeances ?? 3, 5);
    const result = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(form.date_debut);
      if (form.frequence_paiement === 'hebdomadaire') d.setDate(d.getDate() + i * 7);
      else if (form.frequence_paiement === 'bimensuel') d.setDate(d.getDate() + i * 14);
      else if (form.frequence_paiement === 'trimestriel') d.setMonth(d.getMonth() + i * 3);
      else d.setMonth(d.getMonth() + i);
      result.push({ num: i + 1, date: d.toLocaleDateString('fr-FR'), montant: form.loyer_mensuel });
    }
    return result;
  }, [form.type_paiement, form.frequence_paiement, form.nombre_echeances, form.date_debut, form.loyer_mensuel]);

  // --- Helpers ---
  const set = (field: keyof CreateLocationData, value: any) =>
    setForm(p => ({ ...p, [field]: value }));

  const touch = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const getErr = (field: string) => touched[field] ? fieldErrors[field] : undefined;

  const selectedLocataire = locataires.find(l => l.id === form.tenant_id);
  const selectedLot       = lots.find(l => l.id === form.lot_id);
  const selectedOwner     = owners.find(o => o.id === form.owner_id);
  const selectedDevise    = DEVISES.find(d => d.value === form.devise);

  // --- Validation par step ---
  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.tenant_id) errs.tenant_id = 'Sélectionnez un locataire';
      if (!form.lot_id)    errs.lot_id    = 'Sélectionnez un lot';
      if (!form.owner_id)  errs.owner_id  = 'Propriétaire requis';
      if (!form.date_debut) errs.date_debut = 'Date de début requise';
      if (!form.duree_contrat || form.duree_contrat < 1) errs.duree_contrat = 'Durée invalide';
    }
    if (s === 1) {
      if (!form.loyer_mensuel || form.loyer_mensuel <= 0) errs.loyer_mensuel = 'Loyer requis';
    }
    return errs;
  };

  const isStepValid = (s: number) => Object.keys(validateStep(s)).length === 0;

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const allTouched: Record<string, boolean> = {};
      Object.keys(errs).forEach(k => (allTouched[k] = true));
      setTouched(p => ({ ...p, ...allTouched }));
      return;
    }
    setDirection(1);
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const goToStep = (target: number) => {
    if (target < step) {
      setDirection(-1);
      setStep(target);
    }
  };

  // Total initial à débourser
  const totalInitial = (form.caution ?? 0) + (form.avance ?? 0) + (form.loyer_mensuel ?? 0);

  // ==============================
  // Barre stepper
  // ==============================
  const StepBar = () => (
    <div className="px-6 pt-6 pb-0 bg-base-100 border-b border-base-200">
      {/* Barre de progression */}
      <div className="h-1 bg-base-200 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex">
        {STEPS.map((s, idx) => {
          const done    = idx < step;
          const current = idx === step;
          const Icon    = s.icon;
          return (
            <button
              key={s.id}
              role="tab"
              type="button"
              aria-current={current ? 'true' : undefined}
              onClick={() => goToStep(idx)}
              disabled={idx > step}
              className={[
                'flex-1 flex flex-col items-center gap-1.5 pb-3 border-b-2 transition-all text-xs font-semibold',
                current  ? 'border-primary text-primary'          : '',
                done     ? 'border-success text-success cursor-pointer' : '',
                !current && !done ? 'border-transparent text-base-content/40 cursor-default' : '',
              ].join(' ')}
            >
              <span className={[
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                current ? 'bg-primary text-primary-content'   : '',
                done    ? 'bg-success text-success-content'   : '',
                !current && !done ? 'bg-base-200 text-base-content/40' : '',
              ].join(' ')}>
                {done ? <Check size={15} /> : <Icon size={15} />}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ==============================
  // Contenu
  // ==============================
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-base-100">
      <StepBar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <form onSubmit={handleSubmit} noValidate>
          <div className="max-w-2xl mx-auto p-6 pb-8">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants(direction)}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* ===== STEP 0 : PARTIES & BIEN ===== */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-base-content mb-0.5">Parties & Bien</h2>
                      <p className="text-sm text-base-content/50">Associez un locataire à un lot disponible</p>
                    </div>

                    {/* Locataire */}
                    <Select
                      label="Locataire"
                      required
                      searchable
                      clearable
                      placeholder="Rechercher un locataire…"
                      searchPlaceholder="Nom, prénom…"
                      options={locataireOptions}
                      value={form.tenant_id || ''}
                      onChange={e => {
                        set('tenant_id', parseInt(e.target.value) || 0);
                        touch('tenant_id');
                      }}
                      error={getErr('tenant_id')}
                      disabled={isEditing}
                      startIcon={<Users size={16} />}
                    />

                    {/* Info locataire sélectionné */}
                    <AnimatePresence>
                      {selectedLocataire && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl text-sm">
                            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                              <Check size={14} className="text-success" />
                            </div>
                            <div>
                              <p className="font-semibold text-base-content">
                                {selectedLocataire.prenoms} {selectedLocataire.nom}
                              </p>
                              {selectedLocataire.telephone && (
                                <p className="text-base-content/50 text-xs">{selectedLocataire.telephone}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Lot */}
                    <Select
                      label="Lot à louer"
                      required
                      searchable
                      clearable
                      placeholder="Rechercher un lot disponible…"
                      searchPlaceholder="Référence, immeuble…"
                      options={lotOptions}
                      value={form.lot_id || ''}
                      onChange={e => {
                        set('lot_id', parseInt(e.target.value) || 0);
                        touch('lot_id');
                      }}
                      error={getErr('lot_id')}
                      disabled={isEditing}
                      startIcon={<Home size={16} />}
                    />

                    {/* Info lot sélectionné */}
                    <AnimatePresence>
                      {selectedLot && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <p className="text-xs font-bold uppercase text-primary/70 tracking-wide mb-2">
                              Lot sélectionné
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              <span className="text-base-content/60">Référence</span>
                              <span className="font-medium">{selectedLot.ref_lot}</span>
                              <span className="text-base-content/60">Immeuble</span>
                              <span className="font-medium">{selectedLot.immeuble ?? '—'}</span>
                              {selectedLot.type_lot && (
                                <>
                                  <span className="text-base-content/60">Type</span>
                                  <span className="font-medium capitalize">{selectedLot.type_lot}</span>
                                </>
                              )}
                              {(selectedLot.loyer_mensuel ?? selectedLot.loyer) > 0 && (
                                <>
                                  <span className="text-base-content/60">Loyer suggéré</span>
                                  <span className="font-semibold text-primary">
                                    {(selectedLot.loyer_mensuel ?? selectedLot.loyer).toLocaleString('fr-FR')} {form.devise}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Propriétaire */}
                    {owners.length > 1 ? (
                      <div>
                        <Select
                          label="Propriétaire concerné"
                          required
                          searchable
                          placeholder="Sélectionner le propriétaire…"
                          options={ownerOptions}
                          value={form.owner_id || ''}
                          onChange={e => {
                            set('owner_id', parseInt(e.target.value) || 0);
                            touch('owner_id');
                          }}
                          error={getErr('owner_id')}
                          disabled={isEditing || (!!form.lot_id && !!selectedLot?.owner_id)}
                          startIcon={<Building2 size={16} />}
                        />
                        {!!form.lot_id && !!selectedLot?.owner_id && (
                          <p className="text-xs text-base-content/50 mt-1 ml-1">
                            Défini automatiquement par le lot sélectionné
                          </p>
                        )}
                      </div>
                    ) : owners.length === 1 ? (
                      <div className="flex items-center gap-3 p-4 bg-base-200/60 rounded-xl border border-base-300">
                        <Building2 size={18} className="text-primary/60 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase text-base-content/50 tracking-wide">Propriétaire</p>
                          <p className="font-semibold text-base-content">{owners[0].nom ?? owners[0].name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
                        <AlertCircle size={18} />
                        Aucun propriétaire configuré
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Date de début"
                        required
                        type="date"
                        value={form.date_debut}
                        onChange={e => { set('date_debut', e.target.value); touch('date_debut'); }}
                        onBlur={() => touch('date_debut')}
                        error={getErr('date_debut')}
                        startIcon={<Calendar size={16} />}
                      />
                      <Input
                        label="Durée (mois)"
                        required
                        type="number"
                        min={1}
                        max={120}
                        value={form.duree_contrat ?? ''}
                        onChange={e => { set('duree_contrat', parseInt(e.target.value) || 1); touch('duree_contrat'); }}
                        onBlur={() => touch('duree_contrat')}
                        error={getErr('duree_contrat')}
                        helperText="Calcule la date de fin automatiquement"
                      />
                    </div>

                    {/* Date de fin calculée */}
                    {form.date_fin && (
                      <div className="flex items-center gap-2 p-3 bg-info/5 border border-info/20 rounded-xl text-sm">
                        <Info size={15} className="text-info flex-shrink-0" />
                        <span className="text-base-content/70">
                          Fin du bail : <strong className="text-base-content">
                            {new Date(form.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== STEP 1 : FINANCES ===== */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-base-content mb-0.5">Finances</h2>
                      <p className="text-sm text-base-content/50">Montants du loyer, charges et garanties</p>
                    </div>

                    {/* Devise */}
                    <Select
                      label="Devise"
                      options={DEVISES}
                      value={form.devise}
                      onChange={e => set('devise', e.target.value)}
                    />

                    {/* Loyer */}
                    <Input
                      label="Loyer mensuel"
                      required
                      type="number"
                      min={0}
                      value={form.loyer_mensuel || ''}
                      onChange={e => { set('loyer_mensuel', parseFloat(e.target.value) || 0); touch('loyer_mensuel'); }}
                      onBlur={() => touch('loyer_mensuel')}
                      error={getErr('loyer_mensuel')}
                      startIcon={<DollarSign size={16} />}
                      helperText={`Montant hors charges — ${selectedDevise?.label ?? form.devise}`}
                    />

                    {/* Charges */}
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Type de charges"
                        options={TYPE_CHARGES}
                        value={form.type_charges ?? 'forfaitaire'}
                        onChange={e => set('type_charges', e.target.value)}
                      />
                      <Input
                        label="Charges mensuelles"
                        type="number"
                        min={0}
                        value={form.charges_mensuelles || ''}
                        onChange={e => set('charges_mensuelles', parseFloat(e.target.value) || 0)}
                        helperText={form.type_charges === 'reelle' ? 'Estimation' : undefined}
                      />
                    </div>

                    {/* Caution & Avance */}
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Caution"
                        type="number"
                        min={0}
                        value={form.caution || ''}
                        onChange={e => set('caution', parseFloat(e.target.value) || 0)}
                        helperText={form.loyer_mensuel > 0
                          ? `= ${((form.caution ?? 0) / form.loyer_mensuel).toFixed(1)} mois`
                          : 'Dépôt de garantie'}
                      />
                      <Input
                        label="Avance sur loyer"
                        type="number"
                        min={0}
                        value={form.avance || ''}
                        onChange={e => set('avance', parseFloat(e.target.value) || 0)}
                        helperText={form.loyer_mensuel > 0
                          ? `= ${((form.avance ?? 0) / form.loyer_mensuel).toFixed(1)} mois`
                          : "Mois payés à l'avance"}
                      />
                    </div>

                    {/* Total initial */}
                    {totalInitial > 0 && (
                      <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                        <p className="text-xs font-bold uppercase text-warning/80 tracking-wide mb-3">
                          Total à débourser à l'entrée
                        </p>
                        <div className="space-y-1.5 text-sm">
                          {(form.caution ?? 0) > 0 && (
                            <div className="flex justify-between text-base-content/70">
                              <span>Caution</span>
                              <span>{(form.caution ?? 0).toLocaleString('fr-FR')} {form.devise}</span>
                            </div>
                          )}
                          {(form.avance ?? 0) > 0 && (
                            <div className="flex justify-between text-base-content/70">
                              <span>Avance loyer</span>
                              <span>{(form.avance ?? 0).toLocaleString('fr-FR')} {form.devise}</span>
                            </div>
                          )}
                          {form.loyer_mensuel > 0 && (
                            <div className="flex justify-between text-base-content/70">
                              <span>1er loyer</span>
                              <span>{form.loyer_mensuel.toLocaleString('fr-FR')} {form.devise}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-warning/20 flex justify-between font-bold text-base-content">
                            <span>Total</span>
                            <span className="text-warning">{totalInitial.toLocaleString('fr-FR')} {form.devise}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== STEP 2 : PAIEMENT & CONFIRMATION ===== */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-base-content mb-0.5">Paiement & Confirmation</h2>
                      <p className="text-sm text-base-content/50">Mode de paiement et validation du bail</p>
                    </div>

                    {/* Type paiement */}
                    <div>
                      <p className="text-sm font-semibold text-base-content/80 mb-2">Mode de paiement</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'classique',  label: 'Mensuel classique', desc: 'Un versement par mois' },
                          { value: 'echelonne',  label: 'Échelonné',         desc: 'Plusieurs versements périodiques' },
                        ].map(opt => {
                          const active = form.type_paiement === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => set('type_paiement', opt.value)}
                              className={[
                                'p-4 rounded-xl border-2 text-left transition-all',
                                active
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-base-300 bg-base-100 hover:border-base-400 text-base-content/70',
                              ].join(' ')}
                            >
                              <p className="font-bold text-sm mb-0.5">{opt.label}</p>
                              <p className={`text-xs ${active ? 'text-primary/70' : 'text-base-content/40'}`}>{opt.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Options paiement échelonné */}
                    <AnimatePresence>
                      {form.type_paiement === 'echelonne' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <Select
                              label="Fréquence"
                              options={FREQUENCES}
                              value={form.frequence_paiement ?? 'mensuel'}
                              onChange={e => set('frequence_paiement', e.target.value)}
                            />
                            <Input
                              label="Nombre d'échéances"
                              type="number"
                              min={1}
                              value={form.nombre_echeances ?? ''}
                              onChange={e => set('nombre_echeances', parseInt(e.target.value) || 1)}
                            />
                          </div>

                          {/* Preview échéancier */}
                          {previewSchedule.length > 0 && (
                            <div className="bg-base-200/60 rounded-xl p-4 border border-base-300">
                              <p className="text-xs font-bold uppercase text-base-content/50 tracking-wide mb-3">
                                Aperçu échéancier (simulation)
                              </p>
                              <div className="space-y-2">
                                {previewSchedule.map(item => (
                                  <div key={item.num} className="flex justify-between text-sm py-1.5 border-b border-base-300 last:border-0">
                                    <span className="text-base-content/60">Échéance #{item.num} · {item.date}</span>
                                    <span className="font-semibold">{item.montant.toLocaleString('fr-FR')} {form.devise}</span>
                                  </div>
                                ))}
                                {(form.nombre_echeances ?? 0) > 5 && (
                                  <p className="text-xs text-base-content/40 text-center pt-1">
                                    + {(form.nombre_echeances ?? 0) - 5} autres échéances…
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Jour d'échéance */}
                    <Input
                      label="Jour d'échéance"
                      type="number"
                      min={1}
                      max={31}
                      value={form.jour_echeance ?? ''}
                      onChange={e => set('jour_echeance', parseInt(e.target.value) || 5)}
                      helperText="Jour du mois où le paiement est dû (1–31)"
                    />

                    {/* Conditions particulières */}
                    <div>
                      <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                        Conditions particulières
                        <span className="ml-1 text-xs font-normal text-base-content/40">(optionnel)</span>
                      </label>
                      <div className="rounded-xl border-2 border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 bg-base-100">
                        <textarea
                          rows={3}
                          value={form.conditions_particulieres ?? ''}
                          onChange={e => set('conditions_particulieres', e.target.value)}
                          placeholder="Clauses spéciales, obligations particulières…"
                          className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm placeholder:text-base-content/40 resize-none"
                        />
                      </div>
                    </div>

                    {/* ---- Récapitulatif ---- */}
                    <div className="mt-2 p-5 bg-base-200/50 border border-base-300 rounded-2xl space-y-4">
                      <p className="text-sm font-bold text-base-content uppercase tracking-wide">Récapitulatif du bail</p>

                      {/* Parties */}
                      <div className="space-y-2 text-sm">
                        <RecapRow
                          label="Locataire"
                          value={selectedLocataire ? `${selectedLocataire.prenoms} ${selectedLocataire.nom}` : '—'}
                          onEdit={() => goToStep(0)}
                        />
                        <RecapRow
                          label="Lot"
                          value={selectedLot ? `${selectedLot.ref_lot} — ${selectedLot.immeuble ?? ''}` : '—'}
                          onEdit={() => goToStep(0)}
                        />
                        <RecapRow
                          label="Propriétaire"
                          value={selectedOwner?.nom ?? selectedOwner?.name ?? '—'}
                          onEdit={() => goToStep(0)}
                        />
                        <RecapRow
                          label="Période"
                          value={`${new Date(form.date_debut).toLocaleDateString('fr-FR')} → ${form.date_fin ? new Date(form.date_fin).toLocaleDateString('fr-FR') : '?'} (${form.duree_contrat} mois)`}
                          onEdit={() => goToStep(0)}
                        />
                      </div>

                      <hr className="border-base-300" />

                      <div className="space-y-2 text-sm">
                        <RecapRow
                          label="Loyer"
                          value={`${(form.loyer_mensuel ?? 0).toLocaleString('fr-FR')} ${form.devise}/mois`}
                          onEdit={() => goToStep(1)}
                        />
                        {(form.charges_mensuelles ?? 0) > 0 && (
                          <RecapRow
                            label="Charges"
                            value={`${(form.charges_mensuelles ?? 0).toLocaleString('fr-FR')} ${form.devise}/mois`}
                            onEdit={() => goToStep(1)}
                          />
                        )}
                        {(form.caution ?? 0) > 0 && (
                          <RecapRow
                            label="Caution"
                            value={`${(form.caution ?? 0).toLocaleString('fr-FR')} ${form.devise}`}
                            onEdit={() => goToStep(1)}
                          />
                        )}
                        {(form.avance ?? 0) > 0 && (
                          <RecapRow
                            label="Avance"
                            value={`${(form.avance ?? 0).toLocaleString('fr-FR')} ${form.devise}`}
                            onEdit={() => goToStep(1)}
                          />
                        )}
                      </div>

                      <hr className="border-base-300" />

                      <div className="space-y-2 text-sm">
                        <RecapRow
                          label="Paiement"
                          value={form.type_paiement === 'echelonne'
                            ? `Échelonné — ${form.nombre_echeances} × ${FREQUENCES.find(f => f.value === form.frequence_paiement)?.label ?? form.frequence_paiement}`
                            : 'Mensuel classique'}
                          onEdit={() => {}}
                        />
                        <RecapRow
                          label="Jour d'échéance"
                          value={`${form.jour_echeance} du mois`}
                          onEdit={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 bg-base-100 border-t border-base-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={step === 0 ? onCancel : handleBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-base-content/60 hover:bg-base-200 hover:text-base-content transition-all"
        >
          {step === 0 ? 'Annuler' : <><ArrowLeft size={16} /> Retour</>}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid(step)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-content text-sm font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
          >
            Suivant <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-success-content text-sm font-bold hover:bg-success/90 hover:shadow-lg hover:shadow-success/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading
              ? 'Enregistrement…'
              : <>{isEditing ? 'Enregistrer' : 'Confirmer le bail'} <Check size={16} /></>}
          </button>
        )}
      </div>
    </div>
  );
};

// Ligne de récapitulatif avec lien retour
const RecapRow: React.FC<{ label: string; value: string; onEdit: () => void }> = ({ label, value, onEdit }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-base-content/50 shrink-0 w-28">{label}</span>
    <span className="font-medium text-base-content text-right flex-1">{value}</span>
    {onEdit && (
      <button
        type="button"
        onClick={onEdit}
        className="text-primary/60 hover:text-primary shrink-0 transition-colors"
        title="Modifier"
      >
        <ChevronRight size={14} />
      </button>
    )}
  </div>
);

export default LocationForm;
