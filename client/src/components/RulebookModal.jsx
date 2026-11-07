import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Zap, ArrowLeft } from 'lucide-react';
import { RULES_CONFIG } from '../config/rules';

export default function RulebookModal({ playerName, onConfirm, onBack, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 my-6 overflow-hidden"
      >
        {/* Subtle top decorative accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-600" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {RULES_CONFIG.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-cyan-700">
              Player: <span className="text-slate-900 font-bold">{playerName}</span>
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mb-5">
          {RULES_CONFIG.subtitle}
        </p>

        {/* Rules List */}
        <div className="space-y-3.5 mb-6 max-h-[50vh] overflow-y-auto pr-1">
          {RULES_CONFIG.rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl select-none flex-shrink-0 mt-0.5">{rule.icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">{rule.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{rule.description}</p>

                  {/* Optional keyboard shortcuts preview */}
                  {rule.shortcuts && (
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rule.shortcuts.map((sc, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs font-medium text-slate-700"
                        >
                          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] font-bold text-slate-800">
                            {sc.key}
                          </kbd>
                          <span className="text-[11px] truncate">{sc.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-3 text-slate-600 hover:text-slate-900 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            <span>Change Name</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full flex-1 py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Preparing Challenge...
              </span>
            ) : (
              <>
                <span>{RULES_CONFIG.startButtonText}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

