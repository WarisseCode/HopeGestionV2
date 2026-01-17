// frontend/src/components/biens/LotForm.tsx
// Formulaire avancé pour création/modification de lots avec 4 onglets
import React, { useState, useEffect } from 'react';
import { 
  Home, DollarSign, Image, Settings, Save, 
  Upload, X, Building2, Tag
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import type { Lot, Immeuble } from '../../api/bienApi';

interface LotFormProps {
  lot: Partial<Lot>;
  immeubles: Immeuble[];
  onSave: (lot: Partial<Lot>) => Promise<void>;
  onStatusChange?: (lot: Partial<Lot>, newStatus: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TYPES_LOT = [
  { value: 'Appartement', label: 'Appartement' },
  { value: 'Studio', label: 'Studio' },
  { value: 'Chambre', label: 'Chambre' },
  { value: 'Boutique', label: 'Boutique' },
  { value: 'Bureau', label: 'Bureau' },
  { value: 'Dépôt', label: 'Dépôt' },
  { value: 'Terrain', label: 'Terrain nu' },
];

const STATUTS = [
  { value: 'libre', label: 'Libre' },
  { value: 'reserve', label: 'Réservé' },
  { value: 'loue', label: 'Loué' },
  { value: 'vendu', label: 'Vendu' },
  { value: 'hors_service', label: 'Hors service' },
];

const PERIODICITES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
];

const MODALITES_VENTE = [
  { value: 'comptant', label: 'Paiement comptant' },
  { value: 'echelonne', label: 'Paiement échelonné' },
];

const LotForm: React.FC<LotFormProps> = ({
  lot,
  immeubles,
  onSave,
  onStatusChange,
  onCancel,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'financier' | 'medias' | 'statut'>('general');
  const [formData, setFormData] = useState<Partial<Lot>>(lot);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(lot.photos || []);
  const [showVenteFields, setShowVenteFields] = useState(!!lot.prix_vente);

  useEffect(() => {
    setFormData(lot);
    setPhotoPreviews(lot.photos || []);
    setShowVenteFields(!!lot.prix_vente);
  }, [lot]);

  const handleChange = (field: keyof Lot, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoAdd = (url: string) => {
    if (photoPreviews.length < 10) {
      const newPhotos = [...photoPreviews, url];
      setPhotoPreviews(newPhotos);
      handleChange('photos', newPhotos);
    }
  };

  const handlePhotoRemove = (index: number) => {
    const newPhotos = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  const handleSubmit = async () => {
    await onSave(formData);
  };

  const handleStatusChangeClick = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(formData, newStatus);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Home },
    { id: 'financier', label: 'Financier', icon: DollarSign },
    { id: 'medias', label: 'Médias', icon: Image },
    { id: 'statut', label: 'Statut', icon: Settings },
  ];

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'libre': return 'badge-success';
      case 'loue': return 'badge-info';
      case 'reserve': return 'badge-warning';
      case 'vendu': return 'badge-secondary';
      case 'hors_service': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Elegant Tabs */}
      <div className="flex items-center gap-6 px-1 border-b border-base-300 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`
              relative pb-3 text-sm font-medium transition-all duration-200 flex items-center gap-2
              ${activeTab === tab.id 
                ? 'text-primary border-b-2 border-primary -mb-[1px]' 
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-primary' : 'text-gray-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Onglet Général */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonne Gauche */}
            <div className="space-y-6">
              <div className="bg-base-50 p-4 rounded-xl border border-base-200">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Home size={16} className="text-primary" />
                  Identification
                </h4>
                
                <div className="space-y-4">
                  <Select
                    label="Immeuble de rattachement *"
                    value={formData.building_id?.toString() || ''}
                    onChange={(e) => handleChange('building_id', parseInt(e.target.value))}
                    options={[
                      { value: '', label: 'Sélectionner un immeuble' },
                      ...immeubles.map(b => ({ 
                        value: b.id.toString(), 
                        label: `${b.nom} (${b.proprietaire || 'Sans propriétaire'})`
                      }))
                    ]}
                    className="bg-white"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Référence du lot *"
                      value={formData.reference || ''}
                      onChange={(e) => handleChange('reference', e.target.value)}
                      placeholder="Ex: A01, B12..."
                      required
                      className="bg-white"
                    />
                    <Select
                      label="Type de lot *"
                      value={formData.type || 'Appartement'}
                      onChange={(e) => handleChange('type', e.target.value)}
                      options={TYPES_LOT}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-base-50 p-4 rounded-xl border border-base-200">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Emplacement</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Étage"
                    value={formData.etage || ''}
                    onChange={(e) => handleChange('etage', e.target.value)}
                    placeholder="Ex: RDC, 1..."
                    className="bg-white"
                  />
                  <Input
                    label="Bloc"
                    value={formData.bloc || ''}
                    onChange={(e) => handleChange('bloc', e.target.value)}
                    placeholder="Ex: A, B..."
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Colonne Droite */}
            <div className="space-y-6">
              <div className="bg-base-50 p-4 rounded-xl border border-base-200 h-full">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings size={16} className="text-primary" />
                  Caractéristiques & Détails
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Superficie (m²)"
                      type="number"
                      min={0}
                      value={formData.superficie || ''}
                      onChange={(e) => handleChange('superficie', parseFloat(e.target.value))}
                      placeholder="Ex: 45"
                      className="bg-white"
                    />
                    <Input
                      label="Nombre de pièces"
                      type="number"
                      min={1}
                      value={formData.nbPieces || 1}
                      onChange={(e) => handleChange('nbPieces', parseInt(e.target.value))}
                      className="bg-white"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label font-medium text-sm text-gray-700">Description</label>
                    <textarea
                      className="textarea textarea-bordered h-40 bg-white"
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Description du lot, équipements, particularités..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Financier */}
        {activeTab === 'financier' && (
          <div className="space-y-8">
            {/* Données locatives */}
            <div className="card bg-white border border-blue-100 shadow-sm overflow-hidden">
              <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-600" />
                  Configuration Locative
                </h3>
                <span className="badge badge-info badge-sm">Standard</span>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Loyer mensuel (FCFA)"
                    type="number"
                    min={0}
                    value={formData.loyer || ''}
                    onChange={(e) => handleChange('loyer', parseFloat(e.target.value))}
                    placeholder="Ex: 50000"
                    className="font-mono"
                  />
                  <Input
                    label="Charges mensuelles (FCFA)"
                    type="number"
                    min={0}
                    value={formData.charges || ''}
                    onChange={(e) => handleChange('charges', parseFloat(e.target.value))}
                    placeholder="Ex: 5000"
                    className="font-mono bg-gray-50"
                  />
                  <Select
                    label="Périodicité préférée"
                    value={formData.periodicite || 'mensuel'}
                    onChange={(e) => handleChange('periodicite', e.target.value)}
                    options={PERIODICITES}
                  />
                </div>

                <div className="divider my-4">Conditions d'entrée</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-base-50 p-4 rounded-lg">
                    <Input
                      label="Caution recommandée (FCFA)"
                      type="number"
                      min={0}
                      value={formData.caution || ''}
                      onChange={(e) => handleChange('caution', parseFloat(e.target.value))}
                      placeholder="Ex: 100000"
                      className="font-mono"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Généralement 2 à 3 mois de loyer</span>
                  </div>
                  <div className="bg-base-50 p-4 rounded-lg">
                    <Input
                      label="Avance exigée (mois)"
                      type="number"
                      min={0}
                      value={formData.avance || 1}
                      onChange={(e) => handleChange('avance', parseInt(e.target.value))}
                    />
                    <span className="text-xs text-gray-500 mt-1 block">Paiement d'avance à l'entrée</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Données de vente */}
            <div className={`card transition-all duration-300 ${showVenteFields ? 'border-green-200 shadow-md ring-1 ring-green-100' : 'border border-base-200 bg-base-50 opacity-80'}`}>
              <div className="px-6 py-4 flex items-center justify-between cursor-pointer" onClick={() => setShowVenteFields(!showVenteFields)}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${showVenteFields ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${showVenteFields ? 'text-green-900' : 'text-gray-600'}`}>Option de Vente</h3>
                    <p className="text-xs text-gray-500">Activer si ce lot est disponible à l'achat</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  className="toggle toggle-success" 
                  checked={showVenteFields}
                  onChange={(e) => setShowVenteFields(e.target.checked)}
                />
              </div>

              {showVenteFields && (
                <div className="p-6 pt-0 animate-fade-in">
                  <div className="divider mt-0 mb-6"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Prix de vente (FCFA)"
                      type="number"
                      min={0}
                      value={formData.prix_vente || ''}
                      onChange={(e) => handleChange('prix_vente', parseFloat(e.target.value))}
                      placeholder="Ex: 15000000"
                      className="font-mono text-lg font-semibold text-green-700"
                    />
                    <Select
                      label="Modalité de paiement"
                      value={formData.modalite_vente || 'comptant'}
                      onChange={(e) => handleChange('modalite_vente', e.target.value)}
                      options={MODALITES_VENTE}
                    />
                    {formData.modalite_vente === 'echelonne' && (
                      <Input
                        label="Durée échelonnement (mois)"
                        type="number"
                        min={1}
                        value={formData.duree_echelonnement || ''}
                        onChange={(e) => handleChange('duree_echelonnement', parseInt(e.target.value))}
                        placeholder="Ex: 12"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Médias */}
        {activeTab === 'medias' && (
          <div className="space-y-6">
            <div className="bg-base-50 p-6 rounded-xl border border-base-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Image size={18} className="text-primary" />
                  Gallerie Photos
                </h3>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">{photoPreviews.length}/10 photos</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img 
                      src={url} 
                      alt={`Photo ${index + 1}`} 
                      className="w-full h-full object-cover rounded-xl shadow-sm border border-base-200 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <button
                        className="btn btn-circle btn-sm btn-error text-white"
                        onClick={() => handlePhotoRemove(index)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {photoPreviews.length < 10 && (
                  <label className="aspect-square border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/10 group">
                    <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">Ajouter une photo</span>
                    <span className="text-xs text-primary/60 mt-1">MAX 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handlePhotoAdd(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-base-50 p-6 rounded-xl border border-base-200">
              <h3 className="font-semibold text-gray-900 mb-4">Disponibilité</h3>
              <Input
                label="Date de disponibilité"
                type="date"
                value={formData.date_disponibilite || ''}
                onChange={(e) => handleChange('date_disponibilite', e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-gray-500 mt-2">
                Laisser vide si disponible immédiatement.
              </p>
            </div>
          </div>
        )}

        {/* Onglet Statut */}
        {activeTab === 'statut' && (
          <div className="space-y-6">
            <div className="card bg-white border border-base-200 shadow-sm p-6 text-center">
              <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-6">État actuel du lot</h3>
              
              <div className="flex justify-center mb-8">
                <div className={`
                  flex items-center gap-3 px-6 py-3 rounded-full text-lg font-bold shadow-sm border
                  ${formData.statut === 'libre' ? 'bg-green-50 text-green-700 border-green-100' : ''}
                  ${formData.statut === 'loue' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                  ${formData.statut === 'reserve' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                  ${formData.statut === 'vendu' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                  ${formData.statut === 'hors_service' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                  ${!formData.statut ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                `}>
                  <div className={`w-3 h-3 rounded-full 
                    ${formData.statut === 'libre' ? 'bg-green-500' : ''}
                    ${formData.statut === 'loue' ? 'bg-blue-500' : ''}
                    ${formData.statut === 'reserve' ? 'bg-amber-500' : ''}
                    ${formData.statut === 'vendu' ? 'bg-purple-500' : ''}
                    ${formData.statut === 'hors_service' ? 'bg-red-500' : ''}
                    ${!formData.statut ? 'bg-gray-500' : ''}
                  `}></div>
                  {STATUTS.find(s => s.value === formData.statut)?.label || 'Non défini'}
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <Select
                  label="Modifier manuellement le statut"
                  value={formData.statut || 'libre'}
                  onChange={(e) => handleChange('statut', e.target.value)}
                  options={STATUTS}
                  className="text-center"
                />
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <button 
                  className={`btn h-auto py-4 flex flex-col gap-2 border-2 hover:border-blue-500 ${formData.statut === 'loue' ? 'btn-active btn-primary' : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-100'}`}
                  onClick={() => handleStatusChangeClick('loue')}
                  disabled={formData.statut === 'loue'}
                >
                  <Home size={24} />
                  <span>Marquer Loué</span>
                  <span className="text-xs opacity-70 font-normal">Un locataire entre</span>
                </button>
                
                <button 
                  className={`btn h-auto py-4 flex flex-col gap-2 border-2 hover:border-purple-500 ${formData.statut === 'vendu' ? 'btn-active btn-secondary' : 'bg-white hover:bg-purple-50 text-purple-700 border-purple-100'}`}
                  onClick={() => handleStatusChangeClick('vendu')}
                  disabled={formData.statut === 'vendu'}
                >
                  <DollarSign size={24} />
                  <span>Marquer Vendu</span>
                  <span className="text-xs opacity-70 font-normal">Transaction terminée</span>
                </button>

                <button 
                  className={`btn h-auto py-4 flex flex-col gap-2 border-2 hover:border-red-500 ${formData.statut === 'hors_service' ? 'btn-active btn-error' : 'bg-white hover:bg-red-50 text-red-700 border-red-100'}`}
                  onClick={() => handleStatusChangeClick('hors_service')}
                  disabled={formData.statut === 'hors_service'}
                >
                  <Settings size={24} />
                  <span>Désactiver</span>
                  <span className="text-xs opacity-70 font-normal">Travaux / Indisponible</span>
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-base-300">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading || !formData.reference || !formData.building_id}
        >
          <Save size={16} className="mr-2" />
          {loading ? 'Enregistrement...' : formData.id ? 'Modifier' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
};

export default LotForm;
