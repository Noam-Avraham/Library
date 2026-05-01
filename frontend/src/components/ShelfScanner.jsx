import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/index.js';
import { DEFAULT_OWNER } from '../data/config.js';
import { locationOptions } from '../data/members.js';

const OVERLAY = { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' };
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

function BookResultRow({ item, selected, onToggle, selectedMatch, onMatchChange }) {
  const { identified, matches, enriching, isDuplicate } = item;
  const best = selectedMatch ?? matches[0];
  const hasMatch = matches.length > 0;

  return (
    <div
      className="flex gap-3 p-3 cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(180,130,30,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? 'rgba(180,130,30,0.5)' : 'rgba(255,255,255,0.08)'}`,
      }}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-5 h-5 flex items-center justify-center"
          style={{
            background: selected ? '#d97706' : 'transparent',
            border: `2px solid ${selected ? '#d97706' : '#6b7280'}`,
          }}
        >
          {selected && <span className="text-white text-xs font-bold">✓</span>}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-12 h-16 overflow-hidden" style={{ background: '#2d2547' }}>
        {enriching ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#6b7280', borderTopColor: 'transparent' }} />
          </div>
        ) : best?.thumbnailUrl ? (
          <img src={best.thumbnailUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
        )}
      </div>

      {/* Info — Gemini identification is always primary */}
      <div className="flex-1 min-w-0" dir="rtl">

        {/* Gemini title — always prominent */}
        <div className="flex items-center gap-1.5">
          <ConfidenceDot confidence={identified.confidence} />
          <p className="text-sm font-semibold truncate" style={{ color: '#f5e6cc' }}>{identified.title}</p>
          {identified.language === 'en' && (
            <span className="text-xs px-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>EN</span>
          )}
        </div>

        {/* Gemini author */}
        {identified.author && (
          <p className="text-xs truncate mt-0.5" style={{ color: '#94a3b8' }}>{identified.author}</p>
        )}

        {/* Catalog status */}
        {enriching && (
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>מחפש בקטלוג...</p>
        )}
        {!enriching && hasMatch && (
          <div className="mt-1">
            <p className="text-xs" style={{ color: '#4ade80' }}>
              ✓ נמצא בקטלוג: <span className="font-medium">{best.title}</span>
            </p>
            {best.author && best.author !== identified.author && (
              <p className="text-xs" style={{ color: '#6b7280' }}>{best.author}</p>
            )}
          </div>
        )}
        {!enriching && !hasMatch && (
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>לא נמצא בקטלוג</p>
        )}

        {/* Duplicate warning */}
        {isDuplicate && (
          <p className="text-xs mt-0.5" style={{ color: '#fbbf24' }}>⚠️ כבר קיים בספרייה</p>
        )}

        {/* Match selector */}
        {!enriching && matches.length > 1 && (
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
  );
}

export default function ShelfScanner({ open, onClose, familyMembers, onBulkAdd, books = [] }) {
  const [phase, setPhase]               = useState('upload');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64]   = useState(null);
  const [mediaType, setMediaType]       = useState('image/jpeg');
  const [results, setResults]           = useState([]);
  const [selected, setSelected]         = useState({});
  const [matchOverride, setMatchOverride] = useState({});
  const [owner, setOwner]               = useState(DEFAULT_OWNER);
  const [location, setLocation]         = useState('בית');
  const [customLocation, setCustomLocation] = useState('');
  const [locations, setLocations]       = useState([]);
  const [adding, setAdding]             = useState(false);
  const [error, setError]               = useState('');
  const [dragging, setDragging]         = useState(false);
  const fileRef = useRef();

  const reset = () => {
    setPhase('upload'); setImagePreview(null); setImageBase64(null);
    setResults([]); setSelected({}); setMatchOverride({});
    setError(''); setAdding(false); setCustomLocation('');
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
      // Step 1: Gemini identifies books — show results immediately
      const identified = await api.scanIdentify(imageBase64, mediaType);
      const existingTitles = new Set(books.map(b => b.title.trim().toLowerCase()));

      const initial = identified.map(id => ({
        identified: id,
        matches: [],
        enriching: true,
        isDuplicate: existingTitles.has(id.title.trim().toLowerCase()),
      }));
      setResults(initial);

      const sel = {};
      identified.forEach((id, i) => { sel[i] = id.confidence !== 'low'; });
      setSelected(sel);
      setPhase('results');

      // Step 2: Enrich each book in background
      identified.forEach(async (id, i) => {
        try {
          const matches = await api.scanEnrich(id.title, id.author);
          const matchedTitle = (matches[0]?.title ?? id.title).trim().toLowerCase();
          setResults(prev => prev.map((r, idx) => idx !== i ? r : {
            ...r,
            matches,
            enriching: false,
            isDuplicate: existingTitles.has(matchedTitle),
          }));
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
      .filter((_, i) => selected[i])
      .map((item, i) => {
        const match = matchOverride[i] ?? item.matches[0];
        // If no API match, use what Claude identified
        const src = match ?? { title: item.identified.title, author: item.identified.author };
        return {
          title:        src.title,
          author:       src.author || '',
          translator:   src.translator || '',
          thumbnailUrl: src.thumbnailUrl || '',
          isbn:         src.isbn || '',
          genre:        src.genre || '',
          description:  src.description || '',
          owner,
          current_holder: owner,
          location: finalLocation,
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

  const enrichingCount = results.filter(r => r.enriching).length;
  const withMatch      = results.filter(r => !r.enriching && r.matches.length > 0);
  const selectedCount  = Object.values(selected).filter(Boolean).length;

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
          style={{ ...CARD_BG, position: 'relative', width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: '0 16px' }}
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
                    <select
                      value={owner}
                      onChange={e => setOwner(e.target.value)}
                      className="w-full px-3 py-2 text-sm"
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}
                    >
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
                      style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}
                    >
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                      {locations.length === 0 && <option value="בית">בית</option>}
                      <option value="__custom__">אחר...</option>
                    </select>
                    {location === '__custom__' && (
                      <input
                        autoFocus
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        placeholder="הזן מיקום..."
                        className="w-full px-3 py-2 text-sm mt-1"
                        style={{ background: '#2d2547', color: '#f5e6cc', border: '1px solid rgba(180,130,30,0.3)' }}
                      />
                    )}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
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
                  <button
                    onClick={handleScan}
                    className="w-full py-3 font-semibold text-sm transition-all"
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
              <div className="flex flex-col gap-5">

                {/* Summary */}
                <div dir="rtl" className="flex flex-col gap-1">
                  <p className="text-sm font-medium" style={{ color: '#f5e6cc' }}>
                    זוהו <strong>{results.length}</strong> ספרים
                    {enrichingCount === 0 && withMatch.length > 0 && <> — נמצאו התאמות לקטלוג עבור <strong>{withMatch.length}</strong></>}
                    {enrichingCount > 0 && <span style={{ color: '#6b7280' }}> — מחפש בקטלוג...</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
                    <span><span style={{ color: CONF_COLOR.high }}>●</span> ברור</span>
                    <span><span style={{ color: CONF_COLOR.medium }}>●</span> חלקי</span>
                    <span><span style={{ color: CONF_COLOR.low }}>●</span> לא בטוח</span>
                  </div>
                </div>

                {/* Unified book list */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-end" dir="rtl">
                    <button
                      className="text-xs underline"
                      style={{ color: '#6b7280' }}
                      onClick={() => {
                        const allOn = results.every((_, i) => selected[i]);
                        const s = {};
                        results.forEach((_, i) => { s[i] = !allOn; });
                        setSelected(s);
                      }}
                    >
                      {results.every((_, i) => selected[i]) ? 'בטל הכל' : 'בחר הכל'}
                    </button>
                  </div>
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
