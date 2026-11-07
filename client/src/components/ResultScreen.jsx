import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Trophy, Check, X, Clock, Award } from 'lucide-react';
import api from '../api';

const TOTAL_ROUNDS = 20;

function getRating(score) {
  if (score === 20) return { emoji: '🔥', title: 'Perfection!', text: 'You possess superhuman pattern detection!' };
  if (score >= 17) return { emoji: '🎯', title: 'Eagle Eye!', text: "Exceptional accuracy. Almost impossible to deceive!" };
  if (score >= 13) return { emoji: '👀', title: 'Sharp Mind!', text: 'Strong instinct. You caught most of the subtle AI tells.' };
  if (score >= 8)  return { emoji: '🤖', title: 'Tricked by AI!', text: 'Generative models got the upper hand this time.' };
  return { emoji: '😵', title: 'AI Overlord!', text: 'Are you sure you aren’t generating these yourself?' };
}

export default function ResultScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = location.state?.sessionId || sessionStorage.getItem('realeyes_sessionId');
  const passedScore = location.state?.finalScore;

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
      return;
    }

    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/game/result/${sessionId}`);
        setResult(data);
      } catch (err) {
        setError('Failed to retrieve game evaluation.');
      }
    };

    fetchResult();
  }, [sessionId, navigate]);

  if (!sessionId) return null;

  if (error && passedScore === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
        <div className="text-center space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm">
          <p className="text-rose-600 font-semibold">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-medium transition-colors cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Resolve the authoritative score from API response or passed state
  const finalScore = result?.score !== undefined ? result.score : (passedScore !== undefined ? passedScore : 0);
  const rating = getRating(finalScore);
  const percentage = Math.round((finalScore / TOTAL_ROUNDS) * 100);
  const roundList = result?.rounds || result?.answers || [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-8 sm:py-12 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Score Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/60 text-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="text-6xl mb-4 select-none"
          >
            {rating.emoji}
          </motion.div>

          <h2 className="text-2xl font-black text-slate-900 mb-1">
            {rating.title}
          </h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            {rating.text}
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl py-5 px-4 mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-6xl font-black bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent">
                {finalScore}
              </span>
              <span className="text-2xl font-bold text-slate-400">/{TOTAL_ROUNDS}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
              {percentage}% Accuracy Rating
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {result?.totalTimeMs !== undefined && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full">
                <Clock size={13} className="text-cyan-600" />
                <span>Total Time: {(result.totalTimeMs / 1000).toFixed(1)}s</span>
              </div>
            )}

            {result?.leaderboardPosition && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full">
                <Award size={14} className="text-amber-500" />
                Rank #{result.leaderboardPosition} on Leaderboard
              </div>
            )}
          </div>
        </div>

        {/* Round Breakdown */}
        {roundList.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Round-by-Round Breakdown</h3>
              <span className="text-xs font-semibold text-slate-400">{roundList.length} Rounds</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {roundList.map((r, i) => {
                const isCorrect = r.isCorrect ?? r.correct;
                const timedOut = r.timedOut || r.playerAnswer === 'timeout';

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 font-mono w-5">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 capitalize">
                        Actual: <span className="font-bold">{r.correctAnswer || 'N/A'}</span>
                      </span>
                    </div>

                    <div>
                      {timedOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock size={11} />
                          Timeout
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check size={11} strokeWidth={3} />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <X size={11} strokeWidth={3} />
                          Wrong
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={18} />
            Play Again
          </button>

          <Link
            to="/leaderboard"
            className="w-full py-3 px-6 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-base rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={18} className="text-amber-500" />
            View Leaderboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
