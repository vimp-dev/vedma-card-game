import { Card } from "../core/Card";
import { CardView } from "./CardView";
import { el, clearNode } from "./dom";

export interface HandViewOptions {
  facedown: boolean;
  /** Show card rank/count label below the hand. */
  showLabel?: boolean;
  label?: string;
  /** Called when an interactive card is clicked/activated. */
  onCardClick?: (cardId: string) => void;
}

/**
 * Renders a player's hand as a row of overlapping cards. Cards are matched
 * by id so existing DOM elements are reused across re-renders.
 */
export class HandView {
  readonly element: HTMLElement;
  private readonly labelEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly views = new Map<string, CardView>();
  private facedown: boolean;
  private readonly onCardClick?: (cardId: string) => void;

  constructor(options: HandViewOptions = { facedown: false }) {
    this.facedown = options.facedown;
    this.onCardClick = options.onCardClick;
    this.element = el("div", "hand");

    this.listEl = el("div", "hand__list");
    this.element.append(this.listEl);

    this.labelEl = el("div", "hand__label");
    if (options.showLabel) {
      this.element.append(this.labelEl);
    }
    this.setLabel(options.label ?? "");
  }

  setLabel(text: string): void {
    this.labelEl.textContent = text;
  }

  private attachCardHandlers(view: CardView): void {
    if (view.element.dataset.handlers === "1") return;
    view.element.dataset.handlers = "1";
    view.element.addEventListener("click", (ev) => {
      if (!this.onCardClick) return;
      if (!view.element.classList.contains("card--interactive")) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.onCardClick(view.card.id);
    });
    view.element.addEventListener("keydown", (ev) => {
      if (!this.onCardClick) return;
      if (!view.element.classList.contains("card--interactive")) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.onCardClick(view.card.id);
      }
    });
  }

  setFacedown(facedown: boolean): void {
    this.facedown = facedown;
    this.element.classList.toggle("hand--facedown", facedown);
    for (const view of this.views.values()) {
      view.setFacedown(facedown);
    }
  }

  /**
   * Re-renders the hand to match the given cards. Existing card elements are
   * reused; removed cards are detached (but returned for animations).
   */
  render(cards: readonly Card[]): void {
    const nextIds = new Set(cards.map((c) => c.id));
    this.element.classList.toggle("hand--facedown", this.facedown);

    // Remove stale views.
    for (const [id, view] of Array.from(this.views.entries())) {
      if (!nextIds.has(id)) {
        view.element.remove();
        this.views.delete(id);
      }
    }

    // (Re)create or update views in order.
    const fragments: HTMLElement[] = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      let view = this.views.get(card.id);
      if (!view) {
        view = new CardView(card, this.facedown);
        this.views.set(card.id, view);
      } else {
        view.setFacedown(this.facedown);
      }
      view.element.style.zIndex = String(i + 1);
      this.attachCardHandlers(view);
      fragments.push(view.element);
    }

    clearNode(this.listEl);
    for (const frag of fragments) {
      this.listEl.append(frag);
    }

    this.updateLayout(cards.length);
  }

  private updateLayout(count: number): void {
    // Apply fan rotation for small hands on wide screens.
    const fan = count > 0 && count <= 8 && window.innerWidth >= 600;
    this.listEl.classList.toggle("hand__list--fan", fan);
    if (!fan) {
      this.listEl.style.setProperty("--fan-rot", "0deg");
      return;
    }
    const maxRot = Math.min(10, 60 / Math.max(count, 1));
    const step = count <= 1 ? 0 : (maxRot * 2) / (count - 1);
    const cards = this.listEl.children;
    for (let i = 0; i < cards.length; i++) {
      const rotation = i * step - maxRot;
      (cards[i] as HTMLElement).style.setProperty("--fan-rot", `${rotation}deg`);
    }
  }

  getCardView(cardId: string): CardView | null {
    return this.views.get(cardId) ?? null;
  }

  getAllViews(): CardView[] {
    return Array.from(this.views.values());
  }

  getCardViews(): CardView[] {
    return this.getAllViews();
  }

  clear(): void {
    this.views.clear();
    clearNode(this.listEl);
  }
}