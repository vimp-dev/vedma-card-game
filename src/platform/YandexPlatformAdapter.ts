import { PlatformAdapter, PlatformId } from "./PlatformAdapter";

declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<YandexSDK>;
    };
  }
}

/**
 * Minimal typed surface of the Yandex Games SDK used by this game.
 * Only the parts we actually call are described.
 */
export interface YandexSDK {
  isAvailable(): boolean;
  environment?: {
    lang?: string;
  };
  features?: {
    LoadingAPI?: {
      ready(): void;
    };
  };
  gameplay?: {
    start(config?: Record<string, unknown>): void;
    stop(config?: Record<string, unknown>): void;
  };
  adv?: {
    showFullscreenAdv(options?: {
      callbacks?: { onClose?: (wasShown: boolean) => void };
    }): Promise<void>;
    showRewardedVideo(options?: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: (err: unknown) => void;
      };
    }): Promise<void>;
  };
  getPlayer(options?: { scopes: boolean }): Promise<YandexPlayer>;
  getSdkSettings?(): Promise<Record<string, unknown>>;
  setSdkSettings?(settings: Record<string, unknown>): Promise<void>;
  screen?: {
    fullscreen: {
      request(): Promise<void>;
      exit(): Promise<void>;
    };
  };
}

export interface YandexPlayer {
  getMode(): string;
  getData<T>(keys?: string[]): Promise<Record<string, T>>;
  setData(data: Record<string, unknown>): Promise<void>;
  setStats?(values: Record<string, number>): void;
}

/** Optional Yandex-specific hooks a platform can expose to the game. */
export interface YandexHooks {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const SDK_URL = "https://yandex.ru/games/sdk/v2";
const sdkPromise: Promise<YandexSDK | null> | null = null;

function loadScript(url: string): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-witch-sdk="${url}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.dataset.witchSdk = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function getSDK(): Promise<YandexSDK | null> {
  if (sdkPromise) return sdkPromise;
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YaGames) {
    return window.YaGames.init().catch(() => null);
  }
  return Promise.resolve(null);
}

export class YandexPlatformAdapter implements PlatformAdapter {
  readonly id: PlatformId = "yandex";
  private sdk: YandexSDK | null = null;
  private player: YandexPlayer | null = null;
  private hooks: YandexHooks | null = null;

  constructor(hooks: YandexHooks | null = null) {
    this.hooks = hooks;
  }

  private static detect(): boolean {
    try {
      return (
        typeof window !== "undefined" &&
        ((window.location.hostname.endsWith("yandex.net") &&
          window.location.search.includes("ya_sid")) ||
          !!window.YaGames)
      );
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (!YandexPlatformAdapter.detect()) {
      console.info(
        "[platform:yandex] Yandex SDK not detected — running without it.",
      );
      return;
    }
    try {
      await loadScript(SDK_URL);
      this.sdk = await getSDK();
      if (!this.sdk) {
        console.warn("[platform:yandex] SDK init failed — continuing locally.");
        return;
      }
      this.sdk.features?.LoadingAPI?.ready();
      try {
        this.player = await this.sdk.getPlayer({ scopes: false });
      } catch {
        this.player = null;
      }
      if (this.hooks?.onFullscreenChange && this.sdk.screen?.fullscreen) {
        document.addEventListener(
          "fullscreenchange",
          () => {
            this.hooks?.onFullscreenChange?.(!!document.fullscreenElement);
          },
          false,
        );
      }
      console.info("[platform:yandex] initialized");
    } catch (err) {
      console.warn("[platform:yandex] initialization error:", err);
    }
  }

  gameplayStart(): void {
    try {
      this.sdk?.gameplay?.start();
    } catch (err) {
      console.warn("[platform:yandex] gameplay.start failed:", err);
    }
  }

  gameplayStop(): void {
    try {
      this.sdk?.gameplay?.stop();
    } catch (err) {
      console.warn("[platform:yandex] gameplay.stop failed:", err);
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.adv?.showFullscreenAdv();
    } catch (err) {
      console.warn("[platform:yandex] interstitial failed:", err);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.sdk) return false;
    return new Promise<boolean>((resolve) => {
      let rewarded = false;
      this.sdk!
        .adv?.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: () => {
              resolve(rewarded);
            },
            onError: (err) => {
              console.warn("[platform:yandex] rewarded error:", err);
              resolve(false);
            },
          },
        })
        .catch(() => resolve(false));
    });
  }

  async saveProgress(data: unknown): Promise<void> {
    if (!this.player) return;
    try {
      await this.player.setData(data as Record<string, unknown>);
    } catch (err) {
      console.warn("[platform:yandex] saveProgress failed:", err);
    }
  }

  async loadProgress<T>(): Promise<T | null> {
    if (!this.player) return null;
    try {
      const data = await this.player.getData();
      return data as T;
    } catch (err) {
      console.warn("[platform:yandex] loadProgress failed:", err);
      return null;
    }
  }

  setMuted(muted: boolean): void {
    try {
      this.sdk?.setSdkSettings?.({ mute: muted });
    } catch {
      // non-fatal
    }
  }

  async setFullscreen(): Promise<boolean> {
    try {
      if (this.sdk?.screen?.fullscreen) {
        await this.sdk.screen.fullscreen.request();
        return true;
      }
    } catch (err) {
      console.warn("[platform:yandex] fullscreen failed:", err);
    }
    // Fall back to the standard browser fullscreen API.
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}