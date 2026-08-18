import { Card } from "../core/Card";
import { el } from "./dom";

/**
 * Visual representation of the shared discard pile. Cards are shown as a
 * small stack with a count badge.
 */
export class DiscardPileView {
  readonly element: HTMLElement;
  private readonly pileEl: HTMLElement;
  private readonly countEl: HTMLElement;

  constructor(label: string) {
    this.element = el("div", "discard");
    this.element.setAttribute("aria-label", label);

    this.pileEl = el("div", "discard__pile");
    this.pileEl.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) {
      const layer = el("div", "discard__layer");
      layer.style.setProperty("--layer", String(i));
      this.pileEl.append(layer);
    }

    this.countEl = el("div", "discard__count");
    this.countEl.textContent = "0";

    this.element.append(this.pileEl, this.countEl);
  }

  update(pile: readonly Card[]): void {
    this.countEl.textContent = String(pile.length);
  }

  setLabel(label: string): void {
    this.element.setAttribute("aria-label", label);
  }
}