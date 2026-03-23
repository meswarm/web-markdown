import { $remark, $nodeSchema, $view } from '@milkdown/kit/utils';
import { visit } from 'unist-util-visit';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';

const VIDEO_EXTS = /\.(mp4|webm|mkv|mov|ogg)$/i;
const AUDIO_EXTS = /\.(mp3|wav|flac)$/i;

// ---------------------------------------------------------------------------
// 1. Remark plugin: intercept image / image-block AST nodes with media URLs
//    and convert them to custom AST types ("video-block" / "audio-block")
// ---------------------------------------------------------------------------

function visitMediaNodes(ast: any) {
  // Handle standalone images that remarkImageBlockPlugin already converted
  // to "image-block" type
  visit(ast, 'image-block', (node: any, index: number | undefined, parent: any) => {
    if (index == null || !parent) return;
    const url: string = node.url || '';
    if (VIDEO_EXTS.test(url)) {
      parent.children.splice(index, 1, { ...node, type: 'video-block' });
    } else if (AUDIO_EXTS.test(url)) {
      parent.children.splice(index, 1, { ...node, type: 'audio-block' });
    }
  });

  // Also handle inline images that remain as "image" type
  visit(ast, 'image', (node: any, index: number | undefined, parent: any) => {
    if (index == null || !parent) return;
    const url: string = node.url || '';
    if (VIDEO_EXTS.test(url)) {
      parent.children.splice(index, 1, { ...node, type: 'video-block' });
    } else if (AUDIO_EXTS.test(url)) {
      parent.children.splice(index, 1, { ...node, type: 'audio-block' });
    }
  });

  // And handle paragraph -> image patterns (before remarkImageBlockPlugin runs)
  visit(ast, 'paragraph', (node: any, index: number | undefined, parent: any) => {
    if (index == null || !parent) return;
    if (node.children?.length !== 1) return;
    const child = node.children[0];
    if (child.type !== 'image') return;
    const url: string = child.url || '';
    if (VIDEO_EXTS.test(url)) {
      parent.children.splice(index, 1, {
        type: 'video-block',
        url: child.url,
        alt: child.alt,
        title: child.title,
      });
    } else if (AUDIO_EXTS.test(url)) {
      parent.children.splice(index, 1, {
        type: 'audio-block',
        url: child.url,
        alt: child.alt,
        title: child.title,
      });
    }
  });

  return ast;
}

export const remarkMediaPlugin = $remark(
  'remark-media-block',
  () => () => visitMediaNodes,
);

// ---------------------------------------------------------------------------
// 2. Node schemas for video-block and audio-block
// ---------------------------------------------------------------------------

export const videoBlockSchema = $nodeSchema('video-block', () => ({
  inline: false,
  group: 'block',
  selectable: true,
  draggable: true,
  isolating: true,
  marks: '',
  atom: true,
  priority: 110, // higher than image-block (100) so it takes precedence
  attrs: {
    src: { default: '' },
    alt: { default: '' },
  },
  parseDOM: [{
    tag: 'video[data-type="video-block"]',
    getAttrs: (dom) => {
      if (!(dom instanceof HTMLElement)) return {};
      return {
        src: dom.getAttribute('src') || '',
        alt: dom.getAttribute('alt') || '',
      };
    },
  }],
  toDOM: (node) => [
    'video',
    {
      'data-type': 'video-block',
      src: node.attrs.src,
      alt: node.attrs.alt,
      controls: 'true',
    },
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'video-block',
    runner: (state, node, type) => {
      state.addNode(type, {
        src: (node as any).url as string,
        alt: ((node as any).alt as string) || '',
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'video-block',
    runner: (state, node) => {
      // Serialize back as standard markdown image syntax
      state.openNode('paragraph');
      state.addNode('image', undefined, undefined, {
        url: node.attrs.src,
        alt: node.attrs.alt || 'video',
      });
      state.closeNode();
    },
  },
}));

export const audioBlockSchema = $nodeSchema('audio-block', () => ({
  inline: false,
  group: 'block',
  selectable: true,
  draggable: true,
  isolating: true,
  marks: '',
  atom: true,
  priority: 110,
  attrs: {
    src: { default: '' },
    alt: { default: '' },
  },
  parseDOM: [{
    tag: 'audio[data-type="audio-block"]',
    getAttrs: (dom) => {
      if (!(dom instanceof HTMLElement)) return {};
      return {
        src: dom.getAttribute('src') || '',
        alt: dom.getAttribute('alt') || '',
      };
    },
  }],
  toDOM: (node) => [
    'audio',
    {
      'data-type': 'audio-block',
      src: node.attrs.src,
      alt: node.attrs.alt,
      controls: 'true',
    },
  ],
  parseMarkdown: {
    match: ({ type }) => type === 'audio-block',
    runner: (state, node, type) => {
      state.addNode(type, {
        src: (node as any).url as string,
        alt: ((node as any).alt as string) || '',
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === 'audio-block',
    runner: (state, node) => {
      state.openNode('paragraph');
      state.addNode('image', undefined, undefined, {
        url: node.attrs.src,
        alt: node.attrs.alt || 'audio',
      });
      state.closeNode();
    },
  },
}));

// ---------------------------------------------------------------------------
// 3. NodeView factories — create real DOM with blob URL resolution
// ---------------------------------------------------------------------------

/**
 * Creates a resolver function that converts relative paths to blob URLs
 * using the vault's directory handle.
 */
export type MediaResolver = (relativePath: string) => Promise<string | null>;

let _mediaResolver: MediaResolver | null = null;

export function setMediaResolver(resolver: MediaResolver | null) {
  _mediaResolver = resolver;
}

/**
 * Resolve a src and update the element's src attribute.
 */
async function resolveAndSetSrc(el: HTMLVideoElement | HTMLAudioElement, src: string) {
  if (!src || src.startsWith('blob:') || src.startsWith('http') || src.startsWith('data:')) {
    el.src = src;
    return;
  }
  if (_mediaResolver) {
    const blobUrl = await _mediaResolver(src);
    if (blobUrl) {
      el.src = blobUrl;
      // Store for cleanup
      (el as any).__blobUrl = blobUrl;
      return;
    }
  }
  el.src = src;
}

export const videoBlockView = $view(
  videoBlockSchema.node,
  (): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'milkdown-video-block';
      wrapper.contentEditable = 'false';

      // Create video element
      const video = document.createElement('video');
      video.controls = true;
      video.setAttribute('data-type', 'video-block');

      resolveAndSetSrc(video, initialNode.attrs.src);

      wrapper.appendChild(video);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type !== initialNode.type) return false;
          // Revoke old blob URL if any
          if ((video as any).__blobUrl) {
            URL.revokeObjectURL((video as any).__blobUrl);
            (video as any).__blobUrl = null;
          }
          resolveAndSetSrc(video, updatedNode.attrs.src);
          return true;
        },
        stopEvent: () => true,
        destroy: () => {
          if ((video as any).__blobUrl) {
            URL.revokeObjectURL((video as any).__blobUrl);
          }
        },
      };
    };
  },
);

export const audioBlockView = $view(
  audioBlockSchema.node,
  (): NodeViewConstructor => {
    return (initialNode, view, getPos) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'milkdown-audio-block';
      wrapper.contentEditable = 'false';

      const audio = document.createElement('audio');
      audio.controls = true;
      audio.setAttribute('data-type', 'audio-block');
      audio.style.width = '100%';
      audio.style.outline = 'none';

      resolveAndSetSrc(audio, initialNode.attrs.src);

      wrapper.appendChild(audio);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type !== initialNode.type) return false;
          if ((audio as any).__blobUrl) {
            URL.revokeObjectURL((audio as any).__blobUrl);
            (audio as any).__blobUrl = null;
          }
          resolveAndSetSrc(audio, updatedNode.attrs.src);
          return true;
        },
        stopEvent: () => true,
        destroy: () => {
          if ((audio as any).__blobUrl) {
            URL.revokeObjectURL((audio as any).__blobUrl);
          }
        },
      };
    };
  },
);

// ---------------------------------------------------------------------------
// 4. Combined export
// ---------------------------------------------------------------------------

export const mediaNodePlugins = [
  remarkMediaPlugin,
  videoBlockSchema,
  audioBlockSchema,
  videoBlockView,
  audioBlockView,
].flat();
