// frontend/src/pages/public/ModulesTransversesPage.tsx
import React from 'react';
import { 
  MapPin, 
  Wallet, 
  Bell,
  Users,
  Calendar,
  Search,
  MessageCircle,
  Settings,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Phone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const ModulesTransversesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Navbar */}
      <nav className="navbar bg-base-100/90 backdrop-blur-md sticky top-0 z-50 shadow-sm px-4 md:px-8">
        <div className="navbar-start">
          <Link to="/" className="hover:opacity-80 transition-opacity">
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

      {/* Hero */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-purple-50 to-base-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-6">
              <Settings size={16} /> Modules Transverses
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
              Fonctionnalités <span className="text-secondary">avancées</span>
            </h1>
            <p className="text-xl opacity-70 max-w-3xl mx-auto mb-8">
              Des modules spécialisés pour optimiser votre gestion immobilière : 
              réservations, recouvrement, et paramètres avancés.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Réservations Module */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-4">
                <MapPin size={16} /> Module Réservations
              </div>
              <h2 className="text-3xl font-bold mb-4">Géolocalisation & Rendez-vous</h2>
              <p className="text-lg text-base-content/70 mb-6">
                Permettez à vos prospects de localiser vos biens disponibles et de prendre 
                rendez-vous pour une visite en quelques clics.
              </p>
              <ul className="space-y-3 mb-8">
                <FeatureItem text="Carte interactive avec tous vos biens" />
                <FeatureItem text="Prise de rendez-vous en ligne 24/7" />
                <FeatureItem text="Calendrier partagé avec votre équipe" />
                <FeatureItem text="Notifications automatiques" />
              </ul>
            </div>
            <div className="bg-purple-50 rounded-3xl p-8">
              <div className="bg-base-100 rounded-2xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="text-purple-600" size={24} />
                  <span className="font-semibold">Carte des biens disponibles</span>
                </div>
                <div className="h-48 bg-base-200 rounded-lg flex items-center justify-center">
                  <span className="text-base-content/50">Aperçu carte</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm flex-1">Prendre RDV</button>
                  <button className="btn btn-ghost btn-sm flex-1">Plus d'infos</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recouvrement Module */}
      <section className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-orange-50 rounded-3xl p-8">
              <div className="bg-base-100 rounded-2xl shadow-lg p-6">
                <h4 className="font-bold mb-4">Suivi des agents de terrain</h4>
                <div className="space-y-3">
                  {[
                    { name: "Agent Kofi", status: "En cours", amount: "150.000 FCFA" },
                    { name: "Agent Ama", status: "Terminé", amount: "280.000 FCFA" },
                    { name: "Agent Yao", status: "En attente", amount: "95.000 FCFA" }
                  ].map((agent, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-base-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users size={16} className="text-primary" />
                        </div>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{agent.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-4">
                <Wallet size={16} /> Module Recouvrement
              </div>
              <h2 className="text-3xl font-bold mb-4">Suivi des agents & Contentieux</h2>
              <p className="text-lg text-base-content/70 mb-6">
                Optimisez le recouvrement de vos loyers avec un suivi précis de vos agents 
                de terrain et une gestion efficace des contentieux.
              </p>
              <ul className="space-y-3 mb-8">
                <FeatureItem text="Tableau de bord des agents de recouvrement" />
                <FeatureItem text="Historique des visites et encaissements" />
                <FeatureItem text="Gestion des contentieux et relances" />
                <FeatureItem text="Alertes automatiques d'impayés" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Paramètres Module */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4">
              <Settings size={16} /> Module Paramètres
            </div>
            <h2 className="text-3xl font-bold mb-4">Configuration avancée</h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Personnalisez Hope Immo selon vos besoins spécifiques
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-base-100 border border-base-200 rounded-2xl p-8 text-center">
              <CreditCard className="text-blue-600 mx-auto mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Modes de paiement</h3>
              <p className="text-base-content/70 mb-4">
                Configurez les moyens de paiement acceptés : Mobile Money, Virement, Espèces
              </p>
              <ul className="text-left space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> MTN MoMo</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Moov Money</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Orange Money</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Virement bancaire</li>
              </ul>
            </div>

            <div className="bg-base-100 border border-base-200 rounded-2xl p-8 text-center">
              <MessageCircle className="text-green-600 mx-auto mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Notifications WhatsApp</h3>
              <p className="text-base-content/70 mb-4">
                Personnalisez vos messages automatiques envoyés aux locataires
              </p>
              <ul className="text-left space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Rappels de paiement</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Confirmations</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Quittances</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Alertes maintenance</li>
              </ul>
            </div>

            <div className="bg-base-100 border border-base-200 rounded-2xl p-8 text-center">
              <Phone className="text-purple-600 mx-auto mb-4" size={40} />
              <h3 className="text-xl font-bold mb-3">Personnalisation</h3>
              <p className="text-base-content/70 mb-4">
                Adaptez la plateforme à votre image et vos processus
              </p>
              <ul className="text-left space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Logo personnalisé</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Modèles de documents</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Workflows sur mesure</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-success" /> Intégrations API</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-secondary">
        <div className="max-w-4xl mx-auto text-center text-secondary-content">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Besoin d'une configuration personnalisée ?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Contactez notre équipe pour une démo dédiée et la configuration de vos modules
          </p>
          <Link to="/#contact" className="btn btn-neutral btn-lg rounded-full">
            Demander une démo <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer p-10 bg-neutral text-neutral-content">
        <aside>
          <h3 className="text-2xl font-bold text-primary mb-2">Hope Gestion</h3>
          <p className="opacity-70">Cotonou, Bénin<br/>contact@hopegestion.bj</p>
        </aside>
      </footer>
    </div>
  );
};

// Sub-component
const FeatureItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3">
    <CheckCircle2 className="text-success shrink-0" size={20} />
    <span>{text}</span>
  </li>
);

export default ModulesTransversesPage;
