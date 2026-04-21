import { motion, AnimatePresence } from 'framer-motion';
import { isWrongLocation, expectedHome } from '../data/location.js';
import { STATUS_STYLE } from '../data/statuses.js';
import BookCover from './BookCover.jsx';

export default function BookCard({ book, onTransfer, onDelete, onEdit, onReview }) {
  const [showActions, setShowActions] = useState(false);
  const isOnLoan  = book.current_holder && book.current_holder !== book.owner;
  const wrongPlace = isWrongLocation(book);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
      className="relative cursor-pointer group  overflow-hidden"
      style={{
        aspectRatio: '2/3',
        boxShadow: '4px 6px 0 0 rgba(0,0,0,0.18), 7px 10px 18px rgba(0,0,0,0.22)',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Cover */}
      <div className="absolute inset-0">
        <BookCover thumbnailUrl={book.thumbnailUrl} title={book.title} />
      </div>

      {/* Binding edge */}
      <div
        className="absolute top-0 right-0 bottom-0 w-2 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.25), transparent)' }}
      />

      {/* Status badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[book.status] || 'bg-gray-500 text-white'}`}>
          {book.status}
        </span>
      </div>

      {/* Wrong-location badge */}
      {wrongPlace && (
        <div className="absolute top-2 right-2 z-10" title={`הספר ב${book.location} — אמור להיות ב${expectedHome(book.owner)}`}>
          <span className="text-base leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}>
            🏠
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 p-2.5 pt-8"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}
      >
        <p className="text-white font-bold text-xs leading-snug line-clamp-2">{book.title}</p>
        {book.author && (
          <p className="text-white/70 text-xs mt-0.5 truncate">{book.author}</p>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <span className="bg-indigo-500/80 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
            {book.owner}
          </span>
          {isOnLoan && (
            <span className="bg-orange-500/80 text-white text-xs px-1.5 py-0.5 rounded-full">
              ← {book.current_holder}
            </span>
          )}
        </div>
      </div>

      {/* Hover action overlay */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/55 flex flex-col items-center justify-center gap-2"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onTransfer(book); }}
              className="bg-white text-indigo-700 font-semibold text-xs px-4 py-1.5  hover:bg-indigo-50 w-24 transition-colors"
            >
              העברה
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(book); }}
              className="bg-white text-sky-700 font-semibold text-xs px-4 py-1.5  hover:bg-sky-50 w-24 transition-colors"
            >
              עריכה
            </button>
            {onReview && (
              <button
                onClick={(e) => { e.stopPropagation(); onReview(book); }}
                className="bg-white text-amber-700 font-semibold text-xs px-4 py-1.5  hover:bg-amber-50 w-24 transition-colors"
              >
                ⭐ ביקורת
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
              className="bg-white text-red-600 font-semibold text-xs px-4 py-1.5  hover:bg-red-50 w-24 transition-colors"
            >
              מחיקה
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
