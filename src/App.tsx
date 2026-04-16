import { useState, useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import { get, set } from 'idb-keyval';
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";
import { Sidebar } from './components/Sidebar';
import { Editor, type EditorHandle } from './components/Editor';
import { MediaPreview } from './components/MediaPreview';
import { Navbar } from './components/Navbar';
import { ImageLightbox } from './components/ImageLightbox';
import { NoteToolbar } from './components/NoteToolbar';
import { SearchResults } from './components/SearchResults';
import { searchNotes, type RelatedNote } from './utils/notesysApi';
import { readFileText, writeFileText, copyMediaToClassifiedDir, detectMediaType, ensureTrailingEmptyLines, type MediaType } from './utils/fs';

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
  const [editorRevision, setEditorRevision] = useState(0);

  // Ref to the editor for inserting markdown content
  const editorHandleRef = useRef<EditorHandle>(null);
  // Ref to the source-mode textarea for cursor-position insertion
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Ref to the root vault directory handle (for non-reactive use)
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  // State for vault root handle (for reactive prop passing to Editor)
  const [vaultRootHandle, setVaultRootHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Lightbox state for double-click image zoom
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');

  const handleImageDoubleClick = useCallback((src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }, []);

  // --- Search state ---
  const [searchResults, setSearchResults] = useState<RelatedNote[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // --- Right panel preview state ---
  const [previewNotePath, setPreviewNotePath] = useState<string | null>(null);
  const [previewFileHandle, setPreviewFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [previewFileContent, setPreviewFileContent] = useState<string>('');

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
              const rawText = await readFileText(savedFileHandle);
              const text = ensureTrailingEmptyLines(rawText);
              setActivePath(savedPath);
              setActiveFileHandle(savedFileHandle);
              setFileContent(text);
              // 如果补了空行，自动回写文件
              if (text !== rawText) {
                writeFileText(savedFileHandle, text);
              }
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
        const rawText = await readFileText(handle);
        const text = ensureTrailingEmptyLines(rawText);
        setActivePath(path);
        setActiveFileHandle(handle);
        setFileContent(text);
        // 如果补了空行，自动回写文件
        if (text !== rawText) {
          writeFileText(handle, text);
        }
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
        writeFileText(handle, ensureTrailingEmptyLines(markdown));
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

  // --- Helper: insert text at cursor position in source-mode textarea ---
  const insertAtSourceCursor = useCallback((mdRef: string) => {
    const ta = sourceTextareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = sourceContent.slice(0, start);
      const after = sourceContent.slice(end);
      const insertion = '\n\n' + mdRef + '\n';
      const newContent = before + insertion + after;
      setSourceContent(newContent);
      if (activeFileHandle) {
        writeFileText(activeFileHandle, newContent);
      }
      // Restore cursor after the inserted text
      requestAnimationFrame(() => {
        const newPos = start + insertion.length;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
        ta.focus();
      });
    } else {
      // Fallback: append to end
      const newContent = sourceContent.trimEnd() + '\n\n' + mdRef + '\n';
      setSourceContent(newContent);
      if (activeFileHandle) {
        writeFileText(activeFileHandle, newContent);
      }
    }
  }, [sourceContent, activeFileHandle]);

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
        // Source mode: insert at cursor position
        insertAtSourceCursor(mdRef);
      } else {
        // Rendered mode: use editor handle
        editorHandleRef.current?.insertMarkdown(mdRef);
      }
    } catch (e) {
      console.error('Failed to insert media:', e);
      alert('插入媒体失败，请确保有文件写入权限。');
    }
  }, [activePath, viewMode, insertAtSourceCursor]);

  // --- NoteToolbar: replace editor content ---
  const handleContentReplace = useCallback((newContent: string) => {
    const content = ensureTrailingEmptyLines(newContent);
    setFileContent(content);
    if (activeFileHandle) {
      writeFileText(activeFileHandle, content);
    }
  }, [activeFileHandle]);

  // --- NoteToolbar: navigate to classified file path ---
  const handleNavigateToFile = useCallback(async (notePath: string) => {
    if (!rootHandleRef.current) return;

    try {
      // notePath 格式如 "notes/技术/Linux/解压命令.md" 或 "技术/Linux/解压命令.md"
      // 去掉可能的 vault 根目录前缀
      const rootName = rootHandleRef.current.name;
      let segments = notePath.split('/').filter(Boolean);
      if (segments[0] === rootName) {
        segments = segments.slice(1);
      }

      // 通过 File System Access API 逐级导航到目标文件
      let dirHandle = rootHandleRef.current;
      for (let i = 0; i < segments.length - 1; i++) {
        dirHandle = await dirHandle.getDirectoryHandle(segments[i]);
      }
      const fileHandle = await dirHandle.getFileHandle(segments[segments.length - 1]);
      const relativePath = '/' + segments.join('/');

      // 通过已有的 handleFileSelect 打开文件
      await handleFileSelect(fileHandle, relativePath);
    } catch (e) {
      console.error('Failed to navigate to classified file:', e);
      alert(`无法打开分类后的文件: ${notePath}`);
    }
  }, [handleFileSelect]);

  // --- Search handler ---
  const handleSearch = useCallback(async (query: string) => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const results = await searchNotes(query, 10);
      setSearchResults(results.length > 0 ? results : []);
    } catch (err) {
      alert(`搜索请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsSearching(false);
    }
  }, [isSearching]);

  // --- Search result: open note in right panel ---
  const handleSelectNote = useCallback(async (notePath: string) => {
    if (!rootHandleRef.current) return;

    // 同文件检测：如果和中间编辑器打开的是同一个文件
    const rootName = rootHandleRef.current.name;
    let segments = notePath.split('/').filter(Boolean);
    if (segments[0] === rootName) {
      segments = segments.slice(1);
    }
    const relativePath = '/' + segments.join('/');

    if (relativePath === activePath) {
      alert('该文件已在编辑器中打开');
      return;
    }

    try {
      let dirHandle = rootHandleRef.current;
      for (let i = 0; i < segments.length - 1; i++) {
        dirHandle = await dirHandle.getDirectoryHandle(segments[i]);
      }
      const fileHandle = await dirHandle.getFileHandle(segments[segments.length - 1]);
      const rawText = await readFileText(fileHandle);
      const text = ensureTrailingEmptyLines(rawText);

      setPreviewNotePath(relativePath);
      setPreviewFileHandle(fileHandle);
      setPreviewFileContent(text);
    } catch (e) {
      console.error('Failed to open preview file:', e);
      alert(`无法打开文件: ${notePath}`);
    }
  }, [activePath]);

  const handleClosePreview = useCallback(() => {
    setPreviewNotePath(null);
    setPreviewFileHandle(null);
    setPreviewFileContent('');
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlePreviewChange = useCallback(
    debounce((markdown: string, handle: FileSystemFileHandle | null) => {
      if (handle) {
        writeFileText(handle, ensureTrailingEmptyLines(markdown));
      }
    }, 1000),
    []
  );

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
          insertAtSourceCursor(mdRef);
        } else {
          editorHandleRef.current?.insertMarkdown(mdRef);
        }
      }
    });
  }, [insertMediaMarkdown, viewMode, insertAtSourceCursor]);

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
              onSearch={handleSearch}
              isSearching={isSearching}
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
                  {activePath ? (() => {
                    const fullPath = (currentFolderPath || '') + activePath;
                    const segments = fullPath.split('/');
                    const fileName = segments.pop() || '';
                    return (
                      <>
                        {segments.map((seg, i) => (
                          <span key={i}>
                            <span>{seg}</span>
                            <span style={{
                              backgroundColor: 'rgba(251, 191, 36, 0.4)',
                              color: 'rgba(251, 191, 36, 0.7)',
                              borderRadius: '3px',
                              padding: '1px 3px',
                              margin: '0 1px',
                              fontSize: '0.9em',
                            }}>/</span>
                          </span>
                        ))}
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fileName}</span>
                      </>
                    );
                  })() : 'Select a file to edit'}
                </div>
                {/* 文档操作按钮组 */}
                {activePath && activeFileHandle && (
                  <div className="flex items-center gap-1 mr-6">
                    {/* 复制文档内容 */}
                    <button
                      className="p-1.5 rounded-md text-secondary/50 hover:text-on-surface hover:bg-surface-container-highest/60 transition-all shrink-0"
                      title="复制文档内容"
                      onClick={() => {
                        navigator.clipboard.writeText(fileContent).then(() => {
                          const btn = document.activeElement as HTMLElement;
                          btn?.blur();
                        });
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>

                    {/* 删除文档内容 */}
                    <button
                      className="p-1.5 rounded-md text-secondary/50 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                      title="清空文档内容"
                      onClick={() => {
                        if (!confirm('确定要清空文档内容吗？')) return;
                        const empty = ensureTrailingEmptyLines('');
                        setFileContent(empty);
                        writeFileText(activeFileHandle, empty);
                        if (viewMode === 'source') {
                          setSourceContent(empty);
                        }
                        setEditorRevision(r => r + 1);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* 刷新文件 */}
                    <button
                      className="p-1.5 rounded-md text-secondary/50 hover:text-on-surface hover:bg-surface-container-highest/60 transition-all shrink-0"
                      title="刷新文件"
                      onClick={async () => {
                        if (!activeFileHandle) return;
                        try {
                          const rawText = await readFileText(activeFileHandle);
                          const text = ensureTrailingEmptyLines(rawText);
                          setFileContent(text);
                          if (viewMode === 'source') {
                            setSourceContent(text);
                          }
                          setEditorRevision(r => r + 1);
                        } catch (e) {
                          console.error('Failed to reload file:', e);
                        }
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                )}
                {/* NoteToolbar — 悬浮操作按钮 */}
                <NoteToolbar
                  activePath={activePath}
                  fileContent={fileContent}
                  onContentReplace={handleContentReplace}
                  onNavigateToFile={handleNavigateToFile}
                />
              </header>

              <div className="flex-1 overflow-y-auto px-1 py-1">
                <div className="w-full h-full text-on-surface">
                  {!activePath ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-secondary text-lg font-display">Welcome to your pristine editing space.</p>
                    </div>
                  ) : viewMode === 'source' ? (
                    <textarea
                      ref={sourceTextareaRef}
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
                      key={activePath + '-' + viewMode + '-' + editorRevision}
                      initialContent={fileContent}
                      rootHandle={vaultRootHandle}
                      onImageDoubleClick={handleImageDoubleClick}
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

          {/* RIGHT PANEL: dynamic preview or media */}
          <Panel id="media-preview" defaultSize="30%" minSize="12%" maxSize="45%">
            {previewNotePath ? (
              <aside className="h-full bg-surface-container-low flex flex-col overflow-hidden">
                <div className="preview-panel-header">
                  <span className="preview-panel-path" title={previewNotePath}>{previewNotePath}</span>
                  <button
                    className="preview-panel-close"
                    onClick={handleClosePreview}
                    title="关闭预览"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-1 py-1">
                  <Editor
                    key={'preview-' + previewNotePath}
                    initialContent={previewFileContent}
                    rootHandle={vaultRootHandle}
                    onImageDoubleClick={handleImageDoubleClick}
                    onChange={(md) => {
                      setPreviewFileContent(md);
                      handlePreviewChange(md, previewFileHandle);
                    }}
                  />
                </div>
              </aside>
            ) : (
              <MediaPreview handle={activeMediaHandle} type={mediaType} />
            )}
          </Panel>

        </Group>
      </div>

      {/* Search results popup */}
      {searchResults && (
        <SearchResults
          results={searchResults}
          onSelectNote={handleSelectNote}
          onClose={() => setSearchResults(null)}
        />
      )}

      {/* Image Lightbox — rendered at top level for proper z-index stacking */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={lightboxAlt}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}

export default App;
