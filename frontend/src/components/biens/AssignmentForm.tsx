// frontend/src/components/biens/AssignmentForm.tsx
// Wizard 3 étapes : Client & Type → Finances → Confirmation
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, DollarSign, FileText, Check, ArrowRight, ArrowLeft,
  Home, AlertCircle, Info, ChevronRight, Building2,
} from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { getLocataires } from '../../api/locataireApi';
import type { Locataire } from '../../api/locataireApi';
import { locationApi } from '../../api/locationApi';
import type { Lot } from '../../api/bienApi';

interface AssignmentFormProps {
  lot: Lot;
  onSuccess: () => void;
  onCancel: () => void;
}

type ContractType = 'location' | 'vente' | 'reservation';

const STEPS = [
  { id: 'client',   label: 'Client & Type',  icon: User },
  { id: 'finances', label: 'Finances',        icon: DollarSign },
  { id: 'confirm',  label: 'Confirmation',    icon: Check },
];

const MODALITES = [
  { value: 'comptant',   label: 'Comptant' },
  { value: 'echelonne',  label: 'Échelonné' },
];

const slideVariants = (direction: number) => ({
  initial: { x: direction > 0 ? 40 : -40, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit:    { x: direction > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.2 } },
});

const AssignmentForm: React.FC<AssignmentFormProps> = ({ lot, onSuccess, onCancel }) => {
  const [step, setStep]           = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Locataires
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [loadingLocataires, setLoadingLocataires] = useState(true);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [type, setType] = useState<ContractType>('location');

  const [form, setForm] = useState({
    date_debut:              new Date().toISOString().split('T')[0],
    date_fin:                '',
    duree_contrat:           12,
    date_expiration:         '',

    loyer_mensuel:           lot.loyer    || 0,
    charges_mensuelles:      lot.charges  || 0,
    caution:                 lot.caution  || 0,
    avance:                  lot.avance   || 1,

    prix_vente:              lot.prix_vente || 0,
    apport_initial:          0,
    modalite_paiement:       lot.modalite_vente || 'comptant',
    duree_echelonnement:     (lot as any).duree_echelonnement || 12,

    conditions_particulieres: '',
    jour_echeance:            5,
    tolerance_jours:          5,
    penalite_retard:          0,
  });

  // Chargement locataires
  useEffect(() => {
    getLocataires()
      .then(setLocataires)
      .catch(() => {})
      .finally(() => setLoadingLocataires(false));
  }, []);

  // Auto-calc date_fin
  useEffect(() => {
    if (!form.date_debut || !form.duree_contrat) return;
    const start = new Date(form.date_debut);
    const end   = new Date(start);
    end.setMonth(end.getMonth() + form.duree_contrat);
    end.setDate(end.getDate() - 1);
    setForm(p => ({ ...p, date_fin: end.toISOString().split('T')[0] }));
  }, [form.date_debut, form.duree_contrat]);

  const set = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const locataireOptions = useMemo(() => locataires.map(l => ({
    value: l.id,
    label: `${l.prenoms ?? ''} ${l.nom ?? ''}`.trim(),
  })), [locataires]);

  const selectedClient = locataires.find(l => l.id === selectedClientId);

  // --- Validation ---
  const validateStep = (s: number): string | null => {
    if (s === 0 && !selectedClientId) return 'Sélectionnez un client';
    if (s === 1) {
      if (type === 'location' && form.loyer_mensuel <= 0) return 'Loyer requis';
      if (type === 'vente'    && form.prix_vente <= 0)    return 'Prix de vente requis';
      if (type === 'reservation' && !form.date_expiration) return 'Date d\'expiration requise';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setDirection(1);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setDirection(-1);
    setStep(s => s - 1);
  };

  const goToStep = (target: number) => {
    if (target < step) { setDirection(-1); setStep(target); }
  };

  const handleSubmit = async () => {
    if (!selectedClientId || !lot.owner_id) return;
    setError(null);
    setLoading(true);
    try {
      await locationApi.createLocation({
        tenant_id:   selectedClientId,
        lot_id:      lot.id,
        owner_id:    lot.owner_id,
        type_contrat: type,

        date_debut:   form.date_debut,
        date_fin:     form.date_fin    || undefined,
        duree_contrat: type === 'location' ? form.duree_contrat : undefined,

        loyer_mensuel:      type === 'location' ? form.loyer_mensuel : 0,
        charges_mensuelles: form.charges_mensuelles,
        caution:            form.caution,
        avance:             form.avance,
        jour_echeance:      form.jour_echeance,
        penalite_retard:    form.penalite_retard,
        tolerance_jours:    form.tolerance_jours,

        prix_vente:      type === 'vente'       ? form.prix_vente   : undefined,
        apport_initial:  form.apport_initial,
        modalite_paiement: form.modalite_paiement,
        date_expiration: type === 'reservation' ? form.date_expiration : undefined,
        conditions_particulieres: form.conditions_particulieres,

        devise:        'XOF',
        type_paiement: 'classique',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'affectation");
    } finally {
      setLoading(false);
    }
  };

  const typeColor: Record<ContractType, string> = {
    location:    'primary',
    vente:       'success',
    reservation: 'warning',
  };
  const typeBg: Record<ContractType, string> = {
    location:    'bg-primary/5 border-primary/20',
    vente:       'bg-success/5 border-success/20',
    reservation: 'bg-warning/5 border-warning/20',
  };

  // ==============================
  // Stepper
  // ==============================
  const StepBar = () => (
    <div className="px-6 pt-6 pb-0 bg-base-100 border-b border-base-200">
      <div className="h-1 bg-base-200 rounded-full mb-5 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
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
                current  ? 'border-primary text-primary'                 : '',
                done     ? 'border-success text-success cursor-pointer'  : '',
                !current && !done ? 'border-transparent text-base-content/40 cursor-default' : '',
              ].join(' ')}
            >
              <span className={[
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                current ? 'bg-primary text-primary-content'  : '',
                done    ? 'bg-success text-success-content'  : '',
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
  // Render
  // ==============================
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-base-100">
      {/* Lot info banner */}
      <div className="flex items-center gap-4 px-6 py-4 bg-base-200/60 border-b border-base-300">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Home size={18} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-base-content/50 tracking-wide">Lot à affecter</p>
          <p className="font-bold text-base-content truncate">
            {lot.reference} — {(lot as any).immeuble ?? lot.type}
          </p>
        </div>
        {lot.superficie && (
          <span className="ml-auto text-sm text-base-content/50 flex-shrink-0">{lot.superficie} m²</span>
        )}
      </div>

      <StepBar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-xl mx-auto p-6 pb-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants(direction)}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* ===== STEP 0 : CLIENT & TYPE ===== */}
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-base-content mb-0.5">Client & Type d'affectation</h2>
                    <p className="text-sm text-base-content/50">Qui occupe ce lot et selon quel contrat ?</p>
                  </div>

                  {/* Sélection client */}
                  <Select
                    label="Client (locataire / acheteur)"
                    required
                    searchable
                    clearable
                    placeholder={loadingLocataires ? 'Chargement…' : 'Rechercher un client…'}
                    searchPlaceholder="Nom, prénom…"
                    options={locataireOptions}
                    value={selectedClientId || ''}
                    onChange={e => setSelectedClientId(parseInt(e.target.value) || 0)}
                    disabled={loadingLocataires}
                    startIcon={<User size={16} />}
                  />

                  {/* Info client sélectionné */}
                  <AnimatePresence>
                    {selectedClient && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl text-sm">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                            {selectedClient.nom?.[0]?.toUpperCase()}{selectedClient.prenoms?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-base-content">{selectedClient.prenoms} {selectedClient.nom}</p>
                            {selectedClient.telephone_principal && (
                              <p className="text-xs text-base-content/50">{selectedClient.telephone_principal}</p>
                            )}
                          </div>
                          {selectedClient.type && (
                            <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {selectedClient.type}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Type d'affectation */}
                  <div>
                    <p className="text-sm font-semibold text-base-content/80 mb-3">Type d'affectation</p>
                    <div className="space-y-2">
                      {([
                        { value: 'location'   as ContractType, label: 'Location (Bail)',   icon: FileText,   desc: 'Contrat de location avec loyer mensuel' },
                        { value: 'vente'      as ContractType, label: 'Vente directe',     icon: DollarSign, desc: 'Transfert de propriété comptant ou échelonné' },
                        { value: 'reservation' as ContractType, label: 'Réservation',      icon: Calendar,   desc: 'Engagement temporaire avec date d\'expiration' },
                      ] as const).map(opt => {
                        const active = type === opt.value;
                        const Icon   = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setType(opt.value)}
                            className={[
                              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                              active ? `${typeBg[opt.value]} border-${typeColor[opt.value]}` : 'border-base-200 bg-base-100 hover:border-base-300',
                            ].join(' ')}
                          >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? `bg-${typeColor[opt.value]}/10` : 'bg-base-200'}`}>
                              <Icon size={17} className={active ? `text-${typeColor[opt.value]}` : 'text-base-content/40'} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`font-bold text-sm ${active ? `text-${typeColor[opt.value]}` : 'text-base-content/70'}`}>{opt.label}</p>
                              <p className="text-xs text-base-content/40 truncate">{opt.desc}</p>
                            </div>
                            {active && <Check size={16} className={`text-${typeColor[opt.value]} flex-shrink-0`} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 1 : FINANCES ===== */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-base-content mb-0.5">
                      {type === 'location'    ? 'Détails du bail'     : ''}
                      {type === 'vente'       ? 'Détails de la vente' : ''}
                      {type === 'reservation' ? 'Détails réservation' : ''}
                    </h2>
                    <p className="text-sm text-base-content/50">Conditions financières et dates</p>
                  </div>

                  {/* === LOCATION === */}
                  {type === 'location' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Date de début"
                          required
                          type="date"
                          value={form.date_debut}
                          onChange={e => set('date_debut', e.target.value)}
                          startIcon={<Calendar size={16} />}
                        />
                        <Input
                          label="Durée (mois)"
                          required
                          type="number"
                          min={1}
                          value={form.duree_contrat}
                          onChange={e => set('duree_contrat', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      {form.date_fin && (
                        <div className="flex items-center gap-2 p-3 bg-info/5 border border-info/20 rounded-xl text-sm">
                          <Info size={14} className="text-info flex-shrink-0" />
                          <span className="text-base-content/70">
                            Fin prévue : <strong>{new Date(form.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Loyer mensuel"
                          required
                          type="number"
                          min={0}
                          value={form.loyer_mensuel || ''}
                          onChange={e => set('loyer_mensuel', parseFloat(e.target.value) || 0)}
                          startIcon={<DollarSign size={16} />}
                          helperText="Hors charges"
                        />
                        <Input
                          label="Charges mensuelles"
                          type="number"
                          min={0}
                          value={form.charges_mensuelles || ''}
                          onChange={e => set('charges_mensuelles', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Caution (FCFA)"
                          type="number"
                          min={0}
                          value={form.caution || ''}
                          onChange={e => set('caution', parseFloat(e.target.value) || 0)}
                          helperText={form.loyer_mensuel > 0 ? `≈ ${((form.caution) / form.loyer_mensuel).toFixed(1)} mois` : undefined}
                        />
                        <Input
                          label="Avance (mois)"
                          type="number"
                          min={0}
                          value={form.avance || ''}
                          onChange={e => set('avance', parseInt(e.target.value) || 0)}
                          helperText={form.loyer_mensuel > 0 ? `= ${(form.avance * form.loyer_mensuel).toLocaleString('fr-FR')} FCFA` : undefined}
                        />
                      </div>
                      <Input
                        label="Jour d'échéance"
                        type="number"
                        min={1}
                        max={31}
                        value={form.jour_echeance}
                        onChange={e => set('jour_echeance', parseInt(e.target.value) || 5)}
                        helperText="Jour du mois où le paiement est attendu"
                      />
                    </div>
                  )}

                  {/* === VENTE === */}
                  {type === 'vente' && (
                    <div className="space-y-5">
                      <Input
                        label="Date de signature"
                        required
                        type="date"
                        value={form.date_debut}
                        onChange={e => set('date_debut', e.target.value)}
                        startIcon={<Calendar size={16} />}
                      />
                      <Input
                        label="Prix de vente (FCFA)"
                        required
                        type="number"
                        min={0}
                        value={form.prix_vente || ''}
                        onChange={e => set('prix_vente', parseFloat(e.target.value) || 0)}
                        startIcon={<DollarSign size={16} />}
                      />
                      <Select
                        label="Modalité de paiement"
                        options={MODALITES}
                        value={form.modalite_paiement}
                        onChange={e => set('modalite_paiement', e.target.value)}
                      />
                      <AnimatePresence>
                        {form.modalite_paiement === 'echelonne' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <Input
                                label="Apport initial (FCFA)"
                                type="number"
                                min={0}
                                value={form.apport_initial || ''}
                                onChange={e => set('apport_initial', parseFloat(e.target.value) || 0)}
                                helperText={form.prix_vente > 0 ? `${((form.apport_initial / form.prix_vente) * 100).toFixed(0)} % du prix` : undefined}
                              />
                              <Input
                                label="Durée échelonnement (mois)"
                                type="number"
                                min={1}
                                value={form.duree_echelonnement}
                                onChange={e => set('duree_echelonnement', parseInt(e.target.value) || 12)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* === RESERVATION === */}
                  {type === 'reservation' && (
                    <div className="space-y-5">
                      <Input
                        label="Date de réservation"
                        required
                        type="date"
                        value={form.date_debut}
                        onChange={e => set('date_debut', e.target.value)}
                        startIcon={<Calendar size={16} />}
                      />
                      <Input
                        label="Date d'expiration"
                        required
                        type="date"
                        value={form.date_expiration}
                        onChange={e => set('date_expiration', e.target.value)}
                        helperText="Date limite de validité de la réservation"
                        startIcon={<Calendar size={16} />}
                      />
                      <Input
                        label="Montant de réservation (FCFA)"
                        type="number"
                        min={0}
                        value={form.caution || ''}
                        onChange={e => set('caution', parseFloat(e.target.value) || 0)}
                        helperText="Acompte ou caution de réservation"
                        startIcon={<DollarSign size={16} />}
                      />
                    </div>
                  )}

                  {/* Conditions particulières */}
                  <div>
                    <label className="block text-sm font-semibold text-base-content/80 mb-1.5">
                      Conditions particulières
                      <span className="ml-1 text-xs font-normal text-base-content/40">(optionnel)</span>
                    </label>
                    <div className="rounded-xl border-2 border-base-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-base-100">
                      <textarea
                        rows={3}
                        value={form.conditions_particulieres}
                        onChange={e => set('conditions_particulieres', e.target.value)}
                        placeholder="Clauses spéciales, notes…"
                        className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm placeholder:text-base-content/40 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 2 : CONFIRMATION ===== */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-base-content mb-0.5">Confirmation</h2>
                    <p className="text-sm text-base-content/50">Vérifiez les détails avant de valider</p>
                  </div>

                  {/* Récapitulatif */}
                  <div className="p-5 bg-base-200/50 border border-base-300 rounded-2xl space-y-4">
                    <p className="text-sm font-bold text-base-content uppercase tracking-wide">Récapitulatif</p>

                    <div className="space-y-2 text-sm">
                      <RecapRow label="Lot"    value={`${lot.reference} — ${(lot as any).immeuble ?? lot.type}`} onEdit={() => {}} />
                      <RecapRow label="Client" value={selectedClient ? `${selectedClient.prenoms} ${selectedClient.nom}` : '—'} onEdit={() => goToStep(0)} />
                      <RecapRow
                        label="Type"
                        value={type === 'location' ? 'Location (bail)' : type === 'vente' ? 'Vente directe' : 'Réservation'}
                        onEdit={() => goToStep(0)}
                      />
                    </div>

                    <hr className="border-base-300" />

                    <div className="space-y-2 text-sm">
                      <RecapRow
                        label="Début"
                        value={new Date(form.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        onEdit={() => goToStep(1)}
                      />
                      {type === 'location' && (
                        <>
                          <RecapRow label="Durée"  value={`${form.duree_contrat} mois`} onEdit={() => goToStep(1)} />
                          {form.date_fin && (
                            <RecapRow
                              label="Fin prévue"
                              value={new Date(form.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              onEdit={() => goToStep(1)}
                            />
                          )}
                          <RecapRow label="Loyer" value={`${form.loyer_mensuel.toLocaleString('fr-FR')} FCFA/mois`} onEdit={() => goToStep(1)} />
                          {form.caution > 0 && <RecapRow label="Caution" value={`${form.caution.toLocaleString('fr-FR')} FCFA`} onEdit={() => goToStep(1)} />}
                          {form.avance > 0  && <RecapRow label="Avance"  value={`${form.avance} mois`}               onEdit={() => goToStep(1)} />}
                        </>
                      )}
                      {type === 'vente' && (
                        <>
                          <RecapRow label="Prix"      value={`${form.prix_vente.toLocaleString('fr-FR')} FCFA`}     onEdit={() => goToStep(1)} />
                          <RecapRow label="Modalité"  value={form.modalite_paiement === 'echelonne' ? 'Échelonné' : 'Comptant'} onEdit={() => goToStep(1)} />
                          {form.modalite_paiement === 'echelonne' && form.apport_initial > 0 && (
                            <RecapRow label="Apport" value={`${form.apport_initial.toLocaleString('fr-FR')} FCFA`} onEdit={() => goToStep(1)} />
                          )}
                        </>
                      )}
                      {type === 'reservation' && form.date_expiration && (
                        <RecapRow
                          label="Expire le"
                          value={new Date(form.date_expiration).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          onEdit={() => goToStep(1)}
                        />
                      )}
                    </div>

                    {form.conditions_particulieres && (
                      <>
                        <hr className="border-base-300" />
                        <div className="text-sm">
                          <p className="text-base-content/50 mb-1">Conditions particulières</p>
                          <p className="text-base-content/80 italic">{form.conditions_particulieres}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Avertissement si pas de propriétaire */}
                  {!lot.owner_id && (
                    <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-xl text-sm text-error">
                      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                      <span>Ce lot n'a pas de propriétaire associé. L'affectation échouera.</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Erreur inline */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-2 p-3 bg-error/10 border border-error/30 rounded-xl text-sm text-error"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-content text-sm font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all"
          >
            Suivant <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedClientId || !lot.owner_id}
            className={[
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
              'hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:shadow-none',
              type === 'vente'       ? 'bg-success text-success-content hover:bg-success/90 hover:shadow-success/25'   : '',
              type === 'reservation' ? 'bg-warning text-warning-content hover:bg-warning/90 hover:shadow-warning/25'   : '',
              type === 'location'    ? 'bg-primary text-primary-content hover:bg-primary/90 hover:shadow-primary/25'   : '',
            ].join(' ')}
          >
            {loading ? 'Traitement…' : <><Check size={16} /> Confirmer l'affectation</>}
          </button>
        )}
      </div>
    </div>
  );
};

// Ligne de récapitulatif
const RecapRow: React.FC<{ label: string; value: string; onEdit: () => void }> = ({ label, value, onEdit }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-base-content/50 shrink-0 w-24">{label}</span>
    <span className="font-medium text-base-content text-right flex-1">{value}</span>
    {onEdit && (
      <button type="button" onClick={onEdit} className="text-primary/50 hover:text-primary shrink-0 transition-colors" title="Modifier">
        <ChevronRight size={14} />
      </button>
    )}
  </div>
);

export default AssignmentForm;
