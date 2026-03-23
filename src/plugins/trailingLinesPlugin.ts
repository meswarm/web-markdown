import { $prose } from '@milkdown/kit/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

/**
 * ProseMirror plugin: ensures the document always ends with at least
 * MIN_TRAILING empty paragraphs.
 *
 * This gives users a visible "click zone" at the bottom of the editor
 * so they can easily place the cursor there to type or paste content.
 *
 * Works at the document-model level (not markdown text level) to avoid
 * the issue of trailing newlines being collapsed by the markdown parser.
 */

const trailingLinesKey = new PluginKey('trailing-empty-lines');
const MIN_TRAILING = 5;

export const trailingLinesPlugin = $prose(() => {
  return new Plugin({
    key: trailingLinesKey,

    appendTransaction(_transactions, _oldState, newState) {
      const { doc, schema } = newState;
      const paragraphType = schema.nodes.paragraph;
      if (!paragraphType) return null;

      // Count consecutive empty paragraphs at the end of the document
      let trailingEmpty = 0;
      for (let i = doc.childCount - 1; i >= 0; i--) {
        const child = doc.child(i);
        if (child.type === paragraphType && child.content.size === 0) {
          trailingEmpty++;
        } else {
          break;
        }
      }

      // Already enough trailing empty paragraphs
      if (trailingEmpty >= MIN_TRAILING) return null;

      // Build and insert the missing empty paragraph nodes
      const needed = MIN_TRAILING - trailingEmpty;
      const tr = newState.tr;
      for (let i = 0; i < needed; i++) {
        tr.insert(tr.doc.content.size, paragraphType.create());
      }

      return tr;
    },
  });
});
