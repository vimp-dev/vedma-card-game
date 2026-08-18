import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/core/GameEngine";
import { createCard } from "../src/core/Card";
import { removeAllPairs, countOfRank } from "../src/core/GameRules";
import { RandomAI } from "../src/ai/RandomAI";
import { createRNG } from "../src/core/RNG";

describe("rules diagnostic", () => {
  it("deal removes pairs by rank, not suit; 3 of a kind leaves one", () => {
    const hand = [
      createCard("hearts", "7"),
      createCard("clubs", "7"),
      createCard("spades", "7"),
    ];
    const pairs = removeAllPairs(hand);
    expect(pairs.length).toBe(1);
    expect(hand.length).toBe(1);
    expect(countOfRank(hand, "7")).toBe(1);
  });

  it("wizard never pairs", () => {
    const witch = createCard("spades", "Q");
    const qh = createCard("hearts", "Q");
    const qd = createCard("diamonds", "Q");
    const hand = [witch, qh, qd];
    const pairs = removeAllPairs(hand);
    expect(pairs.length).toBe(1);
    expect(hand).toContain(witch);
  });

  it("two queens of non-witch suits pair, witch stays", () => {
    const hand = [
      createCard("hearts", "Q"),
      createCard("diamonds", "Q"),
      createCard("spades", "Q"),
    ];
    const pairs = removeAllPairs(hand);
    expect(pairs.length).toBe(1);
    expect(hand.length).toBe(1);
    expect(hand[0].isWitch).toBe(true);
  });

  it("full game: loser is the witch holder when opponent empties", () => {
    const engine = new GameEngine();
    const seed = 1234;
    engine.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "Comp" },
      ],
      seed,
    );
    // Try to reach a state: human holds witch as only card, ai empties via pair.
    // Directly manipulate state to reproduce the endgame.
    const human = engine.getPlayer("human")!;
    const ai = engine.getPlayer("ai")!;
    const witch = createCard("spades", "Q");
    const hX = createCard("hearts", "K");
    const aMatch = createCard("clubs", "K");
    human.hand = [witch, hX];
    ai.hand = [aMatch];
    engine.state.currentPlayerIndex = 1; // ai
    engine.state.phase = "AI_TURN";
    engine.state.turnNumber = 99;
    const ok = engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "human", cardId: hX.id });
    expect(ok).toBe(true);
    expect(engine.isGameOver()).toBe(true);
    expect(engine.getWinner()).toBe("ai");
    expect(engine.getLoser()).toBe("human");
  });

  it("holding the witch as the only card leads to a win when opponent draws it", () => {
    const engine = new GameEngine();
    engine.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "Comp" },
      ],
      42,
    );
    const human = engine.getPlayer("human");
    const ai = engine.getPlayer("ai");
    const witch = createCard("spades", "Q");
    human!.hand = [witch];
    ai!.hand = [createCard("hearts", "5"), createCard("diamonds", "9")];
    engine.state.currentPlayerIndex = 1; // ai draws the witch
    engine.state.phase = "AI_TURN";
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "human", cardId: witch.id });
    expect(engine.isGameOver()).toBe(true);
    expect(engine.getWinner()).toBe("human");
    expect(engine.getLoser()).toBe("ai");
    expect(engine.getWitchHolder()?.id).toBe("ai");
  });

  it("shuffles the AI hand after an AI draw so the taken card is not predictable", () => {
    const engine = new GameEngine();
    engine.startGame(
      [
        { id: "human", type: "human", name: "You" },
        { id: "ai", type: "ai", name: "Comp" },
      ],
      7,
    );
    const human = engine.getPlayer("human");
    const ai = engine.getPlayer("ai");
    const drawn = createCard("diamonds", "9");
    const held = createCard("hearts", "5");
    human!.hand = [drawn];
    ai!.hand = [held];
    engine.state.currentPlayerIndex = 1; // ai draws
    engine.state.phase = "AI_TURN";
    engine.drawCard({ type: "DRAW_CARD", sourcePlayerId: "human", cardId: drawn.id });
    expect(engine.isGameOver()).toBe(false);
    const ids = ai!.hand.map((c) => c.id);
    // The hand still holds the same cards (a permutation, not a loss).
    expect([...ids].sort()).toEqual(["diamonds-9", "hearts-5"]);
    // The drawn card is not simply appended to the end.
    expect(ids).not.toEqual(["hearts-5", "diamonds-9"]);
  });

  it("RandomAI draws uniformly when the human holds two cards incl. the Witch", () => {
    const state = {
      players: [
        { id: "human", hand: [createCard("spades", "Q"), createCard("hearts", "3")] },
        { id: "ai", hand: [] },
      ],
    };
    const counts: Record<number, number> = { 0: 0, 1: 0 };
    for (let i = 0; i < 2000; i++) {
      const ai = new RandomAI(createRNG(i * 7919 + 13));
      const choice = ai.chooseCard(
        [],
        {
          selfId: "ai",
          opponentCardCounts: new Map([["human", 2]]),
          discardPile: [],
        },
        state as never,
      );
      counts[choice.index] = (counts[choice.index] ?? 0) + 1;
    }
    // Both slots (Witch and the other card) are picked with roughly 50/50 odds.
    expect(counts[0]).toBeGreaterThan(850);
    expect(counts[1]).toBeGreaterThan(850);
  });
});
