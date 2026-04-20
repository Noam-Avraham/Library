import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/index.js';

// ── Bar chart row ─────────────────────────────────────────────────────────────
function StatBar({ label, count, max, color = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-1.5"
    >
      <span className="text-sm text-gray-700 w-28 truncate text-right flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-sm font-bold text-gray-800 w-8 text-center flex-shrink-0">{count}</span>
    </motion.div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'from-indigo-500 to-indigo-700' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${color}  p-5 text-white shadow-lg`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium opacity-90 mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </motion.div>
  );
}

// ── Mini book row ─────────────────────────────────────────────────────────────
function MiniBookRow({ book }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-amber-100 last:border-0">
      <div className="w-8 h-11  overflow-hidden bg-gray-100 flex-shrink-0">
        {book.thumbnailUrl
          ? <img src={book.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          : <div className="book-placeholder w-full h-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{book.title?.charAt(0)}</span>
            </div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{book.title}</p>
        <p className="text-xs text-gray-500 truncate">{book.author}</p>
      </div>
      <span className="text-xs text-indigo-600 font-medium flex-shrink-0">{book.current_holder || book.owner}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full"
        />
        <span className="mr-3 text-gray-500 text-sm">טוען נתונים...</span>
      </div>
    );
  }

  if (!stats) return null;

  const maxOwner    = Math.max(...(stats.byOwner?.map(r => r.count) || [1]));
  const maxLocation = Math.max(...(stats.byLocation?.map(r => r.count) || [1]));
  const maxGenre    = Math.max(...(stats.byGenre?.map(r => r.count) || [1]));

  const available = stats.byStatus?.find(r => r.status === 'זמין')?.count || 0;
  const borrowed  = stats.byStatus?.find(r => r.status === 'מושאל')?.count || 0;
  const wishlist  = stats.byStatus?.find(r => r.status === 'רשימת משאלות')?.count || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="סה״כ ספרים"      value={stats.total}   color="from-indigo-600 to-indigo-800" />
        <StatCard label="זמינים"           value={available}     color="from-emerald-500 to-emerald-700" />
        <StatCard label="מושאלים"          value={borrowed}      color="from-orange-500 to-orange-700" />
        <StatCard label="רשימת משאלות"    value={wishlist}      color="from-sky-500 to-sky-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* By owner */}
        <div className="library-card  p-5">
          <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
            ספרים לפי בעלים
          </h3>
          <div className="space-y-0.5">
            {stats.byOwner?.map(r => (
              <StatBar key={r.owner} label={r.owner || 'ללא'} count={r.count} max={maxOwner} color="bg-indigo-500" />
            ))}
          </div>
        </div>

        {/* By location */}
        <div className="library-card  p-5">
          <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
            ספרים לפי מיקום
          </h3>
          <div className="space-y-0.5">
            {stats.byLocation?.map(r => (
              <StatBar key={r.location} label={r.location || 'ללא'} count={r.count} max={maxLocation} color="bg-amber-500" />
            ))}
          </div>
        </div>

        {/* By genre */}
        {stats.byGenre?.length > 0 && (
          <div className="library-card  p-5">
            <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              ספרים לפי ז׳אנר
            </h3>
            <div className="space-y-0.5">
              {stats.byGenre?.map(r => (
                <StatBar key={r.genre} label={r.genre || 'ללא'} count={r.count} max={maxGenre} color="bg-sky-500" />
              ))}
            </div>
          </div>
        )}

        {/* On loan */}
        {stats.onLoan?.length > 0 && (
          <div className="library-card  p-5">
            <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              ספרים מושאלים כעת
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-semibold">{stats.onLoan.length}</span>
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {stats.onLoan.map(b => <MiniBookRow key={b.id} book={b} />)}
            </div>
          </div>
        )}

        {/* Wishlist */}
        {stats.wishlist?.length > 0 && (
          <div className="library-card  p-5">
            <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
              רשימת משאלות
              <span className="bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full font-semibold">{stats.wishlist.length}</span>
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {stats.wishlist.map(b => <MiniBookRow key={b.id} book={b} />)}
            </div>
          </div>
        )}

        {/* Recently added */}
        <div className="library-card  p-5">
          <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
            <span>🆕</span> נוספו לאחרונה
          </h3>
          <div>
            {stats.recent?.map(b => <MiniBookRow key={b.id} book={b} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
