// frontend/src/pages/admin/AdminAgencies.tsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  MapPin, 
  Users, 
  Home, 
  Briefcase,
  Star,
  Wallet,
  Hash,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

interface Agency {
  id: number;
  name: string;
  managerName: string;
  email: string;
  phone: string;
  managerCode: string;
  propertyCount: number;
  lotCount: number;
  clientCount: number;
  totalRevenue: number;
  status: 'active' | 'inactive';
  rating: number;
  joinedDate: string;
  avatarUrl?: string;
}

const AdminAgencies: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAgencies = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/agencies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAgencies(data.agencies || []);
      } else {
        setAgencies([]);
      }
    } catch (error) {
      console.error('Error loading agencies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgencies(); }, []);

  const filteredAgencies = agencies.filter(agency => 
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.managerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.managerCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Summary stats
  const totalProperties = agencies.reduce((sum, a) => sum + a.propertyCount, 0);
  const totalLots = agencies.reduce((sum, a) => sum + a.lotCount, 0);
  const totalClients = agencies.reduce((sum, a) => sum + a.clientCount, 0);
  const totalRevenue = agencies.reduce((sum, a) => sum + a.totalRevenue, 0);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star 
            key={i} 
            size={12} 
            className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-base-300'} 
          />
        ))}
        <span className="text-xs font-semibold ml-1 text-base-content/60">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Agences</h1>
          <p className="text-base-content/60">{agencies.length} agences enregistrées sur la plateforme</p>
        </div>
        <button onClick={loadAgencies} className="btn btn-sm btn-outline gap-1">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Agences', value: agencies.length, icon: Building2, color: 'text-primary' },
          { label: 'Immeubles', value: totalProperties, icon: Home, color: 'text-purple-500' },
          { label: 'Lots gérés', value: totalLots, icon: Hash, color: 'text-blue-500' },
          { label: 'Revenus', value: `${formatCurrency(totalRevenue)} FCFA`, icon: Wallet, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200 text-center"
          >
            <stat.icon size={18} className={`mx-auto mb-1 ${stat.color}`} />
            <p className="text-lg font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
            <p className="text-xs text-base-content/50">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-base-100 rounded-xl p-3 shadow-sm border border-base-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input 
            type="text"
            placeholder="Rechercher par nom d'agence, gestionnaire ou code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered input-sm w-full pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-base-100 rounded-2xl animate-pulse shadow-sm border border-base-200" />
          ))
        ) : filteredAgencies.length === 0 ? (
          <div className="col-span-full text-center py-16 text-base-content/40">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune agence trouvée</p>
          </div>
        ) : (
          filteredAgencies.map((agency, index) => (
            <motion.div
              key={agency.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="bg-base-100 rounded-2xl p-5 shadow-sm border border-base-200 hover:shadow-md transition-all duration-300 group">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-105 transition-transform">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-tight">{agency.name}</h3>
                      {agency.managerCode && (
                        <span className="text-xs text-primary/70 font-mono bg-primary/5 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {agency.managerCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`badge badge-sm ${agency.status === 'active' ? 'badge-success' : 'badge-ghost'}`}>
                    {agency.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-base-200 my-3">
                  <div className="text-center p-2 rounded-lg bg-base-200/30">
                    <Home size={14} className="mx-auto mb-1 text-primary/60" />
                    <span className="block font-bold text-lg">{agency.propertyCount}</span>
                    <span className="text-[10px] text-base-content/50">Immeubles</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-base-200/30">
                    <Hash size={14} className="mx-auto mb-1 text-blue-500/60" />
                    <span className="block font-bold text-lg">{agency.lotCount}</span>
                    <span className="text-[10px] text-base-content/50">Lots</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-base-200/30">
                    <Users size={14} className="mx-auto mb-1 text-emerald-500/60" />
                    <span className="block font-bold text-lg">{agency.clientCount}</span>
                    <span className="text-[10px] text-base-content/50">Locataires</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/60">
                      <Briefcase size={13} /> Gestionnaire
                    </span>
                    <span className="font-medium text-sm">{agency.managerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/60">
                      <Wallet size={13} /> Revenus
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">{formatCurrency(agency.totalRevenue)} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/60">
                      <TrendingUp size={13} /> Performance
                    </span>
                    {renderStars(agency.rating)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAgencies;
