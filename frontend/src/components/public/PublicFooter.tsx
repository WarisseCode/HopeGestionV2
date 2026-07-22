import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Send
} from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const PublicFooter: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [newsletterEmail, setNewsletterEmail] = useState('');

    const handleNewsletter = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail) return;
        toast.success('Merci ! Vous serez notifié(e) dès le lancement de la newsletter.');
        setNewsletterEmail('');
    };

    return (
        <footer className="bg-neutral text-neutral-content font-sans">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    
                    {/* Column 1: Brand & Contact */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <img src="/logo.png" alt="Hope Immo" className="h-10 w-auto brightness-0 invert" />
                            {/* <span className="text-2xl font-bold tracking-tight">Hope Gestion</span> */}
                        </div>
                        <p className="opacity-70 text-sm leading-relaxed max-w-xs">
                            La première plateforme de gestion immobilière connectée au Bénin. 
                            Simplifiez vos locations, sécurisez vos revenus et gérez vos biens en toute sérénité.
                        </p>
                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                <MapPin size={18} className="mt-1 shrink-0 text-primary" />
                                <span className="text-sm">Haie Vive, Cotonou, Bénin</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                <Phone size={18} className="shrink-0 text-primary" />
                                <span className="text-sm">+229 01 00 00 00</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                                <Mail size={18} className="shrink-0 text-primary" />
                                <span className="text-sm">contact@hopegestion.bj</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Solutions */}
                    <div>
                        <h6 className="text-white font-bold uppercase tracking-wider mb-6 text-sm">Solutions</h6>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link to="/fonctionnalites" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors flex items-center gap-2 group">
                                    <ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                    Gestion Locative
                                </Link>
                            </li>
                            <li>
                                <span className="opacity-40 flex items-center gap-2 cursor-not-allowed text-sm">
                                    <ArrowRight size={14} className="opacity-0" />
                                    Syndic de Copropriété
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">Bientôt</span>
                                </span>
                            </li>
                            <li>
                                <span className="opacity-40 flex items-center gap-2 cursor-not-allowed text-sm">
                                    <ArrowRight size={14} className="opacity-0" />
                                    Paiement Mobile
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">Bientôt</span>
                                </span>
                            </li>
                            <li>
                                <Link to="/tarifs" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors flex items-center gap-2 group">
                                    <ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                    Nos Tarifs
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Entreprise & Aide */}
                    <div>
                        <h6 className="text-white font-bold uppercase tracking-wider mb-6 text-sm">Entreprise</h6>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link to="/a-propos" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                                    Qui sommes-nous ?
                                </Link>
                            </li>
                            <li>
                                <span className="opacity-40 cursor-not-allowed text-sm flex items-center gap-2">
                                    Actualités & Blog
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">Bientôt</span>
                                </span>
                            </li>
                            <li>
                                <span className="opacity-40 cursor-not-allowed text-sm flex items-center gap-2">
                                    Centre d'aide
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">Bientôt</span>
                                </span>
                            </li>
                            <li>
                                <span className="opacity-40 cursor-not-allowed text-sm flex items-center gap-2">
                                    Nous contacter
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold">Bientôt</span>
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h6 className="text-white font-bold uppercase tracking-wider mb-6 text-sm">Restez informé</h6>
                        <p className="opacity-70 text-sm mb-4">
                            Inscrivez-vous à notre newsletter pour recevoir nos conseils en gestion immobilière.
                        </p>
                        <form onSubmit={handleNewsletter} className="form-control w-full">
                            <div className="relative">
                                <input
                                    type="email"
                                    id="newsletter-email"
                                    aria-label="Votre adresse email pour la newsletter"
                                    placeholder="Votre email"
                                    value={newsletterEmail}
                                    onChange={(e) => setNewsletterEmail(e.target.value)}
                                    className="input input-bordered w-full pr-12 bg-base-100/10 border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-primary"
                                />
                                <button
                                    type="submit"
                                    aria-label="S'inscrire à la newsletter"
                                    className="absolute top-0 right-0 rounded-l-none btn btn-primary btn-square"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                        <div className="mt-8">
                            <h6 className="text-xs font-bold uppercase opacity-50 mb-3">Suivez-nous</h6>
                            <div className="flex gap-2">
                                <a href="#" aria-label="Facebook" className="btn btn-ghost btn-sm btn-square hover:bg-base-100/10 hover:text-teal-500 transition-colors">
                                    <Facebook size={18} />
                                </a>
                                <a href="#" aria-label="Twitter" className="btn btn-ghost btn-sm btn-square hover:bg-base-100/10 hover:text-sky-400 transition-colors">
                                    <Twitter size={18} />
                                </a>
                                <a href="#" aria-label="LinkedIn" className="btn btn-ghost btn-sm btn-square hover:bg-base-100/10 hover:text-teal-600 transition-colors">
                                    <Linkedin size={18} />
                                </a>
                                <a href="#" aria-label="Instagram" className="btn btn-ghost btn-sm btn-square hover:bg-base-100/10 hover:text-pink-500 transition-colors">
                                    <Instagram size={18} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10 bg-black/20">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs opacity-60 text-center md:text-left">
                        © {currentYear} Hope Gestion. Tous droits réservés.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 text-xs opacity-60">
                        <Link to="/mentions-legales" className="hover:opacity-100 transition-opacity">Mentions Légales</Link>
                        <Link to="/cgu" className="hover:opacity-100 transition-opacity">CGU</Link>
                        <Link to="/cgv" className="hover:opacity-100 transition-opacity">CGV</Link>
                        <Link to="/conditions-reservation" className="hover:opacity-100 transition-opacity">Conditions de Réservation</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;
