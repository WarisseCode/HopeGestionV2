// frontend/src/pages/admin/AdminFinances.tsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Wallet,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

interface FinanceData {
  revenue: { total: number; volume: number };
  history: Array<{ name: string; revenue: number; volume: number }>;
  transactions: Array<{ id: number; type: string; user: string; amount: number; date: string; status: string }>;
}

const AdminFinances: React.FC = () => {
  const [finances, setFinances] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinances = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/finances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFinances(data);
      }
    } catch (error) {
      console.error('Error fetching finances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinances(); }, []);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const revenue = finances?.revenue?.total || 0;
  const volume = finances?.revenue?.volume || 0;
  const transactions = finances?.transactions || [];
  const history = finances?.history || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-base-100 rounded-2xl animate-pulse shadow-sm" />)}
        </div>
        <div className="h-80 bg-base-100 rounded-2xl animate-pulse shadow-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenus de la Plateforme</h1>
          <p className="text-base-content/60">Suivi des paiements et transactions globales</p>
        </div>
        <button onClick={fetchFinances} className="btn btn-sm btn-outline gap-1">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-content rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="opacity-80 font-medium text-sm">Revenus Plateforme</p>
                <h3 className="text-3xl font-bold mt-2">{formatCurrency(revenue)} FCFA</h3>
              </div>
              <div className="p-3 bg-white/15 rounded-xl">
                <DollarSign size={22} />
              </div>
            </div>
            <div className="mt-3 text-xs opacity-70">Estimation basée sur les paiements</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-base-100 rounded-2xl p-5 shadow-sm border border-base-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 font-medium text-sm">Volume Total</p>
                <h3 className="text-3xl font-bold mt-2">{formatCurrency(volume)} FCFA</h3>
              </div>
              <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                <Wallet size={22} />
              </div>
            </div>
            <div className="mt-3 text-xs text-base-content/60">Total des paiements enregistrés</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-base-100 rounded-2xl p-5 shadow-sm border border-base-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 font-medium text-sm">Transactions</p>
                <h3 className="text-3xl font-bold mt-2">{transactions.length}</h3>
              </div>
              <div className="p-3 bg-accent/10 text-accent rounded-xl">
                <CreditCard size={22} />
              </div>
            </div>
            <div className="mt-3 text-xs text-base-content/60">Récentes opérations</div>
          </div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg">Évolution des Revenus</h3>
              <p className="text-xs text-base-content/50 mt-0.5">12 derniers mois</p>
            </div>
          </div>
          <div className="h-72 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.08} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--b1, #1d232a)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--b3, #2a323c)',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                      fontSize: '13px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="volume" name="Volume (FCFA)" fill="#570DF8" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="revenue" name="Revenus (FCFA)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-base-content/30">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Pas encore de données financières</p>
                  <p className="text-xs mt-1">Les données apparaîtront avec les premiers paiements</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
          <h3 className="font-bold text-lg mb-4">Dernières Transactions</h3>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider">
                    <th>Type</th>
                    <th>Utilisateur / Agence</th>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-base-200/30 transition-colors">
                      <td className="font-medium text-sm">{tx.type}</td>
                      <td className="text-sm">{tx.user}</td>
                      <td className="text-xs text-base-content/60">{tx.date}</td>
                      <td className="font-bold text-sm">
                        {tx.amount > 0 ? `${tx.amount.toLocaleString()} FCFA` : 'Gratuit'}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${
                          tx.status === 'success' ? 'badge-success' : 
                          tx.status === 'pending' ? 'badge-warning' : 'badge-error'
                        }`}>
                          {tx.status === 'success' ? 'Payé' : tx.status === 'pending' ? 'En attente' : 'Échoué'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-base-content/60">
              <CreditCard size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune transaction enregistrée</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminFinances;
