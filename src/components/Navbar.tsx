import { useState, useRef, useEffect } from 'react';

type NavbarProps = {
  onOpenFolder: () => void;
  currentFolderPath: string | null;
  viewMode: 'rendered' | 'source';
  onToggleViewMode: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({ onOpenFolder, currentFolderPath, viewMode, onToggleViewMode }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="h-11 bg-surface-container-low border-b border-outline-variant/12 flex items-center px-4 shrink-0 select-none z-20 gap-1.5">

      {/* === Left group === */}

      {/* 1. Current folder name */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        {currentFolderPath ? (
          <div className="flex items-center gap-1.5 text-[13px] text-secondary/80 min-w-0">
            <svg className="w-3.5 h-3.5 text-primary/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="truncate font-medium text-on-surface/60 max-w-[140px]">{currentFolderPath}</span>
          </div>
        ) : (
          <span className="text-[13px] text-secondary/40 italic">未打开文件夹</span>
        )}
      </div>

      {/* 2. Open folder */}
      <button
        onClick={onOpenFolder}
        className="p-1.5 rounded-md text-secondary/70 hover:text-on-surface hover:bg-surface-container-highest/60 transition-all shrink-0"
        title="打开文件夹"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6"/>
        </svg>
      </button>

      {/* 3. Settings */}
      <button
        className="p-1.5 rounded-md text-secondary/70 hover:text-on-surface hover:bg-surface-container-highest/60 transition-all shrink-0"
        title="设置"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* 4. Source code toggle */}
      <button
        onClick={onToggleViewMode}
        className={`p-1.5 rounded-md transition-all shrink-0 ${
          viewMode === 'source'
            ? 'text-primary bg-primary/15'
            : 'text-secondary/70 hover:text-on-surface hover:bg-surface-container-highest/60'
        }`}
        title={viewMode === 'source' ? '切换到渲染视图' : '切换到源代码视图'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      {/* === Spacer === */}
      <div className="flex-1" />

      {/* === Right group: Search only === */}
      {isSearchOpen ? (
        <div className="flex items-center gap-1.5 bg-surface-container-highest/60 rounded-lg px-2.5 py-1 border border-outline-variant/15">
          <svg className="w-3.5 h-3.5 text-secondary/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索文件..."
            className="bg-transparent text-[13px] text-on-surface outline-none w-40 placeholder:text-secondary/30 font-sans"
          />
          <button
            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
            className="text-secondary/50 hover:text-on-surface transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsSearchOpen(true)}
          className="p-1.5 rounded-md text-secondary/70 hover:text-on-surface hover:bg-surface-container-highest/60 transition-all shrink-0"
          title="搜索"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}
    </nav>
  );
};
