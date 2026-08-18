import { Card } from "./Card";
import { PlayerState } from "./Player";

export type GamePhase =
  | "MENU"
  | "DEALING"
  | "PLAYER_TURN"
  | "DRAWING"
  | "RESOLVING_PAIR"
  | "AI_TURN"
  | "GAME_OVER"
  | "PAUSED";

export interface GameState {
  phase: GamePhase;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnNumber: number;
  discardPile: Card[];
  winner: string | null;
  loser: string | null;
  selectedCard: Card | null;
  isAnimating: boolean;
}

export function createInitialGameState(players: PlayerState[]): GameState {
  return {
    phase: "MENU",
    players,
    currentPlayerIndex: 0,
    turnNumber: 0,
    discardPile: [],
    winner: null,
    loser: null,
    selectedCard: null,
    isAnimating: false,
  };
}