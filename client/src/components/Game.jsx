import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Layers, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import api from '../api';
import Timer from './Timer';
import ImageCard from './ImageCard';

const TOTAL_ROUNDS = 25;
const GAME_DURATION = 90; // 90 seconds total for whole game

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = location.state?.sessionId || sessionStorage.getItem('realeyes_sessionId');
  const playerName = location.state?.playerName || sessionStorage.getItem('realeyes_playerName') || 'Player';

  const [currentRound, setCurrentRound] = useState(1);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);

  // Score tracked internally for navigation state, never shown to user during gameplay
  const internalScoreRef = useRef(0);

  // Prevent double-submit per card & game over lock
  const answeredRef = useRef(false);
  const isGameEndedRef = useRef(false);
  const gameStartTimeRef = useRef(null);
  const roundStartTimeRef = useRef(null);

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
    }
  }, [sessionId, navigate]);

  // Submit answer with animated card swipe
  const handleAnswer = useCallback((choice) => {
    if (answeredRef.current || isGameEndedRef.current) return;
    answeredRef.current = true;

    // Trigger swipe animation (left for real, right for fake)
    const direction = choice === 'real' ? 'left' : 'right';
    setSwipeDirection(direction);

    const now = Date.now();
    const roundDuration = roundStartTimeRef.current ? (now - roundStartTimeRef.current) : 1000;
    const totalElapsed = gameStartTimeRef.current ? (now - gameStartTimeRef.current) : 0;

    // Submit answer to server in parallel
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

    // Brief timeout (~200ms) for crisp swipe animation before advancing
    setTimeout(() => {
      if (currentRound >= TOTAL_ROUNDS) {
        isGameEndedRef.current = true;
        navigate('/result', {
          state: {
            sessionId,
            finalScore: internalScoreRef.current,
            totalTimeMs: totalElapsed,
          },
        });
      } else {
        setSwipeDirection(null);
        setCurrentRound((r) => r + 1);
      }
    }, 200);
  }, [sessionId, currentRound, navigate]);

  // Fetch current round image
  const fetchRound = useCallback(async (round) => {
    setIsLoading(true);
    setImageUrl(null);
    answeredRef.current = false;
    setSwipeDirection(null);
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

  // Preload next image for instant subsequent round transitions
  useEffect(() => {
    if (sessionId && currentRound < TOTAL_ROUNDS) {
      const nextRound = currentRound + 1;
      api.get(`/game/round/${sessionId}/${nextRound}`)
        .then(({ data }) => {
          if (data?.imageUrl) {
            const preloader = new Image();
            preloader.src = data.imageUrl;
          }
        })
        .catch(() => {});
    }
  }, [sessionId, currentRound]);

  // When image finishes loading in the browser
  const handleImageLoad = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      gameStartTimeRef.current = Date.now();
    }
    roundStartTimeRef.current = Date.now();
  }, [gameStarted]);

  // Global 90s Game Timeout
  const handleGameTimeUp = useCallback(() => {
    if (isGameEndedRef.current) return;
    isGameEndedRef.current = true;
    answeredRef.current = true;

    const totalElapsed = GAME_DURATION * 1000;

    navigate('/result', {
      state: {
        sessionId,
        finalScore: internalScoreRef.current,
        totalTimeMs: totalElapsed,
        timedOutGlobal: true,
      },
    });
  }, [sessionId, navigate]);

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
            transition={{ duration: 0.25 }}
          />
        </div>
      </header>

      {/* Center Zone: 90s Global Timer + Image Card with Arrow Controls */}
      <main className="flex-1 flex flex-col items-center justify-center my-3 gap-3 sm:gap-4">
        {/* Global 90s Game Timer (runs continuously for whole game) */}
        <div className="flex-shrink-0">
          <Timer
            duration={GAME_DURATION}
            onTimeUp={handleGameTimeUp}
            isPaused={!gameStarted}
          />
        </div>

        {/* Image Card with Flanking Arrow Keys & Swipe Animation */}
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
