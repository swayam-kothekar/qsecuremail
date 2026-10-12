import { useState, useEffect, useRef } from 'react';
import { emailAPI } from '../../services/api';
import { Mail, Lock, Clock, User, Loader, AlertCircle, RefreshCw, Search, X, Shield, ChevronDown, ArrowLeft } from 'lucide-react';

export default function Inbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const fetchingRef = useRef(false); // ref lock to prevent concurrent fetches
  const limit = 20;

  useEffect(() => { loadEmails(0); }, []);

  const loadEmails = async (cur) => {
    if (fetchingRef.current) return; // prevent concurrent fetches
    fetchingRef.current = true;
    if (cur === 0) { setLoading(true); setError(''); }
    else setLoadingMore(true);
    try {
      const res = await emailAPI.getInbox(limit, cur);
      if (res.data.success) {
        const ne = res.data.emails;
        if (ne.length < limit) setHasMore(false);
        else setHasMore(true);
        setEmails(prev => cur === 0 ? ne : [...prev, ...ne]);
        setOffset(cur + ne.length);
        setError('');
      }
    } catch (err) {
      if (cur === 0) setError(err.response?.data?.error || 'Failed to load emails');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  };

  const handleRefresh = () => { setEmails([]); setOffset(0); setHasMore(true); loadEmails(0); };
  const handleLoadMore = () => { if (!loadingMore && hasMore) loadEmails(offset); };

  const getLevelStyle = (level) => ({
    1: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', label: 'L1: OTP' },
    2: { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', label: 'L2: AES' },
    3: { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', label: 'L3: Hybrid' },
  }[level] || { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: 'Normal' });

  const formatDate = (date) => {
    const d = new Date(date), now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const filtered = emails.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return e.subject?.toLowerCase().includes(q) || e.from?.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q);
  });

  const s = { fontFamily: 'Inter, sans-serif', color: '#fff' };

  return (
    <div style={{ ...s, display: 'flex', height: '100%', background: '#080808' }}>
      {/* List */}
      <div className={`inbox-list-panel ${selectedEmail ? 'is-hidden-mobile' : ''}`} style={{ width: selectedEmail ? '380px' : '100%', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease' }}>
        {/* Header */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.015em' }}>Inbox</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{emails.length} messages</p>
            </div>
            <button onClick={handleRefresh} disabled={loading} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search emails..." style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && (
          <div style={{ margin: 16, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <AlertCircle size={14} color="#f87171" />
            <p style={{ fontSize: 12, color: '#f87171', flex: 1 }}>{error}</p>
            <button onClick={handleRefresh} style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Email list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && !loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'rgba(255,255,255,0.2)' }}>
              <Mail size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>No emails found</p>
              <p style={{ fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.15)' }}>Your inbox is empty</p>
            </div>
          ) : filtered.map((email, idx) => {
            const lv = getLevelStyle(email.encryptedPayload?.level);
            const active = selectedEmail?.messageId === email.messageId;
            return (
              <div key={email.messageId || idx} onClick={() => setSelectedEmail(email)}
                style={{ padding: '16px 24px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: active ? '3px solid #00d4ff' : '3px solid transparent', background: active ? 'rgba(255,255,255,0.04)' : 'transparent', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{email.from}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {email.encrypted && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: lv.bg, color: lv.color, fontWeight: 600 }}>{lv.label}</span>}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{formatDate(email.date)}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject || '(No Subject)'}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email.decrypted ? '🔓 ' : ''}{email.body?.substring(0, 80)}
                </p>
              </div>
            );
          })}
          {/* Loading initial */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading emails...
            </div>
          )}

          {/* Load More button */}
          {!loading && hasMore && emails.length > 0 && (
            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: loadingMore ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                {loadingMore
                  ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading...</>
                  : <><ChevronDown size={14} /> Load more emails</>
                }
              </button>
            </div>
          )}

          {/* All loaded */}
          {!loading && !hasMore && emails.length > 0 && (
            <p style={{ textAlign: 'center', padding: '20px 24px', fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>All {emails.length} emails loaded</p>
          )}
        </div>
      </div>

      {/* Detail */}
      {selectedEmail && (
        <div className="inbox-detail-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="inbox-detail-header" style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Mobile back button */}
            <button
              onClick={() => setSelectedEmail(null)}
              className="inbox-mobile-back"
              style={{ display: 'none', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}
            >
              <ArrowLeft size={13} /> Back to messages
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', flex: 1, paddingRight: 16 }}>{selectedEmail.subject || '(No Subject)'}</h2>
              <button onClick={() => setSelectedEmail(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
            {[['From', selectedEmail.from], ['To', selectedEmail.to], ['Date', new Date(selectedEmail.date).toLocaleString()]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', minWidth: 40 }}>{k}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
            {selectedEmail.encrypted && (
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', minWidth: 40 }}>Security</span>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 999, background: getLevelStyle(selectedEmail.encryptedPayload?.level).bg, color: getLevelStyle(selectedEmail.encryptedPayload?.level).color, fontWeight: 600 }}>
                  {getLevelStyle(selectedEmail.encryptedPayload?.level).label}
                </span>
              </div>
            )}
          </div>
          <div className="inbox-detail-body" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            {selectedEmail.encrypted && selectedEmail.decrypted && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Shield size={14} color="#4ade80" />
                <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 500 }}>Message decrypted successfully</span>
              </div>
            )}
            {selectedEmail.decryptionError && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={14} color="#f87171" style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 12, color: '#f87171', fontWeight: 500 }}>Decryption Failed</p>
                  <p style={{ fontSize: 11, color: 'rgba(248,113,113,0.7)', marginTop: 3 }}>
                    {selectedEmail.decryptionError?.includes('Key not found')
                      ? 'Encryption key not found in current pool. This email was encrypted with a key from a previous session. The key pool is regenerated on backend restart.'
                      : selectedEmail.decryptionError}
                  </p>
                </div>
              </div>
            )}
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{selectedEmail.body}</pre>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
