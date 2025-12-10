// frontend/src/HomePage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div>
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-wrapper">
            <div className="logo">
              <i className="fas fa-home-heart"></i>
              <span>Hope Gestion <span className="highlight">Immobilière</span></span>
            </div>
            {/* Added dynamic class for mobile menu */}
            <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <a href="#accueil" onClick={() => setIsMobileMenuOpen(false)}>Accueil</a>
              <a href="#fonctionnalites" onClick={() => setIsMobileMenuOpen(false)}>Fonctionnalités</a>
              <a href="#tarifs" onClick={() => setIsMobileMenuOpen(false)}>Tarifs</a>
              <a href="#contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</a>
              <Link to="/login.html" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Connexion</Link>
            </div>
            <div className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="accueil">
        <div className="hero-pattern"></div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="badge">🇧🇯 Conçu pour le Bénin</div>
              <h1>Gérez votre patrimoine immobilier <span className="gradient-text">en toute simplicité</span></h1>
              <p className="hero-description">La première plateforme PropTech béninoise pour une gestion moderne et automatisée de vos biens immobiliers. Paiements Mobile Money, contrats digitaux, suivi en temps réel.</p>
              <div className="hero-stats">
                <div className="stat-item">
                    <span className="stat-number">100%</span>
                    <span className="stat-label">Digital</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">FCFA</span>
                    <span className="stat-label">Monnaie locale</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">24/7</span>
                    <span className="stat-label">Disponible</span>
                </div>
              </div>
              <div className="hero-cta">
                <Link to="/register.html" className="btn-hero">Commencer gratuitement</Link>
                <a href="#demo" className="btn-demo">
                    <i className="fas fa-play-circle"></i> Voir la démo
                </a>
              </div>
            </div>
            <div className="hero-image">
                <div className="floating-card card-1">
                    <i className="fas fa-building"></i>
                    <div className="card-info">
                        <span className="card-title">245 Biens</span>
                        <span className="card-subtitle">Gérés</span>
                    </div>
                </div>
                <div className="floating-card card-2">
                    <i className="fas fa-mobile-alt"></i>
                    <div className="card-info">
                        <span className="card-title">Mobile Money</span>
                        <span className="card-subtitle">MTN • Moov</span>
                    </div>
                </div>
                <div className="floating-card card-3">
                    <i className="fas fa-chart-line"></i>
                    <div className="card-info">
                        <span className="card-title">+85%</span>
                        <span className="card-subtitle">Taux de paiement</span>
                    </div>
                </div>
                <div className="hero-mockup">
                    <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop" alt="Dashboard Hope Gestion Immobilière" />
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="fonctionnalites">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Fonctionnalités</span>
            <h2>Une solution complète pour <span className="gradient-text">tous vos besoins</span></h2>
            <p>Des outils professionnels adaptés au marché immobilier béninois</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-building"></i>
              </div>
              <h3>Gestion des Biens</h3>
              <p>Centralisez tous vos biens immobiliers : appartements, villas, bureaux, magasins. Suivi complet avec photos, documents et historique.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> Fiche détaillée par bien</li>
                  <li><i className="fas fa-check"></i> Galerie photos</li>
                  <li><i className="fas fa-check"></i> Suivi du statut</li>
              </ul>
            </div>

            <div className="feature-card featured">
              <div className="popular-badge">Populaire</div>
              <div className="feature-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <h3>Paiements Mobile Money</h3>
              <p>Acceptez les paiements via MTN Mobile Money et Moov Money en FCFA. Automatisation complète des quittances et rappels.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> MTN & Moov Money</li>
                  <li><i className="fas fa-check"></i> Paiements en FCFA</li>
                  <li><i className="fas fa-check"></i> Quittances automatiques</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Gestion Locataires</h3>
              <p>Base de données complète de vos locataires avec historique de paiements, documents et communications centralisées.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> Profils détaillés</li>
                  <li><i className="fas fa-check"></i> Historique complet</li>
                  <li><i className="fas fa-check"></i> Documents numériques</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-file-contract"></i>
              </div>
              <h3>Contrats & Baux</h3>
              <p>Génération automatique de contrats de location conformes à la législation béninoise. Suivi des échéances et renouvellements.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> Génération auto</li>
                  <li><i className="fas fa-check"></i> Conforme législation</li>
                  <li><i className="fas fa-check"></i> Alertes échéances</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-tools"></i>
              </div>
              <h3>Tickets & Maintenance</h3>
              <p>Système de gestion des plaintes et interventions. Assignation automatique aux techniciens, suivi en temps réel.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> Gestion des plaintes</li>
                  <li><i className="fas fa-check"></i> Workflow automatisé</li>
                  <li><i className="fas fa-check"></i> Notifications SMS</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-pie"></i>
              </div>
              <h3>Statistiques & Rapports</h3>
              <p>Dashboard intuitif avec KPIs essentiels : taux d'occupation, revenus, impayés. Exportation des rapports en PDF.</p>
              <ul className="feature-list">
                  <li><i className="fas fa-check"></i> Dashboard en temps réel</li>
                  <li><i className="fas fa-check"></i> Graphiques visuels</li>
                  <li><i className="fas fa-check"></i> Export PDF/Excel</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Comment ça marche</span>
            <h2>Démarrez en <span className="gradient-text">3 étapes simples</span></h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">
                  <i className="fas fa-user-plus"></i>
              </div>
              <h3>Créez votre compte</h3>
              <p>Inscription gratuite en moins de 2 minutes. Choisissez votre plan selon vos besoins.</p>
            </div>

            <div className="step-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">
                  <i className="fas fa-home"></i>
              </div>
              <h3>Ajoutez vos biens</h3>
              <p>Enregistrez vos propriétés, locataires et contrats de location en quelques clics.</p>
            </div>

            <div className="step-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">
                  <i className="fas fa-rocket"></i>
              </div>
              <h3>Gérez en automatique</h3>
              <p>Laissez la plateforme automatiser vos paiements, documents et notifications.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="tarifs">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Tarification</span>
            <h2>Des tarifs <span className="gradient-text">transparents et flexibles</span></h2>
            <p>Choisissez le plan qui correspond à votre activité</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Starter</h3>
                <p>Pour débuter</p>
              </div>
              <div className="pricing-price">
                <span className="price">15 000</span>
                <span className="currency">FCFA/mois</span>
              </div>
              <ul className="pricing-features">
                <li><i className="fas fa-check"></i> Jusqu'à 5 biens</li>
                <li><i className="fas fa-check"></i> 10 locataires max</li>
                <li><i className="fas fa-check"></i> Paiements Mobile Money</li>
                <li><i className="fas fa-check"></i> Génération quittances</li>
                <li><i className="fas fa-check"></i> Support email</li>
              </ul>
              <Link to="/register.html?plan=starter" className="btn-pricing">Commencer</Link>
            </div>

            <div className="pricing-card popular">
              <div className="popular-badge">Recommandé</div>
              <div className="pricing-header">
                <h3>Professionnel</h3>
                <p>Pour les gestionnaires</p>
              </div>
              <div className="pricing-price">
                <span className="price">35 000</span>
                <span className="currency">FCFA/mois</span>
              </div>
              <ul className="pricing-features">
                <li><i className="fas fa-check"></i> Jusqu'à 25 biens</li>
                <li><i className="fas fa-check"></i> Locataires illimités</li>
                <li><i className="fas fa-check"></i> Tous modes de paiement</li>
                <li><i className="fas fa-check"></i> Gestion tickets</li>
                <li><i className="fas fa-check"></i> Rapports avancés</li>
                <li><i className="fas fa-check"></i> Support prioritaire</li>
              </ul>
              <Link to="/register.html?plan=pro" className="btn-pricing">Commencer</Link>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Entreprise</h3>
                <p>Pour les agences</p>
              </div>
              <div className="pricing-price">
                <span className="price">Sur mesure</span>
              </div>
              <ul className="pricing-features">
                <li><i className="fas fa-check"></i> Biens illimités</li>
                <li><i className="fas fa-check"></i> Multi-gestionnaires</li>
                <li><i className="fas fa-check"></i> API personnalisée</li>
                <li><i className="fas fa-check"></i> Formation équipe</li>
                <li><i className="fas fa-check"></i> Support dédié 24/7</li>
                <li><i className="fas fa-check"></i> Serveur dédié</li>
              </ul>
              <a href="#contact" className="btn-pricing">Nous contacter</a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Témoignages</span>
            <h2>Ils nous font <span className="gradient-text">confiance</span></h2>
          </div>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://ui-avatars.com/api/?name=Marcel+Adjovi&background=667eea&color=fff" alt="Marcel Adjovi" />
                <div>
                  <h4>Marcel Adjovi</h4>
                  <p>Propriétaire, Cotonou</p>
                </div>
              </div>
              <div className="rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-text">"Hope Gestion Immobilière a transformé ma gestion locative. Les paiements Mobile Money sont un vrai plus pour mes locataires au Bénin."</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://ui-avatars.com/api/?name=Fatouma+Sanni&background=f093fb&color=fff" alt="Fatouma Sanni" />
                <div>
                  <h4>Fatouma Sanni</h4>
                  <p>Agence Immobilière, Porto-Novo</p>
                </div>
              </div>
              <div className="rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-text">"Enfin une solution adaptée au marché béninois ! La génération automatique des contrats nous fait gagner un temps précieux."</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <img src="https://ui-avatars.com/api/?name=Jean+Baptiste&background=4facfe&color=fff" alt="Jean Baptiste" />
                <div>
                  <h4>Jean-Baptiste Koudou</h4>
                  <p>Gestionnaire, Parakou</p>
                </div>
              </div>
              <div className="rating">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <p className="testimonial-text">"Le système de tickets pour les réparations est génial. Je peux suivre toutes les interventions depuis mon téléphone."</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Prêt à moderniser votre gestion immobilière ?</h2>
            <p>Rejoignez les centaines de propriétaires et gestionnaires qui font confiance à Hope Gestion Immobilière</p>
            <div className="cta-buttons">
              <Link to="/register.html" className="btn-cta-primary">Essayer gratuitement 30 jours</Link>
              <a href="#contact" className="btn-cta-secondary">Planifier une démo</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="contact">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <i className="fas fa-home-heart"></i>
                <span>Hope Gestion Immobilière</span>
              </div>
              <p>La plateforme PropTech de référence au Bénin pour une gestion immobilière moderne et efficace.</p>
              <div className="social-links">
                <a href="#"><i className="fab fa-facebook"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Produit</h4>
              <ul>
                <li><a href="#fonctionnalites">Fonctionnalités</a></li>
                <li><a href="#tarifs">Tarifs</a></li>
                <li><a href="demo.html">Démo</a></li>
                <li><a href="documentation.html">Documentation</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Entreprise</h4>
              <ul>
                <li><a href="about.html">À propos</a></li>
                <li><a href="blog.html">Blog</a></li>
                <li><a href="careers.html">Carrières</a></li>
                <li><a href="partners.html">Partenaires</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li><i className="fas fa-map-marker-alt"></i> Cotonou, Bénin</li>
                <li><i className="fas fa-phone"></i> +229 XX XX XX XX</li>
                <li><i className="fas fa-envelope"></i> contact@hopegimmo.bj</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 Hope Gestion Immobilière. Tous droits réservés.</p>
            <div className="footer-links">
              <a href="privacy.html">Confidentialité</a>
              <a href="terms.html">Conditions d'utilisation</a>
              <a href="legal.html">Mentions légales</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
