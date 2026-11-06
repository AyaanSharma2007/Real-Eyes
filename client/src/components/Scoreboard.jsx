import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, RefreshCw, Medal } from 'lucide-react';
import api from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const currentSessionId = location.state?.sessionId;

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/leaderboard');
      setLeaderboard(data);
    } catch (err) {
      setError('Unable to load leaderboard scores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 max-w-2xl mx-auto bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:text-cyan-700 hover:border-slate-300 shadow-sm transition-all"
        >
          <ArrowLeft size={16} />
          <span>Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <Trophy size={24} className="text-amber-500" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hall of Fame</h1>
        </div>

        <button
          onClick={fetchLeaderboard}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-cyan-600 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
          title="Refresh scores"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin text-cyan-600' : ''} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-cyan-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading rankings...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-4">
          <p className="text-rose-600 font-semibold">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-5 py-2 bg-slate-800 text-white font-medium rounded-xl text-sm hover:bg-slate-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <p className="text-slate-500 font-medium">No verified challenge scores yet.</p>
          <Link
            to="/"
            className="inline-block mt-4 text-sm font-bold text-cyan-600 hover:text-cyan-700"
          >
            Be the first to set a record →
          </Link>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/60"
        >
          {/* Table Header */}
          <div className="grid grid-cols-[48px_1fr_90px_100px] px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-center">Score</span>
            <span className="text-right">Date</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {leaderboard.map((entry, idx) => {
              const isCurrent = currentSessionId && (entry.sessionId === currentSessionId || entry.id === currentSessionId);
              const rank = idx + 1;

              return (
                <div
                  key={entry.sessionId || entry.id || idx}
                  className={`grid grid-cols-[48px_1fr_90px_100px] px-5 py-3.5 items-center transition-colors ${
                    isCurrent
                      ? 'bg-cyan-50/70 border-l-4 border-l-cyan-600 font-semibold'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <span className="text-base font-black">
                    {rank <= 3 ? (
                      <span>{MEDALS[rank - 1]}</span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 font-mono">#{rank}</span>
                    )}
                  </span>

                  <span className="truncate text-slate-800 text-sm font-semibold">
                    {entry.playerName}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-cyan-600 bg-cyan-100/70 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </span>

                  <div className="text-center">
                    <span className="text-sm font-black text-slate-900">{entry.score}</span>
                    <span className="text-xs font-bold text-slate-400">/15</span>
                  </div>

                  <span className="text-right text-xs text-slate-400 font-medium">
                    {entry.date || entry.completedAt
                      ? new Date(entry.date || entry.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
