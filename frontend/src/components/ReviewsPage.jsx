import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import ReviewModal from './ReviewModal.jsx';
import { REVIEWER_NAMES, REVIEWER_COLORS } from '../data/config.js';

const USERS      = REVIEWER_NAMES;
const USER_COLOR = REVIEWER_COLORS;

function Stars({ rating, size = 'sm' }) {
  if (!rating) return null;
  const sz = size === 'lg' ? '1.25rem' : '0.875rem';
  return (
    <span dir="ltr" className="inline-flex" style={{ fontSize: sz }}>
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

function BookCover({ thumbnailUrl, title }) {
  const [err, setErr] = useState(false);
  if (thumbnailUrl && !err) {
    return <img src={thumbnailUrl} alt={title} onError={() => setErr(true)} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center "
      style={{ background: 'linear-gradient(135deg,#4338ca,#1e3a8a)' }}>
      <span className="text-white text-xl font-bold">{title?.[0] || '?'}</span>
    </div>
  );
}

function ReaderChip({ user, hasRead }) {
  const c = USER_COLOR[user] || { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' };
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
      style={hasRead
        ? { background: c.bg, color: c.text, border: `1.5px solid ${c.dot}` }
        : { background: '#f3f4f6', color: '#9ca3af', border: '1.5px solid #e5e7eb' }
      }
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: hasRead ? c.dot : '#d1d5db' }}
      />
      {user}
      {hasRead && <span style={{ fontSize: 10 }}>✓</span>}
    </div>
  );
}

export default function ReviewsPage() {
  const [books, setBooks]           = useState([]);
  const [summary, setSummary]       = useState({});
  const [allReviews, setAllReviews] = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterMode, setFilterMode] = useState(''); // '' | 'rated' | 'reviewed'
  const [expandedBook, setExpandedBook] = useState(null);
  const [reviewModal, setReviewModal]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [booksData, summaryData] = await Promise.all([
        api.getBooks(),
        api.getReviewsSummary(),
      ]);
      setBooks(booksData);
      const map = {};
      summaryData.forEach(s => { map[s.book_id] = s; });
      setSummary(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadBookReviews(bookId) {
    const reviews = await api.getReviews(bookId);
    setAllReviews(prev => ({ ...prev, [bookId]: reviews }));
  }

  function toggleExpand(bookId) {
    if (expandedBook === bookId) {
      setExpandedBook(null);
    } else {
      setExpandedBook(bookId);
      loadBookReviews(bookId);
    }
  }

  async function handleDeleteReview(reviewId, bookId) {
    await api.deleteReview(reviewId);
    await loadBookReviews(bookId);
    await load();
  }

  const filtered = books
    .filter(book => {
      if (search && !book.title.includes(search) && !(book.author || '').includes(search)) return false;
      const s = summary[book.id];
      if (filterUser) {
        const readers = s?.readers ? s.readers.split(',') : [];
        if (!readers.includes(filterUser)) return false;
      }
      if (filterMode === 'rated')    return s?.has_rating;
      if (filterMode === 'reviewed') return s?.has_review;
      return true;
    })
    .sort((a, b) => {
      const ra = summary[a.id]?.avg_rating ? Number(summary[a.id].avg_rating) : -1;
      const rb = summary[b.id]?.avg_rating ? Number(summary[b.id].avg_rating) : -1;
      return rb - ra;
    });

  const totalRead = Object.values(summary).reduce((acc, s) => acc + (s.read_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6" dir="rtl">

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        {USERS.map(u => {
          const count = Object.values(summary).filter(s =>
            s.readers?.split(',').includes(u)
          ).length;
          const c = USER_COLOR[u] || {};
          return (
            <div key={u} className="flex items-center gap-2 px-4 py-2  shadow-sm"
              style={{ background: 'white', border: `1.5px solid ${c.dot || '#e5e7eb'}` }}>
              <span className="w-3 h-3 rounded-full" style={{ background: c.dot }} />
              <span className="font-bold text-sm" style={{ color: '#1a1040' }}>{u}</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
                {count} ספרים
              </span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש ספר..."
          className=" px-4 py-2 text-sm flex-1 min-w-40 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          style={{ background: 'white', border: '1.5px solid #e5e7eb', color: '#1a1040' }}
        />
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className=" px-3 py-2 text-sm shadow-sm focus:outline-none"
          style={{ background: 'white', border: '1.5px solid #e5e7eb', color: '#1a1040' }}
        >
          <option value="">כל הקוראים</option>
          {USERS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {['rated', 'reviewed'].map(mode => (
          <button
            key={mode}
            onClick={() => setFilterMode(f => f === mode ? '' : mode)}
            className="px-4 py-2  text-sm font-semibold shadow-sm transition-all"
            style={filterMode === mode
              ? { background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }
              : { background: 'white', color: '#92400e', border: '1.5px solid #fbbf24' }
            }
          >
            {mode === 'rated' ? 'דורגו' : 'נכתבה ביקורת'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(book => {
            const s = summary[book.id];
            const readers = s?.readers ? s.readers.split(',').filter(Boolean) : [];
            const avgRating = s?.avg_rating ? Number(s.avg_rating) : null;
            const reviews = allReviews[book.id];
            const isExpanded = expandedBook === book.id;

            // per-user rating for chips
            const reviewsByUser = {};
            (reviews || []).forEach(r => { reviewsByUser[r.user_name] = r; });

            return (
              <motion.div
                key={book.id}
                layout
                className=" overflow-hidden shadow-sm"
                style={{ background: 'white', border: '1.5px solid #f3e8d0' }}
              >
                {/* Book row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-amber-50/60 transition-colors"
                  onClick={() => toggleExpand(book.id)}
                >
                  {/* Cover */}
                  <div className="flex-shrink-0  overflow-hidden shadow-md" style={{ width: 44, height: 62 }}>
                    <BookCover thumbnailUrl={book.thumbnailUrl} title={book.title} />
                  </div>

                  {/* Title + author */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-snug" style={{ color: '#1a1040' }}>{book.title}</p>
                    {book.author && <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>{book.author}</p>}
                    {/* Mobile readers */}
                    <div className="grid grid-cols-3 gap-1 mt-1.5 md:hidden">
                      {USERS.map(u => (
                        <ReaderChip key={u} user={u} hasRead={readers.includes(u)} />
                      ))}
                    </div>
                  </div>

                  {/* Avg rating — desktop */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0 w-14">
                    {avgRating ? (
                      <>
                        <span className="text-xl font-black" style={{ color: '#f59e0b' }}>{avgRating.toFixed(1)}</span>
                        <Stars rating={avgRating} />
                      </>
                    ) : (
                      <span className="text-xs text-center" style={{ color: '#d1d5db' }}>אין<br/>דירוג</span>
                    )}
                  </div>

                  {/* Reader chips — desktop */}
                  <div className="hidden md:grid grid-cols-3 gap-1 flex-shrink-0" style={{ width: '12rem' }}>
                    {USERS.map(u => (
                      <ReaderChip key={u} user={u} hasRead={readers.includes(u)}
                        rating={reviewsByUser[u]?.rating} />
                    ))}
                  </div>

                  {/* Add review button */}
                  <button
                    onClick={e => { e.stopPropagation(); setReviewModal(book); }}
                    className="flex-shrink-0 px-3 py-2  text-xs font-bold shadow-sm transition-all hover:shadow"
                    style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white' }}
                  >
                    + ביקורת
                  </button>

                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-amber-400 text-sm flex-shrink-0"
                  >▼</motion.span>
                </div>

                {/* Expanded section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: '#f3e8d0' }}>
                        {!reviews ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-amber-600">
                            <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                            <span className="text-sm">טוען ביקורות...</span>
                          </div>
                        ) : reviews.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-2xl mb-1">📖</p>
                            <p className="text-sm" style={{ color: '#9ca3af' }}>אין ביקורות עדיין</p>
                            <button
                              onClick={() => setReviewModal(book)}
                              className="mt-2 text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
                            >
                              היה הראשון לכתוב ביקורת
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-3 mt-2 sm:grid-cols-2 lg:grid-cols-3">
                            {reviews.map(r => {
                              const c = USER_COLOR[r.user_name] || { bg: '#f9fafb', text: '#374151', dot: '#9ca3af' };
                              return (
                                <div key={r.id} className=" p-3 relative"
                                  style={{ background: c.bg, border: `1.5px solid ${c.dot}30` }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />
                                      <span className="font-bold text-sm" style={{ color: c.text }}>{r.user_name}</span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteReview(r.id, book.id)}
                                      className="text-xs hover:text-red-500 transition-colors"
                                      style={{ color: '#d1d5db' }}
                                    >✕</button>
                                  </div>
                                  {r.rating
                                    ? <Stars rating={r.rating} size="lg" />
                                    : <span className="text-xs font-medium" style={{ color: c.dot }}>קרא ✓</span>
                                  }
                                  {r.review_text && (
                                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#374151' }}>
                                      "{r.review_text}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-3">🔍</p>
              <p className="font-semibold" style={{ color: '#6b7280' }}>לא נמצאו ספרים</p>
            </div>
          )}
        </div>
      )}

      <ReviewModal
        open={!!reviewModal}
        book={reviewModal}
        existingReview={null}
        onClose={() => setReviewModal(null)}
        onSaved={() => {
          load();
          if (reviewModal && expandedBook === reviewModal.id) loadBookReviews(reviewModal.id);
          setReviewModal(null);
        }}
      />
    </div>
  );
}
