import { Card, isPair } from "./Card";

/**
 * Finds all currently resolvable pairs in a hand.
 *
 * Pairs are matched by rank. The Witch (♠Q) never participates in a pair.
 * When three+ cards of the same rank exist, pairs are removed greedily —
 * exactly one available pair is removed per call, guaranteeing the caller
 * can control the deterministic order of removal.
 */
export function findPairIndices(hand: readonly Card[]): [number, number] | null {
  const byRank = new Map<string, number[]>();
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (card.isWitch) continue;
    const indices = byRank.get(card.rank);
    if (indices) {
      indices.push(i);
    } else {
      byRank.set(card.rank, [i]);
    }
  }
  for (const indices of byRank.values()) {
    if (indices.length >= 2) {
      return [indices[0], indices[1]];
    }
  }
  return null;
}

/**
 * Removes a single resolvable pair from the hand (if any exists).
 * Returns the removed pair, or null when no pair could be removed.
 */
export function removeOnePair(hand: Card[]): [Card, Card] | null {
  const pair = findPairIndices(hand);
  if (!pair) return null;
  const [i, j] = pair;
  // Remove the higher index first so the lower one stays valid.
  const a = hand[j];
  const b = hand[i];
  if (j > i) {
    hand.splice(j, 1);
    hand.splice(i, 1);
  } else {
    hand.splice(i, 1);
    hand.splice(j, 1);
  }
  return [a, b];
}

/**
 * Removes ALL resolvable pairs from the hand. Returns the removed pairs.
 * The Witch is never removed.
 */
export function removeAllPairs(hand: Card[]): [Card, Card][] {
  const removed: [Card, Card][] = [];
  let pair: [Card, Card] | null;
  while ((pair = removeOnePair(hand)) !== null) {
    removed.push(pair);
  }
  return removed;
}

/**
 * Counts cards of a given rank (excluding the Witch) in the hand.
 */
export function countOfRank(hand: readonly Card[], rank: string): number {
  let count = 0;
  for (const card of hand) {
    if (!card.isWitch && card.rank === rank) count++;
  }
  return count;
}

/** True when the hand contains at least one card that pairs with `card`. */
export function hasPairFor(hand: readonly Card[], card: Card): boolean {
  if (card.isWitch) return false;
  for (const other of hand) {
    if (isPair(card, other)) return true;
  }
  return false;
}