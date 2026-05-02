import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./src/components/editor-overrides.css', import.meta.url), 'utf8');

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
  const match = css.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]*)\\}`));
  return match?.groups?.body ?? '';
}

assert.match(
  ruleBody('.milkdown .milkdown-code-block .cm-editor .cm-scroller'),
  /overflow-x\s*:\s*hidden/,
  'code block scroller should not create horizontal scrolling',
);

assert.match(
  ruleBody('.milkdown .milkdown-code-block .cm-editor .cm-line'),
  /white-space\s*:\s*pre-wrap/,
  'code block lines should wrap long commands by default',
);

assert.match(
  ruleBody('.milkdown .milkdown-code-block .cm-editor .cm-line'),
  /overflow-wrap\s*:\s*anywhere/,
  'code block lines should break long path-like tokens',
);

assert.match(
  ruleBody('.milkdown .milkdown-code-block .cm-editor .cm-line'),
  /word-break\s*:\s*break-all/,
  'code block lines should fill available width instead of moving whole tokens to the next line',
);
