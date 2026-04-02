/**
 * 代码块折叠插件：当代码块内容超过最大高度时，
 * 在底部显示"展开 / 折叠"按钮，点击可切换显示完整内容。
 */
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const collapsePluginKey = new PluginKey('code-block-collapse');

/** 折叠状态的最大高度（px） */
const MAX_HEIGHT = 320;
/** 检测阈值：内容高度超过此值才显示按钮 */
const THRESHOLD = MAX_HEIGHT + 20;

/** 扫描所有代码块，对超高的添加折叠按钮 */
function processCodeBlocks() {
  const blocks = document.querySelectorAll<HTMLElement>(
    '.milkdown .milkdown-code-block'
  );

  blocks.forEach((block) => {
    const cmEditor = block.querySelector<HTMLElement>('.cm-editor');
    if (!cmEditor) return;

    // 已经处理过的跳过
    if (block.dataset.collapseInit === '1') return;

    // 获取自然高度
    const naturalHeight = cmEditor.scrollHeight;
    if (naturalHeight <= THRESHOLD) return;

    // 标记已初始化
    block.dataset.collapseInit = '1';

    // 默认折叠
    block.classList.add('code-block-collapsed');
    cmEditor.style.maxHeight = `${MAX_HEIGHT}px`;
    cmEditor.style.overflow = 'hidden';

    // 创建按钮容器
    const btnWrap = document.createElement('div');
    btnWrap.className = 'code-block-toggle-wrap';

    const btn = document.createElement('button');
    btn.className = 'code-block-toggle-btn';
    btn.textContent = '展开 ▼';
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isCollapsed = block.classList.contains('code-block-collapsed');
      if (isCollapsed) {
        block.classList.remove('code-block-collapsed');
        block.classList.add('code-block-expanded');
        cmEditor.style.maxHeight = 'none';
        cmEditor.style.overflow = 'visible';
        btn.textContent = '折叠 ▲';
      } else {
        block.classList.remove('code-block-expanded');
        block.classList.add('code-block-collapsed');
        cmEditor.style.maxHeight = `${MAX_HEIGHT}px`;
        cmEditor.style.overflow = 'hidden';
        btn.textContent = '展开 ▼';
      }
    });

    btnWrap.appendChild(btn);
    block.appendChild(btnWrap);
  });
}

export const codeBlockCollapsePlugin = $prose(() => {
  return new Plugin({
    key: collapsePluginKey,

    view() {
      // 初始化时等待 DOM 就绪后首次扫描
      setTimeout(processCodeBlocks, 300);

      return {
        update() {
          // 文档变化后重新扫描（新增/删除代码块）
          setTimeout(processCodeBlocks, 100);
        },
        destroy() {
          // 清理所有折叠状态
          document
            .querySelectorAll<HTMLElement>('.milkdown .milkdown-code-block')
            .forEach((block) => {
              delete block.dataset.collapseInit;
              block.classList.remove('code-block-collapsed', 'code-block-expanded');
              const wrap = block.querySelector('.code-block-toggle-wrap');
              if (wrap) wrap.remove();
              const cm = block.querySelector<HTMLElement>('.cm-editor');
              if (cm) {
                cm.style.maxHeight = '';
                cm.style.overflow = '';
              }
            });
        },
      };
    },
  });
});
