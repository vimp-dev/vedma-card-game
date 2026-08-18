import { Card, RANKS, SUITS, createCard } from "./Card";
import { RNG } from "./RNG";

/**
 * A full standard deck of 52 cards. Exactly one of them is the Witch (♠Q).
 */
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = Deck.buildCards();
  }

  static buildCards(): Card[] {
    const cards: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push(createCard(suit, rank));
      }
    }
    return cards;
  }

  get size(): number {
    return this.cards.length;
  }

  get isEmpty(): boolean {
    return this.cards.length === 0;
  }

  /** Shuffles the deck in place using the provided RNG. */
  shuffle(rng: RNG): void {
    // Fisher–Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      const tmp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = tmp;
    }
  }

  drawTop(): Card | null {
    return this.cards.pop() ?? null;
  }

  /**
   * Removes every Queen except the Witch (♠Q) from the deck, leaving only the
   * Queen of Spades in play. Called at deal time.
   */
  removeAllQueensButWitch(): void {
    this.cards = this.cards.filter((c) => c.isWitch || c.rank !== "Q");
  }
}