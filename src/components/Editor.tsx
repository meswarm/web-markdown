import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Crepe, CrepeFeature } from '@milkdown/crepe';
import { cobalt } from 'thememirror';
import { mediaNodePlugins, setMediaResolver } from '../plugins/mediaPlugin';
import { activeLinePlugin } from '../plugins/activeLinePlugin';
import { trailingLinesPlugin } from '../plugins/trailingLinesPlugin';
import { imageLightboxPlugin, setImageDblClickHandler } from '../plugins/imageLightboxPlugin';
import { insertLinePlugin } from '../plugins/insertLinePlugin';
import { blockContextMenuPlugin } from '../plugins/blockContextMenuPlugin';
import { codeBlockCollapsePlugin } from '../plugins/codeBlockCollapsePlugin';
import { applyImageBlockSchemaOverride } from '../plugins/imageBlockOverride';
import { editorViewCtx, parserCtx } from '@milkdown/core';
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
  onImageDoubleClick?: (src: string, alt: string) => void;
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

export const Editor = forwardRef<EditorHandle, EditorProps>(({ initialContent, onChange, rootHandle, onImageDoubleClick }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const contentRef = useRef<string>(initialContent);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useImperativeHandle(ref, () => ({
    insertMarkdown: (text: string) => {
      if (crepeRef.current) {
        // Use ProseMirror transaction API to insert at cursor position
        // with proper node types (ImageBlock, etc.) from Milkdown's parser
        crepeRef.current.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const parser = ctx.get(parserCtx);
          const doc = parser(text);
          if (!doc || !doc.content.childCount) return;

          const { state } = view;
          const { $from } = state.selection;

          // Find the end of the current top-level block (depth 1 = direct child of doc)
          let insertPos: number;
          if ($from.depth > 0) {
            insertPos = $from.end(1) + 1;
          } else {
            insertPos = state.doc.content.size;
          }

          // Clamp to valid document range
          insertPos = Math.min(insertPos, state.doc.content.size);

          const tr = state.tr.insert(insertPos, doc.content);
          view.dispatch(tr.scrollIntoView());
        });
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
        [CrepeFeature.CodeMirror]: {
          theme: cobalt,
        },
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

    // Override image-block schema: alt stores semantic text, ratio in title
    crepe.editor.config(applyImageBlockSchemaOverride);

    crepe.editor.use(mediaNodePlugins);
    crepe.editor.use(activeLinePlugin);
    crepe.editor.use(trailingLinesPlugin);
    crepe.editor.use(imageLightboxPlugin);
    crepe.editor.use(insertLinePlugin);
    crepe.editor.use(blockContextMenuPlugin);
    crepe.editor.use(codeBlockCollapsePlugin);

    // 移除「保留空行」插件，避免空段落被序列化为 <br />
    crepe.editor.remove(remarkPreserveEmptyLinePlugin);

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        contentRef.current = markdown;
        onChange(markdown);
      });
    });

    // Set the image double-click handler
    setImageDblClickHandler(onImageDoubleClick || null);

    crepe.create().then(() => {
      crepeRef.current = crepe;
    });

    return () => {
      setImageDblClickHandler(null);
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
