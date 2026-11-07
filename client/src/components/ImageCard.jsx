import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function ImageCard({ imageUrl, round, totalRounds, isLoading, onImageLoad }) {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="relative w-full max-w-[500px] mx-auto"
    >
      {/* Badge */}
      <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-slate-700 border border-slate-200/90 shadow-md">
        Photo {round} / {totalRounds}
      </div>

      {/* Frame Container */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-xl shadow-slate-200/70 p-2 sm:p-2.5">
        <div className="relative w-full h-[50vh] sm:h-[54vh] max-h-[500px] min-h-[300px] rounded-2xl overflow-hidden bg-slate-100/70 flex items-center justify-center p-1">
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
    </motion.div>
  );
}
