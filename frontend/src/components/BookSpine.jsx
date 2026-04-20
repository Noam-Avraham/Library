import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { isWrongLocation } from '../data/location.js';

const SPINE_COLORS = [
  { bg: '#6b2737', text: '#fde8ec' }, // בורדו עמוק
  { bg: '#1a3a5c', text: '#dbeafe' }, // כחול נייבי
  { bg: '#2d5a3d', text: '#dcfce7' }, // ירוק יער
  { bg: '#5b2d8e', text: '#ede9fe' }, // סגול עשיר
  { bg: '#b5451b', text: '#fff0e6' }, // טרקוטה
  { bg: '#1a5470', text: '#cffafe' }, // כחול פיקוק
  { bg: '#7a3b1e', text: '#fef3c7' }, // חום שוקולד
  { bg: '#3b5249', text: '#d1fae5' }, // ירוק אפור
  { bg: '#8b1a4a', text: '#fce7f3' }, // ורוד כהה
  { bg: '#2a4858', text: '#e0f2fe' }, // כחול פלדה
  { bg: '#4a3728', text: '#fdf6ec' }, // חום חמים
  { bg: '#1e4d6b', text: '#bae6fd' }, // ציאן כהה
  { bg: '#6b3a2a', text: '#fef9c3' }, // חרדל שרוף
  { bg: '#2d3a6b', text: '#e0e7ff' }, // כחול עמוק
  { bg: '#3d6b4f', text: '#bbf7d0' }, // ירוק זית
  { bg: '#7a2d5a', text: '#fdf2f8' }, // שזיף
  { bg: '#1f4e4e', text: '#99f6e4' }, // טיל כהה
  { bg: '#5c3d11', text: '#fef3c7' }, // ענבר כהה
  { bg: '#3b2a6b', text: '#ede9fe' }, // אינדיגו
  { bg: '#5a1f2e', text: '#ffe4e6' }, // יין
];

const STATUS_DOT = {
  'זמין':          '#10b981',
  'מושאל':         '#f97316',
  'רשימת משאלות': '#38bdf8',
};

const SPINE_HEIGHT = 160;
const SPINE_WIDTH  = 36;

function getColor(book) {
  const seed = ((book.id || 1) * 13 + (book.title?.charCodeAt(0) || 65) * 7);
  return SPINE_COLORS[seed % SPINE_COLORS.length];
}

export default function BookSpine({ book, onTransfer, onDelete, onEdit, onReview }) {
  const [hovered, setHovered] = useState(false);
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState({ bottom: 0, left: 0 });
  const spineRef  = useRef(null);
  const color     = getColor(book);
  const wrongPlace = isWrongLocation(book);

  // Close popup on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!spineRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!open) {
      const rect = spineRef.current.getBoundingClientRect();
      setPos({
        bottom: window.innerHeight - rect.top + 10,
        left:   rect.left + rect.width / 2,
      });
    }
    setOpen(prev => !prev);
  };

  return (
    <div ref={spineRef} className="relative flex-shrink-0" style={{ width: `${SPINE_WIDTH}px` }}>

      {/* ── Popup via Portal (no z-index / overflow issues) ─────────────── */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{   opacity: 0, y: 6,  scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position:  'fixed',
                bottom:    `${pos.bottom}px`,
                left:      `${pos.left}px`,
                transform: 'translateX(-50%)',
                zIndex:    9999,
                width:     '190px',
              }}
              className="bg-white  shadow-2xl p-3 border border-gray-100"
            >
              {book.thumbnailUrl && (
                <img
                  src={book.thumbnailUrl}
                  alt=""
                  className="w-full h-24 object-cover  mb-2"
                />
              )}
              <p className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                {book.title}
              </p>
              {book.author && (
                <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
              )}
              {book.translator && (
                <p className="text-xs text-indigo-500 mt-0.5">מתרגם: {book.translator}</p>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_DOT[book.status] || '#9ca3af' }}
                />
                <span className="text-xs text-gray-600">{book.status}</span>
                <span className="text-gray-300 mx-0.5">·</span>
                <span className="text-xs text-indigo-600 font-medium">{book.owner}</span>
              </div>
              {book.current_holder && book.current_holder !== book.owner && (
                <p className="text-xs text-orange-600 mt-0.5">אצל: {book.current_holder}</p>
              )}
              {wrongPlace && (
                <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5  text-xs font-medium"
                  style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                  <span>🏠</span>
                  <span>הספר ב{book.location} (שייך ל{book.owner})</span>
                </div>
              )}
              <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onTransfer(book); }}
                  className="flex-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100  py-1.5 font-medium transition-colors"
                >
                  העברה
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(book); }}
                  className="flex-1 text-xs bg-sky-50 text-sky-700 hover:bg-sky-100  py-1.5 font-medium transition-colors"
                >
                  עריכה
                </button>
                {onReview && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onReview(book); }}
                    className="flex-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100  py-1.5 font-medium transition-colors"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(book.id); }}
                  className="flex-1 text-xs bg-red-50 text-red-600 hover:bg-red-100  py-1.5 font-medium transition-colors"
                >
                  מחיקה
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Spine ───────────────────────────────────────────────────────── */}
      <motion.div
        animate={{ y: hovered || open ? -12 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
        className="relative cursor-pointer -t-sm flex flex-col items-center select-none overflow-hidden"
        style={{
          width:           `${SPINE_WIDTH}px`,
          height:          `${SPINE_HEIGHT}px`,
          backgroundColor: color.bg,
          boxShadow:       hovered || open
            ? '3px 0 12px rgba(0,0,0,0.5), -1px 0 4px rgba(0,0,0,0.3)'
            : '1px 0 4px rgba(0,0,0,0.25)',
        }}
      >
        {/* Status dot */}
        <span
          className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full z-10"
          style={{ backgroundColor: STATUS_DOT[book.status] || '#9ca3af' }}
        />

        {/* Title — vertical, fills upper portion leaving room for author square */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '36px', paddingTop: '16px' }}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              transform:   'rotate(180deg)',
              color:       color.text,
              fontSize:    '11px',
              fontWeight:  '700',
              overflow:    'hidden',
              lineHeight:  '1.3',
              maxHeight:   `${SPINE_HEIGHT - 52}px`,
            }}
          >
            {book.title}
          </span>
        </div>

        {/* Wrong-location strip — absolute, zero layout impact */}
        {wrongPlace && (
          <div
            title={`הספר ב${book.location} (שייך ל${book.owner})`}
            style={{
              position:   'absolute',
              bottom:     0,
              left:       0,
              right:      0,
              height:     '4px',
              background: 'linear-gradient(90deg,#f97316,#ea580c)',
              zIndex:     20,
              boxShadow:  '0 -1px 6px rgba(249,115,22,0.6)',
            }}
          />
        )}

        {/* Author square — absolute at bottom, independent of flex */}
        <div
          style={{
            position:        'absolute',
            bottom:          0,
            left:            0,
            right:           0,
            height:          '36px',
            backgroundColor: 'rgba(0,0,0,0.28)',
            borderTop:       '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span
            style={{
              position:   'absolute',
              top:        '50%',
              left:       '50%',
              transform:  'translate(-50%, -50%)',
              width:      'calc(100% - 8px)',
              color:      color.text,
              fontSize:   '7px',
              fontWeight: '600',
              textAlign:  'center',
              lineHeight: '1.25',
              opacity:    0.9,
            }}
          >
            {book.author || '—'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
