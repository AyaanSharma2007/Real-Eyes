import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, ShieldCheck, Sparkles, Image as ImageIcon, BookOpen } from 'lucide-react';
import api from '../api';
import RulebookModal from './RulebookModal';

export default function StartScreen() {
  const [playerName, setPlayerName] = useState('');
  const [showRulebook, setShowRulebook] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNameSubmit = (e) => {
    e.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError('Please enter your name to start');
      return;
    }
    setError('');
    setShowRulebook(true);
  };

  const handleStartGame = async () => {
    const trimmed = playerName.trim();
    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.post('/game/start', { playerName: trimmed });
      sessionStorage.setItem('realeyes_sessionId', data.sessionId);
      sessionStorage.setItem('realeyes_playerName', trimmed);
      navigate('/game', { state: { sessionId: data.sessionId, playerName: trimmed } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start game. Please try again.');
      setIsLoading(false);
      setShowRulebook(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Subtle light ambient glow circles */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 w-[450px] h-[450px] bg-violet-200/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Rulebook Modal */}
      <AnimatePresence>
        {showRulebook && (
          <RulebookModal
            playerName={playerName.trim()}
            onConfirm={handleStartGame}
            onBack={() => setShowRulebook(false)}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-200/60">
          {/* Logo & Headline */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 mb-5"
            >
              <span className="text-4xl select-none">👁️</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">
              Real<span className="bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">Eyes</span>
            </h1>
            <p className="text-slate-600 font-medium text-base">
              Can you tell authentic reality from AI?
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Player Name
              </label>
              <input
                id="playerName"
                type="text"
                placeholder="e.g. Alex, Maya..."
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (error) setError('');
                }}
                maxLength={24}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-medium text-base focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 transition-all duration-200"
                autoFocus
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-rose-600 text-sm font-medium bg-rose-50 border border-rose-200 rounded-lg p-2.5"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-base rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 cursor-pointer"
            >
              <span>Continue to Briefing</span>
              <ArrowRight size={18} />
            </motion.button>
          </form>

          {/* Leaderboard CTA */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-cyan-700 transition-colors"
            >
              <Trophy size={16} className="text-amber-500" />
              View Global Leaderboard
            </Link>
          </div>
        </div>

        {/* Game Rules / Badges */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-3 shadow-sm">
            <p className="text-lg font-black text-slate-800">20</p>
            <p className="text-xs text-slate-500 font-medium">Images</p>
          </div>
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-3 shadow-sm">
            <p className="text-lg font-black text-cyan-600">5s</p>
            <p className="text-xs text-slate-500 font-medium">Per Photo</p>
          </div>
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-3 shadow-sm">
            <p className="text-lg font-black text-violet-600">Speed</p>
            <p className="text-xs text-slate-500 font-medium">Rankings</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
