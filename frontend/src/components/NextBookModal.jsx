import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { REVIEWER_NAMES } from '../data/config.js';

function BookCover({ thumbnailUrl, title }) {
  const [err, setErr] = useState(false);
  if (thumbnailUrl && !err)
    return <img src={thumbnailUrl} alt={title} onError={() => setErr(true)} className="w-full h-full object-cover" />;
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#1e3a8a,#4338ca)' }}>
      <span className="text-white text-base font-bold">{title?.[0] || '?'}</span>
    </div>
  );
}

export default function NextBookModal({ open, onClose }) {
  const [user, setUser]                 = useState('');
  const [loading, setLoading]           = useState(false);
  const [recommendations, setRecs]      = useState(null);
  const [noHistoryMsg, setNoHistoryMsg] = useState('');
  const [error, setError]               = useState('');

  function reset() {
    setUser(''); setLoading(false); setRecs(null);
    setNoHistoryMsg(''); setError('');
  }

  async function handleGenerate() {
    if (!user) return;
    setLoading(true); setError(''); setRecs(null); setNoHistoryMsg('');
    try {
      const data = await api.getNextBook(user);
      if (data.reason === 'no_history') {
        setNoHistoryMsg('לא נמצאו ביקורות עבורך — קרא ספרים ודרג אותם כדי לקבל המלצות.');
      } else if (data.reason === 'all_read') {
        setNoHistoryMsg('קראת את כל הספרים בספרייה!');
      } else {
        setRecs(data.recommendations);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { reset(); onClose(); }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          style={{
            position: 'relative', width: '100%', maxWidth: 520,
            maxHeight: '88vh', display: 'flex', flexDirection: 'column',
            margin: '0 16px',
            background: 'linear-gradient(160deg,#1a1040,#0f2744)',
            border: '1px solid rgba(180,130,30,0.35)',
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f5e6cc' }}>מה הספר הבא שלי?</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>המלצה אישית מבוססת על הביקורות שלך</p>
            </div>
            <button onClick={() => { reset(); onClose(); }}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-xl"
              style={{ color: '#94a3b8' }}>✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* User picker */}
            {!recommendations && !noHistoryMsg && (
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>מי אתה?</p>
                <div className="flex flex-wrap gap-2">
                  {REVIEWER_NAMES.map(name => (
                    <button
                      key={name}
                      onClick={() => setUser(name)}
                      className="px-4 py-2 text-sm font-semibold transition-all"
                      style={user === name
                        ? { background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }
                        : { background: 'rgba(255,255,255,0.08)', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#d97706', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: '#f5e6cc' }}>AI מנתח את הטעמים שלך...</p>
              </div>
            )}

            {/* No history */}
            {noHistoryMsg && (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">📖</p>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{noHistoryMsg}</p>
                <button onClick={reset} className="mt-4 text-xs underline" style={{ color: '#d97706' }}>נסה שנית</button>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}

            {/* Results */}
            {recommendations && (
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: '#f5e6cc' }}>
                  הספרים הבאים מומלצים עבורך, {user}:
                </p>
                {recommendations.map((book, i) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-3 p-3"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(180,130,30,0.2)' }}
                  >
                    <div className="flex-shrink-0 overflow-hidden" style={{ width: 40, height: 56 }}>
                      <BookCover thumbnailUrl={book.thumbnailUrl} title={book.title} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: '#f5e6cc' }}>{book.title}</p>
                      {book.author && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{book.author}</p>}
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#d97706' }}>{book.reason}</p>
                    </div>
                  </motion.div>
                ))}
                <button onClick={reset} className="text-xs underline pt-1" style={{ color: '#6b7280' }}>
                  חזור לבחירת שם
                </button>
              </div>
            )}
          </div>

          {/* Footer — generate button */}
          {!recommendations && !noHistoryMsg && !loading && (
            <div className="p-5 pt-0">
              <button
                onClick={handleGenerate}
                disabled={!user}
                className="w-full py-3 text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fffef8' }}
              >
                קבל המלצה
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
