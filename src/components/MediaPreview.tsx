import { useState, useEffect } from 'react';

type MediaPreviewProps = {
  handle: FileSystemFileHandle | null;
  type: 'image' | 'video' | 'audio' | null;
};

export const MediaPreview: React.FC<MediaPreviewProps> = ({ handle, type }) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!handle || !type) {
      setMediaUrl(null);
      return;
    }

    let url: string | null = null;
    let isMounted = true;

    const loadMedia = async () => {
      try {
        const file = await handle.getFile();
        url = URL.createObjectURL(file);
        if (isMounted) {
          setMediaUrl(url);
        }
      } catch (e) {
        console.error('Failed to load media', e);
      }
    };

    loadMedia();

    return () => {
      isMounted = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [handle, type]);

  return (
    <aside className="h-full bg-surface-container-low flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto">
        {!mediaUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-on-surface/40 italic text-center p-4">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Empty Signal.<br/>Select a media file.
          </div>
        ) : (
          <div className="flex flex-col h-full relative">
            
            {/* Media container — fills available space, seamless edge-to-edge */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center min-h-0">
              {type === 'image' && (
                <img
                  src={mediaUrl}
                  alt={handle?.name}
                  className="w-full h-full object-contain"
                />
              )}
              
              {type === 'video' && (
                <video
                  src={mediaUrl}
                  controls
                  className="w-full h-full object-contain outline-none"
                />
              )}
              
              {type === 'audio' && (
                <div className="w-full p-6 flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mb-5 text-primary">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                  </div>
                  <audio src={mediaUrl} controls className="w-full outline-none" />
                </div>
              )}
            </div>

            {/* File name overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/80 truncate">{handle?.name}</span>
            </div>
            
          </div>
        )}
      </div>
    </aside>
  );
};
