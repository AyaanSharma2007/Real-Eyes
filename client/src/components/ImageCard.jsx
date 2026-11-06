import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ImageCard({ imageUrl, round, totalRounds, isLoading, onImageLoad }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleLoad = () => {
    setImgLoaded(true);
    onImageLoad?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="relative w-full max-w-[440px] mx-auto"
    >
      {/* Badge */}
      <div className="absolute top-3 right-3 z-10 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 border border-slate-200/90 shadow-md">
        Photo {round} / {totalRounds}
      </div>

      {/* Frame Container */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl shadow-slate-200/70 p-2">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
          {/* Loading Skeleton */}
          {(isLoading || !imgLoaded) && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-slate-300 border-t-cyan-600 rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Loading specimen...</p>
            </div>
          )}

          {/* Actual image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Subject under test"
              onLoad={handleLoad}
              className={`w-full h-full object-cover transition-opacity duration-200 select-none ${
                imgLoaded && !isLoading ? 'opacity-100' : 'opacity-0'
              }`}
              draggable={false}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
