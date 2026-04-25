import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { GENRES } from '../data/genres.js';
import { sortedMembers, locationOptions } from '../data/members.js';
import { STATUSES } from '../data/statuses.js';

function Overlay({ onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-40"
      onClick={onClick}
    />
  );
}

const SOURCE_LABEL = {
  nli:    { text: 'ספרייה לאומית', cls: 'bg-blue-100 text-blue-700' },
  google: { text: 'Google Books',  cls: 'bg-gray-100 text-gray-500'  },
};

function BookCover({ thumbnailUrl, isbn, title }) {
  const [src, setSrc] = useState(thumbnailUrl || '');
  const fallback = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : '';

  if (!src && !fallback) {
    return (
      <div className="book-placeholder w-10 h-14 flex-shrink-0  overflow-hidden flex items-center justify-center">
        <span className="text-white text-sm font-bold">{title?.charAt(0)}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-14 flex-shrink-0  overflow-hidden bg-gray-100">
      <img
        src={src || fallback}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => { if (src !== fallback && fallback) setSrc(fallback); else setSrc(''); }}
      />
    </div>
  );
}

function SearchResult({ item, onSelect }) {
  const badge = SOURCE_LABEL[item.source] || SOURCE_LABEL.google;
  return (
    <div
      className="flex items-center gap-3 p-2 hover:bg-indigo-50  cursor-pointer group"
      onClick={() => onSelect(item)}
    >
      <BookCover thumbnailUrl={item.thumbnailUrl} isbn={item.isbn} title={item.title} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 line-clamp-1">{item.title}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{item.author}</p>
        {item.translator && (
          <p className="text-xs text-indigo-500 line-clamp-1">מתרגם: {item.translator}</p>
        )}
        <div className="flex gap-2 mt-0.5 items-center">
          {item.publishedDate && <span className="text-xs text-gray-400">{item.publishedDate.slice(0,4)}</span>}
          {item.language && <span className="text-xs text-gray-400 bg-gray-100 px-1 ">{item.language}</span>}
          <span className={`text-xs px-1.5  font-medium ${badge.cls}`}>{badge.text}</span>
        </div>
      </div>
      <span className="text-xs text-indigo-600 font-medium group-hover:underline flex-shrink-0">בחר</span>
    </div>
  );
}


const emptyForm = (familyMembers) => ({
  title: '', author: '', translator: '', thumbnailUrl: '', isbn: '',
  owner: familyMembers[0]?.name || '',
  current_holder: '',
  location: 'בית',
  status: 'זמין',
  genre: '',
  description: '',
});

export default function AddBookModal({ open, onClose, familyMembers, onAdd }) {
  const members = sortedMembers(familyMembers);
  const [step,        setStep]        = useState('search');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [checking,    setChecking]    = useState(false);
  const [duplicate,   setDuplicate]   = useState(null);
  const [form,        setForm]        = useState(() => emptyForm(familyMembers));

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const items = await api.searchBooks(query.trim());
      setResults(items);
      if (items.length === 0) setSearchError('לא נמצאו תוצאות. נסה מילת חיפוש אחרת.');
    } catch {
      setSearchError('שגיאה בחיפוש. בדוק שהשרת פועל.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (item) => {
    setForm(f => ({
      ...f,
      title:        item.title,
      author:       item.author,
      translator:   item.translator || '',
      thumbnailUrl: item.thumbnailUrl,
      isbn:         item.isbn,
      genre:        item.genre,
      description:  item.description,
    }));
    setStep('details');
  };

  const handleManual = () => {
    setForm(f => ({ ...f, title: query }));
    setStep('details');
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await onAdd({ ...form, current_holder: form.current_holder || form.owner });
      handleClose();
    } catch {
      alert('שגיאה בשמירת הספר.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setChecking(true);
    try {
      const existing = await api.getBooks({ search: form.title.trim() });
      const normalized = form.title.trim().toLowerCase();
      const match = existing.find(b => b.title.trim().toLowerCase() === normalized);
      if (match) {
        setDuplicate(match);
        setChecking(false);
        return;
      }
    } catch {
      // proceed on error
    }
    setChecking(false);
    await doSave();
  };

  const handleClose = () => {
    setStep('search');
    setQuery('');
    setResults([]);
    setSearchError('');
    setDuplicate(null);
    setForm(emptyForm(familyMembers));
    onClose();
  };

  const set = (key, val) => {
    if (key === 'title') setDuplicate(null);
    setForm(f => ({ ...f, [key]: val }));
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <Overlay onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white  shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">
                  {step === 'search' ? 'חיפוש ספר' : 'פרטי הספר'}
                </h2>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              {/* Step: Search */}
              {step === 'search' && (
                <div className="p-5">
                  <button
                    onClick={handleManual}
                    className="w-full mb-4 flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 font-medium py-2.5  text-sm transition-colors"
                  >
                    <span>✏️</span>
                    <span>הוסף ספר ידנית (ללא חיפוש)</span>
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">או חפש ב-Google Books + הספרייה הלאומית</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="שם ספר, מחבר, ISBN..."
                      className="flex-1 border border-gray-200  px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={searching || !query.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold px-5 py-2.5  text-sm transition-colors"
                    >
                      {searching ? '...' : 'חפש'}
                    </button>
                  </form>

                  {searchError && <p className="text-sm text-orange-600 mb-3">{searchError}</p>}

                  {results.length > 0 && (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {results.map(item => (
                        <SearchResult key={item.googleId} item={item} onSelect={handleSelect} />
                      ))}
                    </div>
                  )}

                  {(results.length > 0 || searchError) && query.trim() && (
                    <button
                      onClick={handleManual}
                      className="mt-4 text-sm text-indigo-600 hover:underline w-full text-center"
                    >
                      הוסף ידנית: "{query}"
                    </button>
                  )}

                  {results.length === 0 && !searchError && !searching && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-4xl mb-2">🔍</p>
                      <p className="text-sm">חפש לפי שם ספר, מחבר או ISBN</p>
                      {query.trim() && (
                        <button onClick={handleManual} className="mt-3 text-sm text-indigo-600 hover:underline">
                          הוסף ידנית: "{query}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step: Details */}
              {step === 'details' && (
                <form onSubmit={handleSave} className="p-5 space-y-4">
                  {/* Cover preview */}
                  {form.thumbnailUrl && (
                    <div className="flex gap-4 items-start bg-amber-50 p-3 ">
                      <img src={form.thumbnailUrl} alt="" className="w-16 h-22 object-cover  shadow"
                        onError={e => e.target.style.display = 'none'} />
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{form.title}</p>
                        <p className="text-gray-500 text-xs">{form.author}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">שם הספר *</span>
                      <input required value={form.title}
                        onChange={e => set('title', e.target.value)}
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">מחבר</span>
                      <input value={form.author}
                        onChange={e => set('author', e.target.value)}
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">מתרגם</span>
                      <input value={form.translator}
                        onChange={e => set('translator', e.target.value)}
                        placeholder="שם המתרגם (אופציונלי)"
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">בעלים *</span>
                        <select required value={form.owner}
                          onChange={e => set('owner', e.target.value)}
                          className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                          <option value="">בחר...</option>
                          {members.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">סטטוס</span>
                        <select value={form.status}
                          onChange={e => set('status', e.target.value)}
                          className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>

                    {form.status === 'מושאל' && (
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">מחזיק כעת</span>
                        <input value={form.current_holder || ''}
                          onChange={e => set('current_holder', e.target.value)}
                          placeholder="שם המחזיק..."
                          className="mt-1 w-full border border-orange-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50" />
                      </label>
                    )}

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">ז'אנר</span>
                      <select value={form.genre || ''} onChange={e => set('genre', e.target.value)}
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                        <option value="">ללא ז'אנר</option>
                        {form.genre && !GENRES.includes(form.genre) && (
                          <option value={form.genre}>{form.genre}</option>
                        )}
                        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">מיקום</span>
                      <select value={form.location}
                        onChange={e => set('location', e.target.value)}
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                        {locationOptions().map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">קישור לתמונת כריכה</span>
                      <input value={form.thumbnailUrl}
                        onChange={e => set('thumbnailUrl', e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full border border-gray-200  px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono text-xs" />
                    </label>
                  </div>

                  {duplicate && (
                    <div className="bg-amber-50 border border-amber-200 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-base mt-0.5">⚠️</span>
                        <div>
                          <p className="font-semibold text-amber-800 text-sm">ספר עם השם הזה כבר קיים בספרייה</p>
                          <p className="text-xs text-amber-600 mt-0.5">האם להוסיף בכל זאת?</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-amber-100 p-2">
                        <BookCover thumbnailUrl={duplicate.thumbnailUrl} isbn={duplicate.isbn} title={duplicate.title} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 line-clamp-1">{duplicate.title}</p>
                          {duplicate.author && <p className="text-xs text-gray-500 line-clamp-1">{duplicate.author}</p>}
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {duplicate.owner && <span className="text-xs text-gray-400">בעלים: {duplicate.owner}</span>}
                            {duplicate.location && <span className="text-xs text-gray-400">מיקום: {duplicate.location}</span>}
                            {duplicate.status && <span className="text-xs text-gray-400">סטטוס: {duplicate.status}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDuplicate(null)}
                          className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 text-sm hover:bg-gray-50 transition-colors min-h-[44px]">
                          חזור לעריכה
                        </button>
                        <button type="button" onClick={doSave} disabled={saving}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2.5 text-sm transition-colors min-h-[44px]">
                          {saving ? 'שומר...' : 'הוסף בכל זאת'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!duplicate && (
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep('search')}
                        className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5  text-sm hover:bg-gray-50 transition-colors">
                        חזור
                      </button>
                      <button type="submit" disabled={saving || checking}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5  text-sm transition-colors">
                        {checking ? 'בודק...' : saving ? 'שומר...' : 'שמור ספר'}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
