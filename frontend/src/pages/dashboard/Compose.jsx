import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { emailAPI, aspeAPI } from '../../services/api';
import { Send, Shield, Lock, Key, AlertCircle, CheckCircle, Loader, Zap, Info } from 'lucide-react';

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff', fontSize: 14,
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s, background 0.2s',
};

const focusInput = e => { e.target.style.borderColor = 'rgba(0,212,255,0.4)'; e.target.style.background = 'rgba(255,255,255,0.06)'; };
const blurInput = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.04)'; };

export default function Compose() {
  const navigate = useNavigate();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [aspeRecommendation, setAspeRecommendation] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // Debounce recommendation fetch — wait 600ms after typing stops
  const recTimer = useRef(null);
  useEffect(() => {
    if (!isEncrypted) return;
    clearTimeout(recTimer.current);
    recTimer.current = setTimeout(() => fetchRec(), 600);
    return () => clearTimeout(recTimer.current);
  }, [body.length, isEncrypted]);

  // Debounce validation too
  const valTimer = useRef(null);
  useEffect(() => {
    if (!selectedLevel || !isEncrypted) return;
    clearTimeout(valTimer.current);
    valTimer.current = setTimeout(() => validateLevel(selectedLevel), 600);
    return () => clearTimeout(valTimer.current);
  }, [selectedLevel, body.length]);

  const fetchRec = async () => {
    setLoadingRec(true);
    try { const r = await aspeAPI.getRecommendation(body.length || 1024); setAspeRecommendation(r.data); }
    catch { /* silent */ } finally { setLoadingRec(false); }
  };

  const validateLevel = async (level) => {
    try { const r = await aspeAPI.validateLevel(level, body.length || 1024); setValidation(r.data); }
    catch { /* silent */ }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to || !body) { setError('Recipient and message body are required'); return; }
    setSending(true); setError(''); setSuccess(false);
    try {
      const levelToUse = isEncrypted ? (selectedLevel || aspeRecommendation?.recommendedLevel) : 0;
      const res = await emailAPI.send(to, subject, body, levelToUse, isEncrypted);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => { setTo(''); setSubject(''); setBody(''); setSelectedLevel(null); setSuccess(false); navigate('/dashboard/inbox'); }, 2000);
      }
    } catch (err) { setError(err.response?.data?.error || 'Failed to send email'); }
    finally { setSending(false); }
  };

  const levels = [
    { level: 1, name: 'Level 1: QKD-OTP', desc: 'Information-theoretic security with HMAC', icon: <Shield size={16} />, color: '#4ade80', accentBg: 'rgba(74,222,128,0.08)', accentBorder: 'rgba(74,222,128,0.25)', keyUsage: `~${Math.ceil((body.length || 1024) / 32) + 1} keys` },
    { level: 2, name: 'Level 2: QKD-AES', desc: 'Quantum-aided AES-256-GCM', icon: <Lock size={16} />, color: '#a855f7', accentBg: 'rgba(168,85,247,0.08)', accentBorder: 'rgba(168,85,247,0.25)', keyUsage: '1 key' },
    { level: 3, name: 'Level 3: Hybrid QKD⊕PQC', desc: 'ML-KEM-1024 fused with QKD', icon: <Key size={16} />, color: '#00d4ff', accentBg: 'rgba(0,212,255,0.08)', accentBorder: 'rgba(0,212,255,0.25)', keyUsage: '1 key' },
  ];
  const recLevel = aspeRecommendation?.recommendedLevel || 3;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#fff', padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 36 }}>
        <div className="badge" style={{ marginBottom: 16 }}>COMPOSE</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>Compose Email</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Send quantum-safe encrypted messages</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <form onSubmit={handleSend} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {success && (
            <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <CheckCircle size={16} color="#4ade80" />
              <div><p style={{ fontSize: 13, color: '#4ade80', fontWeight: 500 }}>Email sent!</p><p style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)' }}>Redirecting to inbox...</p></div>
            </div>
          )}
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertCircle size={16} color="#f87171" />
              <p style={{ fontSize: 13, color: '#f87171' }}>{error}</p>
            </div>
          )}

          {[['To *', 'email', to, setTo, 'recipient@example.com'], ['Subject', 'text', subject, setSubject, 'Email subject']].map(([label, type, val, setter, ph]) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
              <input type={type} value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={inputStyle} onFocus={focusInput} onBlur={blurInput} required={label.includes('*')} />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Message *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} placeholder="Type your message here..." style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} onFocus={focusInput} onBlur={blurInput} required />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>{body.length} characters</p>
          </div>

          {/* Encryption toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }} onClick={() => setIsEncrypted(e => !e)}>
            <div style={{ width: 40, height: 22, borderRadius: 999, background: isEncrypted ? '#00d4ff' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isEncrypted ? 21 : 3, transition: 'left 0.2s' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Enable Encryption</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{isEncrypted ? 'Message will be encrypted with quantum-safe protocols' : 'Message will be sent as plain text'}</p>
            </div>
          </div>

          <button type="submit" disabled={sending || !to || !body} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 10, background: sending ? 'rgba(255,255,255,0.1)' : '#fff', color: sending ? 'rgba(255,255,255,0.4)' : '#000', fontSize: 14, fontWeight: 600, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: (!to || !body) ? 0.4 : 1 }}>
            {sending ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending...</> : <><Send size={16} /> Send Email</>}
          </button>
        </form>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isEncrypted ? (
            <>
              {/* ASPE Rec */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, height: 160, overflow: 'hidden', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Zap size={16} color="#00d4ff" />
                  <p style={{ fontSize: 13, fontWeight: 600 }}>ASPE Recommendation</p>
                </div>
                {/* Fixed-height container prevents layout shift while analyzing */}
                <div style={{ minHeight: 56 }}>
                  {loadingRec ? (
                    <div style={{ display: 'flex', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 13, alignItems: 'center', height: 56 }}><Loader size={14} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} /> Analyzing...</div>
                  ) : aspeRecommendation ? (
                    <div style={{ padding: '12px 14px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff' }}>Level {aspeRecommendation.recommendedLevel} Recommended</p>
                      <p style={{ fontSize: 11, color: 'rgba(0,212,255,0.6)', marginTop: 4 }}>Pool Health: {aspeRecommendation.poolHealth}%</p>
                    </div>
                  ) : (
                    <div style={{ height: 56 }} />
                  )}
                </div>
              </div>

              {/* Level selector */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Encryption Level</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Auto */}
                  <div onClick={() => setSelectedLevel(null)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${selectedLevel === null ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`, background: selectedLevel === null ? 'rgba(0,212,255,0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Zap size={14} color={selectedLevel === null ? '#00d4ff' : 'rgba(255,255,255,0.4)'} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: selectedLevel === null ? '#00d4ff' : '#fff' }}>Auto (ASPE)</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Let ASPE choose the optimal level</p>
                  </div>

                  {levels.map(lv => (
                    <div key={lv.level} onClick={() => setSelectedLevel(lv.level)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${selectedLevel === lv.level ? lv.accentBorder : 'rgba(255,255,255,0.08)'}`, background: selectedLevel === lv.level ? lv.accentBg : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: lv.color }}>{lv.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>L{lv.level}</span>
                        </div>
                        {recLevel === lv.level && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${lv.color}18`, color: lv.color, fontWeight: 600 }}>Recommended</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{lv.desc}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>🔑 {lv.keyUsage}</p>
                    </div>
                  ))}
                </div>

                {selectedLevel && validation && !validation.valid && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,208,96,0.06)', border: '1px solid rgba(245,208,96,0.2)', borderRadius: 10, display: 'flex', gap: 8 }}>
                    <AlertCircle size={13} color="#f5d060" style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: '#f5d060' }}>{validation.reason}</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '16px 20px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <Info size={14} color="rgba(0,212,255,0.6)" />
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,212,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Encryption Info</p>
                </div>
                {['Level 1: Perfect secrecy, high key usage', 'Level 2: Efficient, quantum-seeded AES', 'Level 3: Hybrid dual-layer QKD⊕PQC'].map(t => (
                  <p key={t} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4, display: 'flex', gap: 6 }}><span style={{ color: '#00d4ff' }}>→</span>{t}</p>
                ))}
              </div>
            </>
          ) : (
            <div style={{ background: '#111', border: '1px solid rgba(245,208,96,0.2)', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={18} color="#f5d060" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Encryption Disabled</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>This email will be sent as plain text without quantum-safe encryption.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
