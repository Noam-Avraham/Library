import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { DEFAULT_OWNER } from '../data/config.js';

const OVERLAY = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const CARD_BG  = { background: '#1e1a2e', border: '1px solid rgba(180,130,30,0.25)', borderRadius: 16 };

function BookResultRow({ item, selected, onToggle, selectedMatch, onMatchChange }) {
  const { identified, matches } = item;
  const best = selectedMatch ?? matches[0];

  return (
    <div
      className="flex gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(180,130,30,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(180,130,30,0.5)' : 'rgba(255,255,255,0.08)'}`,
      }}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{
            background: selected ? '#d97706' : 'transparent',
            border: `2px solid ${selected ? '#d97706' : '#6b7280'}`,
          }}
        >
          {selected && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden" style={{ background: '#2d2547' }}>
        {best?.thumbnailUrl
          ? <img src={best.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
          : <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0" dir="rtl">
        <p className="text-sm font-semibold truncate" style={{ color: '#f5e6cc' }}>
          {best?.title || identified.title}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: '#94a3b8' }}>
          {best?.author || identified.author || '—'}
        </p>
        {identified.title !== best?.title && (
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
            זוהה: {identified.title}
          </p>
        )}

        {/* Match selector */}
        {matches.length > 1 && (
          <select
            className="mt-1 text-xs rounded px-1 py-0.5 w-full"
            style={{ background: '#2d2547', color: '#94a3b8', border: '1px solid #4b5563' }}
            value={matches.indexOf(selectedMatch ?? matches[0])}
            onChange={e => { e.stopPropagation(); onMatchChange(matches[Number(e.target.value)]); }}
            onClick={e => e.stopPropagation()}
          >
            {matches.map((m, i) => (
              <option key={i} value={i}>{m.title} — {m.author || '?'}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default function ShelfScanner({ open, onClose, familyMembers, onBulkAdd }) {
  const [phase, setPhase]               = useState('upload');   // upload | scanning | results
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64]   = useState(null);
  const [mediaType, setMediaType]       = useState('image/jpeg');
  const [results, setResults]           = useState([]);
  const [selected, setSelected]         = useState({});
  const [matchOverride, setMatchOverride] = useState({});
  const [owner, setOwner]               = useState(DEFAULT_OWNER);
  const [location, setLocation]         = useState('בית');
  const [adding, setAdding]             = useState(false);
  const [error, setError]               = useState('');
  const [dragging, setDragging]         = useState(false);
  const fileRef = useRef();

  const reset = () => {
    setPhase('upload'); setImagePreview(null); setImageBase64(null);
    setResults([]); setSelected({}); setMatchOverride({});
    setError(''); setAdding(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const loadFile = (file) => {
    if (!file) return;
    const mt = file.type || 'image/jpeg';
    setMediaType(mt);
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
      // Strip "data:image/...;base64," prefix
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  }, []);

  const handleScan = async () => {
    if (!imageBase64) return;
    setPhase('scanning'); setError('');
    try {
      const data = await api.scanShelf(imageBase64, mediaType);
      const withMatches = data.filter(r => r.matches?.length > 0);
      setResults(withMatches);
      const sel = {};
      withMatches.forEach((_, i) => { sel[i] = true; });
      setSelected(sel);
      setPhase('results');
    } catch (err) {
      setError(err.message || 'שגיאה בסריקה');
      setPhase('upload');
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    const toAdd = results
      .filter((_, i) => selected[i])
      .map((item, i) => {
        const match = matchOverride[i] ?? item.matches[0];
        return {
          title:        match.title,
          author:       match.author || '',
          translator:   match.translator || '',
          thumbnailUrl: match.thumbnailUrl || '',
          isbn:         match.isbn || '',
          genre:        match.genre || '',
          description:  match.description || '',
          publisher:    match.publisher || '',
          owner,
          current_holder: owner,
          location,
          status: 'זמין',
        };
      });

    try {
      await Promise.all(toAdd.map(b => api.addBook(b)));
      await onBulkAdd();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  if (!open) return null;

  return (
    <AnimatePresence>
      <div style={OVERLAY}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{ ...CARD_BG, position: 'relative', width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: '0 16px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} dir="rtl">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f5e6cc' }}>סרוק מדף ספרים</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>העלה תמונה ובינה מלאכותית תזהה את הספרים</p>
            </div>
            <button onClick={handleClose} className="text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10" style={{ color: '#94a3b8' }}>✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ── UPLOAD PHASE ── */}
            {(phase === 'upload' || phase === 'scanning') && (
              <div className="flex flex-col gap-4">
                {/* Drop zone */}
                <div
                  className="rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${dragging ? '#d97706' : 'rgba(180,130,30,0.4)'}`,
                    background: dragging ? 'rgba(180,130,30,0.08)' : 'rgba(255,255,255,0.03)',
                    minHeight: imagePreview ? 'auto' : 200,
                    padding: 20,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => loadFile(e.target.files[0])} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="rounded-lg max-h-64 object-contain w-full" />
                  ) : (
                    <>
                      <span className="text-4xl">📷</span>
                      <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>גרור תמונה לכאן או לחץ לבחירה</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>תמונת מדף ספרים — יזוהו ספרים אוטומטית</p>
                    </>
                  )}
                </div>

                {imagePreview && phase !== 'scanning' && (
                  <button
                    onClick={handleScan}
                    className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}
                  >
                    🔍 זהה ספרים
                  </button>
                )}

                {phase === 'scanning' && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#d97706', borderTopColor: 'transparent' }} />
                    <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>מנתח את התמונה...</p>
                    <p className="text-xs" style={{ color: '#6b7280' }}>בינה מלאכותית קוראת את שמות הספרים</p>
                  </div>
                )}

                {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}
              </div>
            )}

            {/* ── RESULTS PHASE ── */}
            {phase === 'results' && (
              <div className="flex flex-col gap-4">
                {/* Owner + location */}
                <div className="flex gap-3" dir="rtl">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>בעלים</label>
                    <select
                      value={owner}
                      onChange={e => setOwner(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}
                    >
                      {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>מיקום</label>
                    <input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}
                    />
                  </div>
                </div>

                {/* Select all */}
                <div className="flex items-center justify-between" dir="rtl">
                  <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>
                    זוהו {results.length} ספרים — {selectedCount} נבחרו
                  </p>
                  <button
                    className="text-xs underline"
                    style={{ color: '#d97706' }}
                    onClick={() => {
                      const allSelected = selectedCount === results.length;
                      const s = {};
                      results.forEach((_, i) => { s[i] = !allSelected; });
                      setSelected(s);
                    }}
                  >
                    {selectedCount === results.length ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                </div>

                {/* Book list */}
                <div className="flex flex-col gap-2">
                  {results.map((item, i) => (
                    <BookResultRow
                      key={i}
                      item={item}
                      selected={!!selected[i]}
                      onToggle={() => setSelected(s => ({ ...s, [i]: !s[i] }))}
                      selectedMatch={matchOverride[i]}
                      onMatchChange={m => setMatchOverride(o => ({ ...o, [i]: m }))}
                    />
                  ))}
                </div>

                {/* Try again */}
                <button
                  className="text-xs underline self-center"
                  style={{ color: '#6b7280' }}
                  onClick={() => { setPhase('upload'); setResults([]); setSelected({}); }}
                >
                  העלה תמונה אחרת
                </button>

                {error && <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>}
              </div>
            )}
          </div>

          {/* Footer */}
          {phase === 'results' && (
            <div className="p-5 pt-0">
              <button
                onClick={handleAdd}
                disabled={adding || selectedCount === 0}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}
              >
                {adding ? 'מוסיף...' : `הוסף ${selectedCount} ספרים`}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
