// frontend/src/pages/Maintenance.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Mail, Phone } from 'lucide-react';
import { API_URL } from '../config';

const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    enabled: true,
    message: 'Site en maintenance. Merci de votre patience.'
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est admin
    const token = localStorage.getItem('userToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }

    // Récupérer le message de maintenance personnalisé
    fetch(`${API_URL}/public/maintenance/status`)
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setMaintenanceInfo({
            enabled: data.enabled,
            message: data.message || 'Site en maintenance. Merci de votre patience.'
          });
        }
      })
      .catch(err => {
        console.error('Error fetching maintenance status:', err);
      });
  }, []);

  const handleAdminAccess = () => {
    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Icône d'alerte */}
          <div className="mb-8 flex justify-center">
            <div className="bg-amber-100 rounded-full p-6 animate-pulse">
              <AlertTriangle className="w-16 h-16 text-amber-600" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Site en Maintenance
          </h1>

          {/* Message personnalisé */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {maintenanceInfo.message}
          </p>

          {/* Informations supplémentaires */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 text-gray-700 mb-4">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Nous travaillons pour améliorer votre expérience</span>
            </div>
            <p className="text-gray-600 text-sm">
              Le site sera bientôt de retour. Nous vous remercions de votre patience et de votre compréhension.
            </p>
          </div>

          {/* Informations de contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">support@hopegestion.com</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <Phone className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">+225 07 00 00 00 00</span>
            </div>
          </div>

          {/* Bouton admin uniquement si admin */}
          {isAdmin && (
            <button
              onClick={handleAdminAccess}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Accès Admin
            </button>
          )}

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} HopeGestion. Tous droits réservés.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Pour toute question urgente, n'hésitez pas à nous contacter.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
