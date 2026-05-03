// frontend/src/pages/admin/AdminSubscriptions.tsx
import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Users, 
  Crown, 
  Gift, 
  Zap, 
  X, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';
import toast from 'react-hot-toast';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_days: number;
  max_properties: number;
  max_lots: number;
  max_users: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: string;
  starts_at: string;
  expires_at: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_price: number;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  'Gratuit': Gift,
  'Pro': Zap,
  'Enterprise': Crown,
};

const PLAN_COLORS: Record<string, string> = {
  'Gratuit': 'from-gray-500 to-gray-600',
  'Pro': 'from-blue-500 to-teal-600',
  'Enterprise': 'from-amber-500 to-orange-600',
};

const AdminSubscriptions: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
        setSubscriptions(data.subscriptions || []);
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getSubscriberCount = (planId: number): number => {
    const stat = stats.find((s: any) => s.plan_id === planId);
    return stat ? parseInt(stat.count) : 0;
  };

  const handleAssign = async () => {
    if (!assignUserId || !assignPlanId) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/subscriptions/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(assignUserId), planId: parseInt(assignPlanId) }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        setShowAssignModal(false);
        setAssignUserId('');
        setAssignPlanId('');
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleCancel = async (subId: number) => {
    if (!confirm('Annuler cet abonnement ?')) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/subscriptions/${subId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const filteredSubs = subscriptions.filter(sub => 
    sub.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.plan_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Abonnements</h1>
          <p className="text-base-content/60">Plans, abonnés et attributions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAssignModal(true)} className="btn btn-sm btn-primary gap-1">
            <CreditCard size={14} /> Attribuer un plan
          </button>
          <button onClick={fetchData} className="btn btn-sm btn-outline gap-1">
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan, index) => {
          const Icon = PLAN_ICONS[plan.name] || CreditCard;
          const gradient = PLAN_COLORS[plan.name] || 'from-gray-500 to-gray-600';
          const count = getSubscriberCount(plan.id);
          const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
                {/* Plan Header */}
                <div className={`bg-gradient-to-r ${gradient} p-5 text-white`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={20} />
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                      </div>
                      <p className="text-white/70 text-xs">{plan.description}</p>
                    </div>
                    <div className="bg-base-100/20 rounded-xl px-3 py-1.5 text-center">
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-[10px] opacity-80">abonnés</p>
                    </div>
                  </div>
                </div>

                {/* Plan Details */}
                <div className="p-5">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold">{plan.price > 0 ? plan.price.toLocaleString() : 'Gratuit'}</span>
                    {plan.price > 0 && <span className="text-sm text-base-content/60"> FCFA/mois</span>}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-base-200">
                      <span className="text-base-content/60">Propriétés</span>
                      <span className="font-medium">{plan.max_properties === -1 ? 'Illimité' : plan.max_properties}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-base-200">
                      <span className="text-base-content/60">Lots</span>
                      <span className="font-medium">{plan.max_lots === -1 ? 'Illimité' : plan.max_lots}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-base-content/60">Utilisateurs</span>
                      <span className="font-medium">{plan.max_users === -1 ? 'Illimité' : plan.max_users}</span>
                    </div>
                  </div>

                  {features.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {features.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-base-content/70">
                          <CheckCircle size={12} className="text-success flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200">
        <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <h3 className="font-bold text-lg">Abonnements actifs</h3>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60" />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-8"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th>Utilisateur</th>
                <th>Plan</th>
                <th>Statut</th>
                <th>Début</th>
                <th>Expiration</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="h-10 bg-base-200 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-base-content/60">
                    <CreditCard size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Aucun abonnement actif</p>
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const isExpired = new Date(sub.expires_at) < new Date();
                  return (
                    <tr key={sub.id} className="hover:bg-base-200/30 transition-colors">
                      <td>
                        <p className="font-medium text-sm">{sub.user_name}</p>
                        <p className="text-xs text-base-content/50">{sub.user_email}</p>
                      </td>
                      <td>
                        <span className={`badge badge-sm font-medium ${
                          sub.plan_name === 'Enterprise' ? 'badge-warning' :
                          sub.plan_name === 'Pro' ? 'badge-primary' : 'badge-ghost'
                        }`}>
                          {sub.plan_name}
                        </span>
                      </td>
                      <td>
                        {sub.status === 'active' && !isExpired ? (
                          <span className="badge badge-sm badge-success gap-1"><CheckCircle size={10} /> Actif</span>
                        ) : sub.status === 'cancelled' ? (
                          <span className="badge badge-sm badge-error gap-1"><XCircle size={10} /> Annulé</span>
                        ) : (
                          <span className="badge badge-sm badge-warning">Expiré</span>
                        )}
                      </td>
                      <td className="text-xs text-base-content/60">
                        {new Date(sub.starts_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="text-xs text-base-content/60">
                        <span className={isExpired ? 'text-error font-medium' : ''}>
                          {new Date(sub.expires_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="text-right">
                        {sub.status === 'active' && (
                          <button onClick={() => handleCancel(sub.id)} className="btn btn-ghost btn-xs text-error">
                            Annuler
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Attribuer un plan</h3>
                <button onClick={() => setShowAssignModal(false)} className="btn btn-ghost btn-sm btn-square">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="label"><span className="label-text text-sm font-medium">ID Utilisateur</span></label>
                  <input 
                    type="number"
                    placeholder="Ex: 5"
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label"><span className="label-text text-sm font-medium">Plan</span></label>
                  <select 
                    className="select select-bordered w-full"
                    value={assignPlanId}
                    onChange={(e) => setAssignPlanId(e.target.value)}
                  >
                    <option value="">Choisir un plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.price > 0 ? `${p.price.toLocaleString()} FCFA/mois` : 'Gratuit'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button onClick={() => setShowAssignModal(false)} className="btn btn-sm btn-ghost">Annuler</button>
                <button onClick={handleAssign} className="btn btn-sm btn-primary">Attribuer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSubscriptions;
