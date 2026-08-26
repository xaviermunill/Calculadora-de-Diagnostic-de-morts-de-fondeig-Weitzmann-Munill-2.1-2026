import React, { useState, useEffect } from 'react';
import { MortEvaluationRecord } from '../types';
import { fetchFullPhotosForRecord } from '../utils/googleDriveService';
import { X, ChevronLeft, ChevronRight, Download, Loader2, Sparkles, Camera, Eye } from 'lucide-react';

interface PhotoLightboxModalProps {
  record: MortEvaluationRecord | null;
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  record,
  initialIndex = 0,
  onClose,
}) => {
  if (!record) return null;

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [fullPhotos, setFullPhotos] = useState<string[]>(() => {
    return record.photos && record.photos.length > 0
      ? record.photos
      : record.thumbnails && record.thumbnails.length > 0
      ? record.thumbnails
      : record.photoUrl
      ? [record.photoUrl]
      : [];
  });
  const [isLoadingFullRes, setIsLoadingFullRes] = useState<boolean>(true);

  // Fetch full high-resolution photos on demand
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFullRes(true);

    fetchFullPhotosForRecord(record)
      .then((photos) => {
        if (isMounted && photos && photos.length > 0) {
          setFullPhotos(photos);
        }
      })
      .catch((err) => {
        console.warn('Error loading high-res photos in lightbox:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingFullRes(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [record]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullPhotos.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : fullPhotos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < fullPhotos.length - 1 ? prev + 1 : 0));
  };

  const currentPhoto = fullPhotos[currentIndex] || record.thumbnails?.[currentIndex] || record.photoUrl;

  const handleDownload = () => {
    if (!currentPhoto) return;
    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = `${record.code}_foto_${currentIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="photo-lightbox-backdrop"
      className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-lg text-white">{record.code}</h2>
              <span className="text-xs bg-emerald-900/80 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-semibold border border-emerald-700/50">
                {record.locationName}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Fondària: -{record.depthM} m • Data: {record.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoadingFullRes ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/40">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Carregant màxima resolució...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/40 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HD Màxima Resolució (≤1MB)</span>
            </div>
          )}

          {currentPhoto && (
            <button
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-xs"
              title="Descarregar imatge HD"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-rose-500/30 text-white hover:text-rose-300 rounded-full transition"
            title="Tancar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display Area */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
        {fullPhotos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition border border-white/20 shadow-lg"
            title="Imatge anterior (Fletxa esquerra)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {currentPhoto ? (
          <div className="max-w-full max-h-full flex items-center justify-center p-2 select-none">
            <img
              src={currentPhoto}
              alt={`Foto de ${record.code}`}
              className="max-h-[78vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        ) : (
          <div className="text-gray-400 flex flex-col items-center gap-2">
            <Camera className="w-12 h-12 opacity-30" />
            <span>No hi ha imatge disponible</span>
          </div>
        )}

        {fullPhotos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition border border-white/20 shadow-lg"
            title="Següent imatge (Fletxa dreta)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 z-10">
        <div>
          {fullPhotos.length > 1 && (
            <span>
              Imatge {currentIndex + 1} de {fullPhotos.length}
            </span>
          )}
        </div>

        {/* Thumbnail Selector */}
        {fullPhotos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-black/40 rounded-xl border border-white/10 max-w-md">
            {fullPhotos.map((thumb, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                  currentIndex === idx
                    ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={record.thumbnails?.[idx] || thumb}
                  alt={`Min ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div>
          <span className="font-mono text-gray-500">v2.3 HD On-Demand</span>
        </div>
      </div>
    </div>
  );
};
