import { Card } from "../core/Card";
import { GameState } from "../core/GameState";

/**
 * The information an AI is allowed to see. It must NOT contain hidden cards
 * (i.e. the opponent's hand contents). Only the AI's own hand and public
 * game state are visible.
 */
export interface VisibleInfo {
  /** Number of cards each opponent is holding (public information). */
  opponentCardCounts: Map<string, number>;
  /** Cards discarded so far (public information). */
  discardPile: readonly Card[];
  /** Own player id. */
  selfId: string;
}

/**
 * A decision made by an AI: draw a card from `sourcePlayerId`'s hand at the
 * given slot index. The AI never sees the actual card before choosing.
 */
export interface DrawChoice {
  sourcePlayerId: string;
  /** Index into the source player's hand (0-based). */
  index: number;
}

/**
 * Contract for any computer player. GameEngine never depends on a concrete
 * AI implementation — swap RandomAI for a smarter AI without touching the
 * engine.
 */
export interface AIPlayer {
  readonly name: string;

  /**
   * Decides which card to draw from which opponent.
   *
   * @param myHand       The AI's own hand (face-up from its perspective).
   * @param visibleInfo  Public information only.
   * @param gameState    Read-only snapshot of the game state.
   */
  chooseCard(
    myHand: readonly Card[],
    visibleInfo: VisibleInfo,
    gameState: Readonly<GameState>,
  ): DrawChoice;
}