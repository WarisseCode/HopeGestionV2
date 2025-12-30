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
  onNavigateToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onGoBackToHome, onNavigateToLogin }) => {
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

  const handleGoogleSignup = () => {
      // Simulation pour le moment
      console.log("Tentative d'inscription Google");
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

          <div className="mt-4">
              <button 
                  onClick={handleGoogleSignup}
                  className="btn btn-outline w-full flex items-center justify-center gap-2 normal-case font-medium border-base-300 hover:bg-base-200 hover:border-base-300"
              >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  S'inscrire avec Google
              </button>
          </div>
          
          <div className="divider my-6">OU</div>
          
          <div className="text-center">
            <p className="text-sm text-base-content/70">
              Vous avez déjà un compte ?{' '}
              <button 
                onClick={onNavigateToLogin}
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