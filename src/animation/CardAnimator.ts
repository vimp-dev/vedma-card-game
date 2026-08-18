import { Card, cardName, rankSymbol, suitSymbol } from "../core/Card";
import { el } from "../ui/dom";

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Easing = "ease-in" | "ease-out" | "ease-in-out" | "linear";

export interface FlyOptions {
  duration: number;
  easing?: Easing;
  flip?: boolean;
  scale?: number;
  /** Fade the ghost out towards the end of the flight. */
  fadeIn?: boolean;
  /** Fade the ghost out towards the end of the flight. */
  fadeOut?: boolean;
}

const MIN_DURATION = 120;

/**
 * Creates transient "ghost" card elements used to animate draws, pair
 * dismissals and AI picks without disturbing the authoritative game state.
 */
export class CardAnimator {
  private readonly viewport: HTMLElement;

  constructor(viewport: HTMLElement) {
    this.viewport = viewport;
  }

  private makeGhost(card: Card, facedown: boolean): HTMLElement {
    const ghost = el("div", "card card--ghost");
    ghost.dataset.uid = "ghost";
    ghost.dataset.suit = card.suit;
    if (facedown) {
      ghost.classList.add("card--back");
      ghost.append(el("div", "card-back-pattern"), el("div", "card-back-glow"));
    } else {
      const corner = el("div", "card-corner card-corner--tl");
      corner.append(
        el("span", "card-rank", rankSymbol(card.rank)),
        el("span", "card-suit", suitSymbol(card.suit)),
      );
      const center = el("div", "card-center");
      center.append(el("span", "card-suit-big", suitSymbol(card.suit)));
      if (card.isWitch) {
        center.classList.add("card-center--witch");
        center.append(el("div", "card-witch-ornament"));
      }
      ghost.append(corner, center);
      ghost.setAttribute("aria-hidden", "true");
    }
    ghost.style.position = "fixed";
    ghost.style.zIndex = "900";
    ghost.style.pointerEvents = "none";
    this.viewport.append(ghost);
    return ghost;
  }

  /**
   * Flies a ghost card from `from` to `to`. On completion the ghost is
   * removed. Returns a promise resolving when the flight ends.
   */
  fly(
    card: Card,
    from: RectLike,
    to: RectLike,
    options: FlyOptions,
  ): Promise<void> {
    const ghost = this.makeGhost(card, !!options.flip && false);
    const duration = Math.max(MIN_DURATION, options.duration);

    const fromLeft = from.left + (from.width - to.width) / 2;
    const fromTop = from.top + (from.height - to.height) / 2;

    Object.assign(ghost.style, {
      width: `${to.width}px`,
      height: `${to.height}px`,
      left: `${fromLeft}px`,
      top: `${fromTop}px`,
      opacity: "1",
    });

    if (options.fadeIn) {
      ghost.style.opacity = "0";
    }

    const midFlip = options.flip ? duration * 0.55 : 0;
    const keyframes: Keyframe[] = [
      {
        left: `${fromLeft}px`,
        top: `${fromTop}px`,
        opacity: options.fadeIn ? "0" : "1",
        transform: `scale(${options.scale ?? 1})`,
      },
    ];
    if (options.flip) {
      keyframes.push(
        {
          left: `${fromLeft}px`,
          top: `${fromTop}px`,
          opacity: "1",
          transform: `scale(${options.scale ?? 1}) rotateY(0deg)`,
          offset: 0.5,
        },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          opacity: "1",
          transform: `scale(${options.scale ?? 1}) rotateY(90deg)`,
          offset: midFlip / duration + 0.0001,
        },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          opacity: "1",
          transform: `scale(${options.scale ?? 1}) rotateY(180deg)`,
          offset: midFlip / duration + 0.0002,
        },
      );
    }

    keyframes.push({
      left: `${to.left}px`,
      top: `${to.top}px`,
      opacity: options.fadeOut ? "0" : "1",
      transform: `scale(${options.scale ?? 1})`,
    });

    const anim = ghost.animate(keyframes, {
      duration,
      easing: options.easing ?? "ease-in-out",
      fill: "forwards",
    });

    return new Promise<void>((resolve) => {
      anim.onfinish = () => {
        ghost.remove();
        resolve();
      };
      // Safety net for reduced-motion / cancelled animations.
      anim.oncancel = () => {
        ghost.remove();
        resolve();
      };
      window.setTimeout(() => {
        ghost.remove();
        resolve();
      }, duration + 300);
    });
  }

  /**
   * Creates a ghost and lets the caller position it. Returns the ghost
   * element. Use `flyFromGhost` to move it afterwards.
   */
  createGhost(card: Card, rect: RectLike, facedown = false): HTMLElement {
    const ghost = this.makeGhost(card, facedown);
    Object.assign(ghost.style, {
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      left: `${rect.left}px`,
      top: `${rect.top}px`,
    });
    return ghost;
  }

  /**
   * Flies an already-created ghost element to a target rect, then removes it.
   */
  flyGhostTo(ghost: HTMLElement, to: RectLike, duration: number, scale = 1.06): Promise<void> {
    const anim = ghost.animate(
      [
        { left: ghost.style.left, top: ghost.style.top, transform: "scale(1)" },
        { left: `${to.left}px`, top: `${to.top}px`, transform: `scale(${scale})` },
        { left: `${to.left}px`, top: `${to.top}px`, transform: "scale(1)", opacity: "0.6" },
      ],
      { duration: Math.max(MIN_DURATION, duration), easing: "ease-in-out", fill: "forwards" },
    );
    return new Promise<void>((resolve) => {
      anim.onfinish = () => {
        ghost.remove();
        resolve();
      };
      anim.oncancel = () => {
        ghost.remove();
        resolve();
      };
      window.setTimeout(() => {
        ghost.remove();
        resolve();
      }, duration + 300);
    });
  }

  /** Fades a real card element out over the discard area. */
  discardElement(cardEl: HTMLElement, target: RectLike, duration: number): Promise<void> {
    const anim = cardEl.animate(
      [
        { transform: "scale(1)", opacity: "1", left: "0px", top: "0px" },
        { transform: `scale(1.08) translate(${target.left}px, ${target.top}px)`, opacity: "0", offset: 0.6 },
        { transform: `scale(0.7) translate(${target.left}px, ${target.top}px)`, opacity: "0" },
      ],
      { duration: Math.max(MIN_DURATION, duration), easing: "ease-in", fill: "forwards" },
    );
    return new Promise<void>((resolve) => {
      anim.onfinish = () => {
        cardEl.remove();
        resolve();
      };
      anim.oncancel = () => {
        cardEl.remove();
        resolve();
      };
    });
  }

  /** Convenience: name for a ghost (for debugging aria labels). */
  static label(card: Card): string {
    return cardName(card);
  }
}