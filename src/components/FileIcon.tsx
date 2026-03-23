import React from 'react';

type FileIconProps = {
  fileName: string;
  className?: string;
};

type IconDef = {
  color: string;
  icon: React.ReactNode;
};

const getExtension = (name: string): string =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

const ICON_DEFS: Record<string, IconDef> = {};

// --- Markdown ---
const markdownIcon: IconDef = {
  color: 'text-blue-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 15V9l2.5 3L12 9v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 12l-2 3h4l-2-3z" />
    </svg>
  ),
};
['md', 'markdown', 'mdx'].forEach(ext => ICON_DEFS[ext] = markdownIcon);

// --- Images ---
const imageIcon: IconDef = {
  color: 'text-green-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
    </svg>
  ),
};
['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff'].forEach(ext => ICON_DEFS[ext] = imageIcon);

// --- Video ---
const videoIcon: IconDef = {
  color: 'text-rose-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
};
['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'flv', 'wmv'].forEach(ext => ICON_DEFS[ext] = videoIcon);

// --- Audio ---
const audioIcon: IconDef = {
  color: 'text-amber-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
};
['mp3', 'wav', 'flac', 'aac', 'm4a', 'wma'].forEach(ext => ICON_DEFS[ext] = audioIcon);

// --- PDF ---
const pdfIcon: IconDef = {
  color: 'text-red-500',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9l-6-6H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" />
      <text x="7" y="17" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
    </svg>
  ),
};
ICON_DEFS['pdf'] = pdfIcon;

// --- Code files ---
const codeIcon: IconDef = {
  color: 'text-cyan-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
};
['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'swift', 'kt', 'lua', 'r', 'sh', 'bash', 'zsh', 'fish'].forEach(ext => ICON_DEFS[ext] = codeIcon);

// --- Config / Data files ---
const configIcon: IconDef = {
  color: 'text-purple-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
};
['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'xml', 'env', 'properties'].forEach(ext => ICON_DEFS[ext] = configIcon);

// --- Web / Style ---
const webIcon: IconDef = {
  color: 'text-orange-400',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
};
['html', 'htm', 'css', 'scss', 'less', 'sass'].forEach(ext => ICON_DEFS[ext] = webIcon);

// --- Text / Document ---
const docIcon: IconDef = {
  color: 'text-sky-300',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4" />
    </svg>
  ),
};
['txt', 'log', 'csv', 'rtf', 'tex', 'bib', 'doc', 'docx'].forEach(ext => ICON_DEFS[ext] = docIcon);

// --- Archive ---
const archiveIcon: IconDef = {
  color: 'text-yellow-600',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v11a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4" />
    </svg>
  ),
};
['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'].forEach(ext => ICON_DEFS[ext] = archiveIcon);

// --- Default file icon ---
const defaultFileIcon: IconDef = {
  color: 'text-on-surface/40',
  icon: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

export const FileIcon: React.FC<FileIconProps> = ({ fileName, className = '' }) => {
  const ext = getExtension(fileName);
  const def = ICON_DEFS[ext] || defaultFileIcon;

  return (
    <span className={`inline-flex shrink-0 ml-[2px] ${def.color} ${className}`}>
      {def.icon}
    </span>
  );
};

// Folder icons
export const FolderIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <span className={`inline-flex shrink-0 ${isOpen ? 'text-amber-400/70' : 'text-amber-500/50'} ${className}`}>
    {isOpen ? (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    )}
  </span>
);
