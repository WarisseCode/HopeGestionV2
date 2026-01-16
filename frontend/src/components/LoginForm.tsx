// frontend/src/components/LoginForm.tsx

import React, { useState } from 'react';
import { loginUser } from '../api/authApi';
import { accountApi } from '../api/accountApi';
import { Lock, ArrowLeft, Loader2, Eye, EyeOff, Key, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

interface LoginFormProps {
    onLoginSuccess: () => void;
    onGoBackToHome: () => void;
    onNavigateToSignup: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onGoBackToHome, onNavigateToSignup }) => {
    const [loginMode, setLoginMode] = useState<'email' | 'key'>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (loginMode === 'email') {
                await loginUser(email, password);
            } else {
                // loginWithKey now handles token storage and auth-change event internally
                await accountApi.loginWithKey(accessKey);
            }
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
        } finally {
            setLoading(false);
        }
    // Duplicate block removed
    };
    
    // ... rest of component


    const handleGoogleLogin = () => {
        // Simulation pour le moment
        console.log("Tentative de connexion Google");
    };

    const handleForgotPassword = (e: React.MouseEvent) => {
        e.preventDefault();
        // Simulation
        window.alert("Un lien de réinitialisation a été envoyé à votre adresse email (Simulation).");
    };

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-base-100 rounded-xl shadow-lg border border-base-200 p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="mb-4">
                        <img src="/logo.png" alt="Logo" className="w-20 h-auto mx-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-base-content">Connexion</h2>
                    <p className="text-base-content/60 mt-1">Heureux de vous revoir !</p>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex bg-base-200 p-1 rounded-lg mb-6">
                    <button
                        type="button"
                        onClick={() => setLoginMode('email')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${loginMode === 'email' ? 'bg-white shadow text-primary' : 'text-base-content/60 hover:text-base-content'}`}
                    >
                        <Mail size={16} /> Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setLoginMode('key')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${loginMode === 'key' ? 'bg-white shadow text-primary' : 'text-base-content/60 hover:text-base-content'}`}
                    >
                        <Key size={16} /> Clé d'accès
                    </button>
                </div>

                {error && (
                    <Alert variant="error" className="mb-6">
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {loginMode === 'email' ? (
                        <>
                            <Input
                                label="Adresse Email"
                                type="email"
                                placeholder="email@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />

                            <Input
                                label="Mot de passe"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                endIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-base-content/60 hover:text-base-content cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                                required
                            />
                            
                            <div className="flex justify-end">
                                <a href="#" onClick={handleForgotPassword} className="text-sm text-primary hover:text-primary-focus font-medium">Mot de passe oublié ?</a>
                            </div>
                        </>
                    ) : (
                        <div className="py-4">
                            <Input
                                label="Clé d'accès invité"
                                type="text"
                                placeholder="GUEST-XXXX-YYYY"
                                value={accessKey}
                                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                                required
                                autoFocus
                                className="font-mono text-center tracking-wider"
                            />
                            <p className="text-xs text-base-content/60 mt-2 text-center">
                                Entrez la clé fournie par votre gestionnaire.
                            </p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="w-full py-3" 
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={18} />
                                Chargement...
                            </>
                        ) : 'Se connecter'}
                    </Button>
                </form>

                <div className="mt-6">
                    <button 
                        onClick={handleGoogleLogin}
                        className="btn btn-outline w-full flex items-center justify-center gap-2 normal-case font-medium border-base-300 hover:bg-base-200 hover:border-base-300"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continuer avec Google
                    </button>
                </div>

                <div className="mt-6 text-center text-sm">
                    <span className="text-base-content/60">Pas encore de compte ? </span>
                    <button 
                        onClick={onNavigateToSignup} 
                        className="text-primary hover:text-primary-focus font-semibold hover:underline"
                    >
                        Créer un compte
                    </button>
                </div>

                <div className="divider my-8 text-base-content/50">OU</div>

                <Button 
                    variant="ghost" 
                    className="w-full py-3"
                    onClick={onGoBackToHome}
                >
                    <ArrowLeft size={18} className="mr-2" /> Retour à l'accueil
                </Button>
            </div>
        </div>
    );
};

export default LoginForm;
