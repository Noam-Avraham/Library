import { motion } from 'framer-motion';
import { LIBRARY } from '../data/config.js';

export default function Header({ onAddClick, onScanClick, onNextBookClick, activeTab, onTabChange }) {
  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 25%, #1e3a5f 65%, #0f2744 100%)',
        borderBottom: '3px solid #b45309',
      }}
    >
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">

        {/* Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.4)' }}
          >
            📚
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold leading-tight truncate" style={{ color: '#f5e6cc', letterSpacing: '0.02em' }}>
              {LIBRARY.name}
            </h1>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNextBookClick}
            className="font-semibold px-2 sm:px-4 py-2 sm:py-2.5 shadow-lg transition-colors text-xs sm:text-sm"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.5)', color: '#f5e6cc' }}
          >
            <span className="hidden sm:inline">מה הספר הבא שלי?</span>
            <span className="sm:hidden">הספר הבא</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onScanClick}
            className="font-semibold px-2 sm:px-4 py-2 sm:py-2.5 shadow-lg transition-colors text-xs sm:text-sm"
            style={{ background: 'rgba(180,130,30,0.2)', border: '1px solid rgba(180,130,30,0.5)', color: '#f5e6cc' }}
          >
            <span className="hidden sm:inline">📷 סרוק מדף</span>
            <span className="sm:hidden">📷</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAddClick}
            className="font-semibold px-3 sm:px-5 py-2 sm:py-2.5 shadow-lg transition-colors text-xs sm:text-sm"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}
          >
            <span className="hidden sm:inline">+ הוסף ספר</span>
            <span className="sm:hidden text-lg leading-none">+</span>
          </motion.button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 flex gap-0 sm:gap-1 pb-0 overflow-x-auto">
        {[
          { id: 'library', label: 'הספרייה' },
          { id: 'reviews', label: 'ביקורות' },
          { id: 'stats',   label: 'סטטיסטיקות' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-4 sm:px-5 py-2 text-sm font-medium transition-all whitespace-nowrap flex-shrink-0"
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
