// frontend/src/pages/admin/AdminAgencies.tsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Users, 
  Home, 
  MoreHorizontal,
  Briefcase,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

interface Agency {
  id: number;
  name: string;
  managerName: string;
  email: string;
  phone: string;
  address: string;
  propertyCount: number;
  clientCount: number;
  status: 'active' | 'inactive';
  rating: number;
  joinedDate: string;
}

const AdminAgencies: React.FC = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Agencies
  useEffect(() => {
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
            console.error('Failed to load agencies');
            setAgencies([]);
        }
      } catch (error) {
         console.error('Error loading agencies:', error);
      } finally {
         setLoading(false);
      }
    };
    loadAgencies();
  }, []);

  const filteredAgencies = agencies.filter(agency => 
    agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agency.managerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Agences</h1>
          <p className="text-base-content/60">Superviser les agences et partenaires immobiliers</p>
        </div>
        <Button variant="primary">
          <Plus size={16} className="mr-2" /> Ajouter une Agence
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-base-100 p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input 
            type="text"
            placeholder="Rechercher une agence ou un gestionnaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
          />
        </div>
        <select className="select select-bordered w-40">
          <option>Toutes villes</option>
          <option>Cotonou</option>
          <option>Calavi</option>
          <option>Porto-Novo</option>
        </select>
        <select className="select select-bordered w-40">
          <option>Tous statuts</option>
          <option>Actif</option>
          <option>Inactif</option>
        </select>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="h-64 bg-base-200 rounded-2xl animate-pulse"></div>
             ))
        ) : (
          filteredAgencies.map((agency, index) => (
            <motion.div
              key={agency.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{agency.name}</h3>
                      <div className="flex items-center text-xs text-base-content/60 mt-1">
                        <MapPin size={12} className="mr-1" />
                        {agency.address}
                      </div>
                    </div>
                  </div>
                  <div className={`badge ${agency.status === 'active' ? 'badge-success' : 'badge-ghost'}`}>
                    {agency.status === 'active' ? 'Actif' : 'Inactif'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-4 border-t border-b border-base-200 my-4">
                  <div className="text-center p-2 rounded-lg bg-base-200/50">
                    <Home size={16} className="mx-auto mb-1 text-primary" />
                    <span className="block font-bold text-lg">{agency.propertyCount}</span>
                    <span className="text-xs opacity-70">Biens</span>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-base-200/50">
                    <Users size={16} className="mx-auto mb-1 text-secondary" />
                    <span className="block font-bold text-lg">{agency.clientCount}</span>
                    <span className="text-xs opacity-70">Clients</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/70">
                      <Briefcase size={14} /> Gestionnaire
                    </span>
                    <span className="font-medium">{agency.managerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/70">
                      <Star size={14} /> Performance
                    </span>
                    <div className="flex items-center gap-1 text-orange-400 font-bold">
                      {agency.rating} <span className="text-xs text-base-content/40 font-normal">/ 5.0</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" className="flex-1 btn-sm">Détails</Button>
                  <Button variant="primary" className="flex-1 btn-sm">Gérer</Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAgencies;
