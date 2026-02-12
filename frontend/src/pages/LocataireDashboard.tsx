import React, { useState } from 'react';
import DashboardStats from '../components/dashboard/DashboardStats';
import { 
  Home, 
  FileText, 
  CreditCard,
  AlertTriangle,
  Settings,
  ShoppingBag,
  Bell
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import ServiceMarketplace from '../components/services/ServiceMarketplace'; // Import Marketplace

// Types for props
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg text-primary">
        {icon}
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <span className={`font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.isPositive ? '+' : ''}{trend.value}%
        </span>
        <span className="text-gray-500 ml-2">vs mois dernier</span>
      </div>
    )}
  </div>
);

const LocataireDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'services'>('overview'); // Tab state

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user?.nom || 'Locataire'} 👋
          </h1>
          <p className="text-gray-500">Bienvenue dans votre espace personnel</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Bell size={18} />
            Notifications
          </Button>
          <Button variant="primary" onClick={() => setActiveTab('services')}>
            <ShoppingBag size={18} className="mr-2" />
            Réserver un service
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            Vue d'ensemble
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('services')}
          >
            Services & Marketplace
          </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Loyer Mensuel"
              value="150.000 F"
              icon={<Home size={24} />}
            />
            <StatCard
              title="Prochaine échéance"
              value="05 Avril"
              icon={<Calendar size={24} />}
              className="border-l-4 border-l-orange-500"
            />
            <StatCard
              title="Quittances dispo"
              value="12"
              icon={<FileText size={24} />}
            />
            <StatCard
              title="Tickets en cours"
              value="1"
              icon={<AlertTriangle size={24} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Mon Contrat">
                <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">Bail #LOC-2024-001</h3>
                    <p className="text-sm text-gray-500">Du 01/01/2024 au 31/12/2024</p>
                  </div>
                  <span className="badge badge-success text-white">Actif</span>
                </div>
              </Card>

              <Card title="Mes Paiements Récents">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Montant</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Reçu</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">01/03/2024</td>
                      <td className="p-3 font-bold">150.000 F</td>
                      <td className="p-3"><span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">Payé</span></td>
                      <td className="p-3 text-right"><Button variant="ghost" size="sm">PDF</Button></td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card title="Actions Rapides">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-center flex-col h-24 gap-2 hover:border-primary hover:text-primary transition-colors">
                    <CreditCard size={24} />
                    <span>Payer Loyer</span>
                  </Button>
                  <Button variant="outline" className="justify-center flex-col h-24 gap-2 hover:border-error hover:text-error transition-colors">
                    <AlertTriangle size={24} />
                    <span>Signaler un problème</span>
                  </Button>
                </div>
              </Card>

              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-blue-700 mb-4">Contactez votre gestionnaire directement sur WhatsApp.</p>
                <Button className="w-full bg-green-500 hover:bg-green-600 border-none text-white">
                  Contacter par WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ServiceMarketplace />
      )}
    </div>
  );
};

// Quick helper for icon if missing import
const Calendar = ({ size }: { size: number }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

export default LocataireDashboard;
