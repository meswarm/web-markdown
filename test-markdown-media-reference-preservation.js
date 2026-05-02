import assert from 'node:assert/strict';
import { preserveMarkdownImageDestinations } from './src/utils/fs.ts';

const original = [
  '调用接口返回如下：',
  '',
  '![旧语义](<imgs/20260501140842_image_5f383011-e317-487a-9377-e8455f0944dd.png>)',
  '',
  '保存系统生成的首用户注册 Token 凭证。',
].join('\n');

const processed = [
  '调用接口返回如下：',
  '',
  '![Matrix客户端版本信息接口返回数据](imgs/20260501140842_image_5f383011-e317-487a-997b-ba8359997ee0.png)',
  '',
  '保存系统生成的首用户注册 Token 凭证。',
].join('\n');

assert.equal(
  preserveMarkdownImageDestinations(original, processed),
  [
    '调用接口返回如下：',
    '',
    '![Matrix客户端版本信息接口返回数据](<imgs/20260501140842_image_5f383011-e317-487a-9377-e8455f0944dd.png>)',
    '',
    '保存系统生成的首用户注册 Token 凭证。',
  ].join('\n'),
);

assert.equal(
  preserveMarkdownImageDestinations(
    '![a](<imgs/one.png>)\n![b](<imgs/two.png>)',
    '![new a](imgs/generated-a.png)\n![new b](imgs/generated-b.png)',
  ),
  '![new a](<imgs/one.png>)\n![new b](<imgs/two.png>)',
);
