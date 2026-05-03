import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { aspeAPI, kmAPI } from '../../services/api';
import { Activity, Key, Shield, TrendingUp, AlertCircle, Send, Inbox } from 'lucide-react';

function CountUp({ target, suffix = '', duration = 1400 }) {
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
          if (p < 1) requestAnimationFrame(tick); else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

function HealthBar({ value }) {
  const color = value >= 70 ? '#4ade80' : value >= 40 ? '#f5d060' : '#f87171';
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginTop: 12 }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999, transition: 'width 1s ease' }} />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [aspeStatus, setAspeStatus] = useState(null);
  const [kmStatus, setKmStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const [aspeRes, kmRes] = await Promise.all([aspeAPI.getStatus(), kmAPI.getStatus()]);
      setAspeStatus(aspeRes.data); setKmStatus(kmRes.data);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const getLevelName = (level) => ({ 1: 'QKD-OTP', 2: 'QKD-AES', 3: 'Hybrid QKD⊕PQC' })[level] || 'Unknown';
  const getLevelColor = (level) => ({ 1: '#4ade80', 2: '#a855f7', 3: '#00d4ff' })[level] || '#fff';

  const poolHealth = parseFloat(aspeStatus?.poolHealth || 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', color: '#fff', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div className="badge" style={{ marginBottom: 16 }}>DASHBOARD</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>System Overview</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Monitor your quantum-safe email system in real-time</p>
      </div>      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>

        {/* Pool Health — green tint like L1 */}
        <div style={{ background: '#0f1f0e', border: '1px solid rgba(74,222,128,0.1)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(74,222,128,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} color="#4ade80" />
              </div>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: `rgba(${poolHealth >= 70 ? '74,222,128' : poolHealth >= 40 ? '245,208,96' : '248,113,113'},0.12)`, color: poolHealth >= 70 ? '#4ade80' : poolHealth >= 40 ? '#f5d060' : '#f87171', fontWeight: 600, letterSpacing: '0.06em' }}>
                {poolHealth.toFixed(1)}%
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Pool Health</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{kmStatus?.availableKeys || 0}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> / {kmStatus?.poolSize || 0}</span></p>
            <HealthBar value={poolHealth} />
          </div>
        </div>

        {/* Current Level — cyan tint like L3 */}
        <div style={{ background: '#060f1a', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,212,255,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#00d4ff" />
              </div>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontWeight: 600, letterSpacing: '0.06em' }}>
                LVL {aspeStatus?.currentLevel || 3}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Current Security</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: getLevelColor(aspeStatus?.currentLevel) }}>{getLevelName(aspeStatus?.currentLevel)}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Active encryption protocol</p>
          </div>
        </div>

        {/* Email Rate — yellow tint */}
        <div style={{ background: '#1a1506', border: '1px solid rgba(245,208,96,0.1)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(245,208,96,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,208,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={18} color="#f5d060" />
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Email Rate</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}><CountUp target={aspeStatus?.emailRate || 0} /><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/hr</span></p>
          </div>
        </div>

        {/* ASPE Recommended — purple tint like L2 */}
        <div style={{ background: '#110a20', border: '1px solid rgba(168,85,247,0.1)', borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(168,85,247,0.04) 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={18} color="#a855f7" />
              </div>
              <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.1)', color: '#a855f7', fontWeight: 600, letterSpacing: '0.06em' }}>ASPE</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Recommended</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: getLevelColor(aspeStatus?.recommendedLevel) }}>{getLevelName(aspeStatus?.recommendedLevel)}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Based on pool health</p>
          </div>
        </div>
      </div>


      {/* Pool Lifetime */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Estimated Pool Lifetime</h2>
          <div className="badge">KEY USAGE</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
          {[
            { label: 'Level 1 (OTP)', value: aspeStatus?.estimatedLifetimes?.level1, tag: 'HIGH', color: '#f87171' },
            { label: 'Level 2 (AES)', value: aspeStatus?.estimatedLifetimes?.level2, tag: 'MEDIUM', color: '#f5d060' },
            { label: 'Level 3 (Hybrid)', value: aspeStatus?.estimatedLifetimes?.level3, tag: 'EFFICIENT', color: '#4ade80' },
          ].map(({ label, value, tag, color }) => (
            <div key={label} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${color}18`, color: color, fontWeight: 600, letterSpacing: '0.08em' }}>{tag}</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 800, color }}>{value || '0'}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>h</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(0,212,255,0.1),rgba(96,165,250,0.06))', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 20, padding: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Send size={18} color="#00d4ff" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Send Secure Email</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Compose a quantum-safe encrypted message</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard/compose')} style={{ fontSize: 13, padding: '10px 20px' }}>Compose</button>
        </div>
        <div className="stat-card" style={{ padding: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Inbox size={18} color="#a855f7" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>View Inbox</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Check your encrypted and normal emails</p>
          <button className="btn-secondary" onClick={() => navigate('/dashboard/inbox')} style={{ fontSize: 13, padding: '10px 20px' }}>Open Inbox</button>
        </div>

        {/* System status */}
        <div style={{ background: poolHealth >= 70 ? 'rgba(74,222,128,0.05)' : poolHealth >= 40 ? 'rgba(245,208,96,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${poolHealth >= 70 ? 'rgba(74,222,128,0.15)' : poolHealth >= 40 ? 'rgba(245,208,96,0.15)' : 'rgba(248,113,113,0.15)'}`, borderRadius: 20, padding: 28 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={18} color={poolHealth >= 70 ? '#4ade80' : poolHealth >= 40 ? '#f5d060' : '#f87171'} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>System Status</h4>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                All services operational. Pool health is {poolHealth >= 70 ? 'excellent' : poolHealth >= 40 ? 'good' : 'low'}.
                {poolHealth < 40 && ' Consider replenishing the key pool in Settings.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
