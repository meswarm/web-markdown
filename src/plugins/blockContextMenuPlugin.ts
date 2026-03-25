/**
 * 右键菜单插件：在编辑器中右键点击时显示"删除该块"选项
 * 支持删除段落行、图片块、代码块、视频块等任何顶层节点
 *
 * 使用原生 DOM 事件监听（捕获阶段），并通过 DOM 子节点索引
 * 匹配 ProseMirror 文档结构，确保所有 NodeView 都能正确触发。
 */
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const contextMenuPluginKey = new PluginKey('block-context-menu');

// 菜单容器 DOM（单例）
let menuEl: HTMLDivElement | null = null;
// 当前高亮的块 DOM 元素
let highlightedEl: HTMLElement | null = null;

function getOrCreateMenu(): HTMLDivElement {
  if (menuEl) return menuEl;
  menuEl = document.createElement('div');
  menuEl.className = 'block-context-menu';
  menuEl.innerHTML = `<button class="block-ctx-item block-ctx-delete">删除该块</button>`;
  document.body.appendChild(menuEl);
  return menuEl;
}

function clearHighlight() {
  if (highlightedEl) {
    highlightedEl.classList.remove('block-ctx-highlight');
    highlightedEl = null;
  }
}

function hideMenu() {
  if (menuEl) {
    menuEl.style.display = 'none';
  }
  clearHighlight();
}

/**
 * 从点击的 DOM 元素向上查找，找到 view.dom 的直接子元素（顶层块 DOM），
 * 然后通过 DOM 子元素索引匹配文档中的节点位置。
 * 这种方式不依赖 posAtDOM，兼容所有 NodeView（CodeMirror、图片等）。
 */
function findBlockFromDom(
  view: import('@milkdown/prose/view').EditorView,
  target: HTMLElement,
): { from: number; to: number; dom: HTMLElement } | null {
  const editorDom = view.dom;

  // 第一步：向上找到 editorDom 的直接子元素
  let blockDom: HTMLElement | null = target;
  while (blockDom && blockDom.parentElement !== editorDom) {
    blockDom = blockDom.parentElement;
    if (!blockDom || blockDom === document.body) return null;
  }
  if (!blockDom) return null;

  // 第二步：找到这个 DOM 元素在 editorDom.children 中的索引
  const children = Array.from(editorDom.children) as HTMLElement[];
  const index = children.indexOf(blockDom);
  if (index === -1) return null;

  // 第三步：遍历文档顶层节点，通过索引匹配位置
  const doc = view.state.doc;
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    if (i === index) {
      return { from: pos, to: pos + child.nodeSize, dom: blockDom };
    }
    pos += child.nodeSize;
  }

  return null;
}

export const blockContextMenuPlugin = $prose(() => {
  return new Plugin({
    key: contextMenuPluginKey,
    view(editorView) {
      const handler = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target) return;

        // 确认点击发生在编辑器区域内
        const editorRoot = editorView.dom.closest('.milkdown');
        if (!editorRoot || !editorRoot.contains(target)) return;

        // 查找对应的块节点
        const block = findBlockFromDom(editorView, target);
        if (!block) return;

        event.preventDefault();
        event.stopPropagation();

        // 清除旧高亮，添加新高亮
        clearHighlight();
        highlightedEl = block.dom;
        highlightedEl.classList.add('block-ctx-highlight');

        const menu = getOrCreateMenu();
        menu.style.display = 'block';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        // 确保菜单不超出视口
        requestAnimationFrame(() => {
          const rect = menu.getBoundingClientRect();
          if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 8}px`;
          }
          if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 8}px`;
          }
        });

        // 移除旧监听后重新绑定一次性点击
        const deleteBtn = menu.querySelector('.block-ctx-delete') as HTMLButtonElement;
        const newDeleteBtn = deleteBtn.cloneNode(true) as HTMLButtonElement;
        deleteBtn.replaceWith(newDeleteBtn);

        newDeleteBtn.addEventListener('click', () => {
          const tr = editorView.state.tr.delete(block.from, block.to);
          editorView.dispatch(tr);
          editorView.focus();
          hideMenu();
        }, { once: true });

        // 点击其他地方关闭菜单（包括再次右键）
        const closeHandler = (e: MouseEvent) => {
          if (!menu.contains(e.target as Node)) {
            hideMenu();
            document.removeEventListener('click', closeHandler, true);
            document.removeEventListener('contextmenu', closeHandler, true);
          }
        };
        setTimeout(() => {
          document.addEventListener('click', closeHandler, true);
          document.addEventListener('contextmenu', closeHandler, true);
        }, 0);
      };

      // 在 milkdown 根容器上以捕获阶段监听
      const milkdownRoot = editorView.dom.closest('.milkdown');
      if (milkdownRoot) {
        milkdownRoot.addEventListener('contextmenu', handler as EventListener, true);
      }

      return {
        destroy() {
          if (milkdownRoot) {
            milkdownRoot.removeEventListener('contextmenu', handler as EventListener, true);
          }
          hideMenu();
        },
      };
    },
  });
});
