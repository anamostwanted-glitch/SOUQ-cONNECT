import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Camera, Image as ImageIcon, Search, AlertCircle, RefreshCw, Crop as CropIcon, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import imageCompression from 'browser-image-compression';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { analyzeImageForSearch, semanticSearch } from '../../../core/services/geminiService';
import { ScanningOverlay } from './ScanningOverlay';
import { MarketplaceItem } from '../../../core/types';
import { handleAiError } from '../../../core/utils/errorHandling';

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MarketplaceItem[]; // All items to search against
  onResultsFound: (results: MarketplaceItem[], keywords: string[]) => void;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({ isOpen, onClose, items, onResultsFound }) => {
  const { t, i18n } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImageSelection = async (file: File) => {
    try {
      setError(null);
      
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setSelectedImage(previewUrl);
      setIsCropping(true);
      setCrop(undefined);
      setCompletedCrop(null);
    } catch (err: any) {
      handleAiError(err, 'VisualSearchModal:handleImageSelection', false);
      setError(t('visualSearch.error', 'An error occurred while loading the image. Please try again.'));
    }
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: Crop): Promise<string> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve((reader.result as string).split(',')[1]);
        };
      }, 'image/jpeg', 0.9);
    });
  };

  const executeSearch = async () => {
    try {
      setError(null);
      setIsCropping(false);
      setIsScanning(true);

      let base64Image = '';

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
        base64Image = await getCroppedImg(imgRef.current, completedCrop);
      } else if (selectedImage) {
        // Fallback to full image if no crop
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            resolve((reader.result as string).split(',')[1]);
          };
          reader.onerror = reject;
        });
      } else {
        throw new Error('No image selected');
      }
      
      // 1. Analyze image with Gemini
      const analysis = await analyzeImageForSearch(base64Image, 'image/jpeg', i18n.language);
      
      if (!analysis || !analysis.keywords || analysis.keywords.length === 0) {
        throw new Error('Could not analyze the image properly.');
      }

      // 2. Perform semantic search using the extracted keywords
      const searchQuery = analysis.keywords.join(' ') + ' ' + analysis.category;
      const matchedIds = await semanticSearch(searchQuery, items, i18n.language);
      
      // 3. Filter items based on matched IDs
      const results = items.filter(item => matchedIds.includes(item.id));
      
      // Sort results to match the order returned by semanticSearch
      results.sort((a, b) => matchedIds.indexOf(a.id) - matchedIds.indexOf(b.id));

      setIsScanning(false);
      onResultsFound(results, analysis.keywords);
      onClose();
    } catch (err: any) {
      handleAiError(err, 'VisualSearchModal:executeSearch', false);
      setError(t('visualSearch.error', 'An error occurred while analyzing the image. Please try again.'));
      setIsScanning(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelection(file);
      } else {
        setError(t('visualSearch.invalidFile', 'Please upload a valid image file.'));
      }
    }
  }, [t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelection(e.target.files[0]);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!isOpen) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageSelection(file);
          break;
        }
      }
    }
  }, [isOpen]);

  // Add paste event listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const resetSearch = () => {
    setSelectedImage(null);
    setError(null);
    setIsScanning(false);
    setIsCropping(false);
    setCrop(undefined);
    setCompletedCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-brand-border shrink-0">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              {selectedImage && (
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setIsCropping(false);
                    setCompletedCrop(null);
                    setError(null);
                  }}
                  className="p-2 hover:bg-brand-background rounded-full text-brand-text-main transition-colors"
                >
                  <ArrowRight size={20} className="rtl:rotate-0 rotate-180" />
                </button>
              )}
              <div className="p-2 bg-brand-primary/10 rounded-xl">
                <Camera className="w-6 h-6 text-brand-primary" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-brand-text-main">
                {t('visualSearch.title', 'Visual Search')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-brand-text-muted hover:text-brand-text-main hover:bg-brand-surface-hover rounded-full transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 md:p-6 flex-1 flex flex-col min-h-[50vh] md:min-h-[400px] relative overflow-y-auto min-h-0">
            {selectedImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-black/5 my-auto">
                {isCropping ? (
                  <div className="flex flex-col items-center w-full max-h-[500px]">
                    <div className="flex-1 overflow-auto p-4 w-full flex justify-center items-center bg-black/10 rounded-xl">
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className="max-w-full max-h-full"
                      >
                        <img 
                          ref={imgRef}
                          src={selectedImage} 
                          alt="Crop preview" 
                          className="max-w-full max-h-[400px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </ReactCrop>
                    </div>
                    <div className="flex items-center justify-between w-full mt-4 px-4 pb-2">
                      <button
                        onClick={resetSearch}
                        className="px-4 py-2 text-brand-text-muted hover:text-brand-text-main font-medium transition-colors"
                      >
                        {t('common.cancel', 'Cancel')}
                      </button>
                      <button
                        onClick={executeSearch}
                        className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-2.5 bg-brand-primary text-white rounded-full font-medium hover:bg-brand-primary/90 transition-colors shadow-md"
                      >
                        <Search className="w-4 h-4" />
                        <span>
                          {completedCrop && completedCrop.width > 0 
                            ? t('visualSearch.searchArea', 'Search Area') 
                            : t('visualSearch.searchFull', 'Search Full Image')}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img 
                      src={selectedImage} 
                      alt="Search query" 
                      className="max-w-full max-h-[400px] object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                    <ScanningOverlay isScanning={isScanning} />
                  </>
                )}
                
                {error && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <p className="text-white font-medium mb-6">{error}</p>
                    <button
                      onClick={resetSearch}
                      className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>{t('visualSearch.tryAgain', 'Try Again')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex-1 min-h-[300px] my-auto border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isDragging 
                    ? 'border-brand-primary bg-brand-primary/5 scale-[1.02]' 
                    : 'border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface-hover'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="w-20 h-20 mb-6 rounded-full bg-brand-surface border border-brand-border shadow-sm flex items-center justify-center">
                  <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-brand-primary' : 'text-brand-text-muted'}`} />
                </div>
                
                <h3 className="text-lg font-medium text-brand-text-main mb-2 text-center">
                  {t('visualSearch.dragDrop', 'Drag & drop an image here')}
                </h3>
                <p className="text-brand-text-muted text-sm text-center max-w-xs mb-6">
                  {t('visualSearch.supports', 'Supports JPG, PNG, WEBP. You can also paste an image from your clipboard.')}
                </p>
                
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <button className="flex items-center space-x-2 rtl:space-x-reverse px-5 py-2.5 bg-brand-surface border border-brand-border rounded-full text-brand-text-main hover:bg-brand-surface-hover transition-colors text-sm font-medium">
                    <ImageIcon className="w-4 h-4" />
                    <span>{t('visualSearch.browseFiles', 'Browse Files')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
