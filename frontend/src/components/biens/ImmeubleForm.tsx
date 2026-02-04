// frontend/src/components/biens/ImmeubleForm.tsx
// Formulaire avancé pour création/modification d'immeubles avec onglets
import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, Image, Settings, Save, Plus, 
  Upload, X, Video, FileImage, Trash2 
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import type { Immeuble } from '../../api/bienApi';
import type { Proprietaire } from '../../api/accountApi';

interface User {
  id: number;
  nom: string;
  role: string;
}

interface ImmeubleFormProps {
  immeuble: Partial<Immeuble>;
  proprietaires: Proprietaire[];
  gestionnaires?: User[];
  onSave: (immeuble: Partial<Immeuble>) => Promise<void>;
  onSaveAndAddLots?: (immeuble: Partial<Immeuble>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TYPES_IMMEUBLE = [
  { value: 'Maison', label: 'Maison' },
  { value: 'Immeuble', label: 'Immeuble collectif' },
  { value: 'Résidence', label: 'Résidence' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Villa', label: 'Villa' },
];

const STATUTS = [
  { value: 'actif', label: 'Actif' },
  { value: 'inactif', label: 'Inactif' },
];

const ImmeubleForm: React.FC<ImmeubleFormProps> = ({
  immeuble,
  proprietaires,
  gestionnaires = [],
  onSave,
  onSaveAndAddLots,
  onCancel,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'medias' | 'parametres'>('general');
  const [formData, setFormData] = useState<Partial<Immeuble>>({
    type: 'Immeuble',
    nombre_etages: 1,
    statut: 'actif',
    pays: 'Bénin',
    ...immeuble
  });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(immeuble.photos || []);

  useEffect(() => {
    const updatedData = {
      type: 'Immeuble',
      nombre_etages: 1,
      statut: 'actif',
      pays: 'Bénin',
      ...immeuble
    };

    // Auto-selection du propriétaire s'il n'y en a qu'un (cas d'un compte propriétaire)
    if (!updatedData.owner_id && proprietaires.length === 1) {
      updatedData.owner_id = proprietaires[0].id;
    }

    setFormData(updatedData);
    setPhotoPreviews(immeuble.photos || []);
  }, [immeuble, proprietaires]);

  const handleChange = (field: keyof Immeuble, value: any) => {
    console.log(`Field change: ${field} =`, value, typeof value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('New Form Data:', newData, 'Valid?', !!newData.nom && !!newData.owner_id);
      return newData;
    });
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

  const handleSubmit = async (addLots: boolean = false) => {
    if (addLots && onSaveAndAddLots) {
      await onSaveAndAddLots(formData);
    } else {
      await onSave(formData);
    }
  };

  const tabs = [
    { id: 'general', label: 'Général', icon: Building2 },
    { id: 'medias', label: 'Médias', icon: Image },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

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

      {/* Tab Content with Animation Placeholder */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* Onglet Général */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonne Gauche - Informations principales */}
            <div className="space-y-6">
              <div className="bg-base-50 p-4 rounded-xl border border-base-200">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  Identité du bien
                </h4>
                
                <div className="space-y-4">
                  <Input
                    label="Nom de l'immeuble *"
                    value={formData.nom || ''}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    placeholder="Ex: Résidence Les Palmiers"
                    required
                    className="bg-white"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Type *"
                      value={formData.type || 'Immeuble'}
                      onChange={(e) => handleChange('type', e.target.value)}
                      options={TYPES_IMMEUBLE}
                      className="bg-white"
                    />
                    <Input
                      label="Nbre d'étages"
                      type="number"
                      min={1}
                      value={formData.nombre_etages || 1}
                      onChange={(e) => handleChange('nombre_etages', parseInt(e.target.value))}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-base-50 p-4 rounded-xl border border-base-200">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Gestion & Propriétaire</h4>
                <div className="space-y-4">
                  {proprietaires.length > 1 ? (
                    <Select
                      label="Propriétaire *"
                      value={formData.owner_id?.toString() || ''}
                      onChange={(e) => handleChange('owner_id', parseInt(e.target.value))}
                      options={[
                        { value: '', label: 'Sélectionner un propriétaire' },
                        ...proprietaires.map(p => ({ 
                          value: p.id.toString(), 
                          label: p.type === 'individual' ? `${p.nom} ${p.prenom || ''}` : p.nom 
                        }))
                      ]}
                      className="bg-white"
                    />
                  ) : proprietaires.length === 1 ? (
                    <div className="p-3 bg-white border border-base-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Propriétaire</span>
                      <span className="text-sm font-bold text-primary">
                        {proprietaires[0].type === 'individual' 
                          ? `${proprietaires[0].nom} ${proprietaires[0].prenom || ''}` 
                          : proprietaires[0].nom}
                      </span>
                    </div>
                  ) : (
                    <div className="alert alert-warning py-2 text-xs shadow-sm flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span>Aucun propriétaire configuré.</span>
                      </div>
                      <a href="/dashboard/proprietaires" className="flex items-center gap-1 text-primary font-bold hover:underline ml-6">
                        <Plus size={12} /> Créer un profil propriétaire
                      </a>
                    </div>
                  )}

                  {gestionnaires.length > 0 && (
                    <Select
                      label="Gestionnaire responsable"
                      value={formData.gestionnaire_id?.toString() || ''}
                      onChange={(e) => handleChange('gestionnaire_id', e.target.value ? parseInt(e.target.value) : null)}
                      options={[
                        { value: '', label: 'Aucun (géré par le propriétaire)' },
                        ...gestionnaires.map(g => ({ value: g.id.toString(), label: g.nom }))
                      ]}
                      className="bg-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Colonne Droite - Localisation */}
            <div className="space-y-6">
              <div className="bg-base-50 p-4 rounded-xl border border-base-200 h-full">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  Localisation
                </h4>

                <div className="space-y-4">
                  <Input
                    label="Adresse complète"
                    value={formData.adresse || ''}
                    onChange={(e) => handleChange('adresse', e.target.value)}
                    placeholder="Ex: 123 Rue de la Paix"
                    className="bg-white"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Quartier"
                      value={formData.quartier || ''}
                      onChange={(e) => handleChange('quartier', e.target.value)}
                      placeholder="Ex: Akpakpa"
                      className="bg-white"
                    />
                    <Input
                      label="Ville"
                      value={formData.ville || ''}
                      onChange={(e) => handleChange('ville', e.target.value)}
                      placeholder="Ex: Cotonou"
                      className="bg-white"
                    />
                  </div>

                  <Input
                    label="Pays"
                    value={formData.pays || 'Bénin'}
                    onChange={(e) => handleChange('pays', e.target.value)}
                    className="bg-white"
                  />

                  {/* GPS Card - Enhanced */}
                  <div className="card bg-white border border-base-200 shadow-sm p-4 mt-4">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">Coordonnées GPS</div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Input
                        label="Latitude"
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || null)}
                        placeholder="6.3702"
                        className="input-sm"
                      />
                      <Input
                        label="Longitude"
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => handleChange('longitude', parseFloat(e.target.value) || null)}
                        placeholder="2.3912"
                        className="input-sm"
                      />
                    </div>
                    
                    <div className="bg-base-100 rounded-lg h-32 flex items-center justify-center border border-dashed border-base-300 relative group cursor-pointer hover:bg-base-200 transition-colors">
                      <div className="text-center">
                        <MapPin size={24} className="mx-auto text-primary opacity-60 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-gray-500">Ouvrir la carte</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Médias */}
        {activeTab === 'medias' && (
          <div className="space-y-6">
            {/* Photos */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Image size={18} />
                Photos ({photoPreviews.length}/10)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Photo ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      className="absolute top-2 right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handlePhotoRemove(index)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {photoPreviews.length < 10 && (
                  <ImageUpload 
                    onChange={handlePhotoAdd} 
                    folder="property"
                    label=""
                    className="h-32"
                    clearOnSuccess={true}
                  />
                )}
              </div>
            </div>

            {/* Vidéo */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Video size={18} />
                Vidéo (optionnel)
              </h3>
              <Input
                label="URL de la vidéo"
                value={formData.video_url || ''}
                onChange={(e) => handleChange('video_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* Plan de masse */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileImage size={18} />
                Plan de masse (optionnel)
              </h3>
              <Input
                label="URL du plan"
                value={formData.plan_masse_url || ''}
                onChange={(e) => handleChange('plan_masse_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {/* Onglet Paramètres */}
        {activeTab === 'parametres' && (
          <div className="space-y-4 max-w-md">
            <Select
              label="Statut"
              value={formData.statut || 'actif'}
              onChange={(e) => handleChange('statut', e.target.value)}
              options={STATUTS}
            />
            
            <div className="alert alert-info">
              <span>
                Un immeuble inactif ne sera pas affiché dans les listes publiques.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-base-300">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        
        {!formData.id && onSaveAndAddLots && (
          <Button 
            variant="secondary" 
            onClick={() => handleSubmit(true)}
            disabled={loading || !formData.nom || !formData.owner_id}
          >
            <Plus size={16} className="mr-2" />
            Enregistrer & Ajouter lots
          </Button>
        )}
        
        <Button 
          variant="primary" 
          onClick={() => handleSubmit(false)}
          disabled={loading || !formData.nom || !formData.owner_id}
          title={!formData.nom || !formData.owner_id ? "Veuillez remplir le nom et sélectionner un propriétaire (onglet Général)" : ""}
        >
          <Save size={16} className="mr-2" />
          {loading ? 'Enregistrement...' : formData.id ? 'Modifier' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
};

export default ImmeubleForm;
