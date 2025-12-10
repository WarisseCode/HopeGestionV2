// frontend/src/components/RegisterForm.tsx

import React, { useState } from 'react';
import { registerUser } from '../api/authApi'; // Assuming this API function exists or I need to create it
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterForm: React.FC = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);

        try {
            await registerUser(name, email, password);
            navigate('/dashboard.html');
        } catch (err: any) {
            setError(err.message || "Échec de l'inscription. Veuillez réessayer.");
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
                            <UserPlus className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="card-title text-2xl font-bold">Inscription</h2>
                        <p className="text-base-content/60">Rejoignez Hope Gestion</p>
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
                                <span className="label-text">Nom complet</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Jean Dupont"
                                className="input input-bordered w-full"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

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
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Confirmer le mot de passe</span>
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="input input-bordered w-full"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-control mt-6">
                            <button 
                                type="submit" 
                                className="btn btn-primary w-full" 
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "S'inscrire"}
                            </button>
                        </div>
                    </form>

                    <div className="divider">OU</div>

                    <div className="text-center mb-4">
                        <p>Déjà un compte ? <Link to="/login.html" className="link link-primary">Se connecter</Link></p>
                    </div>

                    <Link 
                        to="/"
                        className="btn btn-ghost btn-block gap-2"
                    >
                        <ArrowLeft size={16} /> Retour à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterForm;
