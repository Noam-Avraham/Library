import { useState } from 'react';
import { motion } from 'framer-motion';
import { LIBRARY } from '../data/config.js';

export default function LoginScreen({ onLogin, onGuest }) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'סיסמה שגויה');
      } else {
        sessionStorage.setItem('auth_token', data.token);
        onLogin(data.token);
      }
    } catch {
      setError('שגיאת חיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 25%, #1e3a5f 65%, #0f2744 100%)' }}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-xs sm:max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-5xl sm:text-6xl mb-3">📚</div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: '#f5e6cc', letterSpacing: '0.02em' }}>
            {LIBRARY.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>ברוכים הבאים לספרייה</p>
        </div>

        {/* Password form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 text-right rounded-lg outline-none text-base placeholder-slate-500 focus:ring-2"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#f5e6cc',
            }}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 font-bold text-base rounded-lg shadow-lg transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fffef8' }}
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-xs" style={{ color: '#475569', background: 'transparent' }}>או</span>
          </div>
        </div>

        {/* Guest */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onGuest}
          className="w-full py-3 font-medium text-sm rounded-lg transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8',
          }}
        >
          כניסה ללא סיסמה
        </motion.button>
        <p className="text-center text-xs mt-2" style={{ color: '#475569' }}>
          ללא סיסמה לא ניתן להשתמש בתכונות AI
        </p>
      </motion.div>
    </div>
  );
}
