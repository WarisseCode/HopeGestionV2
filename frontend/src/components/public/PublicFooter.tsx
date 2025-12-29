import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Linkedin } from 'lucide-react';

const PublicFooter: React.FC = () => {
    return (
        <footer className="footer p-10 bg-neutral text-neutral-content">
            <aside>
                <div className="flex items-center gap-2 mb-2">
                    <img src="/logo.png" alt="Hope Immo" className="h-10 w-auto brightness-0 invert" />
                    <span className="text-2xl font-bold">Hope Gestion</span>
                </div>
                <p className="max-w-xs opacity-70">
                    La solution complète pour la gestion immobilière en Afrique.
                    <br/>
                    Simple. Sécurisé. Efficace.
                </p>
                <p className="mt-4 opacity-70">
                    Cotonou, Bénin<br/>
                    +229 01 00 00 00<br/>
                    contact@hopegestion.bj
                </p>
                <div className="flex gap-4 mt-6">
                    <a className="btn btn-ghost btn-sm btn-circle hover:bg-white/10"><Facebook size={20}/></a>
                    <a className="btn btn-ghost btn-sm btn-circle hover:bg-white/10"><Twitter size={20}/></a>
                    <a className="btn btn-ghost btn-sm btn-circle hover:bg-white/10"><Linkedin size={20}/></a>
                </div>
            </aside> 
            <nav>
                <h6 className="footer-title opacity-100 text-white">Produit</h6> 
                <Link to="/fonctionnalites" className="link link-hover opacity-70 hover:opacity-100">Fonctionnalités</Link>
                <Link to="/a-propos" className="link link-hover opacity-70 hover:opacity-100">Qui sommes-nous ?</Link>
                <Link to="/#tarifs" className="link link-hover opacity-70 hover:opacity-100">Tarifs</Link>
                <Link to="/#faq" className="link link-hover opacity-70 hover:opacity-100">FAQ</Link>
            </nav> 
            <nav>
                <h6 className="footer-title opacity-100 text-white">Ressources</h6> 
                <Link to="/blog" className="link link-hover opacity-70 hover:opacity-100">Blog</Link>
                <Link to="/guide" className="link link-hover opacity-70 hover:opacity-100">Guide de gestion</Link>
                <Link to="/support" className="link link-hover opacity-70 hover:opacity-100">Support</Link>
            </nav> 
            <nav>
                <h6 className="footer-title opacity-100 text-white">Légal</h6> 
                <Link to="/cgu" className="link link-hover opacity-70 hover:opacity-100">CGU</Link>
                <Link to="/confidentialite" className="link link-hover opacity-70 hover:opacity-100">Confidentialité</Link>
                <Link to="/mentions-legales" className="link link-hover opacity-70 hover:opacity-100">Mentions Légales</Link>
            </nav>
        </footer>
    );
};

export default PublicFooter;
