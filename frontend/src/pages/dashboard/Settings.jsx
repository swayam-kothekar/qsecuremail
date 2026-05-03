import { useState, useEffect } from 'react';
import { aspeAPI, kmAPI, auditAPI } from '../../services/api';
import { Activity, Key, FileText, RefreshCw, Loader, CheckCircle, AlertCircle, TrendingUp, Database } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff', fontSize: 13,
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
};

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' };

export default function Settings() {
  const [activeTab, setActiveTab] = useState('aspe');
  const [aspeStatus, setAspeStatus] = useState(null);
  const [thresholds, setThresholds] = useState({ theta1: 0.70, theta2: 0.40, theta3: 0.10 });
  const [calibrationParams, setCalibrationParams] = useState({ poolSize: 1000, emailRate: 10, replenishmentRate: 0, minLifetime: 1 });
  const [kmStatus, setKmStatus] = useState(null);
  const [replenishCount, setReplenishCount] = useState(100);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'aspe') { const r = await aspeAPI.getStatus(); setAspeStatus(r.data); if (r.data.thresholds) setThresholds(r.data.thresholds); }
      else if (activeTab === 'km') { const r = await kmAPI.getStatus(); setKmStatus(r.data); }
      else if (activeTab === 'audit') { const r = await auditAPI.getRecent(50); setAuditLog(r.data.entries || []); }
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleCalibrateASPE = async () => {
    setLoading(true); setError(''); setSuccess('');
    try { const r = await aspeAPI.calibrate(calibrationParams); if (r.data.success) { showSuccess('ASPE calibrated successfully'); setThresholds(r.data.newThresholds); fetchData(); } }
    catch (err) { setError(err.response?.data?.error || 'Calibration failed'); }
    finally { setLoading(false); }
  };

  const handleReplenish = async () => {
    setLoading(true); setError(''); setSuccess('');
    try { const r = await kmAPI.replenish(replenishCount); if (r.data.success) { showSuccess(`Pool replenished with ${replenishCount} keys`); fetchData(); } }
    catch (err) { setError(err.response?.data?.error || 'Replenishment failed'); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!confirm('Reset the key pool? All used keys will be cleared.')) return;
    setLoading(true); setError(''); setSuccess('');
    try { const r = await kmAPI.reset(); if (r.data.success) { showSuccess('Key pool reset successfully'); fetchData(); } }
    catch (err) { setError(err.response?.data?.error || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'aspe', label: 'ASPE', icon: <Activity size={16} /> },
    { id: 'km', label: 'Key Mgmt', icon: <Key size={16} /> },
    { id: 'audit', label: 'Audit Log', icon: <FileText size={16} /> },
  ];

  const poolHealth = parseFloat(kmStatus?.poolHealth || 0);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#fff', padding: 40, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 36 }}>
        <div className="badge" style={{ marginBottom: 16 }}>SETTINGS</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>System Settings</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Configure ASPE, manage keys, and view audit logs</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 28, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setError(''); setSuccess(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: activeTab === t.id ? '#fff' : 'transparent', color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {success && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <CheckCircle size={14} color="#4ade80" /><p style={{ fontSize: 13, color: '#4ade80' }}>{success}</p>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertCircle size={14} color="#f87171" /><p style={{ fontSize: 13, color: '#f87171' }}>{error}</p>
        </div>
      )}

      {/* ── ASPE Tab ── */}
      {activeTab === 'aspe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {aspeStatus && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
              {[['Pool Health', `${aspeStatus.poolHealth}%`, '#4ade80'], ['Current Level', `Level ${aspeStatus.currentLevel}`, '#00d4ff'], ['Email Rate', `${aspeStatus.emailRate}/hr`, '#a855f7']].map(([l, v, c]) => (
                <div key={l} className="stat-card" style={{ padding: '20px 24px' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Security Thresholds</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['θ₁ Level 1 Threshold', 'theta1', 'Default: 0.70 (70% pool health)'], ['θ₂ Level 2 Threshold', 'theta2', 'Default: 0.40 (40% pool health)'], ['θ₃ Level 3 Threshold', 'theta3', 'Default: 0.10 (10% pool health)']].map(([label, key, hint]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" step="0.01" min="0" max="1" value={thresholds[key]} onChange={e => setThresholds({ ...thresholds, [key]: parseFloat(e.target.value) })} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Auto Calibration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[['Pool Size', 'poolSize', 'number'], ['Email Rate (emails/hr)', 'emailRate', 'number'], ['Replenishment Rate (keys/hr)', 'replenishmentRate', 'number'], ['Min Lifetime (hours)', 'minLifetime', 'number']].map(([label, key]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" value={calibrationParams[key]} onChange={e => setCalibrationParams({ ...calibrationParams, [key]: parseInt(e.target.value) })} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                </div>
              ))}
            </div>
            <button onClick={handleCalibrateASPE} disabled={loading} className="btn-primary" style={{ fontSize: 13, padding: '11px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <TrendingUp size={14} />}
              Calibrate Thresholds
            </button>
          </div>
        </div>
      )}

      {/* ── KM Tab ── */}
      {activeTab === 'km' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {kmStatus && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
              {[['Total Keys', kmStatus.poolSize, '#fff'], ['Available', kmStatus.availableKeys, '#4ade80'], ['Used', kmStatus.usedKeys, '#f87171'], ['Health', `${poolHealth.toFixed(1)}%`, '#00d4ff']].map(([l, v, c]) => (
                <div key={l} className="stat-card" style={{ padding: '20px 24px' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Replenish Pool</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Number of Keys</label>
                <input type="number" value={replenishCount} onChange={e => setReplenishCount(parseInt(e.target.value))} min="1" max="1000" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <button onClick={handleReplenish} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={14} />} Replenish
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Adds new quantum keys to the pool by removing used keys</p>
          </div>

          <div style={{ background: '#111', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 16, padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Reset Pool</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20, lineHeight: 1.6 }}>Reset the entire key pool to initial state. This will clear all used keys and reinitialize with fresh keys.</p>
            <button onClick={handleReset} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Database size={14} />} Reset Pool
            </button>
          </div>

          <div style={{ padding: '20px 24px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,212,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Key Management Info</p>
            {['Keys are generated using crypto.randomBytes (CSPRNG)', 'Each key is 256 bits (32 bytes)', 'Keys are marked as used after consumption', 'In production, connect to real QKD hardware via ETSI GS QKD 014 API'].map(t => (
              <p key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 6, display: 'flex', gap: 8 }}><span style={{ color: '#00d4ff' }}>→</span>{t}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Audit Tab ── */}
      {activeTab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Recent Activity</p>
            <button onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
          {auditLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
              <FileText size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>No audit entries yet</p>
            </div>
          ) : (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Time', 'Direction', 'Counterpart', 'Level', 'Algorithm'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: entry.direction === 'outgoing' ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)', color: entry.direction === 'outgoing' ? '#60a5fa' : '#4ade80', fontWeight: 600 }}>
                          {entry.direction}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{entry.counterpart}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Level {entry.level}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{entry.algorithm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
