import { useState, useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import { get, set } from 'idb-keyval';
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { Sidebar } from './components/Sidebar';
import { Editor, type EditorHandle } from './components/Editor';
import { MediaPreview } from './components/MediaPreview';
import { Navbar } from './components/Navbar';
import { readFileText, writeFileText, copyMediaToClassifiedDir, detectMediaType, type MediaType } from './utils/fs';

// Keys for IndexedDB persistence
const IDB_ACTIVE_FILE_HANDLE = 'atheneum-active-file-handle';
const IDB_ACTIVE_MEDIA_HANDLE = 'atheneum-active-media-handle';
const LS_ACTIVE_PATH = 'atheneum-active-path';
const LS_MEDIA_TYPE = 'atheneum-media-type';

function App() {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeFileHandle, setActiveFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  const [activeMediaHandle, setActiveMediaHandle] = useState<FileSystemFileHandle | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);

  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  const [sourceContent, setSourceContent] = useState<string>('');

  // Ref to the editor for inserting markdown content
  const editorHandleRef = useRef<EditorHandle>(null);
  // Ref to the root vault directory handle (for non-reactive use)
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  // State for vault root handle (for reactive prop passing to Editor)
  const [vaultRootHandle, setVaultRootHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Persist layout across page reloads
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "atheneum-main-layout",
    storage: localStorage,
  });

  // --- Restore persisted state on mount ---
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restore = async () => {
      try {
        // Restore text file
        const savedPath = localStorage.getItem(LS_ACTIVE_PATH);
        const savedFileHandle = await get<FileSystemFileHandle>(IDB_ACTIVE_FILE_HANDLE);

        if (savedPath && savedFileHandle) {
          const perm = await savedFileHandle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            try {
              const text = await readFileText(savedFileHandle);
              setActivePath(savedPath);
              setActiveFileHandle(savedFileHandle);
              setFileContent(text);
            } catch (e) {
              console.warn('Failed to restore text file:', e);
            }
          }
        }

        // Restore media file
        const savedMediaType = localStorage.getItem(LS_MEDIA_TYPE) as 'image' | 'video' | 'audio' | null;
        const savedMediaHandle = await get<FileSystemFileHandle>(IDB_ACTIVE_MEDIA_HANDLE);

        if (savedMediaType && savedMediaHandle) {
          const perm = await savedMediaHandle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            setActiveMediaHandle(savedMediaHandle);
            setMediaType(savedMediaType);
          }
        }
      } catch (e) {
        console.warn('Failed to restore state:', e);
      } finally {
        setIsRestoring(false);
      }
    };

    restore();
  }, []);

  const handleFileSelect = async (handle: FileSystemFileHandle, path: string) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';

    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
      setActiveMediaHandle(handle);
      setMediaType('image');
      // Persist media
      await set(IDB_ACTIVE_MEDIA_HANDLE, handle);
      localStorage.setItem(LS_MEDIA_TYPE, 'image');
    } else if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) {
      setActiveMediaHandle(handle);
      setMediaType('video');
      await set(IDB_ACTIVE_MEDIA_HANDLE, handle);
      localStorage.setItem(LS_MEDIA_TYPE, 'video');
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      setActiveMediaHandle(handle);
      setMediaType('audio');
      await set(IDB_ACTIVE_MEDIA_HANDLE, handle);
      localStorage.setItem(LS_MEDIA_TYPE, 'audio');
    } else {
      try {
        const text = await readFileText(handle);
        setActivePath(path);
        setActiveFileHandle(handle);
        setFileContent(text);
        // 源码模式下也需要同步更新 sourceContent
        if (viewMode === 'source') {
          setSourceContent(text);
        }
        // Persist text file state
        await set(IDB_ACTIVE_FILE_HANDLE, handle);
        localStorage.setItem(LS_ACTIVE_PATH, path);
      } catch (e) {
        console.error(e);
        alert('Cannot read file');
      }
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleEditorChange = useCallback(
    debounce((markdown: string, handle: FileSystemFileHandle | null) => {
      if (handle) {
        writeFileText(handle, markdown);
      }
    }, 1000),
    []
  );

  const handleOpenFolder = () => {
    // Trigger the open folder action in Sidebar via the global function
    if ((window as any).__atheneumOpenFolder) {
      (window as any).__atheneumOpenFolder();
    }
  };

  const handleRootHandleChange = useCallback((handle: FileSystemDirectoryHandle | null) => {
    setCurrentFolderPath(handle ? handle.name : null);
    rootHandleRef.current = handle;
    setVaultRootHandle(handle);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'rendered') {
        // 切换到源代码视图：用当前 fileContent（由 onChange 实时更新的）
        setSourceContent(fileContent);
        return 'source';
      } else {
        // 切换回渲染视图：将 sourceContent 写回 fileContent 以重新初始化 Editor
        setFileContent(sourceContent);
        // 同时保存到文件
        if (activeFileHandle) {
          writeFileText(activeFileHandle, sourceContent);
        }
        return 'rendered';
      }
    });
  }, [fileContent, sourceContent, activeFileHandle]);

  // --- Insert media into editor: copy to classified dir + insert markdown ---
  const insertMediaMarkdown = useCallback(async (
    source: FileSystemFileHandle | File,
    mType: MediaType,
  ) => {
    if (!rootHandleRef.current) {
      alert('请先打开一个 vault 文件夹');
      return;
    }
    if (!activePath) {
      alert('请先打开一个 Markdown 文件');
      return;
    }

    try {
      const { relativePath } = await copyMediaToClassifiedDir(
        rootHandleRef.current,
        source,
        mType,
      );

      // Build markdown reference — use <url> syntax for filenames with special chars
      const originalName = source instanceof File ? source.name : source.name;
      const safeAlt = originalName.replace(/[\[\]]/g, '\\$&');
      const mdRef = `![${safeAlt}](<${relativePath}>)`;

      // Insert into editor
      if (viewMode === 'source') {
        // Source mode: append directly
        const newContent = sourceContent.trimEnd() + '\n\n' + mdRef + '\n';
        setSourceContent(newContent);
        if (activeFileHandle) {
          writeFileText(activeFileHandle, newContent);
        }
      } else {
        // Rendered mode: use editor handle
        editorHandleRef.current?.insertMarkdown(mdRef);
      }
    } catch (e) {
      console.error('Failed to insert media:', e);
      alert('插入媒体失败，请确保有文件写入权限。');
    }
  }, [activePath, viewMode, sourceContent, activeFileHandle]);

  // --- Sidebar "Insert to editor" handler ---
  const handleInsertMedia = useCallback((handle: FileSystemFileHandle) => {
    const mType = detectMediaType(handle.name);
    if (mType) {
      insertMediaMarkdown(handle, mType);
    }
  }, [insertMediaMarkdown]);

  // --- Drag & Drop handler for editor area ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mType = detectMediaType(file.name);
      if (mType) {
        await insertMediaMarkdown(file, mType);
      }
    }
  }, [insertMediaMarkdown]);

  // --- Paste handler for editor area ---
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Check for files in clipboard (drag from file manager)
    const files = e.clipboardData.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mType = detectMediaType(file.name);
        if (mType) {
          e.preventDefault();
          insertMediaMarkdown(file, mType);
          return;
        }
      }
    }

    // Check for text paths
    const text = e.clipboardData.getData('text/plain').trim();
    if (!text) return;

    // Detect if pasted text looks like a media file path
    const mType = detectMediaType(text);
    if (!mType) return; // Not a media path, let normal paste happen

    // It looks like a media file path — try to find it in the vault
    e.preventDefault();

    // Use the file tree to find matching handle
    const findFileHandle = async (): Promise<FileSystemFileHandle | null> => {
      if (!rootHandleRef.current) return null;

      // Extract just the filename from the path
      const fileName = text.split('/').pop() || text.split('\\').pop() || '';
      if (!fileName) return null;

      // Try to resolve the file from the vault directory
      // Walk the path segments relative to root if it starts with the vault name
      try {
        // Simple approach: try to find the file by name in the vault
        const segments = text.split('/').filter(Boolean);
        let dirHandle = rootHandleRef.current;

        // Try to match path segments from the vault root
        const rootName = rootHandleRef.current.name;
        const rootIdx = segments.indexOf(rootName);
        if (rootIdx >= 0) {
          // Navigate from root
          for (let i = rootIdx + 1; i < segments.length - 1; i++) {
            dirHandle = await dirHandle.getDirectoryHandle(segments[i]);
          }
          return await dirHandle.getFileHandle(segments[segments.length - 1]);
        }
      } catch {
        // Path not found in vault
      }

      return null;
    };

    findFileHandle().then((handle) => {
      if (handle) {
        insertMediaMarkdown(handle, mType);
      } else {
        // Could not find in vault — insert the path as-is as a markdown reference
        const fileName = text.split('/').pop() || text;
        const safeAlt = fileName.replace(/[\[\]]/g, '\\$&');
        const mdRef = `![${safeAlt}](<${text}>)`;
        if (viewMode === 'source') {
          const newContent = sourceContent.trimEnd() + '\n\n' + mdRef + '\n';
          setSourceContent(newContent);
          if (activeFileHandle) {
            writeFileText(activeFileHandle, newContent);
          }
        } else {
          editorHandleRef.current?.insertMarkdown(mdRef);
        }
      }
    });
  }, [insertMediaMarkdown, viewMode, sourceContent, activeFileHandle]);

  if (isRestoring) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface">
        <p className="text-secondary text-sm font-sans animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col selection:bg-primary-container selection:text-white bg-surface">
      {/* Top Navbar */}
      <Navbar
        onOpenFolder={handleOpenFolder}
        currentFolderPath={currentFolderPath}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
      />

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <Group
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
        >

          {/* SIDEBAR PANEL */}
          <Panel id="sidebar" defaultSize="18%" minSize="10%" maxSize="35%">
            <Sidebar
              onFileSelect={handleFileSelect}
              activePath={activePath}
              onOpenFolder={handleOpenFolder}
              onRootHandleChange={handleRootHandleChange}
              onInsertMedia={handleInsertMedia}
            />
          </Panel>

          <Separator className="w-[3px] bg-outline-variant/15 hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary z-10" />

          {/* EDITOR PANEL */}
          <Panel id="editor" defaultSize="52%" minSize="25%">
            <main
              className="flex flex-col h-full min-w-0 bg-surface overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPaste={handlePaste}
            >
              <header className="border-b border-outline-variant/10 flex items-center px-1 py-2 shrink-0">
                <div className="flex-1 text-sm text-secondary truncate leading-none">
                  {activePath ? '/' + activePath.split('/').pop() : 'Select a file to edit'}
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-1 py-1">
                <div className="w-full h-full text-on-surface">
                  {!activePath ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-secondary text-lg font-display">Welcome to your pristine editing space.</p>
                    </div>
                  ) : viewMode === 'source' ? (
                    <textarea
                      className="w-full h-full bg-[#202024] text-on-surface font-mono text-sm p-4 outline-none resize-none"
                      value={sourceContent}
                      onChange={(e) => {
                        setSourceContent(e.target.value);
                        handleEditorChange(e.target.value, activeFileHandle);
                      }}
                      spellCheck={false}
                    />
                  ) : (
                    <Editor
                      ref={editorHandleRef}
                      key={activePath + '-' + viewMode}
                      initialContent={fileContent}
                      rootHandle={vaultRootHandle}
                      onChange={(md) => {
                        setFileContent(md);
                        handleEditorChange(md, activeFileHandle);
                      }}
                    />
                  )}
                </div>
              </div>
            </main>
          </Panel>

          <Separator className="w-[3px] bg-outline-variant/15 hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary z-10" />

          {/* MEDIA PREVIEW PANEL */}
          <Panel id="media-preview" defaultSize="30%" minSize="12%" maxSize="45%">
            <MediaPreview handle={activeMediaHandle} type={mediaType} />
          </Panel>

        </Group>
      </div>
    </div>
  );
}

export default App;
