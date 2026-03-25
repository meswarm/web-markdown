import { useEffect, useCallback } from 'react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="image-lightbox-overlay"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt || ''}
        className="image-lightbox-img"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={onClose}
      />
    </div>
  );
};
