import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function Timer({ duration = 90, onTimeUp, isPaused = false }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const rafRef = useRef(null);
  const hasExpiredRef = useRef(false);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Initialize global game timer on mount
    startTimeRef.current = Date.now();
    hasExpiredRef.current = false;

    const tick = () => {
      if (hasExpiredRef.current) return;

      if (isPaused) {
        if (!pausedAtRef.current) {
          pausedAtRef.current = Date.now();
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      } else if (pausedAtRef.current) {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }

      const elapsed = (Date.now() - startTimeRef.current - totalPausedMsRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        hasExpiredRef.current = true;
        onTimeUp?.();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, isPaused, onTimeUp]);

  const fraction = Math.max(0, Math.min(1, timeLeft / duration));
  const offset = circumference * (1 - fraction);

  // Dynamic light-theme color transitions
  let strokeColor = '#059669'; // Emerald-600
  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (timeLeft <= 15) {
    strokeColor = '#e11d48'; // Rose-600
    badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (timeLeft <= 35) {
    strokeColor = '#d97706'; // Amber-600
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const isUrgent = timeLeft <= 15 && timeLeft > 0;

  // Format seconds: display raw seconds (e.g., 90, 89... 1)
  const secondsDisplay = Math.ceil(timeLeft);

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className="relative inline-flex items-center justify-center bg-white rounded-full p-1 shadow-md border border-slate-200/80"
        animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
        transition={isUrgent ? { duration: 0.5, repeat: Infinity } : {}}
      >
        <svg width="88" height="88" viewBox="0 0 88 88" className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="6"
          />
          {/* Progress stroke */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke 0.25s ease',
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-black tabular-nums tracking-tighter"
            style={{ color: strokeColor }}
          >
            {secondsDisplay}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
            sec left
          </span>
        </div>
      </motion.div>

      {/* Mini status indicator */}
      <div className={`hidden sm:flex flex-col items-start px-3 py-1.5 rounded-xl border text-xs font-bold ${badgeBg}`}>
        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Clock size={12} />
          {timeLeft <= 15 ? 'Time Running Out!' : timeLeft <= 35 ? 'Clock Ticking' : 'Overall Timer'}
        </span>
        <span className="text-slate-500 font-medium text-[10px]">
          90s for whole game
        </span>
      </div>
    </div>
  );
}
