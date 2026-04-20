import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GENRES } from '../data/genres.js';
import { sortedMembers, locationOptions } from '../data/members.js';

const STATUSES = ['זמין', 'מושאל', 'רשימת משאלות'];

export default function EditBookModal({ open, book, familyMembers, onClose, onSave }) {
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [showMore, setShowMore] = useState(false);
  const members = sortedMembers(familyMembers);

  useEffect(() => {
    if (book) { setForm({ ...book }); setShowMore(false); }
  }, [book]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, translator: form.translator || '' };
      if (data.status !== 'מושאל') data.current_holder = data.owner;
      await onSave(book.id, data);
      onClose();
    } catch {
      alert('שגיאה בשמירת הספר.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <AnimatePresence>
      {open && book && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">עריכת ספר</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">שם הספר *</span>
                  <input required value={form.title || ''} onChange={e => set('title', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">מחבר</span>
                  <input value={form.author || ''} onChange={e => set('author', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">בעלים</span>
                    <select value={form.owner || ''} onChange={e => set('owner', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">סטטוס</span>
                    <select value={form.status || 'זמין'} onChange={e => set('status', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>

                {form.status === 'מושאל' && (
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">מחזיק כעת</span>
                    <input
                      value={form.current_holder || ''}
                      onChange={e => set('current_holder', e.target.value)}
                      placeholder="שם המחזיק..."
                      className="mt-1 w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">מיקום</span>
                  <select value={form.location || 'בית'} onChange={e => set('location', e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                    {locationOptions().map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>

                {/* Advanced — collapsed by default */}
                <button
                  type="button"
                  onClick={() => setShowMore(v => !v)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span>{showMore ? '▲' : '▼'}</span>
                  <span>{showMore ? 'פחות שדות' : "ז'אנר, מתרגם, ISBN וקישור תמונה"}</span>
                </button>

                {showMore && (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">ז'אנר</span>
                      <select value={form.genre || ''} onChange={e => set('genre', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                        <option value="">ללא ז'אנר</option>
                        {form.genre && !GENRES.includes(form.genre) && (
                          <option value={form.genre}>{form.genre}</option>
                        )}
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">מתרגם</span>
                      <input value={form.translator || ''} onChange={e => set('translator', e.target.value)}
                        placeholder="שם המתרגם (אופציונלי)"
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">ISBN</span>
                      <input value={form.isbn || ''} onChange={e => set('isbn', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">קישור לתמונת כריכה</span>
                      <input value={form.thumbnailUrl || ''} onChange={e => set('thumbnailUrl', e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono text-xs" />
                    </label>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose}
                    className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    ביטול
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                    {saving ? 'שומר...' : 'שמור שינויים'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
