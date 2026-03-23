import { Editor } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import { remarkMediaPlugin, mediaNodePlugins } from './src/plugins/mediaPlugin.ts';
import fs from 'fs';

async function main() {
  const crepe = new Crepe({
    defaultValue: '![My Video](test.mp4)',
  });
  crepe.editor.use(remarkMediaPlugin).use(mediaNodePlugins);
  
  await crepe.create();
  
  const html = crepe.editor.action((ctx) => {
    // get DOM or Prosemirror state
    const { state } = ctx.get(import('@milkdown/prose/state').then(m => m.EditorState)); // doesn't work easily async
  });
  
  const mdast = await crepe.editor.action((ctx) => {
    // get mdast? No, just get the DOM from the root!
    return document.body.innerHTML;
  });
}
// since we need DOM, maybe JSDOM?
