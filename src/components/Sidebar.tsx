import { useState, useEffect, useRef } from 'react';
import { get, set } from 'idb-keyval';
import { pickDirectory, readDirectoryRecursive, renameEntry, detectMediaType, type FSEntry } from '../utils/fs';
import { FileIcon, FolderIcon } from './FileIcon';
import { InputModal } from './InputModal';

type SidebarProps = {
  onFileSelect: (handle: FileSystemFileHandle, name: string) => void;
  activePath: string | null;
  onOpenFolder: () => void;
  onRootHandleChange: (handle: FileSystemDirectoryHandle | null) => void;
  onInsertMedia?: (handle: FileSystemFileHandle) => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  type: 'file' | 'directory' | 'root';
  entry?: FSEntry;
} | null;

type InputModalState = {
  isOpen: boolean;
  title: string;
  placeholder: string;
  defaultValue: string;
  action: 'newFile' | 'newFolder' | 'rename' | null;
} ;

// Single entry component — hooks are safe here
const FileTreeEntry: React.FC<{
  entry: FSEntry;
  level: number;
  onFileSelect: SidebarProps['onFileSelect'];
  activePath: string | null;
  onContextMenu: (e: React.MouseEvent, type: 'file'|'directory', entry: FSEntry) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string, open: boolean) => void;
}> = ({ entry, level, onFileSelect, activePath, onContextMenu, expandedPaths, onToggleExpand }) => {
  const isDir = entry.kind === 'directory';
  const [isOpen, setIsOpen] = useState(expandedPaths.has(entry.path));
  const isActive = activePath === entry.path;

  return (
    <li>
      <div
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
        className={`flex items-center gap-2 py-0.5 px-2 text-[15px] rounded transition-colors cursor-pointer group ${
          isActive
            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
            : 'text-on-surface/80 hover:bg-surface-container-highest border-l-2 border-transparent hover:text-on-surface'
        }`}
        onClick={() => {
          if (isDir) {
            const next = !isOpen;
            setIsOpen(next);
            onToggleExpand(entry.path, next);
          } else {
            onFileSelect(entry.handle as FileSystemFileHandle, entry.path);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, entry.kind, entry);
        }}
      >
        {isDir ? (
          <>
            <svg className={`w-3 h-3 opacity-50 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <FolderIcon isOpen={isOpen} />
          </>
        ) : (
          <FileIcon fileName={entry.name} />
        )}
        <span className="truncate">{entry.name}</span>
      </div>

      {isDir && isOpen && entry.children && (
        <div className="mt-[2px]">
          <FileTree entries={entry.children} level={level + 1} onFileSelect={onFileSelect} activePath={activePath} onContextMenu={onContextMenu} expandedPaths={expandedPaths} onToggleExpand={onToggleExpand} />
        </div>
      )}
    </li>
  );
};

// Recursive file tree component
const FileTree: React.FC<{
  entries: FSEntry[],
  level?: number,
  onFileSelect: SidebarProps['onFileSelect'],
  activePath: string | null,
  onContextMenu: (e: React.MouseEvent, type: 'file'|'directory', entry: FSEntry) => void,
  expandedPaths: Set<string>,
  onToggleExpand: (path: string, open: boolean) => void
}> = ({ entries, level = 0, onFileSelect, activePath, onContextMenu, expandedPaths, onToggleExpand }) => {
  return (
    <ul className="space-y-0">
      {entries.map(entry => (
        <FileTreeEntry
          key={entry.path}
          entry={entry}
          level={level}
          onFileSelect={onFileSelect}
          activePath={activePath}
          onContextMenu={onContextMenu}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </ul>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ onFileSelect, activePath, onRootHandleChange, onInsertMedia }) => {
  const [tree, setTree] = useState<FSEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [needsPermission, setNeedsPermission] = useState<FileSystemDirectoryHandle | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const isRefreshingRef = useRef(false);

  // Expanded directory paths (persisted in localStorage)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('atheneum-expanded-paths');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const handleToggleExpand = (path: string, open: boolean) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      localStorage.setItem('atheneum-expanded-paths', JSON.stringify([...next]));
      return next;
    });
  };

  // Input modal state
  const [inputModal, setInputModal] = useState<InputModalState>({
    isOpen: false,
    title: '',
    placeholder: '',
    defaultValue: '',
    action: null,
  });
  // Keep track of the context when modal was opened
  const modalContextRef = useRef<ContextMenuState>(null);

  useEffect(() => {
    rootHandleRef.current = rootHandle;
    onRootHandleChange(rootHandle);
  }, [rootHandle, onRootHandleChange]);

  useEffect(() => {
    // Try to load persisted directory handle
    const loadPersistedHandle = async () => {
      try {
        const handle = await get<FileSystemDirectoryHandle>('atheneum-vault-handle');
        if (handle) {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setRootHandle(handle);
            setLoading(true);
            await refreshTree(handle);
            setLoading(false);
          } else {
            setNeedsPermission(handle);
          }
        }
      } catch (err) {
        console.error('Failed to load persisted handle:', err);
      }
    };
    loadPersistedHandle();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Auto refresh local dir files on focus & polling
    const handleFocus = async () => {
      const handle = rootHandleRef.current;
      if (!handle || isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const entries = await readDirectoryRecursive(handle);
          setTree(entries);
        }
      } catch (e) {
        // ignore silently — permission may have been revoked
      } finally {
        isRefreshingRef.current = false;
      }
    };
    const pollInterval = window.setInterval(handleFocus, 8000);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(pollInterval);
    };
  }, []);

  const refreshTree = async (dirHandle: FileSystemDirectoryHandle) => {
    try {
      const entries = await readDirectoryRecursive(dirHandle);
      setTree(entries);
    } catch (e) {
      console.error('Failed to refresh tree:', e);
    }
  };

  // Expose handleOpenFolder for parent to call via onOpenFolder
  const handleOpenFolder = async () => {
    const dirHandle = await pickDirectory();
    if (!dirHandle) return;
    
    await set('atheneum-vault-handle', dirHandle);
    setNeedsPermission(null);
    setLoading(true);
    setRootHandle(dirHandle);
    await refreshTree(dirHandle);
    setLoading(false);
  };

  // Wire the prop callback
  useEffect(() => {
    // Store the handler in a ref-like approach to allow parent to call it
    (window as any).__atheneumOpenFolder = handleOpenFolder;
    return () => { delete (window as any).__atheneumOpenFolder; };
  });

  const handleRestoreAccess = async () => {
    if (!needsPermission) return;
    try {
      const perm = await needsPermission.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        setRootHandle(needsPermission);
        setNeedsPermission(null);
        setLoading(true);
        await refreshTree(needsPermission);
        setLoading(false);
      }
    } catch (e) {
      console.error('Failed to request permission', e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'file'|'directory'|'root', entry?: FSEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, entry });
  };

  // --- Modal-based actions ---
  const openNewFileModal = () => {
    modalContextRef.current = contextMenu;
    setContextMenu(null);
    setInputModal({
      isOpen: true,
      title: '新建文件',
      placeholder: '请输入文件名...',
      defaultValue: '',
      action: 'newFile',
    });
  };

  const openNewFolderModal = () => {
    modalContextRef.current = contextMenu;
    setContextMenu(null);
    setInputModal({
      isOpen: true,
      title: '新建文件夹',
      placeholder: '请输入文件夹名...',
      defaultValue: '',
      action: 'newFolder',
    });
  };

  const openRenameModal = () => {
    modalContextRef.current = contextMenu;
    setContextMenu(null);
    setInputModal({
      isOpen: true,
      title: `重命名 "${contextMenu?.entry?.name}"`,
      placeholder: '请输入新名称...',
      defaultValue: contextMenu?.entry?.name || '',
      action: 'rename',
    });
  };

  const handleModalConfirm = async (value: string) => {
    const ctx = modalContextRef.current;
    const action = inputModal.action;
    
    setInputModal(prev => ({ ...prev, isOpen: false, action: null }));

    if (!rootHandle) return;

    if (action === 'newFile') {
      const parentDir = ctx?.type === 'directory' && ctx.entry 
        ? (ctx.entry.handle as FileSystemDirectoryHandle) 
        : rootHandle;
      try {
        await parentDir.getFileHandle(value, { create: true });
        await refreshTree(rootHandle);
      } catch (e) {
        console.error(e);
        alert('创建文件失败');
      }
    } else if (action === 'newFolder') {
      const parentDir = ctx?.type === 'directory' && ctx.entry 
        ? (ctx.entry.handle as FileSystemDirectoryHandle) 
        : rootHandle;
      try {
        await parentDir.getDirectoryHandle(value, { create: true });
        await refreshTree(rootHandle);
      } catch (e) {
        console.error(e);
        alert('创建文件夹失败');
      }
    } else if (action === 'rename' && ctx?.entry) {
      const { name: oldName, parentDirHandle, kind } = ctx.entry;
      if (value === oldName) return;
      try {
        await renameEntry(parentDirHandle, oldName, value, kind);
        await refreshTree(rootHandle);
      } catch (e) {
        console.error(e);
        alert('重命名失败，请确保文件或文件夹未被占用。');
      }
    }
  };

  const handleModalCancel = () => {
    setInputModal(prev => ({ ...prev, isOpen: false, action: null }));
  };

  const handleDelete = async () => {
    if (!contextMenu || !contextMenu.entry || !rootHandle) return;

    const { name, parentDirHandle, kind } = contextMenu.entry;
    const confirmed = confirm(`确定要删除 "${name}" 吗？${kind === 'directory' ? '\n（文件夹内所有内容将一起被删除）' : ''}`);

    if (!confirmed) {
      setContextMenu(null);
      return;
    }

    try {
      await parentDirHandle.removeEntry(name, { recursive: kind === 'directory' });
      await refreshTree(rootHandle);
    } catch (e) {
      console.error(e);
      alert('删除失败，请确保文件或文件夹未被占用。');
    }
    setContextMenu(null);
  };

  return (
    <aside className="h-full bg-surface-container-low border-r border-outline-variant/15 flex flex-col py-1 overflow-y-auto relative">
      
      {/* Restore access prompt (only when needed) */}
      {needsPermission && (
        <div className="px-4 mb-4">
          <button 
            onClick={handleRestoreAccess}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-[13px] py-2 px-3 rounded shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary/50 text-left flex items-center justify-center gap-2 font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            恢复访问 {needsPermission.name}
          </button>
        </div>
      )}

      <nav 
        className="flex-1 flex flex-col px-1 overflow-y-auto"
        onContextMenu={(e) => {
          // If clicked on empty space, show root context menu
          if (e.target === e.currentTarget && rootHandle) {
            handleContextMenu(e, 'root');
          }
        }}
      >
        {tree.length === 0 && !loading ? (
          <div className="py-2 px-3 text-sm text-on-surface/40 italic">未选择文件夹</div>
        ) : (
          <FileTree entries={tree} onFileSelect={onFileSelect} activePath={activePath} onContextMenu={handleContextMenu} expandedPaths={expandedPaths} onToggleExpand={handleToggleExpand} />
        )}
      </nav>

      {/* Context Menu overlay */}
      {contextMenu && (
        <div 
          ref={menuRef}
          className="fixed z-50 rounded-lg py-1.5 min-w-[160px] text-[13px] shadow-xl backdrop-blur-sm border border-amber-500/30"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            background: 'linear-gradient(135deg, #2a2310 0%, #1f1c14 100%)',
          }}
        >
          {(contextMenu.type === 'directory' || contextMenu.type === 'root') && (
            <>
              <button className="w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2.5" onClick={openNewFileModal}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                新建文件
              </button>
              <button className="w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2.5" onClick={openNewFolderModal}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                新建文件夹
              </button>
            </>
          )}
          {contextMenu.type !== 'root' && (
            <>
              {/* Insert media to editor — only show for media files */}
              {contextMenu.type === 'file' && contextMenu.entry && detectMediaType(contextMenu.entry.name) && onInsertMedia && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2.5"
                    onClick={() => {
                      if (contextMenu.entry) {
                        onInsertMedia(contextMenu.entry.handle as FileSystemFileHandle);
                      }
                      setContextMenu(null);
                    }}
                  >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    插入到编辑器
                  </button>
                  <div className="mx-2 my-1 border-t border-amber-500/20" />
                </>
              )}
              {/* Copy relative path */}
              <button
                className="w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2.5"
                onClick={() => {
                  if (contextMenu.entry && rootHandle) {
                    const relPath = rootHandle.name + contextMenu.entry.path;
                    navigator.clipboard.writeText(relPath);
                  }
                  setContextMenu(null);
                }}
              >
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                复制路径
              </button>
              <div className="mx-2 my-1 border-t border-amber-500/20" />
              <button className="w-full text-left px-4 py-2 text-amber-200 hover:bg-amber-500/20 transition-colors flex items-center gap-2.5" onClick={openRenameModal}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                重命名
              </button>
              <div className="mx-2 my-1 border-t border-amber-500/20" />
              <button className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2.5" onClick={handleDelete}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                删除
              </button>
            </>
          )}
        </div>
      )}

      {/* InputModal for new file / new folder / rename */}
      <InputModal
        isOpen={inputModal.isOpen}
        title={inputModal.title}
        placeholder={inputModal.placeholder}
        defaultValue={inputModal.defaultValue}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </aside>
  );
};
