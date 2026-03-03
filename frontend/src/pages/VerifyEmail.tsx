import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyEmail, resendOtp as resendOtpApi } from '../api/authApi';
import { MailOpen, ArrowLeft, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  // On récupère l'email depuis le state de navigation (via SignupForm ou LoginForm)
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/login'); // Rediriger si on n'a pas l'email en contexte
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Le code doit contenir exactement 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await verifyEmail(email, otp);
      setSuccess(response.message || 'E-mail vérifié avec succès ! Redirection...');
      
      localStorage.setItem('userToken', response.token);
      localStorage.setItem('userRole', response.role);
      localStorage.setItem('userId', response.userId.toString());
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification du code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await resendOtpApi(email);
      setSuccess(response.message || 'Un nouveau code a été envoyé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <MailOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Vérifiez votre E-mail
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nous avons envoyé un code à 6 chiffres à <br />
          <span className="font-bold">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 text-center">
                Code de vérification
              </label>
              <div className="mt-2 flex justify-center">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  className="appearance-none block w-3/4 px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-xl text-center font-mono tracking-widest"
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // Que des chiffres
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Vérifier mon compte'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Vous n'avez rien reçu ?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none flex items-center justify-center w-full"
              >
                {resendLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                Renvoyer le code
              </button>
            </div>
            
            <div className="mt-4 text-center">
               <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center w-full"
              >
                <ArrowLeft className="mr-2" /> Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
