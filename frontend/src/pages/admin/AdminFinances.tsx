// frontend/src/pages/admin/AdminFinances.tsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

const AdminFinances: React.FC = () => {
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);
  const [finances, setFinances] = useState<any>(null);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const token = getToken();
        // Period filtering could be sent here
        const response = await fetch(`${API_URL}/admin/finances`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setFinances(data);
        }
      } catch (error) {
        console.error('Error fetching admin finances:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFinances();
  }, [period]);

  const revenueData = finances?.history || [];
  const transactions = finances?.transactions || [];

  const totalRevenue = finances?.revenue?.total || 0;
  const totalVolume = finances?.revenue?.volume || 0;

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenus de la Plateforme</h1>
          <p className="text-base-content/60">Suivi des abonnements et commissions</p>
        </div>
        <div className="flex gap-2">
          <select className="select select-bordered" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="month">Ce Mois</option>
            <option value="quarter">Ce Trimestre</option>
            <option value="year">Cette Année</option>
          </select>
          <Button variant="ghost">
            <Download size={16} className="mr-2" /> Rapport
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-primary to-primary-focus text-primary-content border-none">
            <div className="flex justify-between items-start">
              <div>
                <p className="opacity-80 font-medium">Revenu Total (2026)</p>
                <h3 className="text-3xl font-bold mt-2">12.5M FCFA</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <DollarSign size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium bg-white/10 w-fit px-2 py-1 rounded">
              <ArrowUpRight size={14} className="mr-1" /> +15.2% vs 2025
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 font-medium">Abonnements Actifs</p>
                <h3 className="text-3xl font-bold mt-2">142</h3>
              </div>
              <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
                <CreditCard size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-500 font-medium">
              <ArrowUpRight size={14} className="mr-1" /> +8 nouveaux cette semaine
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 font-medium">Part Moyen / Utilisateur</p>
                <h3 className="text-3xl font-bold mt-2">8,500 FCFA</h3>
              </div>
              <div className="p-3 bg-accent/10 text-accent rounded-xl">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-base-content/40 font-medium">
               Moyenne mensuelle
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Main Chart */}
      <Card title="Évolution des Revenus">
        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: 'var(--b1)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="saas" name="Abonnements" fill="#570DF8" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="trans" name="Commissions" fill="#F000B8" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card title="Dernières Transactions">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Utilisateur / Agence</th>
                <th>Date</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-base-200/50">
                  <td className="font-medium">{tx.type}</td>
                  <td>{tx.user}</td>
                  <td className="text-base-content/60 text-sm">{tx.date}</td>
                  <td className="font-bold">{tx.amount > 0 ? `${tx.amount.toLocaleString()} FCFA` : 'Gratuit'}</td>
                  <td>
                    <span className={`badge badge-sm ${
                      tx.status === 'success' ? 'badge-success' : 
                      tx.status === 'pending' ? 'badge-warning' : 'badge-error'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminFinances;
