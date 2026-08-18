import { PlatformAdapter, PlatformId } from "./PlatformAdapter";

declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(options?: {
          gameId?: string;
          debug?: boolean;
          onError?: (err: unknown) => void;
        }): Promise<void>;
        game?: {
          gameplayStart(): void;
          gameplayStop(): void;
          loadingStart(): void;
          loadingStop(): void;
          happytime(): void;
        };
        ad?: {
          requestAd(
            type: "midgame" | "rewarded",
            callbacks?: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (err?: unknown) => void;
            },
          ): Promise<void>;
        };
        banner?: {
          requestBanner(options?: {
            container: HTMLElement;
            width?: number;
            height?: number;
          }): Promise<void>;
          clearBanner(): Promise<void>;
        };
        user?: {
          init(): Promise<void>;
          isLoaded(): boolean;
          showErrorDialog(): void;
        };
        audio?: {
          mute(): void;
          unmute(): void;
        };
      };
    };
  }
}

const SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";

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

export class CrazyGamesPlatformAdapter implements PlatformAdapter {
  readonly id: PlatformId = "crazygames";
  private ready = false;

  public static detect(): boolean {
    try {
      return (
        typeof window !== "undefined" &&
        !!window.CrazyGames &&
        !!window.CrazyGames.SDK
      );
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (CrazyGamesPlatformAdapter.detect()) {
      this.ready = true;
      try {
        await window.CrazyGames!.SDK.init({
          debug: false,
          onError: (err) => {
            console.warn("[platform:crazygames] SDK error:", err);
          },
        });
      } catch (err) {
        console.warn("[platform:crazygames] init error:", err);
      }
      return;
    }

    // Outside CrazyGames we don't preload the SDK unless it's already
    // injected. This keeps local development free of external requests.
    try {
      await loadScript(SDK_URL);
      if (CrazyGamesPlatformAdapter.detect()) {
        this.ready = true;
        try {
          await window.CrazyGames!.SDK.init();
        } catch (err) {
          console.warn("[platform:crazygames] init error:", err);
        }
      } else {
        console.info(
          "[platform:crazygames] SDK not detected — running without it.",
        );
      }
    } catch (err) {
      console.warn("[platform:crazygames] failed to load SDK:", err);
    }
  }

  gameplayStart(): void {
    if (!this.ready) return;
    try {
      window.CrazyGames!.SDK.game?.gameplayStart();
    } catch {
      /* non-fatal */
    }
  }

  gameplayStop(): void {
    if (!this.ready) return;
    try {
      window.CrazyGames!.SDK.game?.gameplayStop();
    } catch {
      /* non-fatal */
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.ready) return;
    try {
      await window.CrazyGames!.SDK.ad?.requestAd("midgame", {
        adError: (err) => console.warn("[platform:crazygames] midgame ad:", err),
      });
    } catch (err) {
      console.warn("[platform:crazygames] midgame ad failed:", err);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.ready) return false;
    return new Promise<boolean>((resolve) => {
      window.CrazyGames!.SDK.ad
        ?.requestAd("rewarded", {
          adStarted: () => {},
          adFinished: () => resolve(true),
          adError: (err) => {
            console.warn("[platform:crazygames] rewarded ad error:", err);
            resolve(false);
          },
        })
        .catch(() => resolve(false));
    });
  }

  async saveProgress(data: unknown): Promise<void> {
    if (!this.ready) return;
    // CrazyGames has no cloud saves; keep the data in localStorage via the
    // normal storage layer. This method exists to satisfy the contract.
    void data;
  }

  async loadProgress<T>(): Promise<T | null> {
    return null;
  }

  setMuted(muted: boolean): void {
    if (!this.ready) return;
    try {
      if (muted) {
        window.CrazyGames!.SDK.audio?.mute();
      } else {
        window.CrazyGames!.SDK.audio?.unmute();
      }
    } catch {
      /* non-fatal */
    }
  }

  async setFullscreen(): Promise<boolean> {
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