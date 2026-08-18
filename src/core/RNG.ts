export interface RNG {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns a random integer in [0, max). */
  int(max: number): number;
  /** Picks a random element from an array. */
  pick<T>(items: readonly T[]): T;
}

/**
 * RNG backed by Math.random(). Used in production.
 */
export class MathRNG implements RNG {
  next(): number {
    return Math.random();
  }

  int(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.next() * max);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    return items[this.int(items.length)];
  }
}

/**
 * Deterministic, seedable RNG (mulberry32). Used in tests and debug mode.
 */
export class SeededRNG implements RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) {
      this.state = 0x9e3779b9;
    }
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.next() * max);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    return items[this.int(items.length)];
  }
}

export function createRNG(seed?: number): RNG {
  if (seed !== undefined) {
    return new SeededRNG(seed);
  }
  return new MathRNG();
}