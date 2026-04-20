import { motion } from 'framer-motion';
import { LIBRARY } from '../data/config.js';

export default function Header({ onAddClick, onScanClick, onNextBookClick, bookCount, activeTab, onTabChange }) {
  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 25%, #1e3a5f 65%, #0f2744 100%)',
        borderBottom: '3px solid #b45309',
      }}
    >
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo + Title */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12  flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.4)' }}
          >
            📚
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: '#f5e6cc', letterSpacing: '0.02em' }}>
              {LIBRARY.name}
            </h1>
            <p className="text-xs font-light" style={{ color: '#94a3b8' }}>
              {bookCount > 0 ? `${bookCount} ספרים באוסף` : LIBRARY.subtitle}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNextBookClick}
            className="flex items-center gap-2 font-semibold px-4 py-2.5 shadow-lg transition-colors text-sm"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.5)', color: '#f5e6cc' }}
          >
            <span>מה הספר הבא שלי?</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onScanClick}
            className="flex items-center gap-2 font-semibold px-4 py-2.5  shadow-lg transition-colors text-sm"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.5)', color: '#f5e6cc' }}
          >
            <span>📷</span>
            <span>סרוק מדף</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAddClick}
            className="flex items-center gap-2 font-semibold px-5 py-2.5  shadow-lg transition-colors text-sm"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}
          >
            <span className="text-lg leading-none">+</span>
            <span>הוסף ספר</span>
          </motion.button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
        {[
          { id: 'library', label: '📖 הספרייה' },
          { id: 'reviews', label: '⭐ ביקורות' },
          { id: 'stats',   label: '📊 סטטיסטיקות' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-5 py-2 text-sm font-medium -t-lg transition-all"
            style={activeTab === tab.id
              ? { background: '#f5e6cc', color: '#1a1040', fontWeight: '700' }
              : { color: '#94a3b8', background: 'transparent' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
