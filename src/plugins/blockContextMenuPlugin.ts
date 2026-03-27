/**
 * 右键菜单插件：在编辑器中右键点击时显示"删除该块"和"剪切该块"选项
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
  menuEl.innerHTML = `<button class="block-ctx-item block-ctx-delete">删除该块</button><button class="block-ctx-item block-ctx-cut">剪切该块</button>`;
  document.body.appendChild(menuEl);
  return menuEl;
}

function clearHighlight() {
  if (highlightedEl) {
    highlightedEl.classList.remove('block-ctx-highlight');
    highlightedEl.classList.remove('block-ctx-highlight-cut');
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

  // 第二步：尝试用 posAtDOM 精确获取位置
  try {
    const pos = view.posAtDOM(blockDom, 0);
    const resolved = view.state.doc.resolve(pos);
    // 找到顶层节点（depth 1 = doc 的直接子节点）
    const depth = Math.min(resolved.depth, 1);
    const from = resolved.before(depth || 1);
    const to = resolved.after(depth || 1);
    return { from, to, dom: blockDom };
  } catch {
    // posAtDOM 可能在某些 NodeView（如 CodeMirror）中失败，回退到索引匹配
  }

  // 第三步（回退）：过滤掉 Milkdown 注入的非文档节点，用过滤后的索引匹配
  const children = Array.from(editorDom.children) as HTMLElement[];
  const docChildren = children.filter((el) => {
    // 排除 Milkdown 框架元素（如拖拽手柄、工具栏等）
    const cls = el.className || '';
    if (cls.includes('milkdown-block-handle')) return false;
    if (cls.includes('ProseMirror-separator')) return false;
    if (cls.includes('ProseMirror-trailingBreak')) return false;
    if (el.getAttribute('data-milkdown-overlay') !== null) return false;
    // contenteditable=false 的独立框架元素通常不是文档节点
    // 但 NodeView 也可能是 contenteditable=false，所以不能用这个来过滤
    return true;
  });
  const index = docChildren.indexOf(blockDom);
  if (index === -1) return null;

  // 第四步：遍历文档顶层节点，通过过滤后的索引匹配位置
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

        // 剪切按钮：复制文本到剪贴板后删除块
        const cutBtn = menu.querySelector('.block-ctx-cut') as HTMLButtonElement;
        const newCutBtn = cutBtn.cloneNode(true) as HTMLButtonElement;
        cutBtn.replaceWith(newCutBtn);

        newCutBtn.addEventListener('click', () => {
          // 获取块的文本内容
          const slice = editorView.state.doc.slice(block.from, block.to);
          const textContent = slice.content.textBetween(0, slice.content.size, '\n', '\n');

          // 复制到剪贴板
          navigator.clipboard.writeText(textContent).then(() => {
            // 切换为绿色高亮，短暂闪烁后删除
            if (highlightedEl) {
              highlightedEl.classList.remove('block-ctx-highlight');
              highlightedEl.classList.add('block-ctx-highlight-cut');
            }
            setTimeout(() => {
              const tr = editorView.state.tr.delete(block.from, block.to);
              editorView.dispatch(tr);
              editorView.focus();
              clearHighlight();
            }, 180);
          }).catch(() => {
            // 剪贴板写入失败时回退：直接删除
            const tr = editorView.state.tr.delete(block.from, block.to);
            editorView.dispatch(tr);
            editorView.focus();
          });
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
