import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function Feedback({ show, isCorrect, correctAnswer }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
        >
          <div
            className={`flex flex-col items-center gap-2.5 px-8 py-6 rounded-3xl backdrop-blur-xl border-2 shadow-2xl ${
              isCorrect
                ? 'bg-emerald-50/95 border-emerald-400 text-emerald-950 shadow-emerald-500/20'
                : 'bg-rose-50/95 border-rose-400 text-rose-950 shadow-rose-500/20'
            }`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 18 }}
            >
              {isCorrect ? (
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-600/30 text-white">
                  <Check size={32} strokeWidth={3} />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md shadow-rose-600/30 text-white">
                  <X size={32} strokeWidth={3} />
                </div>
              )}
            </motion.div>

            <p className={`text-2xl font-black tracking-tight ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isCorrect ? 'Spot On!' : 'Incorrect'}
            </p>

            {!isCorrect && correctAnswer && (
              <p className="text-xs font-semibold text-slate-600">
                Correct answer: <span className="font-black uppercase text-slate-900">{correctAnswer}</span>
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
