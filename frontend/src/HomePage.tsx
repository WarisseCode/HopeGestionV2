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
  ArrowRight,
  Quote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from './components/ui/Button';
import HeroImage from './assets/images/hero-image.png';
import TenantImage from './assets/images/tenant-family.png';
import PublicLayout from './layout/PublicLayout';
import PropertyCarousel from './components/public/PropertyCarousel';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigateToSignup = () => navigate('/signup');

  return (
    <PublicLayout>

      {/* Hero Section */}
      <div className="hero min-h-screen bg-base-200 pt-20 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="hero-content flex-col lg:flex-row-reverse gap-8 lg:gap-16 px-4 md:px-8 max-w-7xl relative z-10">
          
          {/* Image Section */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full relative"
          >
             <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-base-100">
                <img 
                    src={HeroImage} 
                    alt="Gestion Immobilière Moderne" 
                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
             </div>
             {/* Floating Badge */}
             <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-6 -left-6 bg-base-100 p-4 rounded-xl shadow-xl z-20 flex items-center gap-4 max-w-xs"
             >
                <div className="bg-green-100 p-3 rounded-full text-green-600">
                    <Wallet size={24} />
                </div>
                <div>
                    <p className="text-sm opacity-60">Loyer encaissé</p>
                    <p className="font-bold text-lg">+ 250.000 FCFA</p>
                </div>
             </motion.div>
          </motion.div>

          {/* Text Section */}
          <motion.div 
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="flex-1 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-base-100 border border-base-300 text-sm font-semibold mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Solution N°1 au Bénin 🇧🇯
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              L'immobilier géré <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Intelligemment.</span>
            </h1>
            <p className="text-lg md:text-xl opacity-80 mb-8 max-w-lg mx-auto lg:mx-0">
              Automatisez vos quittances, encaissez les loyers par Mobile Money et suivez vos biens en temps réel. Simple. Sécurisé. Efficace.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                onClick={handleNavigateToSignup} 
                variant="primary" 
                className="rounded-full px-8 py-4 shadow-lg hover:shadow-primary/50 transition-all flex items-center gap-2"
              >
                Commencer Gratuitement <ArrowRight size={20} />
              </Button>
              <Button 
                id="btn-voir-biens"
                onClick={() => {
                  const element = document.getElementById('featured-properties');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="ghost" 
                className="rounded-full border border-base-300 px-8 py-4"
              >
                Voir les biens
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-8 justify-center lg:justify-start opacity-60 grayscale hover:grayscale-0 transition-all">
               {/* Logos partenaires (simulés textuellement ou icones) */}
               <span className="font-bold text-xl">MTN MoMo</span>
               <span className="font-bold text-xl">Moov Money</span>
               <span className="font-bold text-xl">Celtis</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Property Carousel - Biens Disponibles */}
      <div id="featured-properties">
        <PropertyCarousel />
      </div>

      {/* Statistics Section */}
      <section className="py-16 bg-base-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">500+</div>
              <p className="text-base-content/70">Biens gérés</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">1200+</div>
              <p className="text-base-content/70">Locataires actifs</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">98%</div>
              <p className="text-base-content/70">Taux de recouvrement</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">24h</div>
              <p className="text-base-content/70">Délai résolution tickets</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-24 px-4 md:px-8 bg-base-100 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Tout pour gérer vos biens</h2>
            <p className="text-xl opacity-60 max-w-2xl mx-auto">Une suite d'outils puissants conçus pour les propriétaires et agences immobilières modernes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Building2 className="w-8 h-8 text-white"/>}
              color="bg-blue-600"
              title="Gestion de Patrimoine"
              desc="Vues détaillées de vos immeubles et lots. Suivi de l'occupation et de l'état des lieux."
            />
            <FeatureCard 
              icon={<Wallet className="w-8 h-8 text-white"/>}
              color="bg-purple-600"
              title="Paiements Automatisés"
              desc="Intégration native Mobile Money. Génération automatique de quittances dès réception du paiement."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-white"/>}
              color="bg-orange-500"
              title="Portail Locataire"
              desc="Vos locataires accèdent à leurs documents et paient leur loyer en ligne facilement."
            />
            <FeatureCard 
              icon={<FileText className="w-8 h-8 text-white"/>}
              color="bg-green-600"
              title="Documents Légaux"
              desc="Générez des contrats de bail conformes aux lois béninoises en un clic."
            />
            <FeatureCard 
              icon={<Wrench className="w-8 h-8 text-white"/>}
              color="bg-red-500"
              title="Gestion Maintenance"
              desc="Suivez les tickets d'incidents et assignez des réparateurs directement depuis la plateforme."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-white"/>}
              color="bg-indigo-600"
              title="Comptabilité Temps Réel"
              desc="Tableaux de bord financiers, calcul de rentabilité et rapports d'exportation."
            />
          </div>
        </div>
      </section>

      {/* Image Showcase Section */}
      <section className="py-10 bg-base-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">L'expérience locataire réinventée</h2>
                <p className="text-lg opacity-70">
                    Offrez à vos locataires le confort qu'ils méritent. Un espace dédié pour payer, communiquer et vivre sereinement.
                    <br/><br/>
                    "Une famille heureuse est un locataire fidèle."
                </p>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-base-content/80"><CheckCircle2 className="text-primary"/> Paiement en 1 clic</li>
                    <li className="flex items-center gap-3 text-base-content/80"><CheckCircle2 className="text-primary"/> Quittances numériques instantanées</li>
                    <li className="flex items-center gap-3 text-base-content/80"><CheckCircle2 className="text-primary"/> Support réactif</li>
                </ul>
            </div>
            <div className="flex-1 relative">
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-all duration-500">
                    <img src={TenantImage} alt="Famille heureuse" className="w-full h-auto" />
                </div>
                <div className="absolute top-10 -left-10 w-full h-full bg-primary/10 rounded-2xl -z-0 -rotate-3"></div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-12 px-4 md:px-8 bg-base-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tarification Transparente</h2>
            <p className="text-lg opacity-70">Pas de frais cachés. Annulable à tout moment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <PricingCard 
              title="Starter"
              price="15.000"
              features={["Jusqu'à 5 lots", "Support Email", "Paiements MoMo", "Rapports Basiques"]}
            />
            <PricingCard 
              title="Professionnel"
              price="35.000"
              features={["Jusqu'à 25 lots", "Support Prioritaire", "Paiements MoMo & Virement", "Gestion Maintenance", "Multi-utilisateurs"]}
              isPopular
            />
            <PricingCard 
              title="Entreprise"
              price="Sur Mesure"
              features={["Lots illimités", "API Dédiée", "Formation sur site", "Marque Blanche", "Manager Dédié"]}
              isCustom
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 text-primary-content">
          <h2 className="text-3xl md:text-5xl font-bold mb-8">Rejoignez la révolution PropTech</h2>
          <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto">
            Plus de 500 gestionnaires au Bénin utilisent déjà Hope Gestion pour gagner du temps et de l'argent.
          </p>
          <Button 
            onClick={handleNavigateToSignup}
            variant="secondary" 
            className="rounded-full shadow-2xl border-none px-10 py-4 hover:scale-105 transition-transform"
          >
            Créer mon compte maintenant
          </Button>
          <p className="mt-6 text-sm opacity-70">Essai gratuit de 14 jours • Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-base-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ils nous font confiance</h2>
                <p className="text-lg opacity-70">Découvrez ce que disent nos utilisateurs satisfaits.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TestimonialCard 
                    quote="Depuis que j'utilise Hope Gestion, je n'ai plus aucun souci de suivi des loyers. Tout est automatisé et transparent !"
                    author="Marc A."
                    role="Propriétaire"
                />
                <TestimonialCard 
                    quote="L'interface est super intuitive. Je peux payer mon loyer en 2 clics sans me déplacer. C'est vraiment top !"
                    author="Sarah K."
                    role="Locataire"
                />
                <TestimonialCard 
                    quote="Un gain de temps incroyable pour la gestion de mes 3 immeubles. Le support est aussi très réactif."
                    author="David G."
                    role="Investisseur"
                />
            </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 md:px-8 bg-base-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Questions Fréquentes</h2>
            <p className="text-lg opacity-70">Tout ce que vous devez savoir sur Hope Gestion</p>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              question="Comment fonctionne le paiement par Mobile Money ?"
              answer="Hope Gestion est intégré avec MTN MoMo, Moov Money et autres services locaux. Vos locataires reçoivent une notification WhatsApp avec un lien de paiement. Une fois le paiement effectué, la quittance est générée automatiquement."
            />
            <FAQItem 
              question="Puis-je gérer plusieurs propriétaires ?"
              answer="Oui ! Notre système multi-propriétaires vous permet de gérer autant de propriétaires que nécessaire, avec une isolation complète des données. Chaque propriétaire voit uniquement ses biens et finances."
            />
            <FAQItem 
              question="Comment les locataires accèdent-ils à leur espace ?"
              answer="Les locataires reçoivent un lien d'invitation par WhatsApp ou SMS. Ils créent leur compte avec leur numéro de téléphone et accèdent immédiatement à leurs documents, paiements et demandes d'intervention."
            />
            <FAQItem 
              question="Les données sont-elles sécurisées ?"
              answer="Absolument. Nous utilisons un cryptage de niveau bancaire, des sauvegardes quotidiennes et nos serveurs sont hébergés dans des data centers certifiés. Vos données restent confidentielles."
            />
            <FAQItem 
              question="Y a-t-il une période d'essai gratuite ?"
              answer="Oui, vous bénéficiez de 14 jours d'essai gratuit sans engagement et sans carte bancaire. Vous pouvez annuler à tout moment."
            />
            <FAQItem 
              question="Comment contacter le support ?"
              answer="Notre équipe support est disponible par WhatsApp, email et téléphone du lundi au samedi de 8h à 18h. Les clients Premium bénéficient d'un support prioritaire 24/7."
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 md:px-8 bg-base-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Contactez-nous</h2>
            <p className="text-lg opacity-70">Une question ? Notre équipe est là pour vous aider</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-base-100 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold mb-6">Envoyez-nous un message</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet</label>
                    <input type="text" className="input input-bordered w-full" placeholder="Votre nom" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <input type="tel" className="input input-bordered w-full" placeholder="+229 XX XX XX XX" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input type="email" className="input input-bordered w-full" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sujet</label>
                  <select className="select select-bordered w-full">
                    <option>Demande de démo</option>
                    <option>Support technique</option>
                    <option>Partenariat</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea className="textarea textarea-bordered w-full h-32" placeholder="Votre message..."></textarea>
                </div>
                <button type="submit" className="btn btn-primary w-full">Envoyer le message</button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-6">Nos coordonnées</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Building2 className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold">Adresse</h4>
                      <p className="text-base-content/70">Quartier Haie Vive, Cotonou, Bénin</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Users className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold">Téléphone & WhatsApp</h4>
                      <p className="text-base-content/70">+229 01 00 00 00</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <FileText className="text-primary" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold">Email</h4>
                      <p className="text-base-content/70">contact@hopegestion.bj</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Heures d'ouverture</h3>
                <div className="bg-base-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Lundi - Vendredi</span>
                    <span className="font-semibold">8h00 - 18h00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Samedi</span>
                    <span className="font-semibold">9h00 - 14h00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dimanche</span>
                    <span className="font-semibold text-base-content/50">Fermé</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
};

// Components
const FeatureCard = ({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="rounded-xl overflow-hidden shadow-md border border-base-200"
  >
    <div className="p-6">
      <div className={`p-4 ${color} rounded-2xl w-fit mb-4 shadow-lg`}>{icon}</div>
      <h3 className="text-xl font-semibold text-base-content mb-3">{title}</h3>
      <p className="opacity-80 leading-relaxed text-base-content/80">{desc}</p>
    </div>
  </motion.div>
);

const PricingCard = ({ title, price, features, isPopular, isCustom }: { title: string, price: string, features: string[], isPopular?: boolean, isCustom?: boolean }) => (
  <div className={`rounded-xl shadow-md border transition-all duration-300 ${isPopular ? 'border-primary scale-105 z-10 shadow-lg relative' : 'border-base-200 hover:border-primary/50'}`}>
    {isPopular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-content px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg whitespace-nowrap z-20">Le plus populaire</div>}
    <div className="p-6 text-center bg-base-100 rounded-xl">
      <h3 className="text-lg font-bold opacity-80 uppercase tracking-widest mb-4">{title}</h3>
      <div className="flex justify-center items-baseline gap-1 mb-8">
        <span className="text-4xl font-extrabold">{price}</span>
        {!isCustom && <span className="text-sm opacity-70 font-medium">FCFA / mois</span>}
      </div>
      <ul className="text-left space-y-4 mb-8 flex-grow">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-primary mt-1 shrink-0"/>
            <span className="text-sm opacity-80">{f}</span>
          </li>
        ))}
      </ul>
      <Button 
        variant={isPopular ? "primary" : "ghost"} 
        className={`w-full rounded-lg py-3 ${!isPopular ? 'border border-base-300' : ''}`}
      >
        {isCustom ? 'Contacter les ventes' : 'Choisir ce plan'}
      </Button>
    </div>
  </div>
);

const TestimonialCard = ({ quote, author, role }: { quote: string, author: string, role: string }) => (
    <div className="bg-base-100 p-8 rounded-2xl shadow-sm border border-base-200 relative">
        <Quote className="absolute top-6 left-6 text-primary/20 w-10 h-10" />
        <p className="text-base-content/80 relative z-10 italic mb-6 pt-6">"{quote}"</p>
        <div className="flex items-center gap-4">
            <div className="avatar placeholder">
                <div className="bg-primary/10 text-primary rounded-full w-12 flex items-center justify-center">
                    <span className="text-lg font-bold">{author.charAt(0)}</span>
                </div>
            </div>
            <div>
                <h4 className="font-bold text-base-content">{author}</h4>
                <p className="text-sm text-base-content/60">{role}</p>
            </div>
        </div>
    </div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex justify-between items-center text-left hover:bg-base-50 transition-colors"
      >
        <span className="font-semibold text-base-content">{question}</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-base-content/70 animate-fadeIn">
          {answer}
        </div>
      )}
    </div>
  );
};

export default HomePage;