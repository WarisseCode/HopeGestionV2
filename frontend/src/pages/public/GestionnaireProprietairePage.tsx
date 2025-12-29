// frontend/src/pages/public/GestionnaireProprietairePage.tsx
import React from 'react';
import { 
  Building2, 
  Wallet, 
  Users, 
  FileText, 
  Wrench, 
  BarChart3,
  Shield,
  Calendar,
  PieChart,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const GestionnaireProprietairePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Navbar */}
      <nav className="navbar bg-base-100/90 backdrop-blur-md sticky top-0 z-50 shadow-sm px-4 md:px-8">
        <div className="navbar-start">
          <Link to="/" className="hover:opacity-80 transition-opacity flex items-center">
            <img src="/logo.png" alt="Hope Gestion" className="h-12 md:h-16 w-auto" />
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 font-medium">
            <li><Link to="/fonctionnalites" className="text-primary">Fonctionnalités</Link></li>
            <li><Link to="/#tarifs">Tarifs</Link></li>
            <li><Link to="/#contact">Contact</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <Link to="/login" className="btn btn-primary btn-sm md:btn-md rounded-full px-6">
            Connexion
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-blue-50 to-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
                <Building2 size={16} /> Pour Gestionnaires & Propriétaires
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                Gestion centralisée de votre <span className="text-primary">patrimoine immobilier</span>
              </h1>
              <p className="text-xl opacity-70 mb-8">
                Des outils professionnels adaptés au marché africain pour gérer efficacement 
                vos biens, locataires et finances.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="btn btn-primary btn-lg rounded-full">
                  Commencer gratuitement
                </Link>
                <Link to="/#contact" className="btn btn-outline btn-lg rounded-full">
                  Demander une démo
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:block"
            >
              <div className="bg-base-200 rounded-3xl p-8 shadow-xl">
                <img src="/dashboard-preview.png" alt="Dashboard" className="rounded-xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Fonctionnalités clés</h2>
          <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour gérer votre patrimoine immobilier de manière professionnelle.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Building2 className="text-blue-600" size={32} />}
              title="Gestion multi-biens"
              features={["Immeubles et lots", "États des lieux numériques", "Photos et documents"]}
            />
            <FeatureCard 
              icon={<Users className="text-green-600" size={32} />}
              title="Gestion des locataires"
              features={["Dossiers complets", "Historique des paiements", "Communication intégrée"]}
            />
            <FeatureCard 
              icon={<Shield className="text-purple-600" size={32} />}
              title="Délégation d'accès"
              features={["Permissions granulaires", "Multi-utilisateurs", "Audit des actions"]}
            />
            <FeatureCard 
              icon={<Wallet className="text-orange-600" size={32} />}
              title="Finances"
              features={["Trésorerie temps réel", "Rapports fiscaux", "Suivi des impayés"]}
            />
            <FeatureCard 
              icon={<Wrench className="text-red-600" size={32} />}
              title="Maintenance"
              features={["Tickets d'intervention", "Suivi prestataires", "Historique complet"]}
            />
            <FeatureCard 
              icon={<FileText className="text-indigo-600" size={32} />}
              title="Documents"
              features={["Coffre-fort sécurisé", "Modèles de baux", "Génération automatique"]}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Comment ça marche</h2>
          <p className="text-center text-base-content/70 mb-12">
            Démarrez en quelques minutes seulement
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StepCard number={1} title="Créez votre compte" description="Inscription gratuite en 2 minutes" />
            <StepCard number={2} title="Ajoutez vos biens" description="Immeubles, appartements, locaux..." />
            <StepCard number={3} title="Gérez vos locataires" description="Contrats, quittances, paiements" />
            <StepCard number={4} title="Suivez vos finances" description="Tableau de bord en temps réel" />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value="500+" label="Biens gérés" icon={<Building2 />} />
            <StatCard value="98%" label="Taux de recouvrement" icon={<TrendingUp />} />
            <StatCard value="2h" label="Gagnées par semaine" icon={<Clock />} />
            <StatCard value="4.9/5" label="Satisfaction client" icon={<CheckCircle2 />} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary">
        <div className="max-w-4xl mx-auto text-center text-primary-content">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à simplifier votre gestion immobilière ?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Rejoignez les gestionnaires qui font confiance à Hope Immo
          </p>
          <Link to="/signup" className="btn btn-secondary btn-lg rounded-full">
            Essayer gratuitement pendant 14 jours
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer p-10 bg-neutral text-neutral-content">
        <aside>
          <h3 className="text-2xl font-bold text-primary mb-2">Hope Gestion</h3>
          <p className="opacity-70">Cotonou, Bénin</p>
        </aside>
        <nav>
          <h6 className="footer-title">Navigation</h6>
          <Link to="/fonctionnalites" className="link link-hover">Fonctionnalités</Link>
          <Link to="/#tarifs" className="link link-hover">Tarifs</Link>
          <Link to="/#contact" className="link link-hover">Contact</Link>
        </nav>
      </footer>
    </div>
  );
};

// Sub-components
const FeatureCard = ({ icon, title, features }: { icon: React.ReactNode, title: string, features: string[] }) => (
  <div className="bg-base-100 border border-base-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-4">{title}</h3>
    <ul className="space-y-2">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2 text-base-content/70">
          <CheckCircle2 size={16} className="text-success" /> {f}
        </li>
      ))}
    </ul>
  </div>
);

const StepCard = ({ number, title, description }: { number: number, title: string, description: string }) => (
  <div className="text-center">
    <div className="w-12 h-12 bg-primary text-primary-content rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
      {number}
    </div>
    <h3 className="font-bold mb-2">{title}</h3>
    <p className="text-sm text-base-content/70">{description}</p>
  </div>
);

const StatCard = ({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) => (
  <div>
    <div className="text-primary mb-2">{icon}</div>
    <div className="text-3xl md:text-4xl font-extrabold text-primary mb-1">{value}</div>
    <p className="text-base-content/70">{label}</p>
  </div>
);

export default GestionnaireProprietairePage;
