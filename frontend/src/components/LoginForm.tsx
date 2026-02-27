// frontend/src/components/LoginForm.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { loginUser } from '../api/authApi';
import { accountApi } from '../api/accountApi';
import { Lock, ArrowLeft, Loader2, Eye, EyeOff, Key, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { API_URL } from '../config';

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


    const navigate = useNavigate();
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setGoogleLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userToken', data.token);
                window.dispatchEvent(new Event('auth-change'));

                if (data.needsProfileCompletion) {
                    navigate('/complete-profile');
                } else {
                    // Force full page reload to ensure token is properly recognized
                    window.location.href = '/dashboard';
                }
            } else {
                setError(data.message || 'Erreur Google OAuth');
            }
        } catch (err) {
            setError('Erreur de connexion avec Google');
        } finally {
            setGoogleLoading(false);
        }
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
                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${loginMode === 'email' ? 'bg-base-100 shadow text-primary' : 'text-base-content/60 hover:text-base-content'}`}
                    >
                        <Mail size={16} /> Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setLoginMode('key')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${loginMode === 'key' ? 'bg-base-100 shadow text-primary' : 'text-base-content/60 hover:text-base-content'}`}
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
                                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-focus font-medium">Mot de passe oublié ?</Link>
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
                    {googleLoading ? (
                        <div className="flex justify-center">
                            <span className="loading loading-spinner loading-md"></span>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Erreur de connexion Google')}
                                text="continue_with"
                                size="large"
                                width={300}
                            />
                        </div>
                    )}
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
