type SelectionHandlesOptions = {
  size?: number;
  inset?: number;
};

const HANDLE_CLASS = 'wdtw-handle';
const HOST_CLASS = 'wdtw-handle-host';

function makeHandle(position: 'tl' | 'tr' | 'bl' | 'br') {
  const el = document.createElement('span');
  el.className = `${HANDLE_CLASS} ${HANDLE_CLASS}--${position}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * Injects four “selection handle” corner dots into a node.
 * Visuals are styled globally in `ui/src/routes/+layout.svelte`.
 */
export function selectionHandles(node: HTMLElement, options: SelectionHandlesOptions = {}) {
  const size = options.size ?? 8;
  const inset = options.inset ?? -4;

  node.classList.add(HOST_CLASS);
  node.style.setProperty('--wdtw-handle-size', `${size}px`);
  node.style.setProperty('--wdtw-handle-inset', `${inset}px`);

  const initialPosition = node.style.position;
  if (!initialPosition || initialPosition === 'static') {
    node.style.position = 'relative';
  }

  const handles = [
    makeHandle('tl'),
    makeHandle('tr'),
    makeHandle('bl'),
    makeHandle('br'),
  ];
  for (const h of handles) node.appendChild(h);

  return {
    destroy() {
      node.classList.remove(HOST_CLASS);
      for (const h of handles) h.remove();
      node.style.removeProperty('--wdtw-handle-size');
      node.style.removeProperty('--wdtw-handle-inset');
    },
  };
}
