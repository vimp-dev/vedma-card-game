import { Card } from "./Card";

export type PlayerType = "human" | "ai";

export interface PlayerState {
  id: string;
  type: PlayerType;
  name: string;
  hand: Card[];
  isActive: boolean;
}

export function createPlayerState(
  id: string,
  type: PlayerType,
  name: string,
): PlayerState {
  return {
    id,
    type,
    name,
    hand: [],
    isActive: false,
  };
}

/** Number of cards a player holds. */
export function cardCount(player: PlayerState): number {
  return player.hand.length;
}