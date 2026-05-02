import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorSource = readFileSync(new URL('./src/components/Editor.tsx', import.meta.url), 'utf8');

assert.match(
  editorSource,
  /from ['"]@codemirror\/view['"]/,
  'Editor should import CodeMirror view extensions',
);

assert.match(
  editorSource,
  /extensions\s*:\s*\[[^\]]*EditorView\.lineWrapping[^\]]*]/s,
  'CodeMirror code blocks should enable EditorView.lineWrapping',
);
