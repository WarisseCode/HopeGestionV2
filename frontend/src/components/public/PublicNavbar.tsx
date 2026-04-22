import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const PublicNavbar: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Fonctionnalités', path: '/fonctionnalites' },
        { name: 'Qui sommes-nous', path: '/a-propos' },
        { name: 'Tarifs', path: '/#tarifs' },
        { name: 'FAQ', path: '/#faq' },
        { name: 'Contact', path: '/#contact' },
    ];

    return (
        <>
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={`navbar fixed top-0 z-50 transition-all duration-300 px-4 md:px-8
                    ${scrolled || isMobileMenuOpen ? 'bg-base-100/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}
            >
                <div className="navbar-start">
                    <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
                        <img src="/logo.png" alt="Hope Gestion" className="h-8 md:h-12 w-auto" />
                        <span className="font-bold text-xl hidden sm:inline">Hope Gestion</span>
                    </Link>
                </div>

                <div className="navbar-center hidden lg:flex">
                    <ul className="menu menu-horizontal px-1 font-medium">
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                {link.path.startsWith('/#') && location.pathname === '/' ? (
                                    <a href={link.path.substring(1)}>{link.name}</a>
                                ) : (
                                    <Link to={link.path}>{link.name}</Link>
                                )}
                            </li>
                        ))}
                        <li>
                            <Link
                                to="/biens-disponibles"
                                className={`font-semibold text-primary hover:text-primary transition-colors ${
                                    location.pathname === '/biens-disponibles' ? 'text-primary font-bold' : ''
                                }`}
                            >
                                🏠 Biens disponibles
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="navbar-end gap-2">
                    <Link to="/login" className="btn btn-ghost btn-sm md:btn-md hidden sm:flex">
                        Connexion
                    </Link>
                    <Link to="/signup" className="btn btn-primary btn-sm md:btn-md rounded-full px-4 md:px-6 hidden sm:flex">
                        Commencer
                    </Link>
                    {/* Hamburger — visible en dessous de lg */}
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="btn btn-ghost btn-sm btn-square lg:hidden"
                        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                        aria-expanded={isMobileMenuOpen ? 'true' : 'false'}
                    >
                        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </motion.div>

            {/* Menu mobile déroulant */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="fixed top-16 left-0 right-0 z-40 bg-base-100/95 backdrop-blur-md shadow-lg border-b border-base-200 lg:hidden"
                    >
                        <ul className="menu p-4 gap-1">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    {link.path.startsWith('/#') && location.pathname === '/' ? (
                                        <a
                                            href={link.path.substring(1)}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="py-3 text-base font-medium"
                                        >
                                            {link.name}
                                        </a>
                                    ) : (
                                        <Link to={link.path} className="py-3 text-base font-medium">
                                            {link.name}
                                        </Link>
                                    )}
                                </li>
                            ))}
                            <li>
                                <Link to="/biens-disponibles" className="py-3 text-base font-semibold text-primary">
                                    🏠 Biens disponibles
                                </Link>
                            </li>
                            <li className="divider my-2" />
                            <li className="flex gap-3 px-2">
                                <Link to="/login" className="btn btn-ghost btn-sm flex-1">
                                    Connexion
                                </Link>
                                <Link to="/signup" className="btn btn-primary btn-sm rounded-full flex-1">
                                    Commencer
                                </Link>
                            </li>
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PublicNavbar;
