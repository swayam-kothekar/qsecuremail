import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Shield, Mail, Key, AlertCircle, Loader, ArrowLeft, ArrowRight } from 'lucide-react';

/* ── Particle system (same as Landing) ─────────────────── */
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      alpha: Math.random() * 0.25 + 0.06,
    }));
    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = '#fff';
        ctx.fillRect(p.x, p.y, p.size, p.size); ctx.restore();
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
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem('qsecuremail_last_email') || localStorage.getItem('qsecuremail_email') || '');
  const [appPassword, setAppPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (email.trim()) {
        localStorage.setItem('qsecuremail_last_email', email.trim());
      }
      const result = await login(email, appPassword);
      if (result.success) navigate('/dashboard');
      else setError(result.error || 'Login failed');
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s, background 0.2s',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <Particles />
      {/* Spotlight glow */}
      <div className="spotlight" />

      {/* Main card */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="login-back-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '8px 18px', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Pill badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(0,212,255,0.25)', color: 'rgba(0,212,255,0.8)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 24 }}>
            ⚛ QUANTUM-SAFE AUTH
          </div>

          {/* Icon */}
          <div style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
            <Logo size={60} />
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.08, marginBottom: 10 }}>Sign in</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: 400 }}>Quantum-Safe Email Communication</p>
        </div>

        {/* Form card — matches landing page sticky card style */}
        <div className="login-card" style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Dot grid pattern (same as landing cards) */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,212,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Error */}
            {error && (
              <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={16} color="#f87171" />
                <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="your@email.com"
                    required
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,212,255,0.45)'; e.target.style.background = 'rgba(0,212,255,0.04)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="appPassword" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Google App Password</label>
                <div style={{ position: 'relative' }}>
                  <Key size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  <input
                    id="appPassword"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={appPassword}
                    onChange={e => setAppPassword(e.target.value)}
                    style={inputStyle}
                    placeholder="16-character app password"
                    required
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,212,255,0.45)'; e.target.style.background = 'rgba(0,212,255,0.04)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                  />
                </div>
                <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                  Not your regular password. Use a Google App Password.{' '}
                  <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer" style={{ color: '#00d4ff', textDecoration: 'none' }}>How?</a>
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px', marginTop: 4, fontSize: 15, fontWeight: 700, borderRadius: 999,
                  background: '#fff', color: '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1, transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.88)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                {loading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                  : <>Sign In <ArrowRight size={16} /></>
                }
              </button>
            </form>
          </div>
        </div>

        {/* Info box — pill-tag style matching landing */}
        <div style={{ marginTop: 16, background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 20, padding: '20px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,212,255,0.6)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Why App Password?</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 0, listStyle: 'none', margin: 0 }}>
            {[
              'SMTP/IMAP access for sending and receiving on your behalf',
              'App Passwords are safer than using your main password',
              'Enable 2-Step Verification first in your Google account',
              'Your credentials are never stored on our servers',
            ].map(t => (
              <li key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 10 }}>
                <span style={{ color: '#00d4ff', flexShrink: 0, fontWeight: 700 }}>→</span>{t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-back-btn {
          position: fixed;
          top: 24px;
          left: 24px;
          z-index: 10;
        }
        @media (max-width: 640px) {
          .login-back-btn {
            position: static;
            margin-bottom: 20px;
            align-self: flex-start;
          }
        }
        .login-card {
          padding: 36px 36px 32px;
        }
        @media (max-width: 480px) {
          .login-card {
            padding: 26px 20px 24px;
          }
        }
      `}</style>
    </div>
  );
}
