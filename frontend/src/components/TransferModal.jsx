import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUSES = ['זמין', 'מושאל', 'רשימת משאלות'];

import { locationOptions } from '../data/members.js';

const today = () => new Date().toISOString().split('T')[0];

export default function TransferModal({ open, book, onClose, onTransfer }) {
  const [holder, setHolder] = useState('');
  const [status, setStatus] = useState('מושאל');
  const [location, setLocation] = useState('');
  const [borrowedAt, setBorrowedAt] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setHolder(book?.current_holder || '');
    setStatus(book?.status || 'מושאל');
    setLocation(book?.location || 'בית');
    setBorrowedAt(book?.borrowed_at || today());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'מושאל' && !holder.trim()) return;
    setSaving(true);
    try {
      await onTransfer(book.id, {
        current_holder: holder,
        status,
        location: location || 'בית',
        borrowed_at: status === 'מושאל' ? borrowedAt : null,
      });
      onClose();
    } catch {
      alert('שגיאה בהעברת הספר.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence onExitComplete={() => {}}>
      {open && book && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onAnimationStart={handleOpen}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white  shadow-2xl w-full max-w-sm pointer-events-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">העברת ספר</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="p-5">
                {/* Book info */}
                <div className="flex gap-3 bg-amber-50 p-3  mb-5">
                  {book.thumbnailUrl
                    ? <img src={book.thumbnailUrl} alt="" className="w-12 h-16 object-cover  shadow flex-shrink-0" />
                    : <div className="book-placeholder w-12 h-16  shadow flex-shrink-0 flex items-center justify-center">
                        <span className="text-white font-bold">{book.title?.charAt(0)}</span>
                      </div>
                  }
                  <div>
                    <p className="font-bold text-sm text-gray-900 line-clamp-2">{book.title}</p>
                    <p className="text-xs text-gray-500">{book.author}</p>
                    <p className="text-xs text-indigo-600 mt-1">בעלים: {book.owner}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">סטטוס</span>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="mt-1 w-full border border-gray-200  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>

                  {status === 'מושאל' && (
                    <>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">מושאל למי</span>
                        <input
                          type="text"
                          required
                          value={holder}
                          onChange={e => setHolder(e.target.value)}
                          placeholder="הקלד שם..."
                          className="mt-1 w-full border border-orange-200  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">תאריך השאלה</span>
                        <input
                          type="date"
                          value={borrowedAt}
                          onChange={e => setBorrowedAt(e.target.value)}
                          className="mt-1 w-full border border-orange-200  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50"
                        />
                      </label>
                    </>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">מיקום</span>
                    <select
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="mt-1 w-full border border-gray-200  px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      {locationOptions().map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5  text-sm hover:bg-gray-50 transition-colors"
                    >
                      ביטול
                    </button>
                    <button
                      type="submit"
                      disabled={saving || (status === 'מושאל' && !holder.trim())}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5  text-sm transition-colors"
                    >
                      {saving ? 'מעביר...' : 'העבר ספר'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
