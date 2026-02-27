// frontend/src/components/locataires/LocataireForm.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, FileText, Wallet, Key,
  Phone, Mail, MapPin, Calendar, CreditCard, Shield,
  ArrowLeft, ArrowRight, Save, Check
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import PhoneInput from '../ui/PhoneInput';
import type { Locataire } from '../../api/locataireApi';

interface LocataireFormProps {
  locataire?: Partial<Locataire>;
  onSave: (data: Partial<Locataire>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const STEPS = [
  { id: 0, title: 'Identité', icon: <User size={20} /> },
  { id: 1, title: 'Documents', icon: <FileText size={20} /> },
  { id: 2, title: 'Finances', icon: <Wallet size={20} /> },
  { id: 3, title: 'Accès', icon: <Key size={20} /> },
];

const LocataireForm: React.FC<LocataireFormProps> = ({
  locataire,
  onSave,
  onCancel,
  loading = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
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

  // Only populate form data on initial mount OR when editing (locataire has id)
  // This prevents resetting user input when parent re-renders
  const didPopulateRef = React.useRef(false);
  
  useEffect(() => {
    // For editing: populate if locataire has an id and we haven't populated yet
    // For creation: don't populate (use defaults)
    if (locataire?.id && !didPopulateRef.current) {
      didPopulateRef.current = true;
      setFormData(prev => ({
        ...prev,
        ...locataire,
        date_expiration_piece: locataire.date_expiration_piece 
          ? new Date(locataire.date_expiration_piece).toISOString().split('T')[0] 
          : ''
      }));
    }
  }, [locataire?.id]);

  const handleChange = (field: string, value: any) => {
    let formattedValue = value;
    
    // Auto-formatting for names
    if (field === 'nom' && typeof value === 'string') {
      formattedValue = value.toUpperCase();
    } else if (field === 'prenoms' && typeof value === 'string') {
      // Capitalize first letter of each word
      formattedValue = value.replace(/\b\w/g, char => char.toUpperCase());
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleSubmit = async () => {
    await onSave(formData as any);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Identité
        return !!formData.nom && !!formData.prenoms && !!formData.telephone_principal;
      case 1: // Documents
        return true; // Optional
      case 2: // Finances
        return true; // Optional
      case 3: // Accès
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid()) {
      setDirection(1);
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0 })
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-base-200 overflow-hidden">
      {/* Wizard Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-200">
        <h2 className="text-xl font-bold text-base-content">
          {locataire?.id ? 'Modifier le locataire' : 'Nouveau locataire'}
        </h2>
        <p className="text-base-content/60 text-sm mt-1">
          Étape {currentStep + 1} sur {STEPS.length}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex justify-between items-center px-6 py-4 bg-base-100 border-b border-base-200">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => goToStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                currentStep === step.id
                  ? 'bg-primary text-primary-content'
                  : currentStep > step.id
                  ? 'bg-success/20 text-success'
                  : 'bg-base-200 text-base-content/60'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep > step.id ? 'bg-success text-white' : ''
              }`}>
                {currentStep > step.id ? <Check size={16} /> : step.icon}
              </div>
              <span className="hidden md:inline text-sm font-medium">{step.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${
                currentStep > index ? 'bg-success' : 'bg-base-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Wizard Content */}
      <div className="p-6 min-h-[450px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {/* Step 0: Identité */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center gap-4">
                   <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white ring-1 ring-gray-100 bg-gray-50">
                      <ImageUpload 
                        value={formData.photo_profil_url}
                        onChange={(url) => handleChange('photo_profil_url', url)}
                        folder="avatar"
                        className="w-full h-full [&_div]:border-none [&_div]:rounded-none [&_div]:h-full [&_div]:bg-transparent"
                        label=""
                        clearOnSuccess={false}
                      />
                   </div>
                   <span className="text-xs text-gray-500 font-medium">Photo de profil</span>
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
                    required
                    startIcon={<User size={16} />}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <PhoneInput
                    label="Téléphone Principal (WhatsApp)"
                    value={formData.telephone_principal}
                    onChange={(full) => handleChange('telephone_principal', full)}
                    required
                  />
                  <PhoneInput
                    label="Téléphone Secondaire"
                    value={formData.telephone_secondaire || ''}
                    onChange={(full) => handleChange('telephone_secondaire', full)}
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

            {/* Step 1: Documents */}
            {currentStep === 1 && (
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

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                     <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText size={16} /> Photo de la pièce
                     </h4>
                     <ImageUpload 
                        value={formData.photo_piece_url}
                        onChange={(url) => handleChange('photo_piece_url', url)}
                        folder="document"
                        label=""
                     />
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                     <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <User size={16} /> Photo du locataire
                     </h4>
                     <ImageUpload 
                        value={formData.photo_profil_url}
                        onChange={(url) => handleChange('photo_profil_url', url)}
                        folder="avatar"
                        label=""
                     />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Finances */}
            {currentStep === 2 && (
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

            {/* Step 3: Accès */}
            {currentStep === 3 && (
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center p-6 bg-base-100 border-t border-base-200">
        <Button 
          variant="ghost" 
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          {currentStep === 0 ? 'Annuler' : 'Précédent'}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button 
            variant="primary"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="flex items-center gap-2"
          >
            Suivant
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button 
            variant="primary"
            onClick={handleSubmit}
            disabled={!isStepValid() || loading}
            className="flex items-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Enregistrement...' : (locataire?.id ? 'Mettre à jour' : 'Enregistrer')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LocataireForm;
