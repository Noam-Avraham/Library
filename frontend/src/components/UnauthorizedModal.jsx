import { motion, AnimatePresence } from 'framer-motion';

export default function UnauthorizedModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="w-full max-w-xs shadow-2xl overflow-hidden"
            style={{ background: '#1a1040', border: '1px solid rgba(239,68,68,0.35)' }}
            dir="rtl"
          >
            <div className="px-6 pt-6 pb-2 flex flex-col items-center gap-3 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                🔒
              </div>
              <p className="font-bold text-base leading-snug" style={{ color: '#f5e6cc' }}>
                גישה מוגבלת
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                לא ניתן לבצע שינויים במאגר הנתונים ללא התחברות.
                <br />
                אם ברצונך לקבל הרשאות, צור קשר עם בעל האתר.
              </p>
            </div>

            <div className="px-6 pb-6 pt-4">
              <button
                onClick={onClose}
                className="w-full py-2.5 font-bold text-sm transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                הבנתי
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
