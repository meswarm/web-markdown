/**
 * Override Milkdown's built-in image-block schema so that the Markdown `alt`
 * field (square brackets) carries real semantic text instead of being hijacked
 * for the image aspect-ratio.
 *
 * Storage mapping (new):
 *   Markdown      →  ProseMirror attrs
 *   ─────────────    ──────────────────
 *   alt   (![…])  →  alt   (semantic text)
 *   url   ((…))   →  src
 *   title ("…")   →  caption  +  ratio (encoded as trailing {{r:N.NN}})
 *
 * Backward compatibility:
 *   If the alt text is a pure number (e.g. "1.00"), it is treated as the
 *   old-format ratio and the semantic alt is left empty.
 */
import { imageBlockSchema } from '@milkdown/kit/component/image-block';
import type { Ctx } from '@milkdown/kit/ctx';
import { expectDomTypeError } from '@milkdown/exception';

const IMAGE_DATA_TYPE = 'image-block';

// Regex to match a trailing {{r:1.23}} pattern in the title string
const RATIO_RE = /\s*\{\{r:([\d.]+)\}\}\s*$/;

/** Extract ratio from a title string; returns [cleanTitle, ratio]. */
function extractRatio(title: string | null | undefined): [string, number] {
  if (!title) return ['', 1];
  const m = title.match(RATIO_RE);
  if (m) {
    const ratio = Number(m[1]);
    const clean = title.replace(RATIO_RE, '');
    return [clean, Number.isNaN(ratio) || ratio === 0 ? 1 : ratio];
  }
  return [title, 1];
}

/** Encode ratio into a title string. */
function encodeRatio(caption: string, ratio: number): string {
  const r = Number.parseFloat(ratio.toFixed(2));
  if (r === 1) return caption;
  const suffix = `{{r:${r.toFixed(2)}}}`;
  return caption ? `${caption} ${suffix}` : suffix;
}

/** Check whether a string looks like a pure numeric ratio (old format). */
function isOldFormatRatio(alt: string): boolean {
  if (!alt) return true; // empty → treat as default ratio 1
  return /^\d+(\.\d+)?$/.test(alt.trim());
}

/**
 * Apply the image-block schema override via `crepe.editor.config(...)`.
 *
 * Usage in Editor.tsx:
 *   crepe.editor.config(applyImageBlockSchemaOverride);
 */
export function applyImageBlockSchemaOverride(ctx: Ctx) {
  ctx.set(imageBlockSchema.key, () => ({
    inline: false,
    group: 'block',
    selectable: true,
    draggable: true,
    isolating: true,
    marks: '',
    atom: true,
    priority: 100,
    attrs: {
      src: { default: '', validate: 'string' },
      caption: { default: '', validate: 'string' },
      ratio: { default: 1, validate: 'number' },
      alt: { default: '', validate: 'string' },
    },
    parseDOM: [
      {
        tag: `img[data-type="${IMAGE_DATA_TYPE}"]`,
        getAttrs: (dom: unknown) => {
          if (!(dom instanceof HTMLElement))
            throw expectDomTypeError(dom);
          return {
            src: dom.getAttribute('src') || '',
            caption: dom.getAttribute('caption') || '',
            ratio: Number(dom.getAttribute('ratio') ?? 1),
            alt: dom.getAttribute('alt') || '',
          };
        },
      },
    ],
    toDOM: (node: any) => [
      'img',
      { 'data-type': IMAGE_DATA_TYPE, ...node.attrs },
    ],

    // ── Parse (Markdown → ProseMirror) ────────────────────────────
    parseMarkdown: {
      match: ({ type }: any) => type === 'image-block',
      runner: (state: any, node: any, type: any) => {
        const src = (node.url as string) || '';
        const rawAlt = (node.alt as string) || '';
        const rawTitle = (node.title as string) || '';

        let alt: string;
        let ratio: number;
        let caption: string;

        if (isOldFormatRatio(rawAlt)) {
          // ── Old format: alt stores ratio ──
          ratio = Number(rawAlt) || 1;
          if (Number.isNaN(ratio) || ratio === 0) ratio = 1;
          alt = '';
          caption = rawTitle;
        } else {
          // ── New format: alt stores semantic text ──
          alt = rawAlt;
          const [cleanTitle, extractedRatio] = extractRatio(rawTitle);
          caption = cleanTitle;
          ratio = extractedRatio;
        }

        state.addNode(type, { src, caption, ratio, alt });
      },
    },

    // ── Serialize (ProseMirror → Markdown) ────────────────────────
    toMarkdown: {
      match: (node: any) => node.type.name === 'image-block',
      runner: (state: any, node: any) => {
        const alt = node.attrs.alt || '';
        const caption = node.attrs.caption || '';
        const ratio = node.attrs.ratio ?? 1;

        // Encode ratio into the title field when it's not default (1)
        const title = encodeRatio(caption, ratio);

        state.openNode('paragraph');
        state.addNode('image', undefined, undefined, {
          title: title || undefined,
          url: node.attrs.src,
          alt,
        });
        state.closeNode();
      },
    },
  }));
}
