import { $prose } from '@milkdown/kit/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

/**
 * ProseMirror plugin: highlights the block-level node that currently
 * contains the text cursor by applying a CSS class.
 *
 * The class `active-line` is added to the top-level block wrapper so
 * that an author can style it via CSS (e.g. a subtly brighter background).
 */

const activeLinePluginKey = new PluginKey('active-line');

export const activeLinePlugin = $prose(() => {
  return new Plugin({
    key: activeLinePluginKey,

    state: {
      init(_, state) {
        return buildDecorations(state);
      },
      apply(tr, oldDecos, _oldState, newState) {
        // Only recalculate when the selection or the document changed
        if (tr.selectionSet || tr.docChanged) {
          return buildDecorations(newState);
        }
        return oldDecos;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
});

function buildDecorations(state: any): DecorationSet {
  const { $from } = state.selection;

  // Resolve to the top-level block node that contains the cursor
  const depth = $from.depth;
  if (depth === 0) return DecorationSet.empty;

  // Walk up to depth 1 (direct child of doc) to highlight entire
  // top-level block, not a nested inline/block.
  const pos = $from.start(1) - 1;
  const node = $from.node(1);

  if (!node) return DecorationSet.empty;

  const deco = Decoration.node(pos, pos + node.nodeSize, {
    class: 'active-line',
  });

  return DecorationSet.create(state.doc, [deco]);
}
