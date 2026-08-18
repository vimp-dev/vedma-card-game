import { el } from "./dom";

export type TurnState = "idle" | "you" | "opponent";

/**
 * Indicator showing whose turn it is. Pulses softly when the turn changes.
 */
export class TurnIndicator {
  readonly element: HTMLElement;
  private readonly iconEl: HTMLElement;
  private readonly textEl: HTMLElement;

  constructor() {
    this.element = el("div", "turn-indicator", "");
    this.element.setAttribute("role", "status");
    this.iconEl = el("div", "turn-indicator__icon", "");
    this.iconEl.setAttribute("aria-hidden", "true");
    this.textEl = el("div", "turn-indicator__text");
    this.element.append(this.iconEl, this.textEl);
    this.setText("");
  }

  setText(text: string): void {
    this.textEl.textContent = text;
    this.textEl.setAttribute("aria-live", "polite");
  }

  setState(state: TurnState): void {
    this.element.classList.toggle("turn-indicator--you", state === "you");
    this.element.classList.toggle("turn-indicator--opponent", state === "opponent");
    this.element.classList.toggle("turn-indicator--idle", state === "idle");
    // Pulse on change.
    this.element.classList.remove("turn-indicator--pulse");
    void this.element.offsetWidth;
    this.element.classList.add("turn-indicator--pulse");
  }
}