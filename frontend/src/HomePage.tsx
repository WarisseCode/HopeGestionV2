// frontend/src/HomePage.tsx

import React from 'react';
import './HomePage.css';

// Types
interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  details: string[];
  badge?: string;
  highlighted?: boolean;
}

interface PricingPlan {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
  ctaText: string;
  ctaLink: string;
}

interface Testimonial {
  text: string;
  author: string;
}

interface Step {
  number: string;
  title: string;
  description: string;
}

// Définition de la nouvelle prop
interface HomePageProps {
  onNavigateToLogin: () => void; 
}

// Mise à jour de la signature du composant
const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin }) => {
  // Data (Le contenu est conservé de votre fichier d'origine)
  const features: Feature[] = [
    {
      id: 'properties',
      icon: '🏢',
      title: 'Gestion des Biens',
      description: 'Centralisez tous vos biens immobiliers : appartements, villas, bureaux, magasins. Suivi complet avec photos, documents et historique.',
      details: [
        'Fiche détaillée par bien',
        'Galerie photos',
        'Suivi du statut'
      ]
    },
    {
      id: 'payments',
      icon: '📱',
      title: 'Paiements Mobile Money',
      description: 'Acceptez les paiements via MTN Mobile Money et Moov Money en FCFA. Automatisation complète des quittances et rappels.',
      details: [
        'MTN & Moov Money',
        'Paiements en FCFA',
        'Quittances automatiques'
      ],
      badge: 'Populaire',
      highlighted: true,
    },
    {
      id: 'tenants',
      icon: '👥',
      title: 'Gestion Locataires',
      description: 'Base de données complète de vos locataires avec historique de paiements, documents et communications centralisées.',
      details: [
        'Profils détaillés',
        'Historique complet',
        'Documents numériques'
      ]
    },
    {
      id: 'contracts',
      icon: '📄',
      title: 'Contrats & Baux',
      description: 'Génération automatique de contrats de location conformes à la législation béninoise. Suivi des échéances et renouvellements.',
      details: [
        'Génération auto',
        'Conforme législation',
        'Alertes échéances'
      ]
    },
    {
      id: 'tickets',
      icon: '🔧',
      title: 'Tickets & Maintenance',
      description: 'Système de gestion des plaintes et interventions. Assignation automatique aux techniciens, suivi en temps réel.',
      details: [
        'Gestion des plaintes',
        'Workflow automatisé',
        'Notifications SMS'
      ]
    },
    {
      id: 'stats',
      icon: '📊',
      title: 'Statistiques & Rapports',
      description: 'Dashboard intuitif avec KPIs essentiels : taux d\'occupation, revenus, impayés. Exportation des rapports en PDF.',
      details: [
        'Dashboard en temps réel',
        'Graphiques visuels',
        'Export PDF/Excel'
      ]
    },
  ];

  const steps: Step[] = [
    {
      number: '01',
      title: 'Créez votre compte',
      description: 'Inscription gratuite en moins de 2 minutes. Choisissez votre plan selon vos besoins.'
    },
    {
      number: '02',
      title: 'Ajoutez vos biens',
      description: 'Enregistrez vos propriétés, locataires et contrats de location en quelques clics.'
    },
    {
      number: '03',
      title: 'Gérez en automatique',
      description: 'Laissez la plateforme automatiser vos paiements, documents et notifications.'
    },
  ];

  const pricingPlans: PricingPlan[] = [
    {
      name: 'Starter',
      price: '15 000 FCFA/mois',
      features: ['Jusqu\'à 5 biens', '10 locataires max', 'Paiements Mobile Money', 'Génération quittances', 'Support email'],
      ctaText: 'Commencer',
      ctaLink: '#register',
    },
    {
      name: 'Professionnel',
      price: '35 000 FCFA/mois',
      features: ['Jusqu\'à 25 biens', 'Locataires illimités', 'Tous modes de paiement', 'Gestion tickets', 'Rapports avancés', 'Support prioritaire'],
      recommended: true,
      ctaText: 'Commencer',
      ctaLink: '#register',
    },
    {
      name: 'Entreprise',
      price: 'Sur mesure',
      features: ['Biens illimités', 'Multi-gestionnaires', 'API personnalisée', 'Formation équipe', 'Support dédié 24/7', 'Serveur dédié'],
      ctaText: 'Nous contacter',
      ctaLink: '#contact',
    },
  ];

  const testimonials: Testimonial[] = [
    {
      text: "Hope Gestion Immobilière a transformé ma gestion locative. Les paiements Mobile Money sont un vrai plus pour mes locataires au Bénin.",
      author: "Marcel Adjovi, Propriétaire, Cotonou"
    },
    {
      text: "Enfin une solution adaptée au marché béninois ! La génération automatique des contrats nous fait gagner un temps précieux.",
      author: "Fatouma Sanni, Agence Immobilière, Porto-Novo"
    },
    {
      text: "Le système de tickets pour les réparations est génial. Je peux suivre toutes les interventions depuis mon téléphone.",
      author: "Jean-Baptiste Koudou, Gestionnaire, Parakou"
    },
  ];


  return (
    <div className="homepage-container">
      {/* 1. Header & Navigation */}
      <header className="header">
        <div className="container">
          <nav className="nav">
            <div className="logo">
              Hope Gestion <span className="logo-highlight">Immobilière</span>
            </div>
            <ul className="nav-menu">
              <li><a href="#accueil">Accueil</a></li>
              <li><a href="#fonctionnalites">Fonctionnalités</a></li>
              <li><a href="#tarifs">Tarifs</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <button 
                className="btn-connexion"
                onClick={onNavigateToLogin} // <-- APPEL DE LA FONCTION DE NAVIGATION
            >
                Connexion
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="accueil" className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="badge">🇧🇯 Conçu pour le Bénin</span>
            <h1 className="hero-title">Gérez votre patrimoine immobilier en toute simplicité</h1>
            <p className="hero-description">
              La première plateforme PropTech béninoise pour une gestion moderne et automatisée de vos biens immobiliers. Paiements Mobile Money, contrats digitaux, suivi en temps réel.
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">100%</span>
                <span className="stat-label">Digital</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">FCFA</span>
                <span className="stat-label">Monnaie locale</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">24/7</span>
                <span className="stat-label">Disponible</span>
              </div>
            </div>
            <div className="hero-actions">
              <a href="#register" className="btn-primary">Commencer gratuitement</a>
              <a href="#demo" className="btn-secondary">Voir la démo</a>
            </div>
          </div>
          <div className="hero-image">
            {/* L'image de l'URL d'origine est implicitement référencée ou doit être remplacée par une image locale */}
            <img src="dashboard-placeholder.jpg" alt="Dashboard Hope Gestion Immobilière" />
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="fonctionnalites" className="features-section section-padding">
        <div className="container">
          <h2 className="section-title">Fonctionnalités</h2>
          <p className="section-subtitle">Une solution complète pour tous vos besoins</p>
          <div className="features-grid">
            {features.map((feature) => (
              <div key={feature.id} className={`feature-card ${feature.highlighted ? 'highlighted' : ''}`}>
                {feature.badge && <span className="feature-badge">{feature.badge}</span>}
                <span className="feature-icon">{feature.icon}</span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <ul className="feature-details">
                  {feature.details.map((detail, index) => (
                    <li key={index}>✓ {detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="steps-section section-padding bg-light">
        <div className="container">
          <h2 className="section-title">Comment ça marche</h2>
          <p className="section-subtitle">Démarrez en 3 étapes simples</p>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.number} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="tarifs" className="pricing-section section-padding">
        <div className="container">
          <h2 className="section-title">Tarification</h2>
          <p className="section-subtitle">Des tarifs transparents et flexibles</p>
          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}>
                <h3 className="plan-name">{plan.name}</h3>
                {plan.recommended && <span className="recommended-badge">Recommandé</span>}
                <p className="plan-price">{plan.price}</p>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>✓ {feature}</li>
                  ))}
                </ul>
                <a href={plan.ctaLink} className="btn-primary plan-cta">
                  {plan.ctaText}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials Section */}
      <section className="testimonials-section section-padding bg-light">
        <div className="container">
          <h2 className="section-title">Témoignages</h2>
          <p className="section-subtitle">Ils nous font confiance</p>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <p className="testimonial-text">"{testimonial.text}"</p>
                <p className="testimonial-author">**{testimonial.author.split(',')[0]}**<br/>{testimonial.author.split(',')[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA Footer */}
      <section className="cta-footer-section section-padding">
        <div className="container">
          <h2 className="cta-title">Prêt à moderniser votre gestion immobilière ?</h2>
          <p className="cta-subtitle">Rejoignez les centaines de propriétaires et gestionnaires qui font confiance à Hope Gestion Immobilière</p>
          <div className="cta-actions">
            <a href="#register" className="btn-primary">Essayer gratuitement 30 jours</a>
            <a href="#contact" className="btn-secondary">Planifier une démo</a>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col">
              <div className="footer-logo">
                Hope Gestion <span className="logo-highlight">Immobilière</span>
              </div>
              <p className="footer-description">
                La première plateforme PropTech béninoise pour une gestion immobilière moderne et automatisée.
              </p>
            </div>
            <div className="footer-col">
              <h4>Produit</h4>
              <ul>
                <li><a href="#fonctionnalites">Fonctionnalités</a></li>
                <li><a href="#tarifs">Tarifs</a></li>
                <li><a href="#demo">Démo</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Entreprise</h4>
              <ul>
                <li><a href="#about">À propos</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Légal</h4>
              <ul>
                <li><a href="#privacy">Confidentialité</a></li>
                <li><a href="#terms">Conditions</a></li>
                <li><a href="#mentions">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Hope Gestion Immobilière. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;