// frontend/src/components/LoginForm.tsx

import React, { useState } from 'react';
import { loginUser } from '../api/authApi';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';

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
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-primary/10 p-3 rounded-full mb-4">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="card-title text-2xl font-bold">Connexion</h2>
                        <p className="text-base-content/60">Gestion Locative</p>
                    </div>

                    {error && (
                        <div role="alert" className="alert alert-error mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Adresse Email</span>
                            </label>
                            <input
                                type="email"
                                placeholder="email@exemple.com"
                                className="input input-bordered w-full"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Mot de passe</span>
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="input input-bordered w-full"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <label className="label">
                                <a href="#" className="label-text-alt link link-hover">Mot de passe oublié ?</a>
                            </label>
                        </div>

                        <div className="form-control mt-6">
                            <button 
                                type="submit" 
                                className="btn btn-primary w-full" 
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Se connecter'}
                            </button>
                        </div>
                    </form>

                    <div className="divider">OU</div>

                    <button 
                        onClick={onGoBackToHome}
                        className="btn btn-ghost btn-block gap-2"
                    >
                        <ArrowLeft size={16} /> Retour à l'accueil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
