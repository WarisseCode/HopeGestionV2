// frontend/src/pages/public/LocatairePublicPage.tsx
import React from 'react';
import { 
  FileText, 
  Wallet, 
  Wrench, 
  Bell,
  Smartphone,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const LocatairePublicPage: React.FC = () => {
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
            <li><Link to="/fonctionnalites">Fonctionnalités</Link></li>
            <li><Link to="/#faq">FAQ</Link></li>
            <li><Link to="/#contact">Contact</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <Link to="/login" className="btn btn-success btn-sm md:btn-md rounded-full px-6 text-white">
            Mon espace locataire
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-b from-green-50 to-base-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-6">
              <Smartphone size={16} /> Espace Locataire
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
              Gérez votre location <span className="text-success">simplement</span>
            </h1>
            <p className="text-xl opacity-70 max-w-3xl mx-auto mb-8">
              Accédez à vos documents, payez votre loyer et communiquez avec votre gestionnaire 
              depuis votre téléphone.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login" className="btn btn-success btn-lg rounded-full text-white">
                Accéder à mon espace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FileText className="text-green-600" size={32} />}
              title="Contrats & Quittances"
              description="Téléchargez vos documents à tout moment : bail, quittances, attestations."
            />
            <FeatureCard 
              icon={<CreditCard className="text-blue-600" size={32} />}
              title="Paiement en ligne"
              description="Payez votre loyer par Mobile Money (MTN, Moov, Orange) ou virement en 1 clic."
            />
            <FeatureCard 
              icon={<Wrench className="text-orange-600" size={32} />}
              title="Demandes d'intervention"
              description="Signalez un problème et suivez sa résolution en temps réel."
            />
            <FeatureCard 
              icon={<Bell className="text-purple-600" size={32} />}
              title="Notifications"
              description="Recevez des rappels de paiement par WhatsApp ou SMS."
            />
            <FeatureCard 
              icon={<MessageCircle className="text-indigo-600" size={32} />}
              title="Messagerie"
              description="Communiquez directement avec votre gestionnaire."
            />
            <FeatureCard 
              icon={<Shield className="text-red-600" size={32} />}
              title="Données sécurisées"
              description="Vos informations personnelles sont protégées et confidentielles."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Comment ça marche</h2>
          
          <div className="space-y-8">
            <StepRow 
              number={1}
              title="Recevez votre invitation"
              description="Votre gestionnaire vous envoie un lien par WhatsApp ou SMS"
              isLeft
            />
            <StepRow 
              number={2}
              title="Créez votre compte"
              description="Inscrivez-vous avec votre numéro de téléphone en quelques secondes"
              isLeft={false}
            />
            <StepRow 
              number={3}
              title="Accédez à vos documents"
              description="Consultez votre bail, vos quittances et tous vos documents"
              isLeft
            />
            <StepRow 
              number={4}
              title="Payez votre loyer"
              description="Réglez facilement par Mobile Money ou virement bancaire"
              isLeft={false}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
          
          <div className="space-y-4">
            <FAQItem 
              question="Comment récupérer ma quittance ?"
              answer="Connectez-vous à votre espace, allez dans 'Documents' et téléchargez votre quittance. Elle est générée automatiquement après chaque paiement."
            />
            <FAQItem 
              question="Comment signaler un problème dans mon logement ?"
              answer="Dans votre espace, cliquez sur 'Nouveau ticket' et décrivez le problème. Vous pouvez ajouter des photos. Votre gestionnaire sera notifié immédiatement."
            />
            <FAQItem 
              question="Comment payer mon loyer ?"
              answer="Accédez à 'Paiements', choisissez Mobile Money (MTN, Moov, Orange) ou virement, et suivez les instructions. La confirmation est instantanée."
            />
            <FAQItem 
              question="J'ai oublié mon mot de passe, que faire ?"
              answer="Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Un code vous sera envoyé par SMS pour réinitialiser votre mot de passe."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-success">
        <div className="max-w-4xl mx-auto text-center text-success-content">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Accédez à votre espace locataire
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Connectez-vous pour gérer votre location en toute simplicité
          </p>
          <Link to="/login" className="btn btn-neutral btn-lg rounded-full">
            Se connecter <ArrowRight className="ml-2" size={20} />
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

// Sub-components
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-base-100 border border-base-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-base-content/70">{description}</p>
  </div>
);

const StepRow = ({ number, title, description, isLeft }: { number: number, title: string, description: string, isLeft: boolean }) => (
  <div className={`flex items-center gap-6 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
    <div className="flex-1">
      <div className={`bg-base-100 rounded-2xl p-6 shadow-md ${isLeft ? 'text-left' : 'text-right'}`}>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-base-content/70">{description}</p>
      </div>
    </div>
    <div className="w-12 h-12 bg-success text-success-content rounded-full flex items-center justify-center text-xl font-bold shrink-0">
      {number}
    </div>
    <div className="flex-1 hidden md:block"></div>
  </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full p-5 flex justify-between items-center text-left">
        <span className="font-semibold">{question}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="px-5 pb-5 text-base-content/70">{answer}</div>}
    </div>
  );
};

export default LocatairePublicPage;
