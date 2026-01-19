// frontend/src/components/locataires/LocataireForm.tsx
// 4-tab form for creating/editing tenants per Module IV spec

import React, { useState, useEffect } from 'react';
import {
  User, FileText, Wallet, Key, Upload, Camera,
  Phone, Mail, MapPin, Calendar, CreditCard, Shield
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import type { Locataire } from '../../api/locataireApi';
import { documentApi } from '../../api/documentApi';

interface LocataireFormProps {
  locataire?: Partial<Locataire>;
  onSave: (data: Partial<Locataire>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const tabs = [
  { id: 'identite', label: 'Identité', icon: User },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'finances', label: 'Finances', icon: Wallet },
  { id: 'acces', label: 'Accès', icon: Key },
];

const LocataireForm: React.FC<LocataireFormProps> = ({
  locataire,
  onSave,
  onCancel,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('identite');
  const [formData, setFormData] = useState({
    type: 'Locataire',
    nom: '',
    prenoms: '',
    telephone_principal: '',
    telephone_secondaire: '',
    email: '',
    nationalite: 'Béninoise',
    adresse_actuelle: '',
    // Documents
    type_piece: 'CNI',
    numero_piece: '',
    date_expiration_piece: '',
    photo_piece_url: '',
    photo_profil_url: '',
    // Finances
    mode_paiement_preferentiel: 'Mobile Money',
    caution: 0,
    avance: 0,
    paiement_echelonne: false,
    // Status
    statut: 'Actif'
  });

  useEffect(() => {
    if (locataire) {
      setFormData(prev => ({
        ...prev,
        ...locataire,
        date_expiration_piece: locataire.date_expiration_piece 
          ? new Date(locataire.date_expiration_piece).toISOString().split('T')[0] 
          : ''
      }));
    }
  }, [locataire]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSave(formData as any);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeUploadField, setActiveUploadField] = useState<'photo_profil_url' | 'photo_piece_url' | null>(null);

  const handleUploadClick = (field: 'photo_profil_url' | 'photo_piece_url') => {
    setActiveUploadField(field);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadField) return;

    const isProfile = activeUploadField === 'photo_profil_url';
    const category = isProfile ? 'photo_profil' : 'piece_identite';
    const description = isProfile ? 'Photo de profil locataire' : 'Pièce d\'identité locataire';

    try {
      setUploading(true);
      const uploadedDoc = await documentApi.uploadDocument({
        file,
        categorie: category,
        entity_type: 'tenant_temp', 
        description: description
      });
      
      handleChange(activeUploadField, uploadedDoc.url);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Erreur upload:', error);
      alert("Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
      setActiveUploadField(null);
    }
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/jpeg,image/png,image/jpg,application/pdf"
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Tab: Identité */}
        {activeTab === 'identite' && (
          <div className="space-y-6">
            {/* Profile photo */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div 
                onClick={() => handleUploadClick('photo_profil_url')}
                className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg relative cursor-pointer group hover:border-primary/50 transition-all"
              >
                {formData.photo_profil_url ? (
                  <img src={formData.photo_profil_url} alt="Profil" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={32} className="text-gray-400 group-hover:text-primary transition-colors" />
                )}
                <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <Camera size={12} />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                    <div className="loading loading-spinner loading-xs text-white"></div>
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={() => handleUploadClick('photo_profil_url')}
                className="text-xs text-primary font-medium hover:underline"
              >
                {formData.photo_profil_url ? 'Modifier la photo' : 'Ajouter une photo'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type de profil"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                options={[
                  { value: 'Locataire', label: 'Locataire' },
                  { value: 'Acheteur', label: 'Acheteur' },
                  { value: 'Prospect', label: 'Prospect' }
                ]}
              />
              <Select
                label="Nationalité"
                value={formData.nationalite}
                onChange={(e) => handleChange('nationalite', e.target.value)}
                options={[
                  { value: 'Béninoise', label: 'Béninoise' },
                  { value: 'Togolaise', label: 'Togolaise' },
                  { value: 'Nigériane', label: 'Nigériane' },
                  { value: 'Ivoirienne', label: 'Ivoirienne' },
                  { value: 'Autre', label: 'Autre' }
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nom"
                placeholder="Nom de famille"
                value={formData.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                required
                startIcon={<User size={16} />}
              />
              <Input
                label="Prénoms"
                placeholder="Prénoms"
                value={formData.prenoms}
                onChange={(e) => handleChange('prenoms', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Téléphone Principal (WhatsApp)"
                placeholder="+229 XX XX XX XX"
                value={formData.telephone_principal}
                onChange={(e) => handleChange('telephone_principal', e.target.value)}
                required
                startIcon={<Phone size={16} />}
              />
              <Input
                label="Téléphone Secondaire"
                placeholder="+229 XX XX XX XX"
                value={formData.telephone_secondaire || ''}
                onChange={(e) => handleChange('telephone_secondaire', e.target.value)}
                startIcon={<Phone size={16} />}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email (optionnel)"
                placeholder="exemple@email.com"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                startIcon={<Mail size={16} />}
              />
              <Input
                label="Adresse actuelle"
                placeholder="Quartier, Ville"
                value={formData.adresse_actuelle || ''}
                onChange={(e) => handleChange('adresse_actuelle', e.target.value)}
                startIcon={<MapPin size={16} />}
              />
            </div>
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type de pièce d'identité"
                value={formData.type_piece || 'CNI'}
                onChange={(e) => handleChange('type_piece', e.target.value)}
                options={[
                  { value: 'CNI', label: 'Carte Nationale d\'Identité' },
                  { value: 'Passeport', label: 'Passeport' },
                  { value: 'Permis', label: 'Permis de conduire' },
                  { value: 'CIP', label: 'Carte d\'Identité Professionnelle' }
                ]}
              />
              <Input
                label="Numéro de pièce"
                placeholder="Numéro de la pièce"
                value={formData.numero_piece || ''}
                onChange={(e) => handleChange('numero_piece', e.target.value)}
                startIcon={<CreditCard size={16} />}
              />
            </div>

            <Input
              label="Date d'expiration"
              type="date"
              value={formData.date_expiration_piece || ''}
              onChange={(e) => handleChange('date_expiration_piece', e.target.value)}
              startIcon={<Calendar size={16} />}
            />

            {/* Document upload zones */}
            <div className="grid grid-cols-2 gap-6">
              <div 
                onClick={() => handleUploadClick('photo_piece_url')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer relative"
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Photo de la pièce d'identité</p>
                <p className="text-xs text-gray-400 mt-1">Cliquez pour téléverser (JPG, PNG, PDF)</p>
                {formData.photo_piece_url && (
                  <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                     <FileText size={12} /> Document chargé
                  </p>
                )}
                {uploading && activeUploadField === 'photo_piece_url' && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="loading loading-spinner text-primary"></div>
                  </div>
                )}
              </div>
              <div 
                onClick={() => handleUploadClick('photo_profil_url')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer relative"
              >
                <Camera size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Photo du locataire</p>
                <p className="text-xs text-gray-400 mt-1">Format portrait recommandé</p>
                {formData.photo_profil_url && (
                  <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
                    <User size={12} /> Photo chargée
                  </p>
                )}
                {uploading && activeUploadField === 'photo_profil_url' && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="loading loading-spinner text-primary"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Finances */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <strong>Note :</strong> Ces informations sont en lecture seule pour le locataire dans son portail.
              </p>
            </div>

            <Select
              label="Mode de paiement préféré"
              value={formData.mode_paiement_preferentiel || 'Mobile Money'}
              onChange={(e) => handleChange('mode_paiement_preferentiel', e.target.value)}
              options={[
                { value: 'Mobile Money', label: 'Mobile Money (MTN, Moov)' },
                { value: 'Espèces', label: 'Espèces' },
                { value: 'Virement', label: 'Virement Bancaire' },
                { value: 'Chèque', label: 'Chèque' }
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Caution (FCFA)"
                type="number"
                value={formData.caution || 0}
                onChange={(e) => handleChange('caution', parseFloat(e.target.value) || 0)}
                startIcon={<Wallet size={16} />}
              />
              <Input
                label="Avance (FCFA)"
                type="number"
                value={formData.avance || 0}
                onChange={(e) => handleChange('avance', parseFloat(e.target.value) || 0)}
                startIcon={<Wallet size={16} />}
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="paiement_echelonne"
                checked={formData.paiement_echelonne || false}
                onChange={(e) => handleChange('paiement_echelonne', e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <label htmlFor="paiement_echelonne" className="text-sm font-medium text-gray-700">
                Paiement échelonné autorisé
              </label>
            </div>
          </div>
        )}

        {/* Tab: Accès */}
        {activeTab === 'acces' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
              <Shield size={20} className="text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-800">Portail Locataire</p>
                <p className="text-xs text-purple-600 mt-1">
                  L'accès au portail locataire sera configuré après l'enregistrement du profil.
                </p>
              </div>
            </div>

            <Select
              label="Statut du profil"
              value={formData.statut || 'Actif'}
              onChange={(e) => handleChange('statut', e.target.value)}
              options={[
                { value: 'Actif', label: 'Actif' },
                { value: 'Inactif', label: 'Inactif' },
                { value: 'Expiré', label: 'Expiré' },
                { value: 'Archivé', label: 'Archivé' }
              ]}
            />

            {locataire?.id && (
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="text-sm font-medium text-gray-700">Actions rapides</p>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm">
                    <Key size={14} className="mr-1" /> Activer accès portail
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Suspendre accès
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading}>
          {locataire?.id ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
};

export default LocataireForm;
