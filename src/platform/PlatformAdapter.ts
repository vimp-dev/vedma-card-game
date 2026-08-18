export type PlatformId = "local" | "yandex" | "crazygames";

/**
 * Common contract every platform integration implements. The game engine and
 * UI never talk to Yandex/CrazyGames directly — they only go through this
 * interface, so swapping or adding platforms never touches game code.
 */
export interface PlatformAdapter {
  readonly id: PlatformId;

  /** Asynchronous SDK bootstrap. Must never throw. */
  initialize(): Promise<void>;

  /** Signals that the player reached the playable state. */
  gameplayStart(): void;

  /** Signals that the player left the playable state (menu, game over). */
  gameplayStop(): void;

  /** Shows a full-screen interstitial, if the platform supports it. */
  showInterstitial(): Promise<void>;

  /** Shows a rewarded ad, if the platform supports it. */
  showRewarded(): Promise<boolean>;

  saveProgress(data: unknown): Promise<void>;
  loadProgress<T>(): Promise<T | null>;

  /** Propagates mute/unmute to the platform. */
  setMuted(muted: boolean): void;

  /** Requests fullscreen (returns true if supported). */
  setFullscreen(): Promise<boolean>;
}