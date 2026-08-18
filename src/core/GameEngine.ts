import { Card } from "./Card";
import { Deck } from "./Deck";
import { GameState, createInitialGameState } from "./GameState";
import {
  PlayerState,
  PlayerType,
  createPlayerState,
} from "./Player";
import { removeAllPairs, removeOnePair } from "./GameRules";
import { RNG, createRNG } from "./RNG";

// ---------------------------------------------------------------------------
// Commands (platform/multiplayer agnostic representation of player actions)
// ---------------------------------------------------------------------------

export interface PlayerConfig {
  id: string;
  type: PlayerType;
  name: string;
}

export interface StartGameCommand {
  type: "START_GAME";
  players: PlayerConfig[];
  seed?: number;
}

export interface RestartGameCommand {
  type: "RESTART_GAME";
}

export interface DrawCardCommand {
  type: "DRAW_CARD";
  /** The player whose hand we draw a card from (must differ from current player). */
  sourcePlayerId: string;
  /** The exact card to draw from the source player's hand. */
  cardId: string;
}

export type GameCommand = StartGameCommand | RestartGameCommand | DrawCardCommand;

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface PairsRemovedEvent {
  playerId: string;
  pairs: [Card, Card][];
}

export interface CardDrawnEvent {
  playerId: string;
  fromPlayerId: string;
  card: Card;
}

export interface GameEventMap {
  GAME_STARTED: { players: PlayerState[]; seed?: number };
  CARDS_DEALT: { players: PlayerState[] };
  PAIRS_REMOVED: PairsRemovedEvent;
  TURN_STARTED: { playerIndex: number; playerId: string; turnNumber: number };
  CARD_DRAW_STARTED: { playerId: string; fromPlayerId: string };
  CARD_DRAWN: CardDrawnEvent;
  PAIR_CREATED: { playerId: string; card: Card; pair: [Card, Card] };
  CARDS_DISCARDED: { playerId: string; cards: Card[] };
  TURN_ENDED: { playerIndex: number; playerId: string };
  GAME_OVER: { winnerId: string; loserId: string };
}

type EventName = keyof GameEventMap;
type Handler<E extends EventName> = (payload: GameEventMap[E]) => void;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface GameEngineConfig {
  /** Number of full 52-card decks. Always 1 for the base game. */
  decks?: number;
}

export class GameEngine {
  state: GameState;
  private rng: RNG;
  private seed: number | undefined;
  private listeners = new Map<string, Set<(payload: never) => void>>();

  constructor(_config: GameEngineConfig = {}) {
    this.rng = createRNG();
    this.state = createInitialGameState([]);
  }

  // -- Event subscription ------------------------------------------------

  on<E extends EventName>(event: E, handler: Handler<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as (payload: never) => void);
    return () => {
      set!.delete(handler as (payload: never) => void);
    };
  }

  private emit<E extends EventName>(event: E, payload: GameEventMap[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      handler(payload as never);
    }
  }

  // -- Public API --------------------------------------------------------

  /** Executes a command. Returns true when the command was accepted. */
  execute(command: GameCommand): boolean {
    switch (command.type) {
      case "START_GAME":
        this.startGame(command.players, command.seed);
        return true;
      case "RESTART_GAME":
        this.restartGame();
        return true;
      case "DRAW_CARD":
        return this.drawCard(command);
      default:
        return false;
    }
  }

  /**
   * Starts a new game with the given players. The deck is shuffled with the
   * provided seed (or a random seed) and dealt round-robin to all players.
   */
  startGame(players: PlayerConfig[], seed?: number): void {
    if (players.length < 2) {
      throw new Error("A game requires at least 2 players");
    }
    this.seed = seed ?? this.createRandomSeed();
    this.rng = createRNG(this.seed);

    this.state = createInitialGameState(
      players.map((p) => createPlayerState(p.id, p.type, p.name)),
    );

    this.emit("GAME_STARTED", {
      players: this.state.players.map((p) => ({ ...p, hand: [...p.hand] })),
      seed: this.seed,
    });

    // -- Deal ---------------------------------------------------------
    this.state.phase = "DEALING";
    const deck = new Deck();
    deck.shuffle(this.rng);
    this.deal(deck);
    this.emit("CARDS_DEALT", {
      players: this.state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    });

    // -- Remove initial pairs ------------------------------------------
    for (const player of this.state.players) {
      this.resolveAllPairs(player.id);
    }

    // -- Determine starting player --------------------------------------
    const startingIndex = this.pickStartingPlayerIndex();
    if (this.checkGameOver()) return;
    this.startTurn(startingIndex, 1);
  }

  /** Resolves all currently-existing pairs in a player's hand. */
  resolveAllPairs(playerId: string): [Card, Card][] {
    const player = this.requirePlayer(playerId);
    const removed = removeAllPairs(player.hand);
    if (removed.length > 0) {
      for (const pair of removed) {
        this.state.discardPile.push(...pair);
      }
      this.emit("PAIRS_REMOVED", { playerId, pairs: removed });
    }
    return removed;
  }

  /**
   * Resolves the draw: the current player draws `cardId` from the source
   * player's hand, any resulting pair is discarded, and the turn advances.
   * Returns true when the draw was legal and applied.
   */
  drawCard(command: DrawCardCommand): boolean {
    if (
      this.state.phase !== "PLAYER_TURN" &&
      this.state.phase !== "AI_TURN"
    ) {
      return false;
    }
    if (this.isGameOver()) return false;

    const current = this.currentPlayer();
    const source = this.getPlayer(command.sourcePlayerId);
    if (!source) return false;
    if (source.id === current.id) return false;

    const cardIndex = source.hand.findIndex((c) => c.id === command.cardId);
    if (cardIndex === -1) return false;

    // The card has to physically belong to the source player, so we only
    // allow drawing a card that is actually in their hand.
    this.state.phase = "DRAWING";
    this.emit("CARD_DRAW_STARTED", {
      playerId: current.id,
      fromPlayerId: source.id,
    });

    const [card] = source.hand.splice(cardIndex, 1);
    current.hand.push(card);
    this.state.selectedCard = card;
    this.emit("CARD_DRAWN", {
      playerId: current.id,
      fromPlayerId: source.id,
      card: { ...card },
    });

    // -- Pair resolution ------------------------------------------------
    this.state.phase = "RESOLVING_PAIR";
    let discarded: Card[] = [];
    const pair = removeOnePair(current.hand);
    if (pair) {
      this.state.discardPile.push(...pair);
      discarded = [...pair];
      this.emit("PAIR_CREATED", {
        playerId: current.id,
        card: { ...card },
        pair: [pair[0], pair[1]].map((c) => ({ ...c })) as [Card, Card],
      });
      this.emit("CARDS_DISCARDED", {
        playerId: current.id,
        cards: discarded.map((c) => ({ ...c })),
      });
    }

    this.state.selectedCard = null;

    // -- Turn / game-over resolution --------------------------------------
    if (this.checkGameOver()) return true;

    const finished = this.state.currentPlayerIndex;
    this.state.turnNumber += 1;
    this.emit("TURN_ENDED", {
      playerIndex: finished,
      playerId: current.id,
    });
    this.startTurn((finished + 1) % this.state.players.length, this.state.turnNumber);
    return true;
  }

  /** Restarts the game with the same player set. */
  restartGame(): void {
    if (this.state.players.length === 0) return;
    const config = this.state.players.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
    }));
    this.startGame(config);
  }

  /** Reads the card at `index` of a player's hand (for building commands). */
  getCardAt(playerId: string, index: number): Card | null {
    const player = this.getPlayer(playerId);
    if (!player) return null;
    return player.hand[index] ?? null;
  }

  // -- Introspection ------------------------------------------------------

  isGameOver(): boolean {
    return this.state.phase === "GAME_OVER";
  }

  getWinner(): string | null {
    return this.state.winner;
  }

  getLoser(): string | null {
    return this.state.loser;
  }

  currentPlayer(): PlayerState {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getPlayer(id: string): PlayerState | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  /** The player who currently holds the Witch, or null. */
  getWitchHolder(): PlayerState | null {
    for (const player of this.state.players) {
      if (player.hand.some((c) => c.isWitch)) return player;
    }
    return null;
  }

  getSeed(): number | undefined {
    return this.seed;
  }

  /** Opponents of the given player (players a draw could be made from). */
  getDrawSources(playerId: string): PlayerState[] {
    return this.state.players.filter((p) => p.id !== playerId && p.hand.length > 0);
  }

  // -- Internals ----------------------------------------------------------

  /** Fisher–Yates shuffle using the game RNG (deterministic under a seed). */
  private shuffleHand(hand: Card[]): void {
    for (let i = hand.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      const tmp = hand[i];
      hand[i] = hand[j];
      hand[j] = tmp;
    }
  }

  private deal(deck: Deck): void {
    const n = this.state.players.length;
    let i = this.rng.int(n); // random starting position
    while (!deck.isEmpty) {
      const card = deck.drawTop();
      if (card) {
        this.state.players[i % n].hand.push(card);
      }
      i++;
    }
  }

  private pickStartingPlayerIndex(): number {
    // The player with the fewest cards after pair removal starts.
    let best = 0;
    let bestCount = Infinity;
    this.state.players.forEach((p, i) => {
      if (p.hand.length < bestCount) {
        bestCount = p.hand.length;
        best = i;
      }
    });
    return best;
  }

  private startTurn(playerIndex: number, turnNumber: number): void {
    this.state.currentPlayerIndex = playerIndex;
    this.state.turnNumber = turnNumber;
    const player = this.state.players[playerIndex];

    // Before the human acts, re-shuffle every hidden AI hand so the opponent
    // cannot track where a card landed from the previous animation and keep
    // taking the same card back.
    if (player.type === "human") {
      for (const p of this.state.players) {
        if (p.type === "ai" && p.hand.length > 1) {
          this.shuffleHand(p.hand);
        }
      }
    }

    for (const p of this.state.players) {
      p.isActive = p.id === player.id;
    }
    this.state.phase = player.type === "ai" ? "AI_TURN" : "PLAYER_TURN";
    this.emit("TURN_STARTED", {
      playerIndex,
      playerId: player.id,
      turnNumber,
    });
  }

  /**
   * Checks whether the game is over. A game ends as soon as a player has no
   * cards left. The loser is the player still holding the Witch.
   * Returns true when the game ended.
   */
  private checkGameOver(): boolean {
    for (const player of this.state.players) {
      if (player.hand.length === 0) {
        const loser = this.getWitchHolder();
        if (loser) {
          this.state.winner = player.id;
          this.state.loser = loser.id;
          this.state.phase = "GAME_OVER";
          for (const p of this.state.players) {
            p.isActive = false;
          }
          this.emit("GAME_OVER", {
            winnerId: player.id,
            loserId: loser.id,
          });
          return true;
        }
      }
    }
    return false;
  }

  private requirePlayer(id: string): PlayerState {
    const player = this.getPlayer(id);
    if (!player) {
      throw new Error(`Unknown player: ${id}`);
    }
    return player;
  }

  private createRandomSeed(): number {
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }
}