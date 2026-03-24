// frontend/src/components/biens/ImmeubleForm.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Image, Settings, Save, Plus, 
  Upload, X, Video, FileImage, Trash2, Star, 
  Check, ArrowRight, ArrowLeft, Users
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import type { Immeuble } from '../../api/bienApi';
import type { Proprietaire, Utilisateur } from '../../api/accountApi';

interface User {
  id: number;
  nom: string;
  role: string;
}

interface ImmeubleFormProps {
  immeuble: Partial<Immeuble>;
  proprietaires: Proprietaire[];
  gestionnaires?: Utilisateur[];
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

const STEPS = [
  { id: 0, title: 'Identité', icon: <Building2 size={20} /> },
  { id: 1, title: 'Localisation', icon: <MapPin size={20} /> },
  { id: 2, title: 'Gestion', icon: <Users size={20} /> },
  { id: 3, title: 'Médias & Paramètres', icon: <Image size={20} /> }
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
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Immeuble>>({
    type: 'Immeuble',
    nombre_etages: 0,
    statut: 'actif',
    pays: 'Bénin',
    ...immeuble
  });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(immeuble.photos || []);

  useEffect(() => {
    const updatedData = {
        type: 'Immeuble',
        nombre_etages: 0,
        statut: 'actif',
        pays: 'Bénin',
        ...immeuble
    };

    // Auto-selection du propriétaire s'il n'y en a qu'un
    if (!updatedData.owner_id && proprietaires.length === 1) {
      updatedData.owner_id = proprietaires[0].id;
    }

    // Auto-select first photo as main if none selected
    if (!updatedData.photo && immeuble.photos && immeuble.photos.length > 0) {
      updatedData.photo = immeuble.photos[0];
    }

    setFormData(updatedData);
    setPhotoPreviews(immeuble.photos || []);
  }, [immeuble, proprietaires]);

  const handleChange = (field: keyof Immeuble, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoAdd = (url: string) => {
    if (photoPreviews.length < 10) {
      if (photoPreviews.includes(url)) return;
      
      const newPhotos = [...photoPreviews, url];
      setPhotoPreviews(newPhotos);
      handleChange('photos', newPhotos);
      
      if (newPhotos.length === 1 || !formData.photo) {
        handleChange('photo', url);
      }
    }
  };

  const handlePhotoRemove = (index: number) => {
    const photoToRemove = photoPreviews[index];
    const newPhotos = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
    
    if (formData.photo === photoToRemove) {
        handleChange('photo', newPhotos.length > 0 ? newPhotos[0] : '');
    }
  };

  const handleSetMainPhoto = (url: string) => {
    handleChange('photo', url);
    const otherPhotos = photoPreviews.filter(p => p !== url);
    const newPhotos = [url, ...otherPhotos];
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Identité
        return !!formData.nom && !!formData.type && !!formData.total_lots;
      case 1: // Localisation
        return !!formData.ville;
      case 2: // Gestion
        // Owner ID is mandatory
        return !!formData.owner_id;
      case 3: // Médias
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };


  const handleSubmit = async (addLots: boolean = false) => {
    if (addLots && onSaveAndAddLots) {
      await onSaveAndAddLots(formData);
    } else {
      await onSave(formData);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-base-200/50">
      {/* Wizard Header */}
      <div className="flex items-center justify-between px-12 py-6 bg-base-100 border-b border-base-300">
        {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                    <motion.div
                        initial={false}
                        animate={{
                            backgroundColor: isActive || isCompleted ? '#3B82F6' : '#F3F4F6',
                            color: isActive || isCompleted ? '#FFF' : '#9CA3AF',
                            scale: isActive ? 1.1 : 1
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
                            isActive ? 'ring-4 ring-blue-100' : ''
                        }`}
                    >
                        {isCompleted ? <Check size={20} /> : step.icon}
                    </motion.div>
                    <span className={`mt-3 text-sm font-bold ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-base-content/90' : 'text-base-content/50'
                    }`}>
                        {step.title}
                    </span>
                    
                    {idx < STEPS.length - 1 && (
                        <div className="absolute top-6 left-1/2 w-[calc(100%+4rem)] h-0.5 -z-10 bg-base-300">
                            <motion.div 
                                className="h-full bg-blue-500 origin-left"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: isCompleted ? 1 : 0 }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="max-w-3xl mx-auto px-2 pb-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* STEP 1: IDENTITE */}
                    {currentStep === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-6">
                                <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                                    <Building2 className="text-blue-500" /> Informations générales
                                </h3>
                                
                                <Input
                                    label="Nom de l'immeuble *"
                                    value={formData.nom || ''}
                                    onChange={(e) => handleChange('nom', e.target.value)}
                                    placeholder="Ex: Résidence Les Palmiers"
                                    required
                                    className={`bg-base-200 border-base-300 focus:bg-base-100 ${!formData.nom ? 'border-red-200 focus:border-red-500' : ''}`}
                                />

                                <div className="grid grid-cols-2 gap-6">
                                    <Select
                                        label="Type de bien *"
                                        value={formData.type || 'Immeuble'}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                        options={TYPES_IMMEUBLE}
                                        className="bg-base-200 border-base-300 focus:bg-base-100"
                                    />
                                    <Input
                                        label="Nbre d'étages"
                                        type="number"
                                        min={0}
                                        value={formData.nombre_etages ?? ''}
                                        onChange={(e) => handleChange('nombre_etages', e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="bg-base-200 border-base-300 focus:bg-base-100"
                                    />
                                    <Input
                                        label="Nbre total de lots *"
                                        type="number"
                                        min={1}
                                        value={formData.total_lots ?? ''}
                                        onChange={(e) => handleChange('total_lots', e.target.value === '' ? '' : parseInt(e.target.value))}
                                        placeholder="Ex: 12"
                                        required
                                        className={`bg-base-200 border-base-300 focus:bg-base-100 ${!formData.total_lots ? 'border-red-200' : ''}`}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label font-bold text-sm text-base-content/80">Description</label>
                                    <textarea
                                        className="textarea textarea-bordered h-32 bg-base-200 border-base-300 focus:bg-base-100 w-full rounded-xl p-4 text-sm"
                                        value={formData.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Description du bien, équipements, atouts..."
                                    />
                                </div>
                             </div>
                        </div>
                    )}

                    {/* STEP 2: LOCALISATION */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-6">
                                <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                                    <MapPin className="text-blue-500" /> Adresse & Coordonnées
                                </h3>
                                
                                <Input
                                    label="Adresse complète"
                                    value={formData.adresse || ''}
                                    onChange={(e) => handleChange('adresse', e.target.value)}
                                    placeholder="Ex: 123 Rue de la Paix"
                                    className="bg-base-200 border-base-300 focus:bg-base-100"
                                />

                                <div className="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Quartier"
                                        value={formData.quartier || ''}
                                        onChange={(e) => handleChange('quartier', e.target.value)}
                                        placeholder="Ex: Akpakpa"
                                        className="bg-base-200 border-base-300 focus:bg-base-100"
                                    />
                                    <Input
                                        label="Ville *"
                                        value={formData.ville || ''}
                                        onChange={(e) => handleChange('ville', e.target.value)}
                                        placeholder="Ex: Cotonou"
                                        required
                                        className={`bg-base-200 border-base-300 focus:bg-base-100 ${!formData.ville ? 'border-red-200' : ''}`}
                                    />
                                </div>
                                <Input
                                    label="Pays"
                                    value={formData.pays || 'Bénin'}
                                    onChange={(e) => handleChange('pays', e.target.value)}
                                    className="bg-base-200 border-base-300 focus:bg-base-100"
                                />
                                
                                {/* GPS Section */}
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="text-xs font-bold text-blue-800 uppercase mb-3">Coordonnées GPS (Optionnel)</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Latitude"
                                            type="number"
                                            step="any"
                                            value={formData.latitude || ''}
                                            onChange={(e) => handleChange('latitude', parseFloat(e.target.value) || null)}
                                            placeholder="6.3702"
                                            className="bg-base-100 border-blue-200"
                                        />
                                        <Input
                                            label="Longitude"
                                            type="number"
                                            step="any"
                                            value={formData.longitude || ''}
                                            onChange={(e) => handleChange('longitude', parseFloat(e.target.value) || null)}
                                            placeholder="2.3912"
                                            className="bg-base-100 border-blue-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: GESTION */}
                    {currentStep === 2 && (
                         <div className="space-y-6">
                             <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-6">
                                <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                                    <Users className="text-blue-500" /> Propriétaire & Gestion
                                </h3>

                                <div className="space-y-4">
                                     {proprietaires.length > 1 ? (
                                        <div className="form-control w-full">
                                            <label className="label font-bold text-sm text-base-content/80">Propriétaire *</label>
                                            <select
                                                className={`select select-bordered w-full bg-base-200 border-base-300 focus:bg-base-100 h-12 ${!formData.owner_id ? 'select-error' : ''}`}
                                                value={formData.owner_id || ''}
                                                onChange={(e) => handleChange('owner_id', e.target.value ? parseInt(e.target.value) : 0)}
                                            >
                                                <option value="">Sélectionner un propriétaire</option>
                                                {proprietaires.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.type === 'individual' ? `${p.nom} ${p.prenom || ''}` : p.nom}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                     ) : proprietaires.length === 1 ? (
                                         <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-blue-500 uppercase">Propriétaire assigné</span>
                                                <div className="font-bold text-blue-900 text-lg">
                                                    {proprietaires[0].type === 'individual' 
                                                        ? `${proprietaires[0].nom} ${proprietaires[0].prenom || ''}` 
                                                        : proprietaires[0].nom}
                                                </div>
                                            </div>
                                            <Check className="text-blue-500" />
                                         </div>
                                     ) : (
                                         <div className="alert alert-error">
                                             <div className="flex flex-col">
                                                <span className="font-bold">Aucun propriétaire trouvé.</span>
                                                <span className="text-xs">Vous devez d'abord créer un profil propriétaire.</span>
                                             </div>
                                         </div>
                                     )}

                                     {gestionnaires.length > 0 && (
                                         <div className="form-control w-full mt-4">
                                            <label className="label font-bold text-sm text-base-content/80">Gestionnaire (Optionnel)</label>
                                            <select
                                                className="select select-bordered w-full bg-base-200 border-base-300 focus:bg-base-100 h-12"
                                                value={formData.gestionnaire_id || ''}
                                                onChange={(e) => handleChange('gestionnaire_id', e.target.value ? parseInt(e.target.value) : null)}
                                            >
                                                <option value="">Géré par le propriétaire</option>
                                                {gestionnaires.map(g => (
                                                    <option key={g.id} value={g.id}>{g.nom}</option>
                                                ))}
                                            </select>
                                         </div>
                                     )}
                                </div>
                             </div>
                         </div>
                    )}

                    {/* STEP 4: MEDIAS & PARAMETRES */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-6">
                                <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                                    <Image className="text-blue-500" /> Photos & Vidéos
                                </h3>

                                {/* Photos Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {photoPreviews.map((url, index) => {
                                        const isMain = url === formData.photo || (!formData.photo && index === 0);
                                        return (
                                            <div key={index} className={`relative group rounded-xl overflow-hidden border-2 aspect-square ${isMain ? 'border-blue-500 shadow-md transform scale-[1.02]' : 'border-transparent'}`}>
                                                <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleSetMainPhoto(url)} 
                                                        className="btn btn-circle btn-sm btn-primary text-white"
                                                        title="Définir comme principale"
                                                    >
                                                        <Star size={14} fill="currentColor" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePhotoRemove(index)} 
                                                        className="btn btn-circle btn-sm btn-error text-white"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                {isMain && (
                                                    <div className="absolute bottom-0 w-full bg-blue-500 text-white text-[10px] font-bold text-center py-1 uppercase">
                                                        Principale
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {photoPreviews.length < 10 && (
                                        <ImageUpload 
                                            onChange={handlePhotoAdd} 
                                            folder="property" 
                                            label=""
                                            clearOnSuccess={true}
                                            className="aspect-square bg-base-200 border-dashed border-2 border-base-300 hover:border-blue-300 hover:bg-blue-50 transition-colors rounded-xl"
                                        />
                                    )}
                                </div>

                                <div className="divider">Compléments</div>

                                <div className="space-y-4">
                                    <Input
                                        label="URL Vidéo (YouTube/Vimeo)"
                                        value={formData.video_url || ''}
                                        onChange={(e) => handleChange('video_url', e.target.value)}
                                        placeholder="https://..."
                                        className="bg-base-200 border-base-300 focus:bg-base-100"
                                    />
                                    <Input
                                        label="URL Plan de masse"
                                        value={formData.plan_masse_url || ''}
                                        onChange={(e) => handleChange('plan_masse_url', e.target.value)}
                                        placeholder="https://..."
                                        className="bg-base-200 border-base-300 focus:bg-base-100"
                                    />
                                </div>
                            </div>

                             <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 space-y-4">
                                <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                                    <Settings className="text-blue-500" /> Statut
                                </h3>
                                <Select
                                    label="État du bien"
                                    value={formData.statut || 'actif'}
                                    onChange={(e) => handleChange('statut', e.target.value)}
                                    options={STATUTS}
                                    className="bg-base-200 border-base-300 focus:bg-base-100"
                                />
                             </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </div>

       {/* Footer Buttons */}
       <div className="p-6 bg-base-100 border-t border-base-300 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
            <button
                onClick={currentStep === 0 ? onCancel : handleBack}
                className="px-6 py-3 rounded-xl text-sm font-bold text-base-content/70 hover:bg-base-300 hover:text-base-content/90 transition"
            >
                {currentStep === 0 ? 'Annuler' : 'Retour'}
            </button>

            <div className="flex items-center gap-3">
                {currentStep < STEPS.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        className="px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        Suivant <ArrowRight size={18} />
                    </button>
                ) : (
                    <>
                        {!formData.id && onSaveAndAddLots && (
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={loading}
                                className="px-6 py-3 rounded-xl bg-blue-100 text-blue-700 text-sm font-bold hover:bg-blue-200 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus size={16} /> Enregistrer & Ajouter Lots
                            </button>
                        )}
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                        >
                            <Save size={18} /> {formData.id ? 'Modifier' : 'Terminer'}
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default ImmeubleForm;
