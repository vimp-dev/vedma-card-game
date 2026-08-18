export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clearNode(node: HTMLElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function removeNode(node: HTMLElement | null | undefined): void {
  node?.remove();
}

export function rectOf(node: HTMLElement): DOMRect {
  return node.getBoundingClientRect();
}

export function centerOf(node: HTMLElement): { x: number; y: number } {
  const r = rectOf(node);
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function setAria(
  node: HTMLElement,
  props: Record<string, string | boolean | undefined>,
): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (value === true) {
      node.setAttribute(`aria-${key}`, "true");
    } else if (value === false) {
      node.setAttribute(`aria-${key}`, "false");
    } else {
      node.setAttribute(`aria-${key}`, value);
    }
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
}

/** Adds a one-shot event listener. */
export function once<K extends keyof HTMLElementEventMap>(
  node: HTMLElement,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
): void {
  const wrapped = (ev: HTMLElementEventMap[K]) => {
    handler(ev);
    node.removeEventListener(event, wrapped);
  };
  node.addEventListener(event, wrapped);
}