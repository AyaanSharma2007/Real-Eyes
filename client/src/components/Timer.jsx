import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function Timer({ duration = 3, resetKey, onTimeUp, isPaused = false }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const rafRef = useRef(null);
  const hasExpiredRef = useRef(false);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Reset timer on new round / resetKey
    startTimeRef.current = Date.now();
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;
    hasExpiredRef.current = false;
    setTimeLeft(duration);

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
  }, [duration, resetKey, isPaused, onTimeUp]);

  const fraction = Math.max(0, Math.min(1, timeLeft / duration));
  const offset = circumference * (1 - fraction);

  // Dynamic color transitions for 3s countdown
  let strokeColor = '#06b6d4'; // Cyan-500
  let badgeColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
  if (timeLeft <= 1.0) {
    strokeColor = '#e11d48'; // Rose-600
    badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (timeLeft <= 2.0) {
    strokeColor = '#d97706'; // Amber-600
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  const isUrgent = timeLeft <= 1.0 && timeLeft > 0;
  const displayVal = Math.ceil(timeLeft);

  return (
    <div className="flex items-center gap-3">
      <motion.div
        className="relative inline-flex items-center justify-center bg-white rounded-full p-1 shadow-md border border-slate-200/80"
        animate={isUrgent ? { scale: [1, 1.08, 1] } : {}}
        transition={isUrgent ? { duration: 0.35, repeat: Infinity } : {}}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="5"
          />
          {/* Progress stroke */}
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke 0.2s ease',
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-black tabular-nums tracking-tighter"
            style={{ color: strokeColor }}
          >
            {displayVal}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
            sec
          </span>
        </div>
      </motion.div>

      {/* Mini status indicator */}
      <div className={`hidden sm:flex flex-col items-start px-3 py-1.5 rounded-xl border text-xs font-bold ${badgeColor}`}>
        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
          <Zap size={12} />
          {timeLeft <= 1.0 ? 'Quick! Time Up!' : 'Reaction Speed'}
        </span>
        <span className="text-slate-500 font-medium text-[10px]">
          3s per challenge
        </span>
      </div>
    </div>
  );
}
