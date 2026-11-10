import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../api';
import Timer from './Timer';
import ImageCard from './ImageCard';

const TOTAL_ROUNDS = 25;
const ROUND_DURATION = 3; // 3 seconds per photo

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = location.state?.sessionId || sessionStorage.getItem('realeyes_sessionId');
  const playerName = location.state?.playerName || sessionStorage.getItem('realeyes_playerName') || 'Player';

  const [currentRound, setCurrentRound] = useState(1);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);

  // Score tracked internally for navigation state, never shown to user during gameplay
  const internalScoreRef = useRef(0);

  // Prevent double-submit per card & game over lock
  const answeredRef = useRef(false);
  const isGameEndedRef = useRef(false);
  const roundStartTimeRef = useRef(null);
  const totalTimeTakenMsRef = useRef(0);

  // In-memory image cache to ensure 0ms latency transitions
  const preloadedImagesRef = useRef(new Map());

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
    }
  }, [sessionId, navigate]);

  // Aggressive multi-image prefetching
  const prefetchImagesAhead = useCallback((startRound, count = 4) => {
    if (!sessionId) return;
    for (let r = startRound; r <= Math.min(TOTAL_ROUNDS, startRound + count); r++) {
      const url = `/api/game/image/${sessionId}/${r}`;
      if (!preloadedImagesRef.current.has(url)) {
        const img = new Image();
        img.src = url;
        preloadedImagesRef.current.set(url, img);
      }
    }
  }, [sessionId]);

  // Initial load: prefetch first 6 images immediately
  useEffect(() => {
    if (sessionId) {
      prefetchImagesAhead(1, 6);
    }
  }, [sessionId, prefetchImagesAhead]);

  // Advance to round
  const loadRound = useCallback((round) => {
    answeredRef.current = false;
    setSwipeDirection(null);
    setError(null);
    setIsLoading(true);

    const targetUrl = `/api/game/image/${sessionId}/${round}`;
    setImageUrl(targetUrl);

    // Prefetch upcoming images ahead
    prefetchImagesAhead(round + 1, 4);
  }, [sessionId, prefetchImagesAhead]);

  useEffect(() => {
    if (sessionId) {
      loadRound(currentRound);
    }
  }, [sessionId, currentRound, loadRound]);

  // When image loads in browser
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    roundStartTimeRef.current = Date.now();
  }, []);

  // Submit answer
  const handleAnswer = useCallback((choice) => {
    if (answeredRef.current || isGameEndedRef.current) return;
    answeredRef.current = true;

    // Trigger swipe animation (left for real, right for fake)
    const isTimeout = choice === 'timeout';
    if (!isTimeout) {
      const direction = choice === 'real' ? 'left' : 'right';
      setSwipeDirection(direction);
    }

    const now = Date.now();
    const roundDuration = roundStartTimeRef.current
      ? Math.min(ROUND_DURATION * 1000, now - roundStartTimeRef.current)
      : ROUND_DURATION * 1000;

    totalTimeTakenMsRef.current += roundDuration;

    // Submit answer to server in background
    api.post('/game/answer', {
      sessionId,
      round: currentRound,
      answer: choice,
      timeTakenMs: roundDuration,
    }).then(({ data }) => {
      if (data.correct) {
        internalScoreRef.current += 1;
      }
    }).catch(() => {});

    // Brief timeout (~180ms) for swipe animation before advancing
    setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        isGameEndedRef.current = true;
        navigate('/result', {
          state: {
            sessionId,
            finalScore: internalScoreRef.current,
            totalTimeMs: totalTimeTakenMsRef.current,
          },
        });
      } else {
        setSwipeDirection(null);
        setCurrentRound((r) => r + 1);
      }
    }, isTimeout ? 50 : 180);
  }, [sessionId, currentRound, navigate]);

  // Handle 3-second round timeout
  const handleTimeUp = useCallback(() => {
    if (answeredRef.current || isGameEndedRef.current || isLoading) return;
    handleAnswer('timeout');
  }, [handleAnswer, isLoading]);

  // Keyboard controls: Left Arrow / A / 1 for Real, Right Arrow / D / 2 for Fake
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (answeredRef.current || isGameEndedRef.current || isLoading) return;
      if (e.key === 'ArrowLeft' || e.key === '1' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleAnswer('real');
      } else if (e.key === 'ArrowRight' || e.key === '2' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleAnswer('fake');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer, isLoading]);

  if (!sessionId) return null;

  const imagesRemaining = TOTAL_ROUNDS - currentRound + 1;
  const progressPercent = ((currentRound - 1) / TOTAL_ROUNDS) * 100;

  return (
    <div className="min-h-screen flex flex-col justify-between px-3 sm:px-4 py-4 sm:py-5 max-w-2xl mx-auto bg-slate-50 relative selection:bg-none">
      {/* Top Header Bar — Player Name & Images Remaining */}
      <header className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">PLAYER</span>
            <span className="text-sm font-black text-slate-800">{playerName}</span>
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200/90 shadow-sm">
            <Layers size={16} className="text-cyan-600" />
            <span className="text-sm font-black text-slate-900">{imagesRemaining}</span>
            <span className="text-xs font-semibold text-slate-500">
              {imagesRemaining === 1 ? 'left' : 'remaining'}
            </span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </header>

      {/* Center Zone: 3s Countdown Timer + Image Card with Arrow Controls */}
      <main className="flex-1 flex flex-col items-center justify-center my-3 gap-3 sm:gap-4">
        {/* 3s Per-Round Countdown Timer */}
        <div className="flex-shrink-0">
          <Timer
            key={currentRound}
            duration={ROUND_DURATION}
            resetKey={currentRound}
            onTimeUp={handleTimeUp}
            isPaused={isLoading}
          />
        </div>

        {/* Image Card with Flanking Arrow Keys & Swipe Animation */}
        {error ? (
          <button
            onClick={() => loadRound(currentRound)}
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
              swipeDirection={swipeDirection}
              onSwipeLeft={() => handleAnswer('real')}
              onSwipeRight={() => handleAnswer('fake')}
              isActionDisabled={answeredRef.current || isGameEndedRef.current}
            />
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Answer Controls */}
      <footer className="w-full pb-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleAnswer('real')}
            disabled={answeredRef.current || isGameEndedRef.current || isLoading}
            className="py-3.5 sm:py-4 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none group"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
            <span>Real Image</span>
            <span className="hidden sm:inline-block ml-1 text-[11px] font-bold bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-100">
              ← Left
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleAnswer('fake')}
            disabled={answeredRef.current || isGameEndedRef.current || isLoading}
            className="py-3.5 sm:py-4 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-rose-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed select-none group"
          >
            <span>AI Generated</span>
            <ArrowRight size={18} className="stroke-[2.5]" />
            <span className="hidden sm:inline-block ml-1 text-[11px] font-bold bg-rose-700/60 px-1.5 py-0.5 rounded text-rose-100">
              Right →
            </span>
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
