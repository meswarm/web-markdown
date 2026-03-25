import { $prose } from '@milkdown/kit/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';

// Callback type for when an image is double-clicked
export type ImageDblClickHandler = (src: string, alt: string) => void;

let _imageDblClickHandler: ImageDblClickHandler | null = null;

export function setImageDblClickHandler(handler: ImageDblClickHandler | null) {
  _imageDblClickHandler = handler;
}

/**
 * ProseMirror plugin that intercepts double-click events on images
 * at the editor level (before node views can stop propagation).
 */
export const imageLightboxPlugin = $prose(() => {
  return new Plugin({
    key: new PluginKey('image-lightbox'),
    props: {
      handleDOMEvents: {
        dblclick: (_view, event) => {
          if (!_imageDblClickHandler) return false;

          const target = event.target as HTMLElement;

          // Case 1: Direct click on <img>
          if (target.tagName === 'IMG') {
            const img = target as HTMLImageElement;
            if (img.src) {
              _imageDblClickHandler(img.src, img.alt || '');
              event.preventDefault();
              return true;
            }
          }

          // Case 2: Click on a wrapper element around an image
          // (Milkdown ImageBlock wraps <img> in .image-wrapper inside .milkdown-image-block)
          const imageBlock = target.closest('.milkdown-image-block');
          if (imageBlock) {
            const img = imageBlock.querySelector('img') as HTMLImageElement;
            if (img?.src) {
              _imageDblClickHandler(img.src, img.alt || '');
              event.preventDefault();
              return true;
            }
          }

          // Case 3: Check any ancestor or descendant for an img
          const parentWithImg = target.closest('[data-type="image-block"]');
          if (parentWithImg) {
            const img = parentWithImg.querySelector('img') as HTMLImageElement;
            if (img?.src) {
              _imageDblClickHandler(img.src, img.alt || '');
              event.preventDefault();
              return true;
            }
          }

          return false;
        },
      },
    },
  });
});
