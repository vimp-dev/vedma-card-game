import { Card, cardName, suitSymbol, rankSymbol } from "../core/Card";
import { el } from "./dom";

let uidCounter = 0;

/**
 * A single card rendered as a DOM element. The same element is reused across
 * hand re-renders (matched by card id) so transitions stay smooth.
 */
export class CardView {
  readonly element: HTMLElement;
  readonly card: Card;
  readonly uid: number;

  constructor(card: Card, facedown = false) {
    this.card = card;
    this.uid = ++uidCounter;
    this.element = el("div", "card");
    this.element.dataset.cardId = card.id;
    this.element.dataset.suit = card.suit;
    this.element.dataset.uid = String(this.uid);
    this.element.tabIndex = 0;
    this.render();
    if (facedown) this.setFacedown(true);
  }

  private render(): void {
    this.element.textContent = "";

    const name = cardName(this.card);
    this.element.setAttribute(
      "aria-label",
      `${name}${this.card.isWitch ? " · Witch" : ""}`,
    );

    const cornerTl = el("div", "card-corner card-corner--tl");
    const rankTl = el("span", "card-rank", rankSymbol(this.card.rank));
    const suitTl = el("span", "card-suit", suitSymbol(this.card.suit));
    cornerTl.append(rankTl, suitTl);

    const cornerBr = el("div", "card-corner card-corner--br");
    const rankBr = el("span", "card-rank", rankSymbol(this.card.rank));
    const suitBr = el("span", "card-suit", suitSymbol(this.card.suit));
    cornerBr.append(rankBr, suitBr);

    const center = el("div", "card-center");
    const bigSuit = el("span", "card-suit-big", suitSymbol(this.card.suit));
    center.append(bigSuit);

    if (this.card.isWitch) {
      center.classList.add("card-center--witch");
      const ornament = el("div", "card-witch-ornament");
      ornament.setAttribute("aria-hidden", "true");
      center.append(ornament);
    }

    this.element.append(cornerTl, cornerBr, center);
  }

  setFacedown(facedown: boolean): void {
    if (facedown) {
      this.element.classList.add("card--back");
      this.element.textContent = "";
      const back = el("div", "card-back-pattern");
      const glow = el("div", "card-back-glow");
      this.element.append(back, glow);
      this.element.setAttribute("aria-label", "Card");
    } else {
      this.element.classList.remove("card--back");
      this.render();
    }
  }

  isFacedown(): boolean {
    return this.element.classList.contains("card--back");
  }

  setInteractive(interactive: boolean): void {
    this.element.classList.toggle("card--interactive", interactive);
    this.element.tabIndex = interactive ? 0 : -1;
  }

  setHighlighted(highlighted: boolean): void {
    this.element.classList.toggle("card--highlighted", highlighted);
  }

  setDimmed(dimmed: boolean): void {
    this.element.classList.toggle("card--dimmed", dimmed);
  }

  /** Marks the card as "just arrived" — plays a small pop animation. */
  popIn(): void {
    this.element.classList.remove("card--pop");
    void this.element.offsetWidth; // restart animation
    this.element.classList.add("card--pop");
  }

  remove(): void {
    this.element.remove();
  }
}