// frontend/src/components/proprietaires/ProprietaireForm.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, FileText, Settings, Check, ArrowRight, ArrowLeft, 
  Camera, MessageCircle, Save
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

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

const STEPS = [
  { id: 0, title: 'Informations Générales', icon: <User size={20} /> },
  { id: 1, title: 'Documents', icon: <FileText size={20} /> },
  { id: 2, title: 'Paramètres & Délégation', icon: <Settings size={20} /> }
];

const ProprietaireForm: React.FC<ProprietaireFormProps> = ({
  owner,
  onSave,
  onCancel,
  loading = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Owner>>({
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
    ...owner
  });

  useEffect(() => {
    if (owner) {
      setFormData({
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
        ...owner
      });
    }
  }, [owner]);

  const handleChange = (field: keyof Owner, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('photo_url', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Informations Générales
        if (formData.type === 'individual') {
          return !!formData.name && !!formData.phone;
        } else {
          return !!formData.company_name && !!formData.phone;
        }
      case 1: // Documents
        return true; // No required fields
      case 2: // Paramètres
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

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!isStepValid()) return;
    
    // Send all data including photo_url (now supported by backend TEXT column)
    await onSave(formData);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 100 : -100, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 100 : -100, opacity: 0 })
  };

  const [direction, setDirection] = useState(0);

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-base-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-200">
        <h2 className="text-xl font-bold text-base-content">
          {owner?.id ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
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

      {/* Form Content */}
      <div className="p-6 min-h-[400px]">
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
            {/* Step 0: Informations Générales */}
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* Photo Upload */}
                <div className="flex justify-center mb-6">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-base-200 shadow-sm bg-base-100 flex items-center justify-center">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Propriétaire" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-base-content/40" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-primary text-primary-content p-2 rounded-full cursor-pointer hover:bg-primary-focus transition shadow-sm">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                {/* Type Selection */}
                <div className="bg-base-100 p-4 rounded-xl border border-base-200">
                  <label className="block text-sm font-medium text-base-content mb-3">Type de propriétaire</label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${
                      formData.type === 'individual' ? 'bg-primary/10 border-primary' : 'bg-base-100 border-base-200 hover:border-primary/50'
                    }`}>
                      <input 
                        type="radio" 
                        checked={formData.type === 'individual'}
                        onChange={() => handleChange('type', 'individual')}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="font-medium">Particulier</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${
                      formData.type === 'company' ? 'bg-primary/10 border-primary' : 'bg-base-100 border-base-200 hover:border-primary/50'
                    }`}>
                      <input 
                        type="radio" 
                        checked={formData.type === 'company'}
                        onChange={() => handleChange('type', 'company')}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="font-medium">Entreprise</span>
                    </label>
                  </div>
                </div>

                {/* Identity Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.type === 'individual' ? (
                    <>
                      <Input 
                        label="Nom *" 
                        value={formData.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                      <Input 
                        label="Prénom" 
                        value={formData.prenom || ''}
                        onChange={(e) => handleChange('prenom', e.target.value)}
                      />
                    </>
                  ) : (
                    <>
                      <Input 
                        label="Raison Sociale *" 
                        value={formData.company_name || ''}
                        onChange={(e) => handleChange('company_name', e.target.value)}
                        required
                      />
                      <Input 
                        label="Numéro RCCM" 
                        value={formData.rccm_number || ''}
                        onChange={(e) => handleChange('rccm_number', e.target.value)}
                      />
                    </>
                  )}

                  <Input 
                    label="Email" 
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />

                  <div className="relative">
                    <Input 
                      label="Téléphone Principal *" 
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                    />
                    {formData.phone && (
                      <button 
                        type="button" 
                        onClick={() => openWhatsApp(formData.phone!)}
                        className="absolute top-0 right-0 text-success text-xs flex items-center gap-1 hover:underline"
                      >
                        <MessageCircle size={12}/> WhatsApp
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Input 
                      label="Téléphone Secondaire" 
                      type="tel"
                      value={formData.secondary_phone || ''}
                      onChange={(e) => handleChange('secondary_phone', e.target.value)}
                    />
                    {formData.secondary_phone && (
                      <button 
                        type="button" 
                        onClick={() => openWhatsApp(formData.secondary_phone!)}
                        className="absolute top-0 right-0 text-success text-xs flex items-center gap-1 hover:underline"
                      >
                        <MessageCircle size={12}/> WhatsApp
                      </button>
                    )}
                  </div>

                  <Input 
                    label="Mobile Money" 
                    placeholder="+229 01..."
                    value={formData.mobile_money || ''}
                    onChange={(e) => handleChange('mobile_money', e.target.value)}
                  />

                  <Input 
                    label="Adresse" 
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />

                  <Input 
                    label="Pays" 
                    value={formData.country || 'Bénin'}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Documents */}
            {currentStep === 1 && (
              <div className="p-8 text-center border-2 border-dashed border-base-200 rounded-xl bg-base-100 h-[300px] flex flex-col items-center justify-center text-base-content/60">
                <FileText size={48} className="mb-4 text-base-content/30" />
                <h3 className="text-lg font-medium mb-2">Documents du Propriétaire</h3>
                <p className="max-w-xs mb-6">Ajoutez ici les contrats de mandat, pièces d'identité et autres documents légaux.</p>
                <Button variant="ghost" disabled>À venir bientôt</Button>
              </div>
            )}

            {/* Step 2: Paramètres & Délégation */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-base-content mb-3">Mode de gestion</label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${
                      formData.management_mode === 'direct' ? 'bg-success/10 border-success' : 'bg-base-100 border-base-200 hover:border-success/50'
                    }`}>
                      <input 
                        type="radio" 
                        checked={formData.management_mode === 'direct'}
                        onChange={() => handleChange('management_mode', 'direct')}
                        className="radio radio-success radio-sm"
                      />
                      <span className={formData.management_mode === 'direct' ? 'text-success font-medium' : 'font-medium'}>Direct</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${
                      formData.management_mode === 'delegated' ? 'bg-warning/10 border-warning' : 'bg-base-100 border-base-200 hover:border-warning/50'
                    }`}>
                      <input 
                        type="radio" 
                        checked={formData.management_mode === 'delegated'}
                        onChange={() => handleChange('management_mode', 'delegated')}
                        className="radio radio-warning radio-sm"
                      />
                      <span className={formData.management_mode === 'delegated' ? 'text-warning font-medium' : 'font-medium'}>Délégué</span>
                    </label>
                  </div>
                  <p className="text-xs text-base-content/60 mt-2">
                    {formData.management_mode === 'direct' 
                      ? "Le propriétaire gère lui-même ses biens sur la plateforme." 
                      : "La gestion des biens est déléguée à l'agence (Mandat de gestion)."}
                  </p>
                </div>

                {/* Delegation Fields */}
                {formData.management_mode === 'delegated' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-warning/10 p-4 rounded-xl border border-warning/20 grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-warning mb-1">Début du mandat</label>
                      <input 
                        type="date"
                        value={formData.delegation_start_date ? formData.delegation_start_date.split('T')[0] : ''}
                        onChange={(e) => handleChange('delegation_start_date', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-warning/30 focus:ring-2 focus:ring-warning bg-base-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-warning mb-1">Fin du mandat (Optionnel)</label>
                      <input 
                        type="date"
                        value={formData.delegation_end_date ? formData.delegation_end_date.split('T')[0] : ''}
                        onChange={(e) => handleChange('delegation_end_date', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-warning/30 focus:ring-2 focus:ring-warning bg-base-100"
                      />
                    </div>
                  </motion.div>
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
            {loading ? 'Enregistrement...' : (owner?.id ? 'Mettre à jour' : 'Créer le propriétaire')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProprietaireForm;
