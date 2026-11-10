import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function ImageCard({
  imageUrl,
  round,
  totalRounds,
  isLoading,
  onImageLoad,
  swipeDirection = null,
  onSwipeLeft,
  onSwipeRight,
  isActionDisabled = false,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  const handleLoad = () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setImgLoaded(true);
    onImageLoad?.();
  };

  const handleError = () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setImgLoaded(true);
    onImageLoad?.();
  };

  useEffect(() => {
    setImgLoaded(false);
    hasTriggeredRef.current = false;

    // Check if image is already cached
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      handleLoad();
    }

    // Safety timeout: if image takes more than 2.5s, unblock timer and buttons
    const timeout = setTimeout(() => {
      if (!hasTriggeredRef.current) {
        handleLoad();
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [imageUrl, round]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center gap-2 sm:gap-4">
      {/* Left Arrow Key Indicator / Quick Button (REAL) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08, x: -3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSwipeLeft}
        disabled={isActionDisabled || !imgLoaded}
        className="hidden md:flex flex-col items-center justify-center gap-1.5 w-16 h-28 rounded-2xl bg-white border-2 border-emerald-300/80 hover:border-emerald-500 hover:bg-emerald-50/60 text-emerald-700 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none flex-shrink-0"
        title="Mark Real (Left Arrow)"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
          <ArrowLeft size={22} className="stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-black tracking-tight uppercase">Real</span>
        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[9px] font-bold text-slate-700">
          ←
        </kbd>
      </motion.button>

      {/* Main Image Card with Dynamic Swipe Animation */}
      <motion.div
        animate={
          swipeDirection === 'left'
            ? { x: -480, rotate: -22, opacity: 0 }
            : swipeDirection === 'right'
            ? { x: 480, rotate: 22, opacity: 0 }
            : { x: 0, rotate: 0, opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-[480px] mx-auto select-none"
      >
        {/* Photo Badge */}
        <div className="absolute top-4 right-4 z-10 px-3.5 py-1 bg-white/95 backdrop-blur-md rounded-full text-xs font-black text-slate-700 border border-slate-200/90 shadow-md">
          {round} / {totalRounds}
        </div>

        {/* Live Swipe Stamp Indicators */}
        <AnimatePresence>
          {swipeDirection === 'left' && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="px-6 py-2.5 rounded-2xl border-4 border-emerald-500 bg-white/95 text-emerald-600 font-black text-2xl sm:text-3xl uppercase tracking-wider shadow-2xl rotate-[-12deg] flex items-center gap-2">
                <span>🌿</span>
                <span>REAL</span>
              </div>
            </motion.div>
          )}

          {swipeDirection === 'right' && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="px-6 py-2.5 rounded-2xl border-4 border-rose-500 bg-white/95 text-rose-600 font-black text-2xl sm:text-3xl uppercase tracking-wider shadow-2xl rotate-[12deg] flex items-center gap-2">
                <span>🤖</span>
                <span>AI FAKE</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frame Container */}
        <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl shadow-slate-200/70 p-2 sm:p-2.5">
          <div className="relative w-full h-[48vh] sm:h-[52vh] max-h-[480px] min-h-[300px] rounded-2xl overflow-hidden bg-slate-100/70 flex items-center justify-center p-1">
            {/* Loading Skeleton */}
            {(isLoading || !imgLoaded) && (
              <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-slate-300 border-t-cyan-600 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-400">Loading photo...</p>
              </div>
            )}

            {/* Actual image — object-contain shows the complete photo without cropping */}
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Subject under test"
                onLoad={handleLoad}
                onError={handleError}
                className={`max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-opacity duration-200 select-none shadow-sm ${
                  imgLoaded && !isLoading ? 'opacity-100' : 'opacity-0'
                }`}
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* Small screen helper icons directly flanking below the photo card */}
        <div className="flex md:hidden items-center justify-between px-3 pt-2 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1 text-emerald-600">
            <ArrowLeft size={14} /> Swipe Left for Real
          </span>
          <span className="flex items-center gap-1 text-rose-600">
            Swipe Right for AI <ArrowRight size={14} />
          </span>
        </div>
      </motion.div>

      {/* Right Arrow Key Indicator / Quick Button (FAKE / AI) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08, x: 3 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSwipeRight}
        disabled={isActionDisabled || !imgLoaded}
        className="hidden md:flex flex-col items-center justify-center gap-1.5 w-16 h-28 rounded-2xl bg-white border-2 border-rose-300/80 hover:border-rose-500 hover:bg-rose-50/60 text-rose-700 shadow-lg shadow-rose-500/10 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none flex-shrink-0"
        title="Mark AI Fake (Right Arrow)"
      >
        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
          <ArrowRight size={22} className="stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-black tracking-tight uppercase">Fake</span>
        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[9px] font-bold text-slate-700">
          →
        </kbd>
      </motion.button>
    </div>
  );
}
