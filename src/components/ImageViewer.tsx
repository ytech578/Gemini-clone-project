import React from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { CloseIcon } from './icons/CloseIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ImageViewerProps {
  imageUrl: string;
  imageName?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, imageName, onClose }) => {
  // Generate a default name if none provided
  const displayName = imageName || `Image-${Date.now()}.png`;

  return (
    <div className="fixed inset-0 bg-[#fff] dark:bg-[#0e0e0e] z-50 flex flex-col">
      {/* Header with back arrow and image name */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors text-gray-800 dark:text-gray-300"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span className="text-gray-800 dark:text-gray-300 text-sm font-medium truncate max-w-[300px]">
            {displayName}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={imageUrl}
            download={displayName}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors text-gray-800 dark:text-gray-300"
            aria-label="Download image"
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gemini-gray-800 rounded-full transition-colors text-gray-800 dark:text-gray-300"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image container - centered */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        onClick={onClose}
      >
        <img
          src={imageUrl}
          alt={displayName}
          className="max-w-full max-h-full object-contain rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};