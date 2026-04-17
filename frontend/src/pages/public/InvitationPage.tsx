// frontend/src/pages/public/InvitationPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { API_URL } from '../../config';

interface InvitationContext {
  type: 'owner' | 'tenant';
  gestionnaire_nom: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  expires_at: string;
}

type Status = 'loading' | 'valid' | 'error' | 'submitting' | 'success';

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [context, setContext] = useState<InvitationContext | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    nom: '',
    prenoms: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/invitations/validate/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          setErrorMsg(data.error || 'Invitation invalide');
          setStatus('error');
          return;
        }
        const data: InvitationContext = await r.json();
        setContext(data);
        setForm(f => ({
          ...f,
          nom: data.nom || '',
          prenoms: data.prenom || '',
          email: data.email || '',
          telephone: data.telephone || ''
        }));
        setStatus('valid');
      })
      .catch(() => {
        setErrorMsg('Impossible de valider l\'invitation. Vérifiez votre connexion.');
        setStatus('error');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 8) {
      setErrorMsg('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setErrorMsg('');
    setStatus('submitting');

    try {
      const r = await fetch(`${API_URL}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          prenoms: form.prenoms,
          email: form.email || undefined,
          telephone: form.telephone || undefined,
          password: form.password
        })
      });

      const data = await r.json();

      if (!r.ok) {
        setErrorMsg(data.error || 'Une erreur est survenue');
        setStatus('valid');
        return;
      }

      // Stocker les tokens et rediriger vers l'espace personnel
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setStatus('success');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch {
      setErrorMsg('Erreur réseau. Veuillez réessayer.');
      setStatus('valid');
    }
  };

  const roleLabel = context?.type === 'owner' ? 'Propriétaire' : 'Locataire';
  const roleColor = context?.type === 'owner' ? 'text-blue-600' : 'text-green-600';
  const roleBg = context?.type === 'owner' ? 'bg-blue-50' : 'bg-green-50';

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Hope Gestion" className="h-14 w-auto mx-auto" />
        </div>

        <div className="bg-base-100 rounded-2xl shadow-xl p-8">

          {/* Chargement */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-base-content/60">Vérification de l'invitation...</p>
            </div>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertTriangle className="text-error" size={48} />
              <h2 className="text-xl font-bold">Invitation invalide</h2>
              <p className="text-base-content/60">{errorMsg}</p>
              <a href="/login" className="btn btn-primary mt-4">Aller à la connexion</a>
            </div>
          )}

          {/* Succès */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle2 className="text-success" size={48} />
              <h2 className="text-xl font-bold">Compte créé avec succès !</h2>
              <p className="text-base-content/60">Redirection vers votre espace...</p>
            </div>
          )}

          {/* Formulaire */}
          {(status === 'valid' || status === 'submitting') && context && (
            <>
              <div className={`${roleBg} rounded-xl p-4 mb-6`}>
                <p className="text-sm text-base-content/60 mb-1">Vous avez été invité(e) par</p>
                <p className="font-bold">{context.gestionnaire_nom}</p>
                <p className={`text-sm font-semibold mt-1 ${roleColor}`}>Espace {roleLabel}</p>
              </div>

              <h1 className="text-2xl font-bold mb-6">Créer votre compte</h1>

              {errorMsg && (
                <div className="alert alert-error mb-4 text-sm">{errorMsg}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Nom *</span></label>
                    <input
                      className="input input-bordered w-full"
                      value={form.nom}
                      onChange={e => setForm({ ...form, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Prénoms</span></label>
                    <input
                      className="input input-bordered w-full"
                      value={form.prenoms}
                      onChange={e => setForm({ ...form, prenoms: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Téléphone</span></label>
                  <input
                    type="tel"
                    className="input input-bordered w-full"
                    value={form.telephone}
                    onChange={e => setForm({ ...form, telephone: e.target.value })}
                    placeholder="+229 01 00 00 00"
                  />
                </div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Mot de passe *</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input input-bordered w-full pr-10"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <button type="button" className="absolute right-3 top-3 text-base-content/40"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Confirmer le mot de passe *</span></label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="input input-bordered w-full pr-10"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                    />
                    <button type="button" className="absolute right-3 top-3 text-base-content/40"
                      onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full mt-2"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting'
                    ? <><Loader2 className="animate-spin mr-2" size={16} />Création en cours...</>
                    : 'Créer mon compte'}
                </button>
              </form>

              <p className="text-center text-xs text-base-content/40 mt-6">
                Invitation valide jusqu'au {new Date(context.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;
