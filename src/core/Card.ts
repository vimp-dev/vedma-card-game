export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export const SUITS: readonly Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: readonly Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/**
 * The Witch: Queen of Spades. Never forms a pair and is never discarded.
 */
export const WITCH_SUIT: Suit = "spades";
export const WITCH_RANK: Rank = "Q";

export interface Card {
  /** Unique identifier of this card, e.g. "spades-Q". */
  id: string;
  suit: Suit;
  rank: Rank;
  isWitch: boolean;
}

export function createCard(suit: Suit, rank: Rank): Card {
  const isWitch = suit === WITCH_SUIT && rank === WITCH_RANK;
  return {
    id: `${suit}-${rank}`,
    suit,
    rank,
    isWitch,
  };
}

/** Whether two cards form a valid pair (same rank, neither is the Witch). */
export function isPair(a: Card, b: Card): boolean {
  if (a.isWitch || b.isWitch) return false;
  return a.rank === b.rank;
}

/** Human-readable symbol for a rank, e.g. "Q" or "10". */
export function rankSymbol(rank: Rank): string {
  return rank;
}

/** Human-readable symbol for a suit, e.g. "♠". */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
  }
}

/** Full human-readable name of a card, e.g. "8♠". */
export function cardName(card: Card): string {
  return `${rankSymbol(card.rank)}${suitSymbol(card.suit)}`;
}