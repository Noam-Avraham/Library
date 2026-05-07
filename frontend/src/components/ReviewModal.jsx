import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { REVIEWER_NAMES, REVIEWER_COLORS } from '../data/config.js';

const USERS = REVIEWER_NAMES;
const USER_COLOR = Object.fromEntries(
  Object.entries(REVIEWER_COLORS).map(([name, c]) => [name, { ...c, active: c.dot }])
);

function ratingLabel(r) {
  if (r >= 5) return 'מצוין';
  if (r >= 4) return 'טוב';
  if (r >= 3) return 'בסדר';
  if (r >= 2) return 'לא טוב';
  if (r > 0)  return 'גרוע';
  return '';
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <>
    <div className="flex justify-center" dir="ltr" style={{ gap: 6 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const isFull = display >= star;
        const isHalf = !isFull && display >= star - 0.5;
        return (
          <div key={star} className="relative" style={{ width: 44, height: 44, flexShrink: 0 }} onMouseLeave={() => setHovered(0)}>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', pointerEvents: 'none' }}>
              <span style={isHalf ? {
                background: 'linear-gradient(to right, #f59e0b 50%, rgba(255,255,255,0.15) 50%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              } : { color: isFull ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>★</span>
            </span>
            <button type="button"
              style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }}
              onMouseEnter={() => setHovered(star - 0.5)}
              onClick={() => onChange(star - 0.5 === value ? 0 : star - 0.5)}
            />
            <button type="button"
              style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%' }}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(star === value ? 0 : star)}
            />
          </div>
        );
      })}
    </div>
    <p className="text-center mt-1" style={{ color: '#4b5563', fontSize: '0.65rem' }}>לחץ על חצי שמאל של כוכב לחצי דירוג</p>
    </>
  );
}

const STEP_LABELS = ['מי קורא/ת?', 'דירוג', 'ביקורת'];

export default function ReviewModal({ open, book, existingReview, onClose, onSaved }) {
  const [userName, setUserName]         = useState('');
  const [rating, setRating]             = useState(0);
  const [reviewText, setReviewText]     = useState('');
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [existingData, setExistingData] = useState(null);

  useEffect(() => {
    if (open) {
      setUserName(existingReview?.user_name || '');
      setRating(existingReview?.rating || 0);
      setReviewText(existingReview?.review_text || '');
      setExistingData(null);
    }
  }, [open, existingReview]);

  // When user is selected, look up if they already have a review for this book
  useEffect(() => {
    if (!userName || !book?.id) { setExistingData(null); return; }
    api.getReviews(book.id).then(reviews => {
      const found = reviews.find(r => r.user_name === userName) || null;
      setExistingData(found);
      if (found) {
        setRating(found.rating || 0);
        setReviewText(found.review_text || '');
      } else {
        setRating(0);
        setReviewText('');
      }
    }).catch(() => {});
  }, [userName, book?.id]);

  async function handleDelete() {
    if (!existingData) return;
    setDeleting(true);
    try {
      await api.deleteReview(existingData.id);
      onSaved();
      onClose();
    } catch {
    } finally {
      setDeleting(false);
    }
  }

  const step = !userName ? 1 : rating === 0 ? 2 : 3;
  const c = USER_COLOR[userName];

  const saveLabel = saving ? 'שומר...'
    : existingData && !rating     ? '✓ עדכן — בטל דירוג'
    : existingData                ? '✓ עדכן ביקורת'
    : !rating                     ? '✓ סמן כנקרא'
    : !reviewText                 ? '✓ שמור דירוג'
    :                               '✓ שמור ביקורת';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userName) return;
    setSaving(true);
    try {
      await api.saveReview({
        book_id:     book.id,
        user_name:   userName,
        rating:      rating || null,
        review_text: reviewText,
      });
      onSaved();
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className=" shadow-2xl w-full max-w-sm overflow-hidden"
            style={{ background: '#1a1040', border: '1px solid rgba(180,130,30,0.3)' }}
            dir="rtl"
          >
            {/* Book header */}
            <div className="px-5 py-4 border-b flex items-start justify-between gap-3"
              style={{ borderColor: 'rgba(180,130,30,0.2)' }}>
              <div className="flex items-center gap-3">
                {book?.thumbnailUrl
                  ? <img src={book.thumbnailUrl} alt="" className="w-9 h-13 object-cover  shadow" />
                  : <div className="w-9 h-12  bg-indigo-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{book?.title?.[0]}</div>
                }
                <div>
                  <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: '#f5e6cc' }}>{book?.title}</p>
                  {book?.author && <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>{book.author}</p>}
                </div>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none flex-shrink-0 mt-0.5">×</button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 px-5 pt-4">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done   = step > n;
                const active = step === n;
                return (
                  <div key={n} className="flex items-center gap-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={done
                          ? { background: '#10b981', color: 'white' }
                          : active
                          ? { background: c?.active || '#d97706', color: 'white' }
                          : { background: 'rgba(255,255,255,0.1)', color: '#6b7280' }
                        }
                      >
                        {done ? '✓' : n}
                      </div>
                      <span className="text-xs" style={{ color: active ? '#f5e6cc' : '#4b5563' }}>{label}</span>
                    </div>
                    {n < 3 && <div className="flex-1 h-px mx-1" style={{ background: done ? '#10b981' : 'rgba(255,255,255,0.1)' }} />}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Step 1 — Who */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {USERS.map(u => {
                    const uc = USER_COLOR[u];
                    const selected = userName === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUserName(selected ? '' : u)}
                        className="py-2  text-sm font-bold transition-all"
                        style={selected
                          ? { background: uc.active, color: 'white', boxShadow: `0 0 0 2px ${uc.active}44` }
                          : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }
                        }
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 — Stars (unlocked after user pick) */}
              <AnimatePresence>
                {userName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <p className="text-xs text-center mb-3 mt-3" style={{ color: '#6b7280' }}>
                        {rating === 0 ? 'בחר דירוג — אופציונלי' : `${ratingLabel(rating)} (${rating}/5)`}
                      </p>
                      <StarRating value={rating} onChange={setRating} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3 — Review text (unlocked after rating) */}
              <AnimatePresence>
                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        rows={3}
                        placeholder="מה חשבת על הספר? (אופציונלי)"
                        className="w-full  px-3 py-2.5 text-sm resize-none focus:outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#f5e6cc',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={!userName || saving || deleting}
                className="w-full py-3  font-bold text-sm transition-all disabled:opacity-30"
                style={{ background: c ? `linear-gradient(135deg, ${c.active}, ${c.active}cc)` : 'linear-gradient(135deg, #d97706, #b45309)', color: 'white' }}
              >
                {saveLabel}
              </button>
              {existingData && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="w-full py-2 font-semibold text-sm transition-all disabled:opacity-30 mt-2"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  {deleting ? 'מוחק...' : 'מחק ביקורת / בטל סימון קריאה'}
                </button>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
