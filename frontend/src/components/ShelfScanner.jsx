import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { DEFAULT_OWNER } from '../data/config.js';
import { locationOptions } from '../data/members.js';

const OVERLAY  = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const CARD_BG  = { background: '#1e1a2e', border: '1px solid rgba(180,130,30,0.25)', borderRadius: 0 };
const CONF_COLOR = { high: '#4ade80', medium: '#fbbf24', low: '#f87171' };
const CONF_LABEL = { high: 'ברור', medium: 'חלקי', low: 'לא בטוח' };

function ConfidenceDot({ confidence }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: CONF_COLOR[confidence] ?? '#6b7280' }}
      title={CONF_LABEL[confidence]}
    />
  );
}

function matchQuality(score) {
  if (score >= 100) return { label: 'התאמה גבוהה', color: '#4ade80' };
  if (score >= 40)  return { label: 'התאמה חלקית', color: '#fbbf24' };
  return               { label: 'התאמה חלשה',  color: '#f87171' };
}

function RadioDot({ active }) {
  return (
    <div
      className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5"
      style={{ border: `2px solid ${active ? '#d97706' : '#4b5563'}`, background: active ? '#d97706' : 'transparent' }}
    >
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}

// source: 'gemini' | 'catalog' | null
function BookResultRow({ item, source, onSourceChange, selectedMatch, onMatchChange, editMode, editedTitle, onTitleChange, editedAuthor, onAuthorChange }) {
  const { identified, matches, enriching, isDuplicate } = item;
  const best     = selectedMatch ?? matches[0];
  const hasMatch = matches.length > 0;
  const mq       = best ? matchQuality(best.matchScore ?? 0) : null;

  const geminiSelected  = source === 'gemini';
  const catalogSelected = source === 'catalog';

  return (
    <div className="flex gap-2 items-stretch flex-1 min-w-0">

      {/* ── Gemini panel ── */}
      <div
        className="flex-1 min-w-0 flex gap-1.5 p-2 sm:p-3 cursor-pointer transition-all"
        style={{
          background: geminiSelected ? 'rgba(180,130,30,0.15)' : 'rgba(255,255,255,0.04)',
          border: `2px solid ${geminiSelected ? '#d97706' : 'rgba(255,255,255,0.08)'}`,
        }}
        onClick={() => onSourceChange(geminiSelected ? null : 'gemini')}
      >
        <RadioDot active={geminiSelected} />
        <div className="flex-1 min-w-0" dir="rtl">
          <div className="flex items-center gap-1.5">
            <ConfidenceDot confidence={identified.confidence} />
            {editMode ? (
              <input
                className="text-xs sm:text-sm font-semibold flex-1 min-w-0"
                style={{ color: '#f5e6cc', background: 'transparent', borderBottom: '1px solid #d97706', outline: 'none' }}
                value={editedTitle ?? identified.title}
                onChange={e => onTitleChange(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: '#f5e6cc' }}>{identified.title}</p>
            )}
            {identified.language === 'en' && !editMode && (
              <span className="text-xs px-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>EN</span>
            )}
          </div>
          {editMode ? (
            <input
              className="text-xs mt-0.5 w-full"
              style={{ color: '#94a3b8', background: 'transparent', borderBottom: '1px solid #4b5563', outline: 'none' }}
              value={editedAuthor ?? identified.author ?? ''}
              placeholder="מחבר..."
              onChange={e => onAuthorChange(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : identified.author ? (
            <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>{identified.author}</p>
          ) : null}
          {isDuplicate?.gemini && (
            <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>⚠️ כבר קיים</p>
          )}
        </div>
      </div>

      {/* ── Catalog panel ── */}
      <div
        className={`flex-1 min-w-0 flex gap-1.5 p-2 sm:p-3 transition-all ${hasMatch ? 'cursor-pointer' : 'cursor-default'}`}
        style={{
          background: catalogSelected ? 'rgba(180,130,30,0.15)' : 'rgba(255,255,255,0.04)',
          border: `2px solid ${catalogSelected ? '#d97706' : 'rgba(255,255,255,0.08)'}`,
          opacity: !enriching && !hasMatch ? 0.45 : 1,
        }}
        onClick={() => { if (hasMatch) onSourceChange(catalogSelected ? null : 'catalog'); }}
      >
        <RadioDot active={catalogSelected} />
        {enriching ? (
          <div className="flex-1 flex items-center gap-2" dir="rtl">
            <div className="w-3 h-3 border-2 rounded-full animate-spin flex-shrink-0"
              style={{ borderColor: '#4b5563', borderTopColor: '#94a3b8' }} />
            <p className="text-xs" style={{ color: '#6b7280' }}>מחפש...</p>
          </div>
        ) : hasMatch ? (
          <div className="flex gap-1.5 flex-1 min-w-0">
            {best.thumbnailUrl && (
              <img src={best.thumbnailUrl} alt=""
                className="hidden sm:block w-8 h-12 object-cover flex-shrink-0"
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="flex-1 min-w-0" dir="rtl">
              <p className="text-xs mb-0.5" style={{ color: mq.color }}>{mq.label}</p>
              <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: '#f5e6cc' }}>{best.title}</p>
              {best.author && (
                <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>{best.author}</p>
              )}
              {isDuplicate?.catalog && (
                <p className="text-xs mt-1" style={{ color: '#fbbf24' }}>⚠️ כבר קיים</p>
              )}
              <p className="text-xs mt-1" style={{ color: '#374151' }}>
                {best.source === 'nli' ? 'הספרייה הלאומית' : 'Google Books'}
              </p>
              {matches.length > 1 && (
                <select
                  className="mt-1 text-xs px-1 py-0.5 w-full"
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
        ) : (
          <div className="flex-1 flex items-center" dir="rtl">
            <p className="text-xs" style={{ color: '#4b5563' }}>לא נמצא במאגר</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShelfScanner({ open, onClose, familyMembers, onBulkAdd, books = [] }) {
  const [phase, setPhase]               = useState('upload');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64]   = useState(null);
  const [mediaType, setMediaType]       = useState('image/jpeg');
  const [results, setResults]           = useState([]);
  // source per index: 'gemini' | 'catalog' | null
  const [selected, setSelected]         = useState({});
  const [matchOverride, setMatchOverride] = useState({});
  const [owner, setOwner]               = useState(DEFAULT_OWNER);
  const [location, setLocation]         = useState('בית');
  const [customLocation, setCustomLocation] = useState('');
  const [locations, setLocations]       = useState([]);
  const [adding, setAdding]             = useState(false);
  const [error, setError]               = useState('');
  const [dragging, setDragging]         = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [editedTitles, setEditedTitles] = useState({});
  const [editedAuthors, setEditedAuthors] = useState({});
  const fileRef = useRef();

  const reset = () => {
    setPhase('upload'); setImagePreview(null); setImageBase64(null);
    setResults([]); setSelected({}); setMatchOverride({});
    setError(''); setAdding(false); setCustomLocation('');
    setEditMode(false); setEditedTitles({}); setEditedAuthors({});
  };

  const handleClose = () => { reset(); onClose(); };

  useEffect(() => {
    if (open) {
      const base = locationOptions().filter(l => l !== 'אחר');
      api.getLocations().then(apiLocs => {
        const merged = [...new Set([...base, ...apiLocs])];
        setLocations(merged);
        if (!merged.includes(location)) setLocation(merged[0] || 'בית');
      }).catch(() => setLocations(base));
    }
  }, [open]);

  const loadFile = (file) => {
    if (!file) return;
    const mt = file.type || 'image/jpeg';
    setMediaType(mt);
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
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
      const identified = await api.scanIdentify(imageBase64, mediaType);
      const existingTitles = new Set(books.map(b => b.title.trim().toLowerCase()));

      const initial = identified.map(id => ({
        identified: id,
        matches: [],
        enriching: true,
        isDuplicate: { gemini: existingTitles.has(id.title.trim().toLowerCase()), catalog: false },
      }));
      setResults(initial);

      const sel = {};
      identified.forEach((id, i) => { sel[i] = id.confidence !== 'low' ? 'gemini' : null; });
      setSelected(sel);
      setPhase('results');

      // Enrich each book in background
      identified.forEach(async (id, i) => {
        try {
          const matches = await api.scanEnrich(id.title, id.author);
          const bestScore = matches[0]?.matchScore ?? 0;
          const catalogTitle = (matches[0]?.title ?? '').trim().toLowerCase();
          const isDuplicate = {
            gemini:  existingTitles.has(id.title.trim().toLowerCase()),
            catalog: matches.length > 0 && existingTitles.has(catalogTitle),
          };
          setResults(prev => prev.map((r, idx) => idx !== i ? r : { ...r, matches, enriching: false, isDuplicate }));
          // Auto-switch to catalog if strong match
          if (matches.length > 0 && bestScore >= 100) {
            setSelected(prev => ({ ...prev, [i]: 'catalog' }));
          }
        } catch {
          setResults(prev => prev.map((r, idx) => idx !== i ? r : { ...r, enriching: false }));
        }
      });
    } catch (err) {
      setError(err.message || 'שגיאה בסריקה');
      setPhase('upload');
    }
  };

  const handleAdd = async () => {
    setAdding(true);
    const finalLocation = location === '__custom__' ? (customLocation || 'בית') : location;
    const toAdd = results
      .filter((_, i) => selected[i] != null)
      .map((item, i) => {
        if (selected[i] === 'gemini') {
          return {
            title: item.identified.title,
            author: item.identified.author || '',
            translator: '', thumbnailUrl: '', isbn: '', genre: '', description: '',
            owner, current_holder: owner, location: finalLocation, status: 'זמין',
          };
        }
        const match = matchOverride[i] ?? item.matches[0];
        return {
          title:        match.title,
          author:       match.author || '',
          translator:   match.translator || '',
          thumbnailUrl: match.thumbnailUrl || '',
          isbn:         match.isbn || '',
          genre:        match.genre || '',
          description:  match.description || '',
          owner, current_holder: owner, location: finalLocation, status: 'זמין',
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

  const shiftMap = (obj, removed) => {
    const next = {};
    Object.entries(obj).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < removed) next[ki] = v;
      else if (ki > removed) next[ki - 1] = v;
    });
    return next;
  };

  const handleDismiss = (i) => {
    setResults(prev => prev.filter((_, idx) => idx !== i));
    setSelected(prev => shiftMap(prev, i));
    setMatchOverride(prev => shiftMap(prev, i));
    setEditedTitles(prev => shiftMap(prev, i));
    setEditedAuthors(prev => shiftMap(prev, i));
  };

  const handleUpdateTitles = async () => {
    const existingTitles = new Set(books.map(b => b.title.trim().toLowerCase()));
    const indices = new Set([
      ...Object.keys(editedTitles).map(Number),
      ...Object.keys(editedAuthors).map(Number),
    ]);
    const changed = [...indices]
      .map(i => ({
        i,
        newTitle:  (editedTitles[i]  ?? results[i].identified.title).trim(),
        newAuthor: (editedAuthors[i] ?? results[i].identified.author ?? '').trim(),
      }))
      .filter(({ i, newTitle, newAuthor }) =>
        (newTitle  && newTitle  !== results[i].identified.title) ||
        (newAuthor !== (results[i].identified.author ?? ''))
      );

    setEditMode(false);
    setEditedTitles({});
    setEditedAuthors({});
    if (!changed.length) return;

    // Update identified fields and mark as enriching
    setResults(prev => prev.map((r, i) => {
      const c = changed.find(x => x.i === i);
      if (!c) return r;
      return { ...r, identified: { ...r.identified, title: c.newTitle, author: c.newAuthor }, matches: [], enriching: true };
    }));

    // Re-enrich changed books
    for (const { i, newTitle, newAuthor } of changed) {
      try {
        const matches = await api.scanEnrich(newTitle, newAuthor);
        const bestScore = matches[0]?.matchScore ?? 0;
        const isDuplicate = {
          gemini:  existingTitles.has(newTitle.toLowerCase()),
          catalog: matches.length > 0 && existingTitles.has((matches[0]?.title ?? '').trim().toLowerCase()),
        };
        setResults(prev => prev.map((r, ri) => ri !== i ? r : { ...r, matches, enriching: false, isDuplicate }));
        if (bestScore >= 100) setSelected(prev => ({ ...prev, [i]: 'catalog' }));
      } catch {
        setResults(prev => prev.map((r, ri) => ri !== i ? r : { ...r, enriching: false }));
      }
    }
  };

  const selectedCount  = Object.values(selected).filter(v => v != null).length;
  const enrichingCount = results.filter(r => r.enriching).length;
  const withMatch      = results.filter(r => !r.enriching && r.matches.length > 0);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div style={OVERLAY}>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{ ...CARD_BG, position: 'relative', width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: '0 16px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} dir="rtl">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f5e6cc' }}>סרוק מדף ספרים</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>העלה תמונה ובינה מלאכותית תזהה את הספרים</p>
            </div>
            <button onClick={handleClose} className="text-xl w-8 h-8 flex items-center justify-center hover:bg-white/10" style={{ color: '#94a3b8' }}>✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">

            {/* ── UPLOAD PHASE ── */}
            {(phase === 'upload' || phase === 'scanning') && (
              <div className="flex flex-col gap-4">
                {/* Owner + location */}
                <div className="flex gap-3" dir="rtl">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>בעלים</label>
                    <select value={owner} onChange={e => setOwner(e.target.value)}
                      className="w-full px-3 py-2 text-sm"
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}>
                      {familyMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: '#94a3b8' }}>מיקום</label>
                    <select
                      value={location === '__custom__' ? '__custom__' : location}
                      onChange={e => {
                        if (e.target.value === '__custom__') { setLocation('__custom__'); setCustomLocation(''); }
                        else setLocation(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-sm"
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                      {locations.length === 0 && <option value="בית">בית</option>}
                      <option value="__custom__">אחר...</option>
                    </select>
                    {location === '__custom__' && (
                      <input autoFocus value={customLocation} onChange={e => setCustomLocation(e.target.value)}
                        placeholder="הזן מיקום..." className="w-full px-3 py-2 text-sm mt-1"
                        style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }} />
                    )}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                  style={{
                    border: `2px dashed ${dragging ? '#d97706' : 'rgba(180,130,30,0.4)'}`,
                    background: dragging ? 'rgba(180,130,30,0.08)' : 'rgba(255,255,255,0.03)',
                    minHeight: imagePreview ? 'auto' : 200, padding: 20,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => loadFile(e.target.files[0])} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="max-h-64 object-contain w-full" />
                  ) : (
                    <>
                      <span className="text-4xl">📷</span>
                      <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>גרור תמונה לכאן או לחץ לבחירה</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>תמונת מדף ספרים — יזוהו ספרים אוטומטית</p>
                      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>שימו לב שהאיכות טובה ושניתן לראות את הכותרת</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>גודל מקסימלי: 20MB</p>
                    </>
                  )}
                </div>

                {imagePreview && phase !== 'scanning' && (
                  <button onClick={handleScan}
                    className="w-full py-3 font-semibold text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}>
                    🔍 זהה ספרים
                  </button>
                )}

                {phase === 'scanning' && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin"
                      style={{ borderColor: '#d97706', borderTopColor: 'transparent' }} />
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

                {/* Summary */}
                <div dir="rtl" className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>
                      זוהו <strong>{results.length}</strong> ספרים
                      {enrichingCount === 0 && withMatch.length > 0 &&
                        <> — <strong>{withMatch.length}</strong> נמצאו בקטלוג</>}
                      {enrichingCount > 0 &&
                        <span style={{ color: '#6b7280' }}> — מחפש בקטלוג ({enrichingCount})...</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
                      <span><span style={{ color: CONF_COLOR.high }}>●</span> ברור</span>
                      <span><span style={{ color: CONF_COLOR.medium }}>●</span> חלקי</span>
                      <span><span style={{ color: CONF_COLOR.low }}>●</span> לא בטוח</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {editMode ? (
                      <>
                        <button className="text-xs" style={{ color: '#6b7280' }}
                          onClick={() => { setEditMode(false); setEditedTitles({}); }}>ביטול</button>
                        <button className="text-xs font-semibold px-2 py-1"
                          style={{ background: '#d97706', color: '#fffef8' }}
                          onClick={handleUpdateTitles}>עדכן</button>
                      </>
                    ) : (
                      <>
                        <button className="text-xs underline" style={{ color: '#6b7280' }}
                          onClick={() => {
                            const allSelected = results.every((_, i) => selected[i] != null);
                            if (allSelected) { setSelected({}); }
                            else {
                              const s = {};
                              results.forEach((r, i) => {
                                s[i] = (r.matches.length > 0 && (r.matches[0]?.matchScore ?? 0) >= 100) ? 'catalog' : 'gemini';
                              });
                              setSelected(s);
                            }
                          }}>
                          {results.every((_, i) => selected[i] != null) ? 'בטל הכל' : 'בחר הכל'}
                        </button>
                        <button className="text-xs" style={{ color: '#6b7280' }}
                          onClick={() => setEditMode(true)} title="ערוך כותרות">✏️</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex flex-col gap-1 px-1 py-2" dir="rtl"
                  style={{ background: 'rgba(255,255,255,0.03)', borderRight: '2px solid rgba(180,130,30,0.3)' }}>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    <span style={{ color: '#d97706' }}>ימין</span> — מה זוהה בתמונה ·
                    <span style={{ color: '#d97706' }}> שמאל</span> — הספר שנמצא במאגר
                  </p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    ✏️ ערוך כותרת או מחבר ולחץ <strong style={{ color: '#9ca3af' }}>עדכן</strong> לחיפוש מחדש · ✕ הסר זיהוי שגוי
                  </p>
                </div>

                {/* Column headers */}
                <div className="flex gap-1 px-1" dir="rtl">
                  <p className="flex-1 text-xs font-semibold text-center" style={{ color: '#6b7280' }}>זוהה בתמונה</p>
                  <p className="flex-1 text-xs font-semibold text-center" style={{ color: '#6b7280' }}>נמצא ספר במאגר</p>
                  <div className="w-5 flex-shrink-0" />
                </div>

                {/* Book list */}
                <div className="flex flex-col gap-2">
                  {results.map((item, i) => (
                    <div key={i} className="flex gap-1 items-stretch">
                      <BookResultRow
                        item={item}
                        source={selected[i] ?? null}
                        onSourceChange={src => setSelected(s => ({ ...s, [i]: src }))}
                        selectedMatch={matchOverride[i]}
                        onMatchChange={m => setMatchOverride(o => ({ ...o, [i]: m }))}
                        editMode={editMode}
                        editedTitle={editedTitles[i]}
                        onTitleChange={t => setEditedTitles(e => ({ ...e, [i]: t }))}
                        editedAuthor={editedAuthors[i]}
                        onAuthorChange={t => setEditedAuthors(e => ({ ...e, [i]: t }))}
                      />
                      <button
                        className="w-5 flex-shrink-0 flex items-center justify-center text-xs transition-colors"
                        style={{ color: '#4b5563' }}
                        onClick={() => handleDismiss(i)}
                        title="הסר">✕</button>
                    </div>
                  ))}
                </div>

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
            <div className="p-5 pt-0" dir="rtl">
              <p className="text-xs mb-2" style={{ color: '#6b7280' }}>{selectedCount} ספרים נבחרו להוספה</p>
              <button
                onClick={handleAdd}
                disabled={adding || selectedCount === 0}
                className="w-full py-3 font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}>
                {adding ? 'מוסיף...' : `הוסף ${selectedCount} ספרים`}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
