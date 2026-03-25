import { useState, useRef, useCallback, useEffect } from 'react';
import {
  organizeNote,
  subscribeOrganizeProgress,
  getStepLabel,
  type OrganizeResult,
} from '../utils/notesysApi';

export interface NoteToolbarProps {
  /** 当前打开文件的路径，如 "/mytest.md" 或 "/技术/Linux/解压.md" */
  activePath: string | null;
  /** 当前编辑器中的 markdown 内容 */
  fileContent: string;
  /** 替换编辑器内容并保存到文件 */
  onContentReplace: (newContent: string) => void;
  /** 跳转到新分类路径的文件 */
  onNavigateToFile: (notePath: string) => void;
}

/** 判断文件是否在根目录下（路径中只有一层） */
function isRootFile(path: string): boolean {
  // path 格式如 "/mytest.md" 或 "/技术/Linux/解压.md"
  const segments = path.split('/').filter(Boolean);
  return segments.length === 1;
}

export const NoteToolbar: React.FC<NoteToolbarProps> = ({
  activePath,
  fileContent,
  onContentReplace,
  onNavigateToFile,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const previousContentRef = useRef<string>('');
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleOrganize = useCallback(async (options: {
    imageSemantic: boolean;
    noteFormat: boolean;
    classifySave: boolean;
  }) => {
    if (!activePath || loading) return;

    setLoading(true);
    setStatusText('提交任务...');
    setShowUndo(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // 保存当前内容用于撤销
    previousContentRef.current = fileContent;

    try {
      const taskId = await organizeNote({
        markdown_content: fileContent,
        enable_image_semantic: options.imageSemantic,
        enable_note_format: options.noteFormat,
        enable_classify_and_save: options.classifySave,
        enable_embedding: false,
      });

      cleanupRef.current = subscribeOrganizeProgress(taskId, {
        onProgress: (data) => {
          const label = getStepLabel(data.step);
          setStatusText(`${label}...`);
        },
        onResult: (data: OrganizeResult) => {
          setLoading(false);
          cleanupRef.current = null;

          if (!data.success) {
            setStatusText('整理失败');
            setTimeout(() => setStatusText(''), 3000);
            return;
          }

          if (options.classifySave && data.note_path) {
            // 根目录整理完成 → 自动跳转
            setStatusText('已分类，正在跳转...');
            // 短暂延迟让侧边栏刷新
            setTimeout(() => {
              onNavigateToFile(data.note_path!);
              setStatusText('');
            }, 1500);
          } else if (data.processed_content) {
            // 非根目录整理完成 → 替换内容
            onContentReplace(data.processed_content);
            setStatusText('');
            // 显示撤销按钮
            setShowUndo(true);
            undoTimerRef.current = setTimeout(() => setShowUndo(false), 8000);
          } else {
            setStatusText('完成');
            setTimeout(() => setStatusText(''), 2000);
          }
        },
        onError: (data) => {
          setLoading(false);
          cleanupRef.current = null;
          setStatusText(`出错: ${data.error}`);
          setTimeout(() => setStatusText(''), 4000);
        },
      });
    } catch (err) {
      setLoading(false);
      setStatusText(`请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setTimeout(() => setStatusText(''), 4000);
    }
  }, [activePath, fileContent, loading, onContentReplace, onNavigateToFile]);

  const handleUndo = useCallback(() => {
    if (previousContentRef.current) {
      onContentReplace(previousContentRef.current);
      setShowUndo(false);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  }, [onContentReplace]);

  // 没有打开文件或不是 md 文件 → 不显示
  if (!activePath || !activePath.endsWith('.md')) return null;

  const isRoot = isRootFile(activePath);

  return (
    <div className="note-toolbar">
      {isRoot ? (
        /* ===== 根目录模式：1 个按钮 ===== */
        <button
          className="note-toolbar-btn note-toolbar-btn-primary"
          disabled={loading}
          onClick={() => handleOrganize({
            imageSemantic: true,
            noteFormat: true,
            classifySave: true,
          })}
          title="提取语义 + 整理笔记 + 分类存储"
        >
          {loading ? (
            <span className="note-toolbar-spinner" />
          ) : (
            <svg className="note-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6" />
              <path d="M9 15l3 3 3-3" />
            </svg>
          )}
          整理笔记
        </button>
      ) : (
        /* ===== 非根目录模式：3 个按钮 ===== */
        <>
          <button
            className="note-toolbar-btn"
            disabled={loading}
            onClick={() => handleOrganize({
              imageSemantic: true,
              noteFormat: false,
              classifySave: false,
            })}
            title="使用 VL 模型提取图片语义"
          >
            {loading && statusText.includes('语义') ? (
              <span className="note-toolbar-spinner" />
            ) : (
              <svg className="note-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
              </svg>
            )}
            提取语义
          </button>

          <button
            className="note-toolbar-btn"
            disabled={loading}
            onClick={() => handleOrganize({
              imageSemantic: false,
              noteFormat: true,
              classifySave: false,
            })}
            title="使用 LLM 格式化排版笔记"
          >
            {loading && statusText.includes('整理') ? (
              <span className="note-toolbar-spinner" />
            ) : (
              <svg className="note-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="21" y1="10" x2="7" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="7" y2="18" />
              </svg>
            )}
            整理笔记
          </button>

          <button
            className="note-toolbar-btn note-toolbar-btn-primary"
            disabled={loading}
            onClick={() => handleOrganize({
              imageSemantic: true,
              noteFormat: true,
              classifySave: false,
            })}
            title="提取语义 + 整理笔记"
          >
            {loading ? (
              <span className="note-toolbar-spinner" />
            ) : (
              <svg className="note-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="10" cy="13" r="2" />
                <path d="M20 17l-1.09-1.09a2 2 0 0 0-2.82 0L10 22" />
              </svg>
            )}
            语义+整理
          </button>
        </>
      )}

      {/* 进度状态文字 */}
      {statusText && (
        <span className="note-toolbar-status">{statusText}</span>
      )}

      {/* 撤销按钮 */}
      {showUndo && (
        <button
          className="note-toolbar-undo"
          onClick={handleUndo}
        >
          <svg className="note-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          撤销
        </button>
      )}
    </div>
  );
};
