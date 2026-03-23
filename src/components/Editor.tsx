import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { mediaNodePlugins, setMediaResolver } from '../plugins/mediaPlugin';
import { activeLinePlugin } from '../plugins/activeLinePlugin';
import { trailingLinesPlugin } from '../plugins/trailingLinesPlugin';
import { replaceAll } from '@milkdown/kit/utils';
import { remarkPreserveEmptyLinePlugin } from '@milkdown/kit/preset/commonmark';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame-dark.css';
import './editor-overrides.css';

export interface EditorHandle {
  insertMarkdown: (text: string) => void;
}

export interface EditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
  rootHandle?: FileSystemDirectoryHandle | null;
}

/**
 * Resolve a relative file path through the vault's directory handle
 * and return a blob URL for the browser to render.
 */
async function resolveRelativeSrc(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<string | null> {
  try {
    const parts = relativePath.split('/').filter(Boolean);
    let dir = rootHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export const Editor = forwardRef<EditorHandle, EditorProps>(({ initialContent, onChange, rootHandle }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const contentRef = useRef<string>(initialContent);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useImperativeHandle(ref, () => ({
    insertMarkdown: (text: string) => {
      if (crepeRef.current) {
        // Append text to the end of the current content
        const newContent = contentRef.current.trimEnd() + '\n\n' + text + '\n';
        crepeRef.current.editor.action(replaceAll(newContent));
        contentRef.current = newContent;
        onChange(newContent);
      }
    },
  }));

  useEffect(() => {
    if (!editorRef.current) return;

    const blobUrls = blobUrlsRef.current;

    // Set up the media resolver for video/audio NodeViews
    if (rootHandle) {
      setMediaResolver(async (relativePath: string) => {
        const blobUrl = await resolveRelativeSrc(rootHandle, relativePath);
        if (blobUrl) {
          blobUrls.add(blobUrl);
        }
        return blobUrl;
      });
    } else {
      setMediaResolver(null);
    }

    const crepe = new Crepe({
      root: editorRef.current,
      defaultValue: initialContent,
      featureConfigs: {
        [CrepeFeature.ImageBlock]: {
          proxyDomURL: (url: string) => {
            // Skip already-resolved or absolute URLs
            if (!url || url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:'))
              return url;
            if (!rootHandle) return url;
            return resolveRelativeSrc(rootHandle, url).then(blobUrl => {
              if (blobUrl) {
                blobUrls.add(blobUrl);
                return blobUrl;
              }
              return url;
            });
          },
        },
      },
    });

    crepe.editor.use(mediaNodePlugins);
    crepe.editor.use(activeLinePlugin);
    crepe.editor.use(trailingLinesPlugin);

    // 移除「保留空行」插件，避免空段落被序列化为 <br />
    crepe.editor.remove(remarkPreserveEmptyLinePlugin);

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        contentRef.current = markdown;
        onChange(markdown);
      });
    });

    crepe.create().then(() => {
      crepeRef.current = crepe;
    });

    return () => {
      setMediaResolver(null);
      crepe.destroy().catch(() => {});
      crepeRef.current = null;
      // Clean up blob URLs
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
      blobUrls.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount thanks to key on parent

  return (
    <div 
      ref={editorRef} 
      className="prose prose-invert max-w-none w-full outline-none h-full"
    />
  );
});

Editor.displayName = 'Editor';
