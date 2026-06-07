// frontend/src/pages/public/InvitationPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { API_URL } from '../../config';

interface InvitationContext {
  type: 'owner' | 'tenant';
  gestionnaire_nom: string;
  expires_at: string;
}

type Status = 'loading' | 'valid' | 'error' | 'submitting' | 'success';

interface OwnerForm {
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  type_proprietaire: 'individual' | 'company';
  password: string;
  confirmPassword: string;
}

interface TenantForm {
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  adresse: string;
  password: string;
  confirmPassword: string;
}

const defaultOwnerForm: OwnerForm = {
  nom: '', prenoms: '', telephone: '', email: '',
  adresse: '', ville: '', type_proprietaire: 'individual',
  password: '', confirmPassword: ''
};

const defaultTenantForm: TenantForm = {
  nom: '', prenoms: '', telephone: '', email: '',
  adresse: '', password: '', confirmPassword: ''
};

const InvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('loading');
  const [context, setContext] = useState<InvitationContext | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [ownerForm, setOwnerForm] = useState<OwnerForm>(defaultOwnerForm);
  const [tenantForm, setTenantForm] = useState<TenantForm>(defaultTenantForm);

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
        setStatus('valid');
      })
      .catch(() => {
        setErrorMsg("Impossible de valider l'invitation. Vérifiez votre connexion.");
        setStatus('error');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = context?.type === 'owner' ? ownerForm : tenantForm;

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
      const body = context?.type === 'owner'
        ? {
            nom: ownerForm.nom,
            prenoms: ownerForm.prenoms || undefined,
            telephone: ownerForm.telephone,
            email: ownerForm.email || undefined,
            adresse: ownerForm.adresse || undefined,
            ville: ownerForm.ville || undefined,
            type_proprietaire: ownerForm.type_proprietaire,
            password: ownerForm.password
          }
        : {
            nom: tenantForm.nom,
            prenoms: tenantForm.prenoms || undefined,
            telephone: tenantForm.telephone,
            email: tenantForm.email || undefined,
            adresse: tenantForm.adresse || undefined,
            password: tenantForm.password
          };

      const r = await fetch(`${API_URL}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Le navigateur reçoit le cookie httpOnly refreshToken
        body: JSON.stringify(body)
      });

      const data = await r.json();
      if (!r.ok) {
        setErrorMsg(data.error || 'Une erreur est survenue');
        setStatus('valid');
        return;
      }

      localStorage.setItem('userToken', data.accessToken);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user));
      setStatus('success');

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch {
      setErrorMsg('Erreur réseau. Veuillez réessayer.');
      setStatus('valid');
    }
  };

  const roleLabel = context?.type === 'owner' ? 'Propriétaire' : 'Locataire';
  const roleColor = context?.type === 'owner' ? 'text-teal-600' : 'text-green-600';
  const roleBg = context?.type === 'owner' ? 'bg-teal-50' : 'bg-green-50';
  const btnClass = context?.type === 'owner' ? 'btn-primary' : 'btn-success';

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Hope Gestion" className="h-14 w-auto mx-auto" />
        </div>

        <div className="bg-base-100 rounded-2xl shadow-xl p-8">

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-base-content/60">Vérification de l'invitation...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertTriangle className="text-error" size={48} />
              <h2 className="text-xl font-bold">Invitation invalide</h2>
              <p className="text-base-content/60">{errorMsg}</p>
              <a href="/login" className="btn btn-primary mt-4">Aller à la connexion</a>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle2 className="text-success" size={48} />
              <h2 className="text-xl font-bold">Compte créé avec succès !</h2>
              <p className="text-base-content/60">Redirection vers votre espace...</p>
            </div>
          )}

          {(status === 'valid' || status === 'submitting') && context && (
            <>
              <div className={`${roleBg} rounded-xl p-4 mb-6`}>
                <p className="text-sm text-base-content/60 mb-1">Vous avez été invité(e) par</p>
                <p className="font-bold">{context.gestionnaire_nom}</p>
                <p className={`text-sm font-semibold mt-1 ${roleColor}`}>Espace {roleLabel}</p>
              </div>

              <h1 className="text-2xl font-bold mb-6">Créer votre compte</h1>

              {errorMsg && <div className="alert alert-error mb-4 text-sm">{errorMsg}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Champs communs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Nom *</span></label>
                    <input
                      className="input input-bordered w-full"
                      value={context.type === 'owner' ? ownerForm.nom : tenantForm.nom}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, nom: e.target.value })
                        : setTenantForm({ ...tenantForm, nom: e.target.value })}
                      placeholder="DUPONT"
                      required
                      disabled={status === 'submitting'}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Prénom(s)</span></label>
                    <input
                      className="input input-bordered w-full"
                      value={context.type === 'owner' ? ownerForm.prenoms : tenantForm.prenoms}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, prenoms: e.target.value })
                        : setTenantForm({ ...tenantForm, prenoms: e.target.value })}
                      placeholder="Jean"
                      disabled={status === 'submitting'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Téléphone *</span></label>
                    <input
                      type="tel"
                      className="input input-bordered w-full"
                      value={context.type === 'owner' ? ownerForm.telephone : tenantForm.telephone}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, telephone: e.target.value })
                        : setTenantForm({ ...tenantForm, telephone: e.target.value })}
                      placeholder="+229 01 00 00 00"
                      required
                      disabled={status === 'submitting'}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={context.type === 'owner' ? ownerForm.email : tenantForm.email}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, email: e.target.value })
                        : setTenantForm({ ...tenantForm, email: e.target.value })}
                      placeholder="jean@exemple.com"
                      disabled={status === 'submitting'}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Adresse</span></label>
                  <input
                    className="input input-bordered w-full"
                    value={context.type === 'owner' ? ownerForm.adresse : tenantForm.adresse}
                    onChange={e => context.type === 'owner'
                      ? setOwnerForm({ ...ownerForm, adresse: e.target.value })
                      : setTenantForm({ ...tenantForm, adresse: e.target.value })}
                    placeholder="Rue de l'Église, Cotonou"
                    disabled={status === 'submitting'}
                  />
                </div>

                {/* Champs spécifiques Propriétaire */}
                {context.type === 'owner' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label pb-1"><span className="label-text font-medium">Ville</span></label>
                      <input
                        className="input input-bordered w-full"
                        value={ownerForm.ville}
                        onChange={e => setOwnerForm({ ...ownerForm, ville: e.target.value })}
                        placeholder="Cotonou"
                        disabled={status === 'submitting'}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label pb-1"><span className="label-text font-medium">Type</span></label>
                      <select
                        className="select select-bordered w-full"
                        value={ownerForm.type_proprietaire}
                        onChange={e => setOwnerForm({ ...ownerForm, type_proprietaire: e.target.value as 'individual' | 'company' })}
                        disabled={status === 'submitting'}
                      >
                        <option value="individual">Particulier</option>
                        <option value="company">Entreprise</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="divider text-xs text-base-content/40">Sécurité du compte</div>

                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-medium">Mot de passe *</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input input-bordered w-full pr-10"
                      value={context.type === 'owner' ? ownerForm.password : tenantForm.password}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, password: e.target.value })
                        : setTenantForm({ ...tenantForm, password: e.target.value })}
                      required
                      minLength={8}
                      placeholder="8 caractères minimum"
                      disabled={status === 'submitting'}
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
                      value={context.type === 'owner' ? ownerForm.confirmPassword : tenantForm.confirmPassword}
                      onChange={e => context.type === 'owner'
                        ? setOwnerForm({ ...ownerForm, confirmPassword: e.target.value })
                        : setTenantForm({ ...tenantForm, confirmPassword: e.target.value })}
                      required
                      disabled={status === 'submitting'}
                    />
                    <button type="button" className="absolute right-3 top-3 text-base-content/40"
                      onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn ${btnClass} w-full mt-2`}
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
