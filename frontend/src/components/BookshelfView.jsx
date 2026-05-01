import { useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BookCard from './BookCard.jsx';
import BookSpine from './BookSpine.jsx';

const SPINE_WIDTH = 36;
const SPINE_GAP   = 2;   // gap-0.5 = 2px
const SHELF_PAD   = 64;  // px-8 on each side = 32*2

const SPECIAL_STATUSES = ['מושאל', 'רשימת משאלות'];
const SPECIAL_SHELF_LABEL = { 'מושאל': 'מושאלים', 'רשימת משאלות': 'רשימת משאלות' };
const SPECIAL_SHELF_ICON  = { 'מושאלים': '📤', 'רשימת משאלות': '⭐' };

function groupBooks(books, sortBy, shelfSize, statusFilter = '') {
  // Single-status filter modes
  if (statusFilter === 'מושאל')          return [['מושאלים', books]];
  if (statusFilter === 'רשימת משאלות')   return [['רשימת משאלות', books]];

  // Split into regular books and the two special groups
  const regular  = books.filter(b => !SPECIAL_STATUSES.includes(b.status));
  const borrowed = books.filter(b => b.status === 'מושאל');
  const wishlist = books.filter(b => b.status === 'רשימת משאלות');

  const makeGroups = (keyFn, fallback, arr) => {
    const map = {};
    arr.forEach(b => {
      const k = keyFn(b) || fallback;
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.length - a.length);
  };

  let groups;
  switch (sortBy) {
    case 'owner':
      groups = makeGroups(b => b.owner, 'ללא בעלים', regular); break;
    case 'genre':
      groups = makeGroups(b => b.genre, 'ללא ז\'אנר', regular); break;
    case 'title-az':
    case 'author-az': {
      const size = shelfSize || 14;
      groups = [];
      for (let i = 0; i < regular.length; i += size)
        groups.push(['', regular.slice(i, i + size)]);
      break;
    }
    default: // location
      groups = makeGroups(b => b.location, 'בית', regular);
  }

  // Always append special shelves at the bottom when no status filter
  if (!statusFilter) {
    if (borrowed.length > 0) groups.push(['מושאלים', borrowed]);
    if (wishlist.length > 0) groups.push(['רשימת משאלות', wishlist]);
  }

  return groups;
}

// ── Shelf row ─────────────────────────────────────────────────────────────────
function ShelfRow({ label, books, onTransfer, onDelete, onEdit, onReview }) {
  return (
    <div>
      {/* Location label */}
      {label && (
        <div className="flex items-center gap-3 px-8 pt-5 pb-1">
          <span className="text-sm font-bold tracking-wide" style={{ color: '#4A2810' }}>{label}</span>
          <div className="flex-1 h-px" style={{ background: '#8B5E3C55' }} />
          <span className="text-xs" style={{ color: '#6B3F20' }}>{books.length} ספרים</span>
        </div>
      )}

      {/* Books standing on wall */}
      <div
        className="flex items-end gap-0.5 px-8 pt-6"
        style={{
          background:  'linear-gradient(to bottom, #fffdf5 0%, #fef3c7 100%)',
          minHeight:   '200px',
          overflow:    'visible',
        }}
      >
        {books.map(book => (
          <BookSpine
            key={book.id}
            book={book}
            onTransfer={onTransfer}
            onDelete={onDelete}
            onEdit={onEdit}
            onReview={onReview}
          />
        ))}
      </div>

      {/* Wooden plank */}
      <div style={{
        height:     '16px',
        background: 'linear-gradient(to bottom, #8B5E3C, #6B3F20, #4A2810)',
        boxShadow:  '0 5px 12px rgba(0,0,0,0.4)',
      }} />
      {/* Shadow under plank */}
      <div style={{
        height:     '8px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), transparent)',
        marginBottom: '2px',
      }} />
    </div>
  );
}

// ── Shelf view ────────────────────────────────────────────────────────────────
function ShelfView({ books, sortBy, statusFilter, onTransfer, onDelete, onEdit, onReview }) {
  const containerRef = useRef(null);
  const [shelfSize,  setShelfSize]  = useState(14);
  const [collapsed,  setCollapsed]  = useState({});

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const available = w - SHELF_PAD;
    const count = Math.max(1, Math.floor(available / (SPINE_WIDTH + SPINE_GAP)));
    setShelfSize(count);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const groups = groupBooks(books, sortBy, shelfSize, statusFilter);

  const toggle = (key) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  return (
    <div ref={containerRef} className=" overflow-hidden shadow-xl" style={{ border: '1px solid #8B5E3C44', background: '#fdf6ee' }}>
      {groups.map(([label, groupBooks], gi) => {
        const key = label || String(gi);
        const isCollapsed = !!collapsed[key];
        const chunks = [];
        for (let i = 0; i < groupBooks.length; i += shelfSize)
          chunks.push(groupBooks.slice(i, i + shelfSize));

        return (
          <div key={key}>
            {label && (
              <div
                className="flex items-center gap-3 px-8 pt-5 pb-1 cursor-pointer select-none"
                onClick={() => toggle(key)}
              >
                <motion.span
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs flex-shrink-0"
                  style={{ color: '#8B5E3C', display: 'inline-block' }}
                >▼</motion.span>
                <span className="text-sm font-bold tracking-wide" style={{ color: '#4A2810' }}>{label}</span>
                <div className="flex-1 h-px" style={{ background: '#8B5E3C55' }} />
                <span className="text-xs" style={{ color: '#6B3F20' }}>{groupBooks.length} ספרים</span>
              </div>
            )}
            {!isCollapsed && chunks.map((chunk, ci) => (
              <ShelfRow
                key={ci}
                label=""
                books={chunk}
                onTransfer={onTransfer}
                onDelete={onDelete}
                onEdit={onEdit}
                onReview={onReview}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

const GROUP_ICON = { location: '📍', owner: '👤', genre: '🏷️' };
const GROUPED_SORTS = ['location', 'owner', 'genre'];

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ books, sortBy, statusFilter, onTransfer, onDelete, onEdit, onReview }) {
  if (GROUPED_SORTS.includes(sortBy) || statusFilter === 'מושאל' || statusFilter === 'רשימת משאלות') {
    const groups = groupBooks(books, sortBy, undefined, statusFilter);
    return (
      <div className="space-y-10">
        {groups.map(([label, groupBooks], i) => (
          <div key={label || i}>
            {label && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-bold tracking-wide" style={{ color: '#4A2810' }}>
                  {SPECIAL_SHELF_ICON[label] ?? GROUP_ICON[sortBy]} {label}
                </span>
                <div className="flex-1 h-px" style={{ background: '#8B5E3C55' }} />
                <span className="text-xs" style={{ color: '#6B3F20' }}>{groupBooks.length} ספרים</span>
              </div>
            )}
            <motion.div
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
            >
              <AnimatePresence>
                {groupBooks.map(book => (
                  <BookCard key={book.id} book={book} onTransfer={onTransfer} onDelete={onDelete} onEdit={onEdit} onReview={onReview} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
    >
      <AnimatePresence>
        {books.map(book => (
          <BookCard key={book.id} book={book} onTransfer={onTransfer} onDelete={onDelete} onEdit={onEdit} onReview={onReview} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Empty state message based on active filters ───────────────────────────────
function emptyMessage(filters = {}) {
  const { search, owner, status } = filters;
  if (search)                           return { icon: '🔍', main: `לא נמצאו ספרים עבור "${search}"`,     sub: 'נסה מילת חיפוש אחרת' };
  if (owner  && status === 'מושאל')     return { icon: '📤', main: `אין ספרים מושאלים של ${owner}`,        sub: '' };
  if (owner  && status === 'זמין')      return { icon: '✅', main: `אין ספרים זמינים של ${owner}`,         sub: '' };
  if (owner  && status)                 return { icon: '📚', main: `אין ספרים של ${owner} בסטטוס זה`,     sub: '' };
  if (owner)                            return { icon: '👤', main: `אין ספרים של ${owner}`,                sub: '' };
  if (status === 'מושאל')               return { icon: '📤', main: 'אין ספרים מושאלים כרגע',              sub: 'כל הספרים נמצאים בבית' };
  if (status === 'זמין')                return { icon: '✅', main: 'אין ספרים זמינים כרגע',               sub: 'כל הספרים מושאלים' };
  if (status === 'רשימת משאלות')        return { icon: '⭐', main: 'רשימת המשאלות ריקה',                  sub: '' };
  return { icon: '📖', main: 'הספרייה ריקה', sub: 'לחץ על "הוסף ספר" כדי להתחיל' };
}

// ── Combined export ───────────────────────────────────────────────────────────
export default function BookshelfView({ books, loading, viewMode, sortBy, filters, statusFilter, onTransfer, onDelete, onEdit, onReview }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full"
        />
        <span className="mr-3 text-gray-500 text-sm">טוען ספרים...</span>
      </div>
    );
  }

  if (books.length === 0) {
    const msg = emptyMessage(filters);
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <span className="text-7xl mb-4 select-none">{msg.icon}</span>
        <p className="text-xl font-semibold text-gray-600">{msg.main}</p>
        {msg.sub && <p className="text-gray-400 text-sm mt-1">{msg.sub}</p>}
      </div>
    );
  }

  return viewMode === 'shelf'
    ? <ShelfView books={books} sortBy={sortBy} statusFilter={statusFilter} onTransfer={onTransfer} onDelete={onDelete} onEdit={onEdit} onReview={onReview} />
    : <GridView  books={books} sortBy={sortBy} statusFilter={statusFilter} onTransfer={onTransfer} onDelete={onDelete} onEdit={onEdit} onReview={onReview} />;
}
