// frontend/src/pages/public/FonctionnalitesPage.tsx
import React from 'react';
import { 
  Building2, 
  Wallet, 
  Users, 
  FileText, 
  Wrench, 
  BarChart3,
  MapPin,
  Bell,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layout/PublicLayout';

const FonctionnalitesPage: React.FC = () => {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-base-200 to-base-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
              Des fonctionnalités <span className="text-primary">puissantes</span>
            </h1>
            <p className="text-xl opacity-70 max-w-3xl mx-auto mb-8">
              Hope Gestion offre un ensemble complet de fonctionnalités professionnelles 
              adaptées à la gestion immobilière en Afrique.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/fonctionnalites/gestionnaire" className="btn btn-primary btn-lg rounded-full">
                Gestionnaire / Propriétaire
              </Link>
              <Link to="/fonctionnalites/locataire" className="btn btn-outline btn-lg rounded-full">
                Espace Locataire
              </Link>
              <Link to="/fonctionnalites/modules" className="btn btn-ghost btn-lg rounded-full">
                Modules Transverses
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gestionnaire / Propriétaire Section */}
      <section className="py-20 px-4 md:px-8 bg-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-blue-600 p-4 rounded-2xl">
              <Building2 className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Gestionnaire / Propriétaire</h2>
              <p className="text-base-content/70">Outils professionnels pour gérer votre patrimoine</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<BarChart3 />}
              title="Suivi des loyers"
              description="Tableau de bord en temps réel, alertes de retard, calendrier personnalisé des échéances."
            />
            <FeatureCard 
              icon={<Building2 />}
              title="Gestion des biens"
              description="Immeubles, lots, états des lieux numériques. Vue complète de votre patrimoine."
            />
            <FeatureCard 
              icon={<Users />}
              title="Multi-propriétaires"
              description="Gérez plusieurs propriétaires avec isolation complète des données."
            />
            <FeatureCard 
              icon={<FileText />}
              title="Coffre-fort numérique"
              description="Stockage sécurisé de tous vos documents. Modèles de baux personnalisables."
            />
            <FeatureCard 
              icon={<Wallet />}
              title="Trésorerie & Fiscalité"
              description="Suivi des encaissements, décaissements. Génération de rapports fiscaux."
            />
            <FeatureCard 
              icon={<Wrench />}
              title="Maintenance"
              description="Tickets d'intervention, suivi des réparations, gestion des sinistres."
            />
          </div>

          <div className="mt-8 text-center">
            <Link to="/fonctionnalites/gestionnaire" className="btn btn-primary btn-lg rounded-full">
              Découvrir toutes les fonctionnalités <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Locataire Section */}
      <section className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-green-600 p-4 rounded-2xl">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Espace Locataire</h2>
              <p className="text-base-content/70">Une expérience simplifiée pour vos locataires</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<FileText />}
              title="Contrats & Quittances"
              description="Accès instantané à tous les documents : bail, quittances, attestations."
            />
            <FeatureCard 
              icon={<Wallet />}
              title="Paiement en ligne"
              description="Mobile Money (MTN, Moov, Orange), virement. Paiement en 1 clic."
            />
            <FeatureCard 
              icon={<Wrench />}
              title="Tickets d'intervention"
              description="Signalez un problème, suivez sa résolution en temps réel."
            />
            <FeatureCard 
              icon={<Bell />}
              title="Notifications"
              description="Rappels de paiement, confirmations par WhatsApp et SMS."
            />
            <FeatureCard 
              icon={<Smartphone />}
              title="Application mobile"
              description="Gérez tout depuis votre téléphone, où que vous soyez."
            />
            <FeatureCard 
              icon={<Shield />}
              title="Données sécurisées"
              description="Vos informations personnelles sont protégées et confidentielles."
            />
          </div>

          <div className="mt-8 text-center">
            <Link to="/fonctionnalites/locataire" className="btn btn-success btn-lg rounded-full text-white">
              En savoir plus sur l'espace locataire <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Modules Transverses Section */}
      <section className="py-20 px-4 md:px-8 bg-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-purple-600 p-4 rounded-2xl">
              <MapPin className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Modules Transverses</h2>
              <p className="text-base-content/70">Fonctionnalités avancées pour optimiser votre gestion</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-base-200 rounded-2xl p-8">
              <MapPin className="text-purple-600 mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Réservations</h3>
              <ul className="space-y-2 text-base-content/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Géolocalisation des biens</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Prise de rendez-vous en ligne</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Calendrier partagé</li>
              </ul>
            </div>

            <div className="bg-base-200 rounded-2xl p-8">
              <Wallet className="text-orange-600 mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Recouvrement</h3>
              <ul className="space-y-2 text-base-content/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Suivi agents de terrain</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Gestion des contentieux</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Alertes automatiques</li>
              </ul>
            </div>

            <div className="bg-base-200 rounded-2xl p-8">
              <Bell className="text-blue-600 mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Paramètres avancés</h3>
              <ul className="space-y-2 text-base-content/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Configuration Mobile Money</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Notifications WhatsApp</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Personnalisation complète</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/fonctionnalites/modules" className="btn btn-secondary btn-lg rounded-full">
              Explorer les modules transverses <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-primary-content">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à transformer votre gestion immobilière ?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Demandez une démo personnalisée ou créez votre compte gratuitement.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="btn btn-secondary btn-lg rounded-full">
              Créer un compte gratuit
            </Link>
            <Link to="/#contact" className="btn btn-outline btn-lg rounded-full border-white text-white hover:bg-white hover:text-primary">
              Demander une démo
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

// Sub-component
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-base-100 border border-base-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="text-primary mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-base-content/70 text-sm">{description}</p>
  </motion.div>
);

export default FonctionnalitesPage;
