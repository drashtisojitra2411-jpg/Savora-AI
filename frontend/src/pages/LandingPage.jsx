import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Zap, Activity, ArrowRight, ScanLine } from 'lucide-react';

const floatingImages = [
  { src: '/images/pizza.png', x: '-5%', y: '15%', delay: 0, size: 280, rotate: 15 },
  { src: '/images/burger.png', x: '80%', y: '20%', delay: 1, size: 300, rotate: -10 },
  { src: '/images/sushi.png', x: '75%', y: '70%', delay: 0.5, size: 260, rotate: -5 },
];

export default function LandingPage() {
  return (
    <div className="page-wrapper savora-home">
      <div className="glow-orb savora-home-glow savora-home-glow-left" />
      <div className="glow-orb savora-home-glow savora-home-glow-right" />

      <section className="savora-home-hero">
        {floatingImages.map((img, i) => (
          <motion.div
            key={i}
            className="savora-home-float"
            style={{ left: img.x, top: img.y }}
            animate={{ y: [0, -20, 0], rotate: [img.rotate, img.rotate + 3, img.rotate] }}
            transition={{ duration: 8 + i, repeat: Infinity, ease: 'easeInOut', delay: img.delay }}
          >
            <img src={img.src} alt="food" style={{ width: img.size }} />
          </motion.div>
        ))}

        <div className="container-main savora-home-hero-content">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="savora-home-pill"
          >
            <span className="savora-home-pill-dot" />
            <span>Deep learning powered</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
          >
            <span>Savora analyzes </span>
            <span className="gradient-text">every bite</span>
            <span> in seconds.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
          >
            Upload a meal photo and get calories, macros, and confidence scores in one clear AI-first workflow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="savora-home-actions"
          >
            <Link to="/dashboard" className="btn-primary savora-home-primary">
              <ScanLine size={20} />
              Start scanning
            </Link>
            <Link to="/history" className="savora-home-secondary-link">
              View scan history
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="savora-home-features">
        <div className="container-main">
          <div className="savora-home-section-head">
            <span className="savora-kicker">Why Savora</span>
            <h2>Designed like a premium AI product.</h2>
          </div>

          <div className="savora-home-feature-grid">
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card savora-home-feature savora-home-feature-wide"
            >
              <div className="savora-home-feature-icon">
                <Camera size={22} />
              </div>
              <h3>Instant visual recognition</h3>
              <p>Automatically detects food from a single image with optimized AI inference and clear confidence feedback.</p>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="glass-card savora-home-feature"
            >
              <div className="savora-home-feature-icon savora-home-feature-icon-cool">
                <Zap size={22} />
              </div>
              <h3>Fast workflow</h3>
              <p>From upload to nutrition insights in a single streamlined flow with low-friction interactions.</p>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="glass-card savora-home-feature savora-home-feature-wide savora-home-feature-cta"
            >
              <div className="savora-home-feature-icon">
                <Activity size={22} />
              </div>
              <h3>Macro analytics that are readable</h3>
              <p>Track calories, protein, carbs, and fat with polished cards and charts built for quick decision making.</p>
              <Link to="/dashboard" className="btn-secondary">Open dashboard</Link>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="savora-home-final-cta">
        <div className="container-main">
          <div className="glass-card savora-home-cta-card">
            <h2>Ready to scan your next meal?</h2>
            <p>Start with one image and let Savora handle the nutrition breakdown instantly.</p>
            <Link to="/dashboard" className="btn-primary">Try Savora now</Link>
          </div>
        </div>
      </section>

      <footer className="savora-home-footer">
        <div className="container-main">
          <p>© 2026 Savora AI. Premium food recognition platform.</p>
        </div>
      </footer>
    </div>
  );
}
