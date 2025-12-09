// frontend/src/HomePage.tsx
import React from 'react';
import { 
  Building2, 
  Wallet, 
  Users, 
  FileText, 
  Wrench, 
  BarChart3, 
  CheckCircle2, 
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Linkedin,
  Twitter
} from 'lucide-react';

interface HomePageProps {
  onNavigateToLogin: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-base-100 font-sans text-base-content">
      {/* Navbar */}
      <div className="navbar bg-base-100 fixed top-0 z-50 shadow-sm px-4 md:px-8">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden" onClick={toggleMenu}>
              {isMenuOpen ? <X /> : <Menu />}
            </div>
            {isMenuOpen && (
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li><a href="#fonctionnalites">Fonctionnalités</a></li>
                <li><a href="#tarifs">Tarifs</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            )}
          </div>
          <a className="btn btn-ghost text-xl md:text-2xl font-bold text-primary">
            Hope Gestion <span className="text-secondary">Immobilière</span>
          </a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 font-medium">
            <li><a href="#fonctionnalites">Fonctionnalités</a></li>
            <li><a href="#tarifs">Tarifs</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div className="navbar-end">
          <button onClick={onNavigateToLogin} className="btn btn-primary btn-sm md:btn-md">
            Connexion
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero min-h-screen bg-base-200 pt-16">
        <div className="hero-content flex-col lg:flex-row-reverse gap-8 lg:gap-12 px-4 md:px-8 max-w-7xl">
          <div className="flex-1 w-full max-w-lg">
             {/* Placeholder for Hero Image - In a real app, use a real image */}
             <div className="mockup-window border bg-base-300 shadow-2xl">
                <div className="flex justify-center px-4 py-16 bg-base-200 h-64 items-center">
                    <span className="text-4xl opacity-20 font-bold">Dashboard Preview</span>
                </div>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="badge badge-secondary badge-outline mb-4 font-semibold">🇧🇯 Conçu pour le Bénin</div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Gérez votre patrimoine immobilier en toute <span className="text-primary">simplicité</span>
            </h1>
            <p className="py-6 text-lg md:text-xl opacity-90">
              La première plateforme PropTech béninoise pour une gestion moderne et automatisée. Paiements Mobile Money, contrats digitaux, suivi en temps réel.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                <div className="flex items-center gap-2 badge badge-ghost p-3">
                    <CheckCircle2 size={16} className="text-success"/> 100% Digital
                </div>
                <div className="flex items-center gap-2 badge badge-ghost p-3">
                    <CheckCircle2 size={16} className="text-success"/> FCFA Monnaie locale
                </div>
                <div className="flex items-center gap-2 badge badge-ghost p-3">
                    <CheckCircle2 size={16} className="text-success"/> 24/7 Disponible
                </div>
            </div>

            <div className="flex gap-4 justify-center lg:justify-start">
              <button className="btn btn-primary btn-lg shadow-lg">Commencer gratuitement</button>
              <button className="btn btn-outline btn-lg">Voir la démo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 px-4 md:px-8 bg-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fonctionnalités</h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto">Une solution complète conçue spécifiquement pour les besoins du marché immobilier béninois.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <FeatureCard 
              icon={<Building2 className="w-10 h-10 text-primary"/>}
              title="Gestion des Biens"
              desc="Centralisez tous vos biens : appartements, villas, bureaux. Suivi complet avec photos et historique."
            />
            <FeatureCard 
              icon={<Wallet className="w-10 h-10 text-secondary"/>}
              title="Paiements Mobile Money"
              desc="Acceptez MTN Mobile Money et Moov Money. Automatisation complète des quittances."
              badge="Populaire"
            />
            <FeatureCard 
              icon={<Users className="w-10 h-10 text-accent"/>}
              title="Gestion Locataires"
              desc="Base de données complète avec historique de paiements, documents et communications."
            />
            <FeatureCard 
              icon={<FileText className="w-10 h-10 text-info"/>}
              title="Contrats & Baux"
              desc="Génération automatique de contrats conformes à la législation béninoise."
            />
            <FeatureCard 
              icon={<Wrench className="w-10 h-10 text-warning"/>}
              title="Tickets & Maintenance"
              desc="Gestion des plaintes et interventions. Suivi en temps réel des réparations."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-10 h-10 text-error"/>}
              title="Statistiques & Rapports"
              desc="Dashboard intuitif avec KPIs essentiels : taux d'occupation, revenus, impayés."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tarification Simple</h2>
            <p className="text-lg opacity-70">Choisissez le plan adapté à votre taille.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard 
              title="Starter"
              price="15 000"
              features={["Jusqu'à 5 biens", "10 locataires max", "Paiements Mobile Money", "Support email"]}
            />
            <PricingCard 
              title="Professionnel"
              price="35 000"
              features={["Jusqu'à 25 biens", "Locataires illimités", "Tous modes de paiement", "Gestion tickets", "Support prioritaire"]}
              isPopular
            />
            <PricingCard 
              title="Entreprise"
              price="Sur mesure"
              features={["Biens illimités", "Multi-gestionnaires", "API personnalisée", "Formation équipe", "Support dédié 24/7"]}
              isCustom
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-content text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Prêt à moderniser votre gestion ?</h2>
          <p className="text-xl mb-8 opacity-90">Rejoignez les centaines de propriétaires qui font confiance à Hope Gestion.</p>
          <button className="btn btn-secondary btn-lg shadow-xl border-none">Créer un compte maintenant</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer p-10 bg-neutral text-neutral-content">
        <aside>
           <h3 className="text-2xl font-bold text-primary mb-2">Hope Gestion</h3>
           <p className="max-w-xs">La solution PropTech N°1 au Bénin pour la gestion locative simplifiée.</p>
           <div className="flex gap-4 mt-4">
             <a className="link link-hover"><Facebook size={24}/></a>
             <a className="link link-hover"><Twitter size={24}/></a>
             <a className="link link-hover"><Linkedin size={24}/></a>
           </div>
        </aside> 
        <nav>
          <h6 className="footer-title">Services</h6> 
          <a className="link link-hover">Gestion Locative</a>
          <a className="link link-hover">Contrats Digitaux</a>
          <a className="link link-hover">Paiements MoMo</a>
        </nav> 
        <nav>
          <h6 className="footer-title">Entreprise</h6> 
          <a className="link link-hover">À propos</a>
          <a className="link link-hover">Contact</a>
          <a className="link link-hover">Blog</a>
        </nav> 
        <nav>
          <h6 className="footer-title">Légal</h6> 
          <a className="link link-hover">Conditions d'utilisation</a>
          <a className="link link-hover">Confidentialité</a>
        </nav>
      </footer>
    </div>
  );
};

// Components
const FeatureCard = ({ icon, title, desc, badge }: { icon: React.ReactNode, title: string, desc: string, badge?: string }) => (
  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow border border-base-200">
    <div className="card-body">
      <div className="flex justify-between items-start">
        <div className="p-3 bg-base-200 rounded-lg mb-4">{icon}</div>
        {badge && <div className="badge badge-secondary">{badge}</div>}
      </div>
      <h3 className="card-title mb-2">{title}</h3>
      <p className="opacity-70">{desc}</p>
    </div>
  </div>
);

const PricingCard = ({ title, price, features, isPopular, isCustom }: { title: string, price: string, features: string[], isPopular?: boolean, isCustom?: boolean }) => (
  <div className={`card bg-base-100 shadow-xl border ${isPopular ? 'border-primary border-2 scale-105 z-10' : 'border-base-200'}`}>
    {isPopular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 badge badge-primary p-3 font-semibold">RECOMMANDÉ</div>}
    <div className="card-body text-center">
      <h3 className="text-xl font-bold text-base-content/70 uppercase tracking-wide">{title}</h3>
      <div className="my-4">
        <span className="text-4xl font-extrabold">{price}</span>
        {!isCustom && <span className="text-sm opacity-50"> FCFA/mois</span>}
      </div>
      <ul className="text-left space-y-3 mb-8 flex-grow">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success shrink-0"/>
            <span className="text-sm">{f}</span>
          </li>
        ))}
      </ul>
      <div className="card-actions justify-center">
        <button className={`btn w-full ${isPopular ? 'btn-primary' : 'btn-outline'}`}>
          {isCustom ? 'Nous contacter' : 'Choisir ce plan'}
        </button>
      </div>
    </div>
  </div>
);

export default HomePage;
