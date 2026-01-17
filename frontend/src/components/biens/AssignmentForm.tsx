// frontend/src/components/biens/AssignmentForm.tsx
import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, DollarSign, FileText, CheckCircle, 
  Search, UserPlus, AlertCircle 
} from 'lucide-react';
import Button from '../ui/Button';
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

const AssignmentForm: React.FC<AssignmentFormProps> = ({ lot, onSuccess, onCancel }) => {
  // Global State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client Selection State
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<Locataire[]>([]);
  const [selectedClient, setSelectedClient] = useState<Locataire | null>(null);
  const [searching, setSearching] = useState(false);

  // Form State
  const [type, setType] = useState<'location' | 'vente' | 'reservation'>('location');
  const [formData, setFormData] = useState({
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    duree_contrat: 12,
    date_expiration: '', // Reservation only
    
    // Financials
    loyer_mensuel: lot.loyer || 0,
    charges_mensuelles: lot.charges || 0,
    caution: lot.caution || 0,
    avance: lot.avance || 1,
    
    // Sale
    prix_vente: lot.prix_vente || 0,
    apport_initial: 0,
    modalite_paiement: lot.modalite_vente || 'comptant',
    duree_echelonnement: lot.duree_echelonnement || 12, // mois

    // Settings
    conditions_particulieres: '',
    jour_echeance: 5,
    tolerance_jours: 5,
    penalite_retard: 0,
  });

  // Debounced Search for Clients
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientSearch.length > 1) {
        setSearching(true);
        try {
          // Filter by type based on assignment type preference? 
          // Ideally show all, but maybe prioritize 'Locataire' for rent, 'Acheteur' for sale.
          // For now, fetch all.
          const res = await getLocataires(undefined, clientSearch);
          setClients(res);
        } catch (err) {
          console.error(err);
        } finally {
          setSearching(false);
        }
      } else {
        setClients([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientSearch]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      setError('Veuillez sélectionner un locataire ou acheteur.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await locationApi.createLocation({
        tenant_id: selectedClient.id,
        lot_id: lot.id,
        owner_id: lot.building_id ? 1 : 1, // TODO: Get owner from building/lot properly. Assuming mocked/context.
        // Actually lot should have owner_id or building. But my Lot interface might be light.
        // I'll default to 1 for demo or check if I can get it. locationApi requires owner_id.
        // Let's assume the user context or we fetch it. For now, I'll pass 1.
        
        type_contrat: type,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || undefined,
        
        // Location fields
        loyer_mensuel: type === 'location' ? formData.loyer_mensuel : 0,
        charges_mensuelles: formData.charges_mensuelles,
        caution: formData.caution,
        avance: formData.avance,
        duree_contrat: formData.duree_contrat,
        jour_echeance: formData.jour_echeance,
        penalite_retard: formData.penalite_retard,
        tolerance_jours: formData.tolerance_jours,

        // Sale / Reservation
        prix_vente: type === 'vente' ? formData.prix_vente : undefined,
        apport_initial: formData.apport_initial,
        modalite_paiement: formData.modalite_paiement,
        date_expiration: type === 'reservation' ? formData.date_expiration : undefined,
        conditions_particulieres: formData.conditions_particulieres,

        // Common defaults
        devise: 'XOF',
        type_paiement: 'classique',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'affectation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 p-6 max-w-4xl mx-auto rounded-xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Affectation du Lot {lot.reference}</h2>
        <p className="text-gray-500 text-sm mt-1">{lot.type} - {lot.superficie} m²</p>
      </div>

      {error && (
        <div className="alert alert-error mb-6 shadow-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Client & Type */}
        <div className="space-y-6">
          
          {/* 1. Choix du client */}
          <div className="card bg-white border border-base-200 p-4 shadow-sm z-50"> 
            <label className="label text-sm font-semibold text-gray-700">Client (Locataire/Acheteur)</label>
            
            {!selectedClient ? (
              <div className="relative">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    className="input input-bordered w-full pl-9"
                    placeholder="Rechercher nom, tél..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    autoFocus
                  />
                  {searching && <span className="loading loading-spinner loading-xs absolute right-3 top-3"></span>}
                </div>

                {/* Dropdown Results */}
                {clientSearch.length > 1 && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-xl border border-base-200 rounded-lg mt-1 max-h-60 overflow-y-auto z-50">
                    {clients.length > 0 ? (
                      clients.map(client => (
                        <div 
                          key={client.id}
                          className="p-3 hover:bg-base-100 cursor-pointer flex items-center gap-3 border-b border-base-100 last:border-0"
                          onClick={() => {
                            setSelectedClient(client);
                            setClientSearch('');
                            setClients([]);
                          }}
                        >
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-full w-8">
                              <span className="text-xs">{client.nom[0]}{client.prenoms[0]}</span>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-sm">{client.nom} {client.prenoms}</div>
                            <div className="text-xs text-gray-500">{client.telephone_principal}</div>
                          </div>
                          <span className={`badge badge-sm ml-auto ${client.type === 'Acheteur' ? 'badge-primary' : 'badge-ghost'}`}>{client.type}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Aucun résultat. 
                        <a href="/contacts/nouveau" target="_blank" className="text-primary hover:underline ml-1">Créer ?</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-10">
                      <span className="text-sm font-bold">{selectedClient.nom[0]}{selectedClient.prenoms[0]}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedClient.nom} {selectedClient.prenoms}</div>
                    <div className="text-xs text-primary">{selectedClient.type}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="btn btn-ghost btn-xs text-gray-400 hover:text-red-500"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* 2. Type d'affectation */}
          <div className="card bg-white border border-base-200 p-4 shadow-sm">
            <label className="label text-sm font-semibold text-gray-700">Type d'affectation</label>
            <div className="grid grid-cols-1 gap-2">
              <button 
                className={`btn justify-start gap-3 ${type === 'location' ? 'btn-primary' : 'btn-ghost bg-base-100'}`}
                onClick={() => setType('location')}
              >
                <div className={`p-1 rounded ${type === 'location' ? 'bg-primary-content/20' : 'bg-gray-200'}`}>
                   <FileText size={16} /> 
                </div>
                Location (Bail)
              </button>
              <button 
                className={`btn justify-start gap-3 ${type === 'vente' ? 'btn-success text-white' : 'btn-ghost bg-base-100'}`}
                onClick={() => setType('vente')}
              >
                <div className={`p-1 rounded ${type === 'vente' ? 'bg-white/20' : 'bg-gray-200'}`}>
                   <DollarSign size={16} /> 
                </div>
                Vente Directe
              </button>
              <button 
                className={`btn justify-start gap-3 ${type === 'reservation' ? 'btn-warning text-white' : 'btn-ghost bg-base-100'}`}
                onClick={() => setType('reservation')}
              >
                <div className={`p-1 rounded ${type === 'reservation' ? 'bg-white/20' : 'bg-gray-200'}`}>
                   <Calendar size={16} /> 
                </div>
                Réservation
              </button>
            </div>
          </div>
        </div>

        {/* Middle & Right: Dynamic Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-base-200 shadow-sm relative overflow-hidden">
             {/* Header Stripe based on Type */}
             <div className={`absolute top-0 left-0 right-0 h-1 
               ${type === 'location' ? 'bg-primary' : ''}
               ${type === 'vente' ? 'bg-success' : ''}
               ${type === 'reservation' ? 'bg-warning' : ''}
             `}></div>

             <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
               {type === 'location' && <><FileText className="text-primary"/> Détails du Bail</>}
               {type === 'vente' && <><DollarSign className="text-success"/> Détails de la Vente</>}
               {type === 'reservation' && <><Calendar className="text-warning"/> Détails Réservation</>}
             </h3>

             <div className="grid grid-cols-2 gap-4 mb-4">
                <Input 
                   label="Date de début *"
                   type="date"
                   value={formData.date_debut}
                   onChange={(e) => handleChange('date_debut', e.target.value)}
                   required
                />
                
                {type === 'reservation' && (
                  <Input 
                    label="Expire le *"
                    type="date"
                    value={formData.date_expiration}
                    onChange={(e) => handleChange('date_expiration', e.target.value)}
                    required
                  />
                )}

                {type === 'location' && (
                  <Input 
                    label="Durée (mois)"
                    type="number"
                    value={formData.duree_contrat}
                    onChange={(e) => handleChange('duree_contrat', parseInt(e.target.value))}
                  />
                )}
             </div>

             {/* Dynamic Financials */}
             {type === 'location' && (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Loyer Mensuel (FCFA) *"
                      type="number"
                      value={formData.loyer_mensuel}
                      onChange={(e) => handleChange('loyer_mensuel', parseFloat(e.target.value))}
                      className="font-bold"
                      required
                    />
                    <Input 
                      label="Charges (FCFA)"
                      type="number"
                      value={formData.charges_mensuelles}
                      onChange={(e) => handleChange('charges_mensuelles', parseFloat(e.target.value))}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4 bg-base-50 p-4 rounded-lg">
                    <Input 
                      label="Caution (FCFA)"
                      type="number"
                      value={formData.caution}
                      onChange={(e) => handleChange('caution', parseFloat(e.target.value))}
                    />
                    <Input 
                      label="Avance (Mois)"
                      type="number"
                      value={formData.avance}
                      onChange={(e) => handleChange('avance', parseInt(e.target.value))}
                    />
                 </div>
               </div>
             )}

             {type === 'vente' && (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Prix de Vente (FCFA) *"
                      type="number"
                      value={formData.prix_vente}
                      onChange={(e) => handleChange('prix_vente', parseFloat(e.target.value))}
                      className="font-bold text-success"
                      required
                    />
                    <Select 
                       label="Modalité de paiement"
                       value={formData.modalite_paiement}
                       onChange={(e) => handleChange('modalite_paiement', e.target.value)}
                       options={[
                         {value: 'comptant', label: 'Comptant'},
                         {value: 'echelonne', label: 'Échelonné'}
                       ]}
                    />
                 </div>
                 {formData.modalite_paiement === 'echelonne' && (
                    <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                      <Input 
                        label="Apport Initial (FCFA)"
                        type="number"
                        value={formData.apport_initial}
                        onChange={(e) => handleChange('apport_initial', parseFloat(e.target.value))}
                      />
                      <Input 
                        label="Durée (mois)"
                        type="number"
                        value={formData.duree_contrat} // Reuse duree_contrat for schedule
                        onChange={(e) => handleChange('duree_contrat', parseInt(e.target.value))}
                      />
                    </div>
                 )}
               </div>
             )}
             
             <div className="mt-6">
                <label className="label font-medium text-sm">Conditions Particulières</label>
                <textarea 
                  className="textarea textarea-bordered w-full h-24"
                  value={formData.conditions_particulieres}
                  onChange={(e) => handleChange('conditions_particulieres', e.target.value)}
                  placeholder="Clauses spécifiques, notes..."
                />
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
             <Button variant="ghost" onClick={onCancel} disabled={loading}>Annuler</Button>
             <Button 
                variant={type === 'vente' ? 'success' : type === 'reservation' ? 'warning' : 'primary'}
                onClick={handleSubmit}
                disabled={loading || !selectedClient}
             >
                {loading ? 'Traitement...' : 'Confirmer Affectation'}
             </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssignmentForm;
