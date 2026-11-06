import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function Timer({ duration = 5, onTimeUp, isPaused = false, resetKey }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const hasExpiredRef = useRef(false);

  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Reset on each round
    setTimeLeft(duration);
    hasExpiredRef.current = false;
    startTimeRef.current = Date.now();

    const tick = () => {
      if (isPaused || hasExpiredRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
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
  }, [resetKey, duration, isPaused, onTimeUp]);

  const fraction = timeLeft / duration;
  const offset = circumference * (1 - fraction);

  // Dynamic light-theme color transitions
  let strokeColor = '#059669'; // Emerald-600
  if (timeLeft <= 1.8) strokeColor = '#e11d48'; // Rose-600
  else if (timeLeft <= 3.2) strokeColor = '#d97706'; // Amber-600

  const isUrgent = timeLeft <= 1.8 && timeLeft > 0;

  return (
    <motion.div
      className="relative inline-flex items-center justify-center bg-white rounded-full p-1 shadow-md border border-slate-200/80"
      animate={isUrgent ? { scale: [1, 1.06, 1] } : {}}
      transition={isUrgent ? { duration: 0.4, repeat: Infinity } : {}}
    >
      <svg width="84" height="84" viewBox="0 0 84 84" className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="6"
        />
        {/* Progress stroke */}
        <circle
          cx="42"
          cy="42"
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
          {Math.ceil(timeLeft)}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
          sec
        </span>
      </div>
    </motion.div>
  );
}
