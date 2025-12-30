import React from 'react';
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

const PublicFooter: React.FC = () => {
    const currentYear = new Date().getFullYear();

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
                                <Link to="/syndic" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors flex items-center gap-2 group">
                                    <ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                    Syndic de Copropriété
                                </Link>
                            </li>
                            <li>
                                <Link to="/mobile-money" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors flex items-center gap-2 group">
                                    <ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                    Paiement Mobile
                                </Link>
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
                                <Link to="/blog" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                                    Actualités & Blog
                                </Link>
                            </li>
                            <li>
                                <Link to="/support" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                                    Centre d'aide
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="opacity-70 hover:opacity-100 hover:text-primary transition-colors">
                                    Nous contacter
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Newsletter */}
                    <div>
                        <h6 className="text-white font-bold uppercase tracking-wider mb-6 text-sm">Restez informé</h6>
                        <p className="opacity-70 text-sm mb-4">
                            Inscrivez-vous à notre newsletter pour recevoir nos conseils en gestion immobilière.
                        </p>
                        <div className="form-control w-full">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Votre email" 
                                    className="input input-bordered w-full pr-12 bg-base-100/10 border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-primary" 
                                />
                                <button className="absolute top-0 right-0 rounded-l-none btn btn-primary btn-square">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-8">
                            <h6 className="text-xs font-bold uppercase opacity-50 mb-3">Suivez-nous</h6>
                            <div className="flex gap-2">
                                <a href="#" className="btn btn-ghost btn-sm btn-square hover:bg-white/10 hover:text-blue-500 transition-colors">
                                    <Facebook size={18} />
                                </a>
                                <a href="#" className="btn btn-ghost btn-sm btn-square hover:bg-white/10 hover:text-sky-400 transition-colors">
                                    <Twitter size={18} />
                                </a>
                                <a href="#" className="btn btn-ghost btn-sm btn-square hover:bg-white/10 hover:text-blue-600 transition-colors">
                                    <Linkedin size={18} />
                                </a>
                                <a href="#" className="btn btn-ghost btn-sm btn-square hover:bg-white/10 hover:text-pink-500 transition-colors">
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
                        <Link to="/confidentialite" className="hover:opacity-100 transition-opacity">Confidentialité</Link>
                        <Link to="/cookies" className="hover:opacity-100 transition-opacity">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;
