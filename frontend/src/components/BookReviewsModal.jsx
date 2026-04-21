import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { REVIEWER_COLORS } from '../data/config.js';

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span dir="ltr" className="inline-flex text-lg">
      {[1,2,3,4,5].map(i => {
        const isFull = rating >= i;
        const isHalf = !isFull && rating >= i - 0.5;
        return (
          <span key={i} style={isHalf ? {
            background: 'linear-gradient(to right, #f59e0b 50%, rgba(180,160,100,0.3) 50%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          } : { color: isFull ? '#f59e0b' : 'rgba(180,160,100,0.3)' }}>★</span>
        );
      })}
    </span>
  );
}

export default function BookReviewsModal({ book, open, onClose, onAddReview }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !book) return;
    setLoading(true);
    api.getReviews(book.id)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [open, book]);

  async function handleDelete(reviewId) {
    await api.deleteReview(reviewId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  }

  if (!open || !book) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', margin: '0 16px', background: 'white', border: '1.5px solid #f3e8d0' }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3" style={{ borderBottom: '1px solid #f3e8d0' }}>
            <div className="flex-1 min-w-0 ml-3">
              <h2 className="font-bold text-base leading-snug" style={{ color: '#1a1040' }}>{book.title}</h2>
              {book.author && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{book.author}</p>}
            </div>
            <button onClick={onClose} className="text-lg w-7 h-7 flex items-center justify-center hover:bg-gray-100 flex-shrink-0" style={{ color: '#9ca3af' }}>✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: '#d97706' }}>
                <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-sm">טוען...</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📖</p>
                <p className="text-sm" style={{ color: '#9ca3af' }}>אין ביקורות עדיין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => {
                  const c = REVIEWER_COLORS[r.user_name] || { bg: '#f9fafb', text: '#374151', dot: '#9ca3af' };
                  return (
                    <div key={r.id} className="p-3" style={{ background: c.bg, border: `1.5px solid ${c.dot}30` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                          <span className="font-bold text-sm" style={{ color: c.text }}>{r.user_name}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-xs hover:text-red-500 transition-colors"
                          style={{ color: '#d1d5db' }}
                          title="בטל סימון קריאה"
                        >✕</button>
                      </div>
                      {r.rating
                        ? <Stars rating={r.rating} />
                        : <span className="text-xs font-medium" style={{ color: c.dot }}>קרא ✓</span>
                      }
                      {r.review_text && (
                        <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#374151' }}>"{r.review_text}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 pt-0">
            <button
              onClick={() => { onClose(); onAddReview(book); }}
              className="w-full py-2.5 text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }}
            >
              + הוסף ביקורת
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
