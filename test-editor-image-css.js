import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./src/components/editor-overrides.css', import.meta.url), 'utf8');

const inlineImageRule = css.match(/\.milkdown\s+\.ProseMirror\s+img\s*\{(?<body>[^}]*)\}/);

assert.ok(inlineImageRule, 'expected a .milkdown .ProseMirror img rule');
assert.match(
  inlineImageRule.groups?.body ?? '',
  /max-height\s*:\s*300px/,
  'inline markdown images should be capped to the same height as image blocks',
);
assert.match(
  inlineImageRule.groups?.body ?? '',
  /max-width\s*:\s*100%/,
  'inline markdown images should not overflow the editor width',
);
