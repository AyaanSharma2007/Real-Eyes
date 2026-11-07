import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../api';

export default function PasswordGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('realeyes_authenticated') === 'true';
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setIsCheckingStatus(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const { data } = await api.get('/auth/status');
        if (!data.required) {
          sessionStorage.setItem('realeyes_authenticated', 'true');
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Fallback: If status check fails, still allow attempting login
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, [isAuthenticated]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setError('Please enter the access passcode');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data } = await api.post('/auth/verify', { password: trimmed });
      if (data.success) {
        sessionStorage.setItem('realeyes_authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Incorrect passcode. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect passcode. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Subtle light ambient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-200/35 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-200/35 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-200/80">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 mb-5"
            >
              <Lock size={32} />
            </motion.div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
              Protected Access
            </h1>
            <p className="text-slate-600 font-medium text-sm">
              Please enter the site passcode to access the RealEyes platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Access Passcode
              </label>
              <div className="relative">
                <input
                  id="passcode"
                  type="password"
                  placeholder="Enter passcode..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium text-base focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition-all duration-200"
                  autoFocus
                />
                <KeyRound
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-600 text-sm font-medium bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 disabled:opacity-60 text-white font-black text-base rounded-xl shadow-lg shadow-cyan-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <span>Unlock RealEyes</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <ShieldCheck size={14} className="text-cyan-600" />
              Secure Pattern Recognition Test
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

