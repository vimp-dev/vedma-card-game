import { PlatformAdapter, PlatformId } from "./PlatformAdapter";

/**
 * Fallback adapter used when the game runs outside Yandex/CrazyGames.
 * Everything is a graceful no-op, so the game works identically in any
 * plain web browser.
 */
export class LocalPlatformAdapter implements PlatformAdapter {
  readonly id: PlatformId = "local";

  async initialize(): Promise<void> {
    // Nothing to initialize locally.
  }

  gameplayStart(): void {}
  gameplayStop(): void {}

  async showInterstitial(): Promise<void> {
    // No ads on the local platform.
  }

  async showRewarded(): Promise<boolean> {
    return false;
  }

  async saveProgress(_data: unknown): Promise<void> {
    // Persistence is handled by the storage layer locally.
  }

  async loadProgress<T>(): Promise<T | null> {
    return null;
  }

  setMuted(_muted: boolean): void {}

  async setFullscreen(): Promise<boolean> {
    try {
      if (!document.documentElement.requestFullscreen) return false;
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }
}