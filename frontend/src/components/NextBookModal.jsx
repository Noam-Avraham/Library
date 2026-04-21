import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { REVIEWER_NAMES } from '../data/config.js';
import BookCover from './BookCover.jsx';

function WishlistButton({ title, author }) {
  const [state, setState] = useState('idle'); // idle | loading | done

  async function handle() {
    setState('loading');
    try {
      await api.addToWishlist(title, author);
      setState('done');
    } catch {
      setState('idle');
    }
  }

  if (state === 'done') return (
    <span className="text-xs font-semibold" style={{ color: '#86efac' }}>נוסף לרשימת משאלות ✓</span>
  );
  return (
    <button
      onClick={handle}
      disabled={state === 'loading'}
      className="text-xs font-semibold px-3 py-1 transition-all disabled:opacity-50"
      style={{ background: 'rgba(180,130,30,0.25)', color: '#fcd34d', border: '1px solid rgba(180,130,30,0.4)' }}
    >
      {state === 'loading' ? '...' : '+ רשימת משאלות'}
    </button>
  );
}

export default function NextBookModal({ open, onClose }) {
  const [user, setUser]                 = useState('');
  const [mode, setMode]                 = useState('library'); // library | external
  const [loading, setLoading]           = useState(false);
  const [recommendations, setRecs]      = useState(null);
  const [recMode, setRecMode]           = useState('library');
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
      const data = await api.getNextBook(user, mode);
      setRecMode(mode);
      if (data.reason === 'no_history') {
        setNoHistoryMsg('לא נמצאו ביקורות עבורך — קרא ספרים ודרג אותם כדי לקבל המלצות.');
      } else if (data.reason === 'no_ratings') {
        setNoHistoryMsg('קראת ספרים אבל לא דירגת אף אחד — דרג לפחות ספר אחד כדי שה-AI יוכל להבין את הטעמים שלך.');
      } else if (data.reason === 'all_read') {
        setNoHistoryMsg('קראת את כל הספרים בספרייה! נסה את מצב "ספר חדש".');
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

  const showForm = !recommendations && !noHistoryMsg && !loading;

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

            {showForm && (
              <>
                {/* Mode toggle */}
                <div className="flex gap-0 overflow-hidden" style={{ border: '1px solid rgba(180,130,30,0.4)' }}>
                  {[
                    { id: 'library',  label: 'מהספרייה שלנו' },
                    { id: 'external', label: 'ספר חדש לקנות' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className="flex-1 py-2 text-sm font-semibold transition-all"
                      style={mode === m.id
                        ? { background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }
                        : { background: 'transparent', color: '#94a3b8' }
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {mode === 'library'
                    ? 'ממליץ על ספרים שכבר נמצאים בספרייה ועדיין לא קראת'
                    : 'ממליץ על ספרים חדשים שכדאי לרכוש בהתאם לטעם שלך'}
                </p>

                {/* User picker */}
                <div className="space-y-2">
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
              </>
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
                  {recMode === 'external' ? 'ספרים מומלצים לרכישה עבורך,' : 'הספרים הבאים מומלצים עבורך,'} {user}:
                </p>
                {recommendations.map((book, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex gap-3 p-3"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(180,130,30,0.2)' }}
                  >
                    {book.thumbnailUrl && (
                      <div className="flex-shrink-0 overflow-hidden" style={{ width: 40, height: 56 }}>
                        <BookCover thumbnailUrl={book.thumbnailUrl} title={book.title} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: '#f5e6cc' }}>{book.title}</p>
                      {book.author && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{book.author}</p>}
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#d97706' }}>{book.reason}</p>
                      {recMode === 'external' && (
                        <div className="mt-2">
                          <WishlistButton title={book.title} author={book.author} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                <button onClick={reset} className="text-xs underline pt-1" style={{ color: '#6b7280' }}>
                  חזור
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {showForm && (
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
