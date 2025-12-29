// frontend/src/components/LoginForm.tsx

import React, { useState } from 'react';
import { loginUser } from '../api/authApi';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

interface LoginFormProps {
    onLoginSuccess: () => void;
    onGoBackToHome: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onGoBackToHome }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await loginUser(email, password);
            onLoginSuccess();
            // alert(`Connexion réussie !`); // Removed alert for better UX
        } catch (err: any) {
            setError(err.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
        } finally {
            setLoading(false);
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
                    <p className="text-base-content/60 mt-1">Gestion Locative</p>
                </div>

                {error && (
                    <Alert variant="error" className="mb-6">
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
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
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <div className="flex justify-end">
                        <a href="#" className="text-sm text-primary hover:text-primary-focus">Mot de passe oublié ?</a>
                    </div>

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
