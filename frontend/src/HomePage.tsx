// frontend/src/HomePage.tsx
import React from 'react';

interface HomePageProps {
  onNavigateToLogin: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin }) => {
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
            <div className="nav-links">
              <a href="#accueil">Accueil</a>
              <a href="#fonctionnalites">Fonctionnalités</a>
              <a href="#tarifs">Tarifs</a>
              <a href="#contact">Contact</a>
              <button onClick={onNavigateToLogin} className="btn-primary">Connexion</button>
            </div>
            <div className="mobile-menu-btn">
              <i className="fas fa-bars"></i>
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
                <div className="stat-card">
                  <div className="stat-value">100%</div>
                  <div className="stat-label">Digital</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">FCFA</div>
                  <div className="stat-label">Monnaie locale</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">24/7</div>
                  <div className="stat-label">Disponible</div>
                </div>
              </div>
              <div className="hero-cta">
                <a href="#" className="btn-primary">Commencer gratuitement</a>
                <a href="#" className="btn-secondary">Voir la démo</a>
              </div>
            </div>
            <div className="hero-image">
              <div className="dashboard-preview">
                <span className="text-2xl font-bold text-gray-400">Dashboard Preview</span>
              </div>
              <div className="floating-card card-1">
                <div className="stat-value">245</div>
                <div className="stat-label">Biens Gérés</div>
              </div>
              <div className="floating-card card-2">
                <div className="stat-value">+85%</div>
                <div className="stat-label">Taux de paiement</div>
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
            <h2>Une solution complète pour tous vos <span className="gradient-text">besoins</span></h2>
            <p className="hero-description">Des outils professionnels adaptés au marché immobilier béninois</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-building"></i>
              </div>
              <h3>Gestion des Biens</h3>
              <p>Centralisez tous vos biens immobiliers : appartements, villas, bureaux, magasins. Suivi complet avec photos, documents et historique.</p>
              <a href="#" className="feature-badge">Détails</a>
            </div>

            <div className="feature-card popular">
              <div className="feature-icon">
                <i className="fas fa-wallet"></i>
              </div>
              <h3>Paiements Mobile Money</h3>
              <p>Acceptez les paiements via MTN Mobile Money et Moov Money en FCFA. Automatisation complète des quittances et rappels.</p>
              <span className="feature-badge">Populaire</span>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Gestion Locataires</h3>
              <p>Base de données complète de vos locataires avec historique de paiements, documents et communications centralisées.</p>
              <a href="#" className="feature-badge">Détails</a>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-file-contract"></i>
              </div>
              <h3>Contrats & Baux</h3>
              <p>Génération automatique de contrats de location conformes à la législation béninoise. Suivi des échéances et renouvellements.</p>
              <a href="#" className="feature-badge">Détails</a>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-tools"></i>
              </div>
              <h3>Tickets & Maintenance</h3>
              <p>Système de gestion des plaintes et interventions. Assignation automatique aux techniciens, suivi en temps réel.</p>
              <a href="#" className="feature-badge">Détails</a>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3>Statistiques & Rapports</h3>
              <p>Dashboard intuitif avec KPIs essentiels : taux d'occupation, revenus, impayés. Exportation des rapports en PDF.</p>
              <a href="#" className="feature-badge">Détails</a>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="steps">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Comment ça marche</span>
            <h2>Démarrez en <span className="gradient-text">3 étapes simples</span></h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Créez votre compte</h3>
              <p>Inscription gratuite en moins de 2 minutes. Choisissez votre plan selon vos besoins.</p>
            </div>

            <div className="step-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Ajoutez vos biens</h3>
              <p>Enregistrez vos propriétés, locataires et contrats de location en quelques clics.</p>
            </div>

            <div className="step-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
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
            <h2>Des tarifs <span className="gradient-text">transparents</span> et flexibles</h2>
            <p className="hero-description">Choisissez le plan qui correspond à votre activité</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Starter</h3>
              <div className="price">
                <span className="price-amount">15 000</span>
                <span className="price-period">FCFA/mois</span>
              </div>
              <ul className="features-list">
                <li><i className="fas fa-check"></i> Jusqu'à 5 biens</li>
                <li><i className="fas fa-check"></i> 10 locataires max</li>
                <li><i className="fas fa-check"></i> Paiements Mobile Money</li>
                <li><i className="fas fa-check"></i> Génération quittances</li>
                <li><i className="fas fa-check"></i> Support email</li>
              </ul>
              <a href="#" className="btn-pricing">Commencer</a>
            </div>

            <div className="pricing-card popular">
              <div className="popular-badge">RECOMMANDÉ</div>
              <h3>Professionnel</h3>
              <div className="price">
                <span className="price-amount">35 000</span>
                <span className="price-period">FCFA/mois</span>
              </div>
              <ul className="features-list">
                <li><i className="fas fa-check"></i> Jusqu'à 25 biens</li>
                <li><i className="fas fa-check"></i> Locataires illimités</li>
                <li><i className="fas fa-check"></i> Tous modes de paiement</li>
                <li><i className="fas fa-check"></i> Gestion tickets</li>
                <li><i className="fas fa-check"></i> Rapports avancés</li>
                <li><i className="fas fa-check"></i> Support prioritaire</li>
              </ul>
              <a href="#" className="btn-pricing">Commencer</a>
            </div>

            <div className="pricing-card">
              <h3>Entreprise</h3>
              <div className="price">
                <span className="price-amount">Sur mesure</span>
              </div>
              <ul className="features-list">
                <li><i className="fas fa-check"></i> Biens illimités</li>
                <li><i className="fas fa-check"></i> Multi-gestionnaires</li>
                <li><i className="fas fa-check"></i> API personnalisée</li>
                <li><i className="fas fa-check"></i> Formation équipe</li>
                <li><i className="fas fa-check"></i> Support dédié 24/7</li>
                <li><i className="fas fa-check"></i> Serveur dédié</li>
              </ul>
              <a href="#" className="btn-pricing btn-outline">Nous contacter</a>
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
              <a href="#" className="btn-cta-primary">Essayer gratuitement 30 jours</a>
              <a href="#" className="btn-cta-secondary">Planifier une démo</a>
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
                <li><a href="#">Démo</a></li>
                <li><a href="#">Documentation</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Entreprise</h4>
              <ul>
                <li><a href="#">À propos</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Carrières</a></li>
                <li><a href="#">Partenaires</a></li>
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
              <a href="#">Conditions d'utilisation</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;