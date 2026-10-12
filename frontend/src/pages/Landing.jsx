import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Shield, Lock, Key, Activity, ArrowRight, Menu, X, Zap, Server, Database, FileCheck } from 'lucide-react';

/* ── Particle system ─────────────────────────────────────── */
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.4 + 0.1,
    }));
    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ── Rotating word ───────────────────────────────────────── */
const WORDS = ['unbreakable', 'quantum-safe', 'unstoppable', 'sovereign'];
function RotatingWord() {
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState('visible'); // visible | exit
  useEffect(() => {
    const t = setInterval(() => {
      setState('exit');
      setTimeout(() => { setIdx(i => (i + 1) % WORDS.length); setState('visible'); }, 520);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
      <span style={{
        display: 'inline-block',
        transition: 'transform 0.52s cubic-bezier(0.76,0,0.24,1), opacity 0.52s ease',
        transform: state === 'exit' ? 'translateY(-110%)' : 'translateY(0)',
        opacity: state === 'exit' ? 0 : 1,
      }}>
        {WORDS[idx]}
      </span>
    </span>
  );
}

/* ── Count-up number ─────────────────────────────────────── */
function CountUp({ target, suffix = '', duration = 1600 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.floor(p * target));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Scroll reveal hook ──────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    }, { threshold: 0.12 });
    const el = ref.current;
    if (el) { el.classList.add('reveal'); obs.observe(el); }
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Nav overlay ─────────────────────────────────────────── */
function NavOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = (path) => {
    onClose();
    if (path.startsWith('#')) {
      setTimeout(() => {
        document.getElementById(path.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    } else {
      navigate(path);
    }
  };

  const navLinks = [
    ['/', 'Home'],
    [isAuthenticated ? '/dashboard' : '/login', isAuthenticated ? 'Dashboard' : 'Sign In'],
    ['#features', 'Features']
  ];

  return (
    <div className={`nav-overlay ${open ? 'open' : ''}`}>
      <div className="nav-overlay-bg" onClick={onClose} />
      <div className="nav-overlay-panel">
        <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 8 }}>
          <X size={24} />
        </button>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navLinks.map(([href, label]) => (
            <a key={label} href={href} className="nav-link-big" onClick={(e) => { e.preventDefault(); go(href); }}>{label}</a>
          ))}
        </nav>
        <div style={{ marginTop: 48, display: 'flex', gap: 16 }}>
          <a href="https://github.com/swayam-kothekar" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <a href="https://linkedin.com/in/swayam-kothekar" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,102,194,0.2)'; e.currentTarget.style.color = '#0a66c2'; e.currentTarget.style.borderColor = 'rgba(10,102,194,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── How We Secure carousel ─────────────────────────────── */
const HOW_STEPS = [
  {
    num: '01',
    title: 'Key Pool\nInitialization',
    desc: 'Your session begins with a fresh quantum key pool seeded by CSPRNG (or real QKD hardware in production). Keys are pre-generated in bulk and held ready for instant consumption.',
    time: 'INSTANT',
    accent: '#a3e635',
    orb: 'radial-gradient(circle at 30% 30%, #a3e635 0%, #365314 55%, #0f1a07 100%)',
    dotColor: 'rgba(163,230,53,0.06)',
  },
  {
    num: '02',
    title: 'ASPE\nAnalysis',
    desc: 'Before every email, ASPE evaluates your real-time pool health. It maps pool depletion percentage to θ₁, θ₂, θ₃ thresholds and recommends the optimal encryption level automatically.',
    time: '< 1 MS',
    accent: '#c084fc',
    orb: 'radial-gradient(circle at 35% 25%, #e879f9 0%, #7c3aed 50%, #0d0618 100%)',
    dotColor: 'rgba(192,132,252,0.06)',
  },
  {
    num: '03',
    title: 'Quantum\nEncryption',
    desc: 'Your message is encrypted using the selected level — L1 (QKD-OTP), L2 (QKD-AES), or L3 (Hybrid QKD⊕ML-KEM-1024). Keys are consumed and marked used, ensuring one-time use.',
    time: '< 5 MS',
    accent: '#38bdf8',
    orb: 'radial-gradient(circle at 40% 20%, #7dd3fc 0%, #0284c7 45%, #020e1a 100%)',
    dotColor: 'rgba(56,189,248,0.06)',
  },
  {
    num: '04',
    title: 'Secure\nDelivery',
    desc: 'The encrypted payload is embedded in a structured MIME message with security attestation headers. It\'s delivered via SMTP/IMAP with full audit trail and cryptographic provenance.',
    time: '< 50 MS',
    accent: '#fb923c',
    orb: 'radial-gradient(circle at 35% 30%, #fb923c 0%, #9a3412 50%, #1a0800 100%)',
    dotColor: 'rgba(251,146,60,0.06)',
  },
  {
    num: '05',
    title: 'Recipient\nDecryption',
    desc: 'The recipient\'s client detects the encryption level from MIME headers, retrieves the correct key material, and decrypts the message — all automatically, delivering the plaintext securely.',
    time: '< 5 MS',
    accent: '#4ade80',
    orb: 'radial-gradient(circle at 30% 35%, #4ade80 0%, #15803d 50%, #031a0b 100%)',
    dotColor: 'rgba(74,222,128,0.06)',
  },
];

/* Unique SVG illustration for each step */
const ILLUSTRATIONS = [
  /* 0 — lime: orbital sphere */
  <svg key={0} viewBox="0 0 200 200" width="160" height="160">
    <defs>
      <radialGradient id="g0" cx="32%" cy="28%" r="68%"><stop offset="0%" stopColor="#ecfccb" /><stop offset="30%" stopColor="#a3e635" /><stop offset="70%" stopColor="#365314" /><stop offset="100%" stopColor="#0a1400" /></radialGradient>
    </defs>
    <circle cx="100" cy="100" r="74" fill="url(#g0)" />
    <ellipse cx="100" cy="100" rx="92" ry="24" fill="none" stroke="#a3e635" strokeWidth="2.5" strokeOpacity="0.45" transform="rotate(-35 100 100)" />
    <ellipse cx="100" cy="100" rx="92" ry="24" fill="none" stroke="#a3e635" strokeWidth="1.5" strokeOpacity="0.22" transform="rotate(35 100 100)" />
    <circle cx="100" cy="100" r="12" fill="#ecfccb" fillOpacity="0.55" />
    <circle cx="76" cy="70" r="20" fill="white" fillOpacity="0.1" />
  </svg>,

  /* 1 — purple: 4-pointed star sparkle */
  <svg key={1} viewBox="0 0 200 200" width="160" height="160">
    <defs>
      <radialGradient id="g1" cx="38%" cy="32%" r="65%"><stop offset="0%" stopColor="#f5d0fe" /><stop offset="40%" stopColor="#c084fc" /><stop offset="80%" stopColor="#6b21a8" /><stop offset="100%" stopColor="#1a0530" /></radialGradient>
    </defs>
    <path d="M100,5 C100,5 110,85 100,100 C90,85 100,5 100,5Z" fill="url(#g1)" />
    <path d="M195,100 C195,100 115,110 100,100 C115,90 195,100 195,100Z" fill="url(#g1)" />
    <path d="M100,195 C100,195 90,115 100,100 C110,115 100,195 100,195Z" fill="url(#g1)" />
    <path d="M5,100 C5,100 85,90 100,100 C85,110 5,100 5,100Z" fill="url(#g1)" />
    <circle cx="100" cy="100" r="14" fill="#f5d0fe" fillOpacity="0.75" />
  </svg>,

  /* 2 — cyan: concentric rings */
  <svg key={2} viewBox="0 0 200 200" width="160" height="160">
    <defs>
      <radialGradient id="g2" cx="38%" cy="32%" r="65%"><stop offset="0%" stopColor="#bae6fd" /><stop offset="45%" stopColor="#0284c7" /><stop offset="100%" stopColor="#012a4a" /></radialGradient>
    </defs>
    <circle cx="100" cy="100" r="80" fill="url(#g2)" />
    <circle cx="100" cy="100" r="60" fill="#020e1a" fillOpacity="0.72" />
    <circle cx="100" cy="100" r="44" fill="#0284c7" fillOpacity="0.5" />
    <circle cx="100" cy="100" r="28" fill="#012a4a" />
    <circle cx="100" cy="100" r="13" fill="#38bdf8" />
    <circle cx="76" cy="72" r="16" fill="white" fillOpacity="0.09" />
  </svg>,

  /* 3 — orange: abstract send arrow */
  <svg key={3} viewBox="0 0 200 200" width="160" height="160">
    <defs>
      <radialGradient id="g3" cx="35%" cy="30%" r="68%"><stop offset="0%" stopColor="#fed7aa" /><stop offset="40%" stopColor="#fb923c" /><stop offset="80%" stopColor="#9a3412" /><stop offset="100%" stopColor="#1a0800" /></radialGradient>
      <radialGradient id="g3b" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fb923c" stopOpacity="0.6" /><stop offset="100%" stopColor="#fb923c" stopOpacity="0" /></radialGradient>
    </defs>
    <circle cx="100" cy="100" r="80" fill="url(#g3b)" />
    <path d="M40,160 L100,40 L160,160 L100,120 Z" fill="url(#g3)" strokeLinejoin="round" />
    <path d="M100,40 L160,160 L100,120 Z" fill="#9a3412" fillOpacity="0.5" />
    <circle cx="100" cy="116" r="10" fill="#fed7aa" fillOpacity="0.7" />
  </svg>,

  /* 4 — green: shield */
  <svg key={4} viewBox="0 0 200 200" width="160" height="160">
    <defs>
      <radialGradient id="g4" cx="35%" cy="28%" r="68%"><stop offset="0%" stopColor="#bbf7d0" /><stop offset="35%" stopColor="#4ade80" /><stop offset="75%" stopColor="#15803d" /><stop offset="100%" stopColor="#031a0b" /></radialGradient>
    </defs>
    <path d="M100,20 L168,52 L168,108 C168,148 100,178 100,178 C100,178 32,148 32,108 L32,52 Z" fill="url(#g4)" />
    <path d="M100,35 L155,63 L155,108 C155,140 100,164 100,164 C100,164 45,140 45,108 L45,63 Z" fill="#031a0b" fillOpacity="0.45" />
    <path d="M76,100 L92,116 L126,82" stroke="#bbf7d0" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="78" cy="66" r="18" fill="white" fillOpacity="0.08" />
  </svg>,
];

function HowWeSecure() {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);

  const go = (dir) => {
    setActive(a => Math.max(0, Math.min(HOW_STEPS.length - 1, a + dir)));
  };

  useEffect(() => {
    if (!trackRef.current) return;
    const cardW = trackRef.current.querySelector('.how-card')?.offsetWidth || 0;
    const gap = 20;
    trackRef.current.scrollTo({ left: active * (cardW + gap), behavior: 'smooth' });
  }, [active]);

  return (
    <section style={{ padding: '140px 0 140px 24px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto 56px', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em', margin: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>How</span> we bring<br />
            security to life
          </h2>
        </div>
      </div>

      {/* Scrollable track */}
      <div
        ref={trackRef}
        style={{ display: 'flex', gap: 20, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingRight: 24, cursor: 'grab' }}
        onMouseDown={e => { const el = e.currentTarget; let startX = e.pageX - el.offsetLeft; let scrollL = el.scrollLeft; const move = ev => { el.scrollLeft = scrollL - (ev.pageX - el.offsetLeft - startX); }; const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); el.style.cursor = 'grab'; }; el.style.cursor = 'grabbing'; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); }}
      >
        {HOW_STEPS.map((step, i) => (
          <div
            key={i}
            className="how-card"
            onClick={() => setActive(i)}
            style={{
              boxShadow: active === i ? '0 0 0 1.5px rgba(255,255,255,0.12), 0 32px 80px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {/* Dot pattern overlay */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${step.dotColor} 1px, transparent 1px)`, backgroundSize: '24px 24px', pointerEvents: 'none' }} />

            {/* Left: step info */}
            <div className="how-card-left">
              {/* Top row: step number + arrow */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: 'rgba(255,255,255,0.08)', lineHeight: 1, letterSpacing: '-0.04em' }}>{step.num}</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12 L12 2 M12 2 H5 M12 2 V9" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>

              {/* Bottom: content */}
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 'clamp(1.5rem,2.5vw,2.2rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16, whiteSpace: 'pre-line' }}>
                  {step.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 24, maxWidth: 380 }}>
                  {step.desc}
                </p>
                <div style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)' }}>
                  {step.time}
                </div>
              </div>
            </div>

            {/* Right: SVG illustration */}
            <div className="how-card-right">
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${step.dotColor} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
              {/* Ambient glow behind illustration */}
              <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${step.accent}22 0%, transparent 70%)`, zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 28px ${step.accent}55)` }}>
                {ILLUSTRATIONS[i]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <div style={{ maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => go(-1)}
          disabled={active === 0}
          style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: active === 0 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: active === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: 18 }}
          onMouseEnter={e => { if (active > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >‹</button>
        <button
          onClick={() => go(1)}
          disabled={active === HOW_STEPS.length - 1}
          style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: active === HOW_STEPS.length - 1 ? 'rgba(255,255,255,0.05)' : '#fff', color: active === HOW_STEPS.length - 1 ? 'rgba(255,255,255,0.2)' : '#000', cursor: active === HOW_STEPS.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontSize: 18 }}
        >›</button>
      </div>
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
    </section>
  );
}

/* ── Main Landing ────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const r1 = useReveal(), r2 = useReveal(), r3 = useReveal(), r4 = useReveal(), r5 = useReveal();

  return (
    <div style={{ background: '#080808', color: '#fff', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      <NavOverlay open={navOpen} onClose={() => setNavOpen(false)} />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: scrolled ? 'rgba(8,8,8,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Logo size={28} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>QSecureMail</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            style={{
              background: isAuthenticated ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.08)',
              border: isAuthenticated ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(255,255,255,0.12)',
              color: isAuthenticated ? '#00d4ff' : '#fff',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              fontFamily: 'inherit'
            }}
          >
            {isAuthenticated ? (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
                Dashboard
              </>
            ) : (
              'Sign In'
            )}
          </button>
          <button onClick={() => setNavOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 24px' }}>
        <Particles />
        <div className="spotlight" />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780 }}>
          <div className="badge" style={{ marginBottom: 28 }}>⚛ QUANTUM-SAFE EMAIL</div>
          <h1 style={{ fontSize: 'clamp(3rem,7vw,6rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 24 }}>
            Turning private into<br />
            <RotatingWord />
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            Quantum-safe email encryption with adaptive security. Three levels of protection powered by QKD and post-quantum cryptography.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get started'} <ArrowRight size={16} />
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Learn more
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', marginBottom: 20, textTransform: 'uppercase' }}>Built on open standards</p>
          <div style={{ display: 'flex', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'inline-flex', gap: 56, animation: 'marqueeScroll 30s linear infinite', flexShrink: 0 }}>
              {['ETSI GS QKD 014', 'ML-KEM-1024', 'FIPS 203', 'AES-256-GCM', 'HMAC-SHA256', 'HKDF-SHA256', 'Post-Quantum Cryptography', 'Quantum Key Distribution', 'RFC 3156', 'ETSI GS QKD 014', 'ML-KEM-1024', 'FIPS 203', 'AES-256-GCM', 'HMAC-SHA256', 'HKDF-SHA256', 'Post-Quantum Cryptography', 'Quantum Key Distribution', 'RFC 3156'].map((s, i) => (
                <span key={i} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        <style>{`@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </section>


      {/* ── Features / Encryption Levels — sticky scroll stack ── */}
      <section id="features" style={{ padding: '120px 24px 0' }}>
        <div className="container">
          {/* Section header */}
          <div ref={r1} className="reveal" style={{ marginBottom: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
            <h2 style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>Transforming</span><br />
              ideas into reality
            </h2>
          </div>

          {/* Sticky cards stack */}
          <div style={{ position: 'relative' }}>
            {[
              {
                label: 'LEVEL 1',
                title: 'QKD-OTP Encryption',
                desc: 'Information-theoretic security with perfect secrecy. One-time pad encryption authenticated with HMAC-SHA256 — the gold standard for absolute, mathematically proven protection.',
                tags: ['Perfect Secrecy', 'HMAC-SHA256', 'QKD Keys'],
                cta: 'L1 services',
                bg: '#1c2d1a',
                accent: '#a3e635',
                top: 80,
                iconBg: 'radial-gradient(circle at 35% 35%, #a3e635 0%, #4d7c0f 60%, #1c2d1a 100%)',
                iconSvg: (
                  <svg width="110" height="110" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="22" r="12" fill="rgba(0,0,0,0.35)" />
                    <circle cx="30" cy="22" r="6" fill="rgba(0,0,0,0.5)" />
                    <rect x="26" y="28" width="8" height="14" rx="4" fill="rgba(0,0,0,0.4)" />
                  </svg>
                ),
              },
              {
                label: 'LEVEL 2',
                title: 'Quantum-Aided AES',
                desc: 'AES-256-GCM seeded with quantum-derived keys via HKDF-SHA256. Efficient computational security with true quantum randomness, striking the perfect balance between performance and protection.',
                tags: ['AES-256-GCM', 'HKDF-SHA256', 'Computational'],
                cta: 'L2 services',
                bg: '#1e0a35',
                accent: '#c084fc',
                top: 100,
                iconBg: 'radial-gradient(circle at 35% 35%, #e879f9 0%, #7c3aed 55%, #1e0a35 100%)',
                iconSvg: (
                  <svg width="110" height="110" viewBox="0 0 60 60" fill="none">
                    <path d="M30 10 L50 50 L10 50 Z" fill="rgba(0,0,0,0.3)" />
                    <path d="M30 22 L42 44 L18 44 Z" fill="rgba(0,0,0,0.4)" />
                    <circle cx="30" cy="36" r="4" fill="rgba(0,0,0,0.5)" />
                  </svg>
                ),
              },
              {
                label: 'LEVEL 3 · NOVEL',
                title: 'Hybrid QKD ⊕ PQC',
                desc: 'ML-KEM-1024 (FIPS 203) fused with QKD keys for dual-layer quantum-safe protection. Our novel XOR-fusion architecture is the future of post-quantum cryptography, available today.',
                tags: ['ML-KEM-1024', 'QKD Fusion', 'Dual-Layer', 'FIPS 203'],
                cta: 'L3 services',
                bg: '#071828',
                accent: '#38bdf8',
                top: 120,
                iconBg: 'radial-gradient(circle at 40% 25%, #7dd3fc 0%, #0284c7 40%, #071828 100%)',
                iconSvg: (
                  <svg width="110" height="110" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="30" r="20" fill="rgba(0,0,0,0.3)" />
                    <circle cx="30" cy="30" r="13" fill="rgba(0,0,0,0.35)" />
                    <circle cx="30" cy="30" r="6" fill="rgba(0,0,0,0.45)" />
                  </svg>
                ),
              },
            ].map((card, i) => (
              <div
                key={i}
                className="sticky-level-card"
                style={{
                  top: card.top,
                  background: card.bg,
                  zIndex: 10 + i,
                }}
              >
                {/* Large decorative icon — top right on desktop, watermark corner on mobile */}
                <div 
                  className="sticky-level-orb"
                  style={{ background: card.iconBg, boxShadow: `0 0 60px ${card.accent}30` }}
                >
                  {card.iconSvg}
                </div>

                {/* Content — bottom left */}
                <div style={{ marginTop: 'auto', maxWidth: 600 }}>
                  {/* Level badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, border: `1px solid ${card.accent}55`, color: card.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
                    {card.label}
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: card.accent, marginBottom: 16 }}>
                    {card.title}
                  </h3>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {card.tags.map(t => (
                      <span key={t} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 999, border: `1px solid ${card.accent}55`, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>

                  {/* Description */}
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
                    {card.desc}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.18)`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                  >
                    {card.cta} →
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Spacer so content doesn't clip behind sticky cards */}
          <div style={{ height: 160 }} />
        </div>
      </section>



      {/* ── Numbers ── */}
      <section id="security" style={{ padding: '120px 24px 140px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 80 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em', margin: 0 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Numbers that</span><br />
                drive security
              </h2>
            </div>
          </div>

          {/* Big stats — responsive grid */}
          <div className="numbers-stats-grid">
            {[
              { n: 3, suf: '+', label: 'Encryption Levels', dot: '#ef4444' },
              { n: 100, suf: '%', label: 'Quantum-Safe Emails', dot: '#a3e635' },
              { n: 256, suf: '-bit', label: 'AES Key Strength', dot: '#4ade80' },
              { n: 1024, suf: '', label: 'ML-KEM Security Bits', dot: '#38bdf8' },
            ].map(({ n, suf, label, dot }) => (
              <div key={label}>
                {/* Dot + number row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 8px ${dot}99` }} />
                  <span className="numbers-stat-num">
                    <CountUp target={n} suffix={suf} />
                  </span>
                </div>
                {/* Label */}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16, fontWeight: 400, margin: 0, paddingLeft: 28 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How We Secure — horizontal carousel ── */}
      <HowWeSecure />



      {/* ── CTA ── */}
      <section id="contact" style={{ padding: '140px 24px', position: 'relative', overflow: 'hidden' }}>
        <Particles />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <div className="badge" style={{ marginBottom: 28 }}>GET STARTED</div>
          <h2 style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 24 }}>
            Ready to secure<br />your communications?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 17, marginBottom: 44 }}>
            Experience quantum-safe email encryption today.
          </p>
          <button className="btn-primary" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')} style={{ fontSize: 16, padding: '16px 40px' }}>
            {isAuthenticated ? 'Open Dashboard' : 'Sign in now'} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 24px' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>© 2026 QSecureMail. Built for quantum-safe communication.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {/* GitHub */}
            <a href="https://github.com/swayam-kothekar" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="https://linkedin.com/in/swayam-kothekar" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,102,194,0.2)'; e.currentTarget.style.color = '#0a66c2'; e.currentTarget.style.borderColor = 'rgba(10,102,194,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
        <div className="footer-brand-text" style={{ textAlign: 'center', marginTop: 8 }}>QSecureMail</div>
      </footer>
    </div>
  );
}
