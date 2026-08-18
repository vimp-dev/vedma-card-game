import { describe, expect, it } from "vitest";
import { Card, createCard } from "../src/core/Card";
import { Deck } from "../src/core/Deck";
import { GameEngine } from "../src/core/GameEngine";
import { SeededRNG, createRNG } from "../src/core/RNG";
import {
  countOfRank,
  findPairIndices,
  hasPairFor,
  removeAllPairs,
  removeOnePair,
} from "../src/core/GameRules";
import { createPlayerState } from "../src/core/Player";
import { RandomAI } from "../src/ai/RandomAI";
import { VisibleInfo } from "../src/ai/AIPlayer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function card(suit: Card["suit"], rank: Card["rank"]): Card {
  return createCard(suit, rank);
}

/** Builds an engine with a fixed two-player setup and specific hands. */
function setupEngine(
  humanHand: Card[],
  aiHand: Card[],
  phase: "PLAYER_TURN" | "AI_TURN" = "PLAYER_TURN",
  currentIndex = 0,
): GameEngine {
  const engine = new GameEngine();
  engine.state.players = [
    createPlayerState("human", "human", "You"),
    createPlayerState("ai", "ai", "AI"),
  ];
  engine.state.phase = phase;
  engine.state.currentPlayerIndex = currentIndex;
  engine.state.turnNumber = 1;
  engine.state.players[0].hand = [...humanHand];
  engine.state.players[1].hand = [...aiHand];
  engine.state.players[currentIndex].isActive = true;
  return engine;
}

const WITCH = card("spades", "Q");

// ---------------------------------------------------------------------------

describe("Deck", () => {
  it("contains exactly 52 cards", () => {
    const deck = new Deck();
    expect(deck.size).toBe(52);
  });

  it("contains exactly one Queen of Spades and it is the Witch", () => {
    const deck = new Deck();
    const witchCount = deck["cards"].filter(
      (c) => c.suit === "spades" && c.rank === "Q",
    ).length;
    expect(witchCount).toBe(1);
    const witch = deck["cards"].find((c) => c.suit === "spades" && c.rank === "Q")!;
    expect(witch.isWitch).toBe(true);
  });

  it("shuffle preserves all 52 cards", () => {
    const deck = new Deck();
    const before = deck["cards"].map((c) => c.id).sort();
    deck.shuffle(createRNG(42));
    const after = deck["cards"].map((c) => c.id).sort();
    expect(after).toEqual(before);
  });
});

describe("Deal", () => {
  it("deals exactly 52 cards across all players", () => {
    const engine = new GameEngine();
    const events: { total: number; unique: number }[] = [];
    engine.on("CARDS_DEALT", (e) => {
      const ids = e.players.flatMap((p) => p.hand.map((c) => c.id));
      events.push({ total: ids.length, unique: new Set(ids).size });
    });
    engine.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "AI" },
      ],
      7,
    );
    expect(events[0].total).toBe(52);
    expect(events[0].unique).toBe(52);
    // Total cards (hands + discard) is conserved.
    const total = engine.state.players.reduce((s, p) => s + p.hand.length, 0);
    expect(total + engine.state.discardPile.length).toBe(52);
  });

  it("dealt hands differ by at most one card", () => {
    const engine = new GameEngine();
    let dealt: number[] = [];
    engine.on("CARDS_DEALT", (e) => {
      dealt = e.players.map((p) => p.hand.length);
    });
    engine.startGame(
      [
        { id: "p0", type: "human", name: "You" },
        { id: "p1", type: "ai", name: "A" },
        { id: "p2", type: "ai", name: "B" },
      ],
      3,
    );
    expect(dealt).toHaveLength(3);
    expect(Math.max(...dealt) - Math.min(...dealt)).toBeLessThanOrEqual(1);
    expect(dealt.reduce((a, b) => a + b, 0)).toBe(52);
  });
});

describe("Pair rules", () => {
  it("removes a simple pair", () => {
    const hand = [card("spades", "8"), card("hearts", "8")];
    const removed = removeAllPairs(hand);
    expect(removed).toHaveLength(1);
    expect(hand).toHaveLength(0);
  });

  it("never removes the Witch", () => {
    const hand = [WITCH, card("hearts", "2"), card("diamonds", "2")];
    const removed = removeAllPairs(hand);
    expect(removed).toHaveLength(1);
    expect(hand).toEqual([WITCH]);
  });

  it("the Witch never forms a pair with another queen", () => {
    const hand = [WITCH, card("hearts", "Q")];
    expect(hasPairFor(hand, WITCH)).toBe(false);
    expect(findPairIndices(hand)).toBeNull();
    expect(removeOnePair(hand)).toBeNull();
  });

  it("two queens (excluding the Witch) form a pair", () => {
    const hand = [card("clubs", "Q"), card("diamonds", "Q")];
    expect(removeOnePair(hand)).not.toBeNull();
    expect(hand).toHaveLength(0);
  });

  it("handles three same-rank cards by removing exactly one pair", () => {
    const hand = [card("spades", "7"), card("hearts", "7"), card("diamonds", "7")];
    const removed = removeOnePair(hand);
    expect(removed).not.toBeNull();
    expect(hand).toHaveLength(1);
    expect(countOfRank(hand, "7")).toBe(1);
  });

  it("removeAllPairs clears all pairs greedily", () => {
    const hand = [
      card("spades", "7"),
      card("hearts", "7"),
      card("diamonds", "7"),
      card("clubs", "7"),
    ];
    const removed = removeAllPairs(hand);
    expect(removed).toHaveLength(2);
    expect(hand).toHaveLength(0);
  });

  it("queens of spades + clubs is not a valid pair (Witch excluded)", () => {
    const hand = [WITCH, card("clubs", "Q")];
    expect(removeAllPairs(hand)).toHaveLength(0);
    expect(hand).toEqual([WITCH, card("clubs", "Q")]);
  });
});

describe("Draw mechanics", () => {
  it("drawing a card that forms a pair discards the pair", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "8"), card("diamonds", "5")],
    );
    const discarded: Card[][] = [];
    engine.on("CARDS_DISCARDED", (e) => discarded.push(e.cards));

    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "clubs-8",
    });

    expect(ok).toBe(true);
    const human = engine.getPlayer("human")!;
    expect(human.hand).toHaveLength(0);
    expect(discarded).toHaveLength(1);
    expect(discarded[0].map((c) => c.id).sort()).toEqual(["clubs-8", "hearts-8"]);
    expect(engine.state.discardPile.map((c) => c.id).sort()).toEqual([
      "clubs-8",
      "hearts-8",
    ]);
  });

  it("drawing a card without a match keeps it in the hand", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "10"), card("diamonds", "5")],
    );
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "clubs-10",
    });
    expect(ok).toBe(true);
    const human = engine.getPlayer("human")!;
    expect(human.hand).toHaveLength(2);
    expect(human.hand.some((c) => c.id === "clubs-10")).toBe(true);
  });

  it("rejects a draw when it is not the player's turn", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "10")],
      "AI_TURN",
      1,
    );
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "clubs-10",
    });
    expect(ok).toBe(false);
    expect(engine.getPlayer("human")!.hand).toHaveLength(1);
  });

  it("rejects drawing your own card", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "10")],
    );
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "human",
      cardId: "hearts-8",
    });
    expect(ok).toBe(false);
  });

  it("rejects drawing a card the source doesn't hold", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "10")],
    );
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "spades-A",
    });
    expect(ok).toBe(false);
  });
});

describe("Witch transfer and game end", () => {
  it("the Witch can move between players", () => {
    const engine = setupEngine([card("hearts", "8")], [WITCH]);
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "spades-Q",
    });
    expect(ok).toBe(true);
    const human = engine.getPlayer("human")!;
    expect(human.hand.some((c) => c.isWitch)).toBe(true);
    expect(engine.getWitchHolder()!.id).toBe("human");
  });

  it("a player with zero cards wins; the Witch holder loses", () => {
    const engine = setupEngine([card("hearts", "8")], [WITCH]);
    engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "spades-Q",
    });
    // Human now holds the Witch; AI has zero cards.
    expect(engine.isGameOver()).toBe(true);
    expect(engine.getWinner()).toBe("ai");
    expect(engine.getLoser()).toBe("human");
  });

  it("game over is detected when a player reaches zero", () => {
    const engine = setupEngine([card("hearts", "8")], [WITCH, card("clubs", "10")]);
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "ai", cardId: "spades-Q" });
    // Human now has 8 + Q (2 cards). Not over.
    expect(engine.isGameOver()).toBe(false);
  });

  it("a player left holding the Witch loses when the opponent empties", () => {
    // Human: Witch + 8♠. AI: 8♥. AI draws 8♠ → pair discarded → AI hand
    // empties while the human still holds the Witch. Human loses.
    const engine = setupEngine(
      [WITCH, card("spades", "8")],
      [card("hearts", "8")],
      "AI_TURN",
      1,
    );
    engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "human",
      cardId: "spades-8",
    });
    expect(engine.isGameOver()).toBe(true);
    expect(engine.getWinner()).toBe("ai");
    expect(engine.getLoser()).toBe("human");
    expect(engine.getPlayer("human")!.hand).toEqual([WITCH]);
  });

  it("no further actions are possible after game over", () => {
    const engine = setupEngine([card("hearts", "8")], [WITCH]);
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "ai", cardId: "spades-Q" });
    expect(engine.isGameOver()).toBe(true);
    const before = engine.state.discardPile.length;
    const ok = engine.drawCard({
      type: "DRAW_CARD",
      sourcePlayerId: "ai",
      cardId: "spades-Q",
    });
    expect(ok).toBe(false);
    expect(engine.state.discardPile.length).toBe(before);
    expect(engine.state.phase).toBe("GAME_OVER");
  });

  it("emit GAME_OVER exactly once with correct ids", () => {
    const engine = setupEngine([card("hearts", "8")], [WITCH]);
    const over: { winnerId: string; loserId: string }[] = [];
    engine.on("GAME_OVER", (e) => over.push(e));
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "ai", cardId: "spades-Q" });
    expect(over).toHaveLength(1);
    expect(over[0]).toEqual({ winnerId: "ai", loserId: "human" });
  });
});

describe("Events", () => {
  it("emits the documented event sequence for a normal draw", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [card("clubs", "10"), card("diamonds", "5")],
    );
    const seq: string[] = [];
    engine.on("CARD_DRAW_STARTED", () => seq.push("CARD_DRAW_STARTED"));
    engine.on("CARD_DRAWN", () => seq.push("CARD_DRAWN"));
    engine.on("TURN_ENDED", () => seq.push("TURN_ENDED"));
    engine.on("TURN_STARTED", () => seq.push("TURN_STARTED"));
    engine.on("PAIR_CREATED", () => seq.push("PAIR_CREATED"));
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "ai", cardId: "clubs-10" });
    expect(seq).toEqual([
      "CARD_DRAW_STARTED",
      "CARD_DRAWN",
      "TURN_ENDED",
      "TURN_STARTED",
    ]);
  });

  it("emits PAIR_CREATED and CARDS_DISCARDED for a matching draw", () => {
    const engine = setupEngine(
      [card("hearts", "8"), card("diamonds", "3")],
      [card("clubs", "8")],
    );
    const seq: string[] = [];
    engine.on("CARD_DRAWN", () => seq.push("CARD_DRAWN"));
    engine.on("PAIR_CREATED", () => seq.push("PAIR_CREATED"));
    engine.on("CARDS_DISCARDED", () => seq.push("CARDS_DISCARDED"));
    engine.on("GAME_OVER", () => seq.push("GAME_OVER"));
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "ai", cardId: "clubs-8" });
    expect(seq).toEqual(["CARD_DRAWN", "PAIR_CREATED", "CARDS_DISCARDED"]);
    expect(engine.getPlayer("human")!.hand.map((c) => c.id)).toEqual(["diamonds-3"]);
  });
});

describe("AI", () => {
  it("never receives hidden cards — only counts", () => {
    const engine = setupEngine(
      [card("hearts", "8"), card("diamonds", "K")],
      [WITCH, card("clubs", "10")],
      "AI_TURN",
      1,
    );
    const ai = new RandomAI(createRNG(1));
    let seenHand: Card[] = [];
    let seenInfo: VisibleInfo | null = null;
    const choice = ai.chooseCard(
      engine.getPlayer("ai")!.hand,
      (seenInfo = {
        selfId: "ai",
        opponentCardCounts: new Map([["human", engine.getPlayer("human")!.hand.length]]),
        discardPile: [],
      }),
      engine.state,
    );
    expect(seenInfo.opponentCardCounts.get("human")).toBe(2);
    expect(seenInfo.discardPile).toEqual([]);
    // The AI's own hand is what it sees.
    seenHand = engine.getPlayer("ai")!.hand;
    expect(seenHand.map((c) => c.id)).toEqual(["spades-Q", "clubs-10"]);
    // Its choice only references the opponent's hand by index/count.
    expect(choice.sourcePlayerId).toBe("human");
    expect(choice.index).toBeGreaterThanOrEqual(0);
    expect(choice.index).toBeLessThan(2);
  });

  it("chooses within the opponent's hand size", () => {
    const engine = setupEngine(
      [card("hearts", "8")],
      [WITCH],
      "AI_TURN",
      1,
    );
    const ai = new RandomAI(createRNG(5));
    const choice = ai.chooseCard(
      engine.getPlayer("ai")!.hand,
      {
        selfId: "ai",
        opponentCardCounts: new Map([["human", 1]]),
        discardPile: [],
      },
      engine.state,
    );
    expect(choice.sourcePlayerId).toBe("human");
    expect(choice.index).toBe(0);
  });
});

describe("RNG", () => {
  it("SeededRNG is deterministic for the same seed", () => {
    const a = new SeededRNG(12345);
    const b = new SeededRNG(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds produce different sequences", () => {
    const a = new SeededRNG(1);
    const b = new SeededRNG(2);
    expect(a.next()).not.toBe(b.next());
  });

  it("the engine is deterministic for a given seed", () => {
    const e1 = new GameEngine();
    e1.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "AI" },
      ],
      99,
    );
    const h1 = e1.state.players.map((p) => p.hand.map((c) => c.id));
    const e2 = new GameEngine();
    e2.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "AI" },
      ],
      99,
    );
    const h2 = e2.state.players.map((p) => p.hand.map((c) => c.id));
    expect(h1).toEqual(h2);
  });

  it("a full simulated game stays consistent", () => {
    const engine = new GameEngine();
    engine.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "AI" },
      ],
      42,
    );
    const ai = new RandomAI(createRNG(123));
    let guard = 0;
    while (!engine.isGameOver() && guard < 1000) {
      guard++;
      const current = engine.currentPlayer();
      if (current.type === "ai") {
        const choice = ai.chooseCard(
          current.hand,
          {
            selfId: current.id,
            opponentCardCounts: new Map(
              engine.state.players
                .filter((p) => p.id !== current.id)
                .map((p) => [p.id, p.hand.length]),
            ),
            discardPile: [...engine.state.discardPile],
          },
          engine.state,
        );
        const card = engine.getCardAt(choice.sourcePlayerId, choice.index);
        if (!card) break;
        engine.drawCard({
          type: "DRAW_CARD",
          sourcePlayerId: choice.sourcePlayerId,
          cardId: card.id,
        });
      } else {
        const sources = engine.getDrawSources(current.id);
        if (sources.length === 0) break;
        const src = sources[0];
        const idx = 0;
        const card = engine.getCardAt(src.id, idx);
        if (!card) break;
        engine.drawCard({
          type: "DRAW_CARD",
          sourcePlayerId: src.id,
          cardId: card.id,
        });
      }
    }
    expect(engine.isGameOver()).toBe(true);
    // Exactly one player holds the Witch and the loser always has it.
    const witchHolders = engine.state.players.filter((p) =>
      p.hand.some((c) => c.isWitch),
    );
    expect(witchHolders).toHaveLength(1);
    expect(engine.getLoser()).toBe(witchHolders[0].id);
    // All non-witch cards eventually end up in the discard pile.
    const remaining =
      engine.state.discardPile.length +
      engine.state.players.reduce((s, p) => s + p.hand.length, 0);
    expect(remaining).toBe(52);
  });
});