import { $prose } from '@milkdown/kit/utils';
import { keymap } from '@milkdown/kit/prose/keymap';

/**
 * ProseMirror keymap plugin: Ctrl+Enter to insert a new empty
 * paragraph below the current block, placing the cursor in it.
 *
 * This avoids having to navigate to the end of a line before pressing
 * Enter — the new line is always inserted *after* the current block.
 */

function insertLineBelow(state: any, dispatch?: any) {
  const { $from } = state.selection;
  if ($from.depth === 0) return false;

  // Find the end position of the current top-level block
  const endPos = $from.end(1) + 1;

  // Create a new empty paragraph node
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const newParagraph = paragraphType.createAndFill();
  if (!newParagraph) return false;

  if (dispatch) {
    const tr = state.tr.insert(endPos, newParagraph);
    // Place cursor inside the new paragraph (endPos + 1 = inside the new node)
    const newCursorPos = endPos + 1;
    tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newCursorPos)));
    tr.scrollIntoView();
    dispatch(tr);
  }

  return true;
}

export const insertLinePlugin = $prose(() => {
  return keymap({
    'Mod-Enter': insertLineBelow,
  });
});
