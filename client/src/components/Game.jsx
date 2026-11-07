import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers } from 'lucide-react';
import api from '../api';
import Timer from './Timer';
import ImageCard from './ImageCard';

const TOTAL_ROUNDS = 20;
const ROUND_DURATION = 5;

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = location.state?.sessionId || sessionStorage.getItem('realeyes_sessionId');
  const playerName = location.state?.playerName || sessionStorage.getItem('realeyes_playerName') || 'Player';

  const [currentRound, setCurrentRound] = useState(1);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError] = useState(null);

  // Score tracked internally for navigation state, never shown to user during gameplay
  const internalScoreRef = useRef(0);

  // Prevent double-submit
  const answeredRef = useRef(false);
  const roundStartTimeRef = useRef(null);

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
    }
  }, [sessionId, navigate]);

  // Submit answer seamlessly without revealing feedback or running score
  const submitAnswer = useCallback(async (answer) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setTimerActive(false);

    const timeTakenMs = roundStartTimeRef.current
      ? Date.now() - roundStartTimeRef.current
      : ROUND_DURATION * 1000;

    try {
      const { data } = await api.post('/game/answer', {
        sessionId,
        round: currentRound,
        answer: answer || 'timeout',
        timeTakenMs,
      });

      if (data.correct) {
        internalScoreRef.current += 1;
      }

      // Smooth brief transition to next round (no feedback popup)
      setTimeout(() => {
        if (currentRound >= TOTAL_ROUNDS) {
          navigate('/result', {
            state: {
              sessionId,
              finalScore: internalScoreRef.current,
            },
          });
        } else {
          setCurrentRound((r) => r + 1);
        }
      }, 150);
    } catch (err) {
      // In case of error, still advance if round is finished or retry
      if (currentRound >= TOTAL_ROUNDS) {
        navigate('/result', {
          state: {
            sessionId,
            finalScore: internalScoreRef.current,
          },
        });
      } else {
        setCurrentRound((r) => r + 1);
      }
    }
  }, [sessionId, currentRound, navigate]);

  // Fetch round image
  const fetchRound = useCallback(async (round) => {
    setIsLoading(true);
    setTimerActive(false);
    setImageUrl(null);
    answeredRef.current = false;
    setError(null);

    try {
      const { data } = await api.get(`/game/round/${sessionId}/${round}`);
      setImageUrl(data.imageUrl);
      setIsLoading(false);
    } catch (err) {
      setError('Unable to load photo. Tap to retry.');
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchRound(currentRound);
    }
  }, [sessionId, currentRound, fetchRound]);

  // When image finishes loading in the browser
  const handleImageLoad = useCallback(() => {
    setTimerActive(true);
    roundStartTimeRef.current = Date.now();
  }, []);

  // Keyboard shortcuts: Left Arrow / A / 1 for Real, Right Arrow / D / 2 for Fake
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!timerActive || answeredRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === '1' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        submitAnswer('real');
      } else if (e.key === 'ArrowRight' || e.key === '2' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        submitAnswer('fake');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timerActive, submitAnswer]);

  // Timer callback (timeout)
  const handleTimeUp = useCallback(() => {
    submitAnswer('timeout');
  }, [submitAnswer]);

  if (!sessionId) return null;

  const imagesRemaining = TOTAL_ROUNDS - currentRound + 1;
  const progressPercent = ((currentRound - 1) / TOTAL_ROUNDS) * 100;

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 py-5 max-w-xl mx-auto bg-slate-50 relative selection:bg-none">
      {/* Top Header Bar — ONLY Player Name & Images Remaining */}
      <header className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">PLAYER</span>
            <span className="text-sm font-black text-slate-800">{playerName}</span>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200/90 shadow-sm">
            <Layers size={16} className="text-cyan-600" />
            <span className="text-sm font-black text-slate-900">{imagesRemaining}</span>
            <span className="text-xs font-semibold text-slate-500">
              {imagesRemaining === 1 ? 'image left' : 'images left'}
            </span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </header>

      {/* Center Zone: Timer + Image */}
      <main className="flex-1 flex flex-col items-center justify-center my-4 gap-4">
        {/* Timer — Remaining Time */}
        <div className="flex-shrink-0">
          <Timer
            duration={ROUND_DURATION}
            onTimeUp={handleTimeUp}
            isPaused={!timerActive}
            resetKey={currentRound}
          />
        </div>

        {/* Image Card */}
        {error ? (
          <button
            onClick={() => fetchRound(currentRound)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw size={16} />
            {error}
          </button>
        ) : (
          <AnimatePresence mode="wait">
            <ImageCard
              key={currentRound}
              imageUrl={imageUrl}
              round={currentRound}
              totalRounds={TOTAL_ROUNDS}
              isLoading={isLoading}
              onImageLoad={handleImageLoad}
            />
          </AnimatePresence>
        )}
      </main>

      {/* Answer Controls */}
      <footer className="w-full pb-3">
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => submitAnswer('real')}
            disabled={!timerActive || answeredRef.current}
            className="py-4 px-4 sm:px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none group relative"
          >
            <span>🌿</span>
            <span>Real Image</span>
            <span className="hidden sm:inline-block ml-1 text-[11px] font-bold bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-100">
              ←
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => submitAnswer('fake')}
            disabled={!timerActive || answeredRef.current}
            className="py-4 px-4 sm:px-6 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-rose-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none group relative"
          >
            <span>🤖</span>
            <span>AI Generated</span>
            <span className="hidden sm:inline-block ml-1 text-[11px] font-bold bg-rose-700/60 px-1.5 py-0.5 rounded text-rose-100">
              →
            </span>
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
