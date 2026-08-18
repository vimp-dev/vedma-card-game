import { prefersReducedMotion } from "../ui/dom";

/**
 * Central place that decides how long animations take, honoring the user's
 * "reduce motion" OS setting and the in-game animations toggle.
 */
export class AnimationManager {
  private enabled = true;
  /** Multiplier applied to all animation durations (3 = three times slower). */
  private speed = 3;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  isEnabled(): boolean {
    return this.enabled && !prefersReducedMotion();
  }

  /** Scales a "normal" duration by the global speed factor. */
  time(normalMs: number): number {
    if (!this.isEnabled()) return 0;
    return Math.max(1, Math.round(normalMs * this.speed));
  }

  /** Non-blocking convenience for element-level CSS class flashes. */
  flashClass(el: HTMLElement, className: string, ms = 350): void {
    if (!this.isEnabled()) return;
    el.classList.add(className);
    window.setTimeout(() => el.classList.remove(className), this.time(ms));
  }

  /** Sleeps for the given animation duration (respects reduced motion). */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, this.time(ms));
    });
  }
}

export const animationManager = new AnimationManager();