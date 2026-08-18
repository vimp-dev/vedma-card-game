export interface Screen {
  readonly element: HTMLElement;
  mount(): void;
  unmount(): void;
}

export abstract class BaseScreen implements Screen {
  readonly element: HTMLElement;

  constructor(tag: string, className: string) {
    this.element = document.createElement(tag);
    this.element.className = className;
  }

  mount(): void {
    // Intentionally empty — subclasses may override.
  }

  unmount(): void {
    // Intentionally empty.
  }
}