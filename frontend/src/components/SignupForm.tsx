// frontend/src/components/SignupForm.tsx
import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Building2, 
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Alert from './ui/Alert';
import Select from './ui/Select';
import { registerUser } from '../api/authApi';

interface SignupFormProps {
  onSignupSuccess: () => void;
  onGoBackToHome: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onGoBackToHome }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    userType: 'gestionnaire'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation simple
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (!formData.nom || !formData.prenoms || !formData.email || !formData.telephone) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setLoading(true);
    
    try {
      // Appel API pour l'inscription
      await registerUser(
        formData.nom,
        formData.prenoms,
        formData.email,
        formData.telephone,
        formData.password,
        formData.userType
      );
      
      // Appeler la fonction de succès
      onSignupSuccess();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
      console.error('Erreur d\'inscription:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Logo" className="w-16 h-auto mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-base-content">Créer un compte</h2>
            <p className="text-base-content/70 mt-2">Rejoignez Hope Gestion pour gérer vos biens immobiliers</p>
          </div>
          
          {error && <Alert variant="error">{error}</Alert>}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nom"
                  name="nom"
                  type="text"
                  placeholder="Votre nom"
                  value={formData.nom}
                  onChange={handleChange}
                  startIcon={<User size={16} />}
                  required
                />
                <Input
                  label="Prénoms"
                  name="prenoms"
                  type="text"
                  placeholder="Vos prénoms"
                  value={formData.prenoms}
                  onChange={handleChange}
                  startIcon={<User size={16} />}
                  required
                />
              </div>
              
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                startIcon={<Mail size={16} />}
                required
              />
              
              <Input
                label="Téléphone"
                name="telephone"
                type="tel"
                placeholder="+229 00 000 000"
                value={formData.telephone}
                onChange={handleChange}
                startIcon={<Phone size={16} />}
                required
              />
              
              <Input
                label="Mot de passe"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                startIcon={<Lock size={16} />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-base-content/60 hover:text-base-content"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />
              
              <Input
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                startIcon={<Lock size={16} />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-base-content/60 hover:text-base-content"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />
            </div>
            
            <Select
              label="Type de compte"
              name="userType"
              value={formData.userType}
              onChange={(e) => setFormData({...formData, userType: e.target.value})}
              options={[
                { value: 'gestionnaire', label: 'Gestionnaire' },
                { value: 'proprietaire', label: 'Propriétaire' },
                { value: 'locataire', label: 'Locataire' },
                { value: 'agent_recouvreur', label: 'Agent Recouvreur' },
                { value: 'comptable', label: 'Comptable' }
              ]}
              required
            />
            
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </form>
          
          <div className="divider my-6">OU</div>
          
          <div className="text-center">
            <p className="text-sm text-base-content/70">
              Vous avez déjà un compte ?{' '}
              <button 
                onClick={onGoBackToHome}
                className="text-primary font-medium hover:underline"
              >
                Connectez-vous
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;