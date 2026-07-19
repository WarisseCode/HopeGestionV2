// frontend/src/pages/admin/AdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save,
  RefreshCw,
  Server,
  Mail,
  Globe,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config';
import { apiCall } from '../../utils/apiUtils';
import toast from 'react-hot-toast';

interface PlatformSettings {
  name: string;
  description: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxPropertiesPerUser: number;
  defaultUserRole: string;
}

interface EmailConfig {
  host: string;
  port: string;
  user: string;
  from: string;
}

interface SystemInfo {
  nodeVersion: string;
  environment: string;
  databaseConnected: boolean;
  frontendUrl: string;
}

const AdminSettings: React.FC = () => {
  const [platform, setPlatform] = useState<PlatformSettings>({
    name: 'HopeGestion',
    description: 'Plateforme de gestion immobilière',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxPropertiesPerUser: 10,
    defaultUserRole: 'gestionnaire',
  });
  const [email, setEmail] = useState<EmailConfig>({ host: '', port: '', user: '', from: '' });
  const [system, setSystem] = useState<SystemInfo>({
    nodeVersion: '', environment: '', databaseConnected: false, frontendUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Le mode maintenance réel vit dans system_settings (voir /admin/maintenance/*),
  // pas dans admin_settings (table générique de cette page) — on le traque à part
  // pour ne l'envoyer au bon endpoint que s'il a réellement changé.
  const [initialMaintenanceMode, setInitialMaintenanceMode] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [data, maintenanceStatus] = await Promise.all([
        apiCall<{ platform?: PlatformSettings; email?: EmailConfig; system?: SystemInfo }>(`${API_URL}/admin/settings`),
        apiCall<{ enabled: boolean }>(`${API_URL}/admin/maintenance/status`),
      ]);
      if (data.platform) setPlatform({ ...data.platform, maintenanceMode: maintenanceStatus.enabled });
      if (data.email) setEmail(data.email);
      if (data.system) setSystem(data.system);
      setInitialMaintenanceMode(maintenanceStatus.enabled);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const calls: Promise<any>[] = [
        apiCall<{ message: string }>(`${API_URL}/admin/settings`, {
          method: 'PUT',
          body: JSON.stringify({
            settings: {
              platform_name: platform.name,
              platform_description: platform.description,
              allow_registration: platform.allowRegistration.toString(),
              require_email_verification: platform.requireEmailVerification.toString(),
              max_properties_per_user: platform.maxPropertiesPerUser.toString(),
              default_user_role: platform.defaultUserRole,
            }
          }),
        }),
      ];
      if (platform.maintenanceMode !== initialMaintenanceMode) {
        calls.push(apiCall<{ message: string; enabled: boolean }>(`${API_URL}/admin/maintenance/toggle`, {
          method: 'PUT',
          body: JSON.stringify({ enabled: platform.maintenanceMode }),
        }));
      }
      await Promise.all(calls);
      setInitialMaintenanceMode(platform.maintenanceMode);
      toast.success('Paramètres sauvegardés avec succès.');
    } catch (error: any) {
      toast.error(error.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1,2,3].map(i => <div key={i} className="h-64 bg-base-100 rounded-2xl animate-pulse shadow-sm" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Configuration
          </h1>
          <p className="text-base-content/60">Paramètres de la plateforme HopeGestion</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSettings} className="btn btn-sm btn-outline gap-1">
            <RefreshCw size={14} /> Actualiser
          </button>
          <button onClick={saveSettings} className={`btn btn-sm btn-primary gap-1 ${saving ? 'loading' : ''}`} disabled={saving}>
            <Save size={14} /> Sauvegarder
          </button>
        </div>
      </div>

      {/* Platform Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-5">
            <Globe size={18} className="text-primary" />
            Plateforme
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label"><span className="label-text font-medium">Nom de la plateforme</span></label>
              <input 
                type="text"
                value={platform.name}
                onChange={(e) => setPlatform({ ...platform, name: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="label"><span className="label-text font-medium">Rôle par défaut</span></label>
              <select 
                className="select select-bordered w-full"
                value={platform.defaultUserRole}
                onChange={(e) => setPlatform({ ...platform, defaultUserRole: e.target.value })}
              >
                <option value="gestionnaire">Gestionnaire</option>
                <option value="viewer">Viewer</option>
                <option value="comptable">Comptable</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label"><span className="label-text font-medium">Description</span></label>
              <textarea 
                value={platform.description}
                onChange={(e) => setPlatform({ ...platform, description: e.target.value })}
                className="textarea textarea-bordered w-full"
                rows={2}
              />
            </div>
            <div>
              <label className="label"><span className="label-text font-medium">Max propriétés par utilisateur</span></label>
              <input 
                type="number"
                value={platform.maxPropertiesPerUser}
                onChange={(e) => setPlatform({ ...platform, maxPropertiesPerUser: parseInt(e.target.value) || 10 })}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="divider my-5" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Mode maintenance</p>
                <p className="text-xs text-base-content/50">Affiche une page de maintenance aux visiteurs</p>
              </div>
              <input 
                type="checkbox" 
                className="toggle toggle-error"
                checked={platform.maintenanceMode}
                onChange={(e) => setPlatform({ ...platform, maintenanceMode: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Autoriser les inscriptions</p>
                <p className="text-xs text-base-content/50">Permettre aux nouveaux utilisateurs de créer un compte</p>
              </div>
              <input 
                type="checkbox" 
                className="toggle toggle-success"
                checked={platform.allowRegistration}
                onChange={(e) => setPlatform({ ...platform, allowRegistration: e.target.checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Vérification email obligatoire</p>
                <p className="text-xs text-base-content/50">Exiger la vérification par OTP avant l'accès</p>
              </div>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={platform.requireEmailVerification}
                onChange={(e) => setPlatform({ ...platform, requireEmailVerification: e.target.checked })}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Email Configuration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-5">
            <Mail size={18} className="text-primary" />
            Configuration Email
          </h3>
          <p className="text-sm text-base-content/50 mb-4">
            Les paramètres email sont configurés via les variables d'environnement sur le serveur.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Serveur SMTP', value: email.host || 'Non configuré' },
              { label: 'Port', value: email.port || 'Non configuré' },
              { label: 'Utilisateur', value: email.user },
              { label: 'Expéditeur', value: email.from || 'Non configuré' },
            ].map((item, i) => (
              <div key={i} className="bg-base-200/50 rounded-xl p-4">
                <p className="text-xs text-base-content/50 mb-1">{item.label}</p>
                <p className="font-medium text-sm flex items-center gap-1.5">
                  {item.value.includes('configuré') || item.value.includes('Non') ? (
                    <>
                      {item.value.includes('Non') ? (
                        <AlertCircle size={14} className="text-warning" />
                      ) : (
                        <CheckCircle size={14} className="text-success" />
                      )}
                      {item.value}
                    </>
                  ) : (
                    <span className="font-mono">{item.value}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* System Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-5">
            <Server size={18} className="text-primary" />
            Informations Système
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-base-200/50 rounded-xl p-4 text-center">
              <p className="text-xs text-base-content/50 mb-1">Node.js</p>
              <p className="font-bold font-mono text-sm">{system.nodeVersion}</p>
            </div>
            <div className="bg-base-200/50 rounded-xl p-4 text-center">
              <p className="text-xs text-base-content/50 mb-1">Environnement</p>
              <span className={`badge badge-sm ${system.environment === 'production' ? 'badge-success' : 'badge-warning'}`}>
                {system.environment}
              </span>
            </div>
            <div className="bg-base-200/50 rounded-xl p-4 text-center">
              <p className="text-xs text-base-content/50 mb-1">Base de données</p>
              <span className={`badge badge-sm ${system.databaseConnected ? 'badge-success' : 'badge-error'}`}>
                {system.databaseConnected ? 'Connectée' : 'Déconnectée'}
              </span>
            </div>
            <div className="bg-base-200/50 rounded-xl p-4 text-center">
              <p className="text-xs text-base-content/50 mb-1">Frontend URL</p>
              <p className="font-mono text-xs truncate">{system.frontendUrl}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-base-200/30 rounded-xl text-xs text-base-content/50">
            <Shield size={12} className="inline mr-1" />
            Les informations système sont en lecture seule. Pour modifier les variables d'environnement, utilisez le panneau Render.
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettings;
