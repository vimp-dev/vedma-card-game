import { Card } from "../core/Card";
import { GameState } from "../core/GameState";
import { AIPlayer, DrawChoice, VisibleInfo } from "./AIPlayer";

/**
 * Simplest possible AI: picks a uniformly random opponent and a random card
 * slot in their hand. It never inspects hidden information and never cheats.
 */
export class RandomAI implements AIPlayer {
  readonly name: string;
  private readonly rng: { next(): number; int(max: number): number };

  constructor(rng: { next(): number; int(max: number): number }) {
    this.name = "AI";
    this.rng = rng;
  }

  chooseCard(
    _myHand: readonly Card[],
    visibleInfo: VisibleInfo,
    gameState: Readonly<GameState>,
  ): DrawChoice {
    const sources = gameState.players
      .filter((p) => p.id !== visibleInfo.selfId && p.hand.length > 0)
      .map((p) => p.id);

    if (sources.length === 0) {
      throw new Error("No valid draw sources available");
    }

    const sourcePlayerId = sources[this.rng.int(sources.length)];
    const count = visibleInfo.opponentCardCounts.get(sourcePlayerId) ?? 0;
    const index = count > 0 ? this.rng.int(count) : 0;
    return { sourcePlayerId, index };
  }
}