import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Menu, X } from 'lucide-react';

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/dashboard', label: 'Scan Food' },
  { path: '/history', label: 'History' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(11, 11, 15, 0.75)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'var(--border-surface)' : 'transparent'}`,
      }}
    >
      <div className="container-main flex items-center justify-between gap-4" style={{ minHeight: 'var(--header-height)' }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div
            className="flex items-center justify-center relative group"
            style={{ width: 44, height: 44 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#ff7a18] to-[#af002d] blur-lg opacity-40 group-hover:opacity-70 transition duration-500"></div>
            <div className="relative flex items-center justify-center w-full h-full rounded-xl bg-gradient-to-tr from-[#ff7a18] to-[#af002d]">
              <UtensilsCrossed size={22} color="white" />
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Savora
            </h1>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="nav-pill-group hidden md:flex items-center">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="nav-pill-item relative overflow-hidden"
                style={{
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  letterSpacing: '0.01em',
                  textDecoration: 'none'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full -z-10"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/dashboard" className="nav-pill-item border border-white/10 bg-white/5 text-sm font-semibold text-white">
            Get Started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[#0b0b0f] border-b border-white/10"
          >
            <div className="container-main py-4">
              <div className="nav-pill-group flex flex-col items-stretch rounded-[28px]">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className="nav-pill-item text-center font-medium"
                  style={{
                    color: location.pathname === link.path ? 'white' : 'var(--text-secondary)',
                    background: location.pathname === link.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
