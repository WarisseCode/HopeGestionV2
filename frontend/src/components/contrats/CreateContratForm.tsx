import React from 'react';
import { Plus, Loader2, ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import type { CreateLocationData } from '../../api/locationApi';

type TypeContrat = 'location' | 'vente';

interface Lot {
  id: number;
  reference: string;
  immeuble: string;
  statut: string;
  owner_id?: number;
}

interface LocataireItem {
  id: number;
  nom: string;
  prenoms: string;
}

type FormState = CreateLocationData & { owner_id: number };

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  locataires: LocataireItem[];
  lots: Lot[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}

const CreateContratForm: React.FC<Props> = ({ form, setForm, locataires, lots, onSubmit, onCancel, isPending }) => (
  <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
    <div className="flex items-center gap-4">
      <button type="button" onClick={onCancel} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Retour aux contrats</span>
      </button>
      <div className="h-5 w-px bg-base-300" />
      <h1 className="text-xl font-bold text-base-content/90">Nouveau contrat</h1>
    </div>
    <Card className="p-6">
      <form id="create-contrat-form" onSubmit={onSubmit} className="space-y-5">
        <div className="flex gap-3">
          {(['location', 'vente'] as TypeContrat[]).map(type => (
            <button key={type} type="button"
              onClick={() => setForm(f => ({ ...f, type_contrat: type }))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all capitalize ${
                form.type_contrat === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-base-300 text-base-content/50 hover:border-base-400'
              }`}
            >
              {type === 'location' ? 'Bail de location' : 'Contrat de vente'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="form-tenant" className="text-sm font-semibold text-base-content/70">
              {form.type_contrat === 'vente' ? 'Acheteur' : 'Locataire'} <span className="text-error">*</span>
            </label>
            <select id="form-tenant" required className="select select-bordered w-full"
              value={form.tenant_id || ''}
              onChange={e => setForm(f => ({ ...f, tenant_id: Number(e.target.value) }))}
            >
              <option value="">Sélectionner…</option>
              {locataires.map(l => <option key={l.id} value={l.id}>{l.nom} {l.prenoms}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="form-lot" className="text-sm font-semibold text-base-content/70">
              Bien (lot) <span className="text-error">*</span>
            </label>
            <select id="form-lot" required className="select select-bordered w-full"
              value={form.lot_id || ''}
              onChange={e => {
                const lotId = Number(e.target.value);
                const lot = lots.find(l => l.id === lotId);
                setForm(f => ({ ...f, lot_id: lotId, owner_id: lot?.owner_id ?? f.owner_id }));
              }}
            >
              <option value="">Sélectionner…</option>
              {lots.length === 0 && <option disabled>Aucun lot trouvé</option>}
              {lots.map(l => {
                const dispo = ['libre', 'disponible'].includes(l.statut?.toLowerCase());
                return (
                  <option key={l.id} value={l.id} disabled={!dispo}>
                    {l.reference} — {l.immeuble}{!dispo ? ` (${l.statut})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <Input label="Date de début" required type="date" value={form.date_debut}
            onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
          <Input label="Date de fin" type="date" value={form.date_fin as string}
            onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} />
          <Input label="Durée (mois)" type="number" min={1} value={form.duree_contrat ?? ''}
            onChange={e => setForm(f => ({ ...f, duree_contrat: Number(e.target.value) }))} />

          <div className="flex flex-col gap-1">
            <label htmlFor="form-devise" className="text-sm font-semibold text-base-content/70">Devise</label>
            <select id="form-devise" className="select select-bordered w-full" value={form.devise}
              onChange={e => setForm(f => ({ ...f, devise: e.target.value }))}>
              <option value="XOF">XOF (FCFA)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          {form.type_contrat === 'location' && (
            <Input label="Loyer mensuel" required type="number" min={0} value={form.loyer_mensuel || ''}
              onChange={e => setForm(f => ({ ...f, loyer_mensuel: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{form.devise}</span>} />
          )}
          {form.type_contrat === 'vente' && (
            <Input label="Prix de vente" required type="number" min={0} value={form.prix_vente || ''}
              onChange={e => setForm(f => ({ ...f, prix_vente: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{form.devise}</span>} />
          )}

          <Input label="Caution" type="number" min={0} value={form.caution || ''}
            onChange={e => setForm(f => ({ ...f, caution: Number(e.target.value) }))}
            endIcon={<span className="text-xs text-base-content/40">{form.devise}</span>} />
          <Input label="Avance" type="number" min={0} value={form.avance || ''}
            onChange={e => setForm(f => ({ ...f, avance: Number(e.target.value) }))}
            endIcon={<span className="text-xs text-base-content/40">{form.devise}</span>} />

          {form.type_contrat === 'location' && (
            <Input label="Charges mensuelles" type="number" min={0} value={form.charges_mensuelles || ''}
              onChange={e => setForm(f => ({ ...f, charges_mensuelles: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{form.devise}</span>} />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" type="button" onClick={onCancel}>Annuler</Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending
              ? <Loader2 size={16} className="animate-spin mr-2" />
              : <Plus size={16} className="mr-2" />
            }
            Créer le contrat
          </Button>
        </div>
      </form>
    </Card>
  </div>
);

export default CreateContratForm;
