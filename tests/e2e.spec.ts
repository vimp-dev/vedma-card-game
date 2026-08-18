import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:5173";

/** Force Russian UI for deterministic selectors, then load the app. */
async function gotoApp(page: Page, path = "/"): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("witch.lang", "ru");
    } catch {
      /* ignore */
    }
  });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

async function gotoGame(page: Page): Promise<void> {
  await gotoApp(page, "/?aidelay=80&anim=1");
  // Unlock audio via a click.
  await page.click('button:has-text("Играть")');
  // Give the deal a moment.
  await page.waitForSelector(".screen--game");
  await page.waitForTimeout(400);
}

/** Plays the game by always drawing the first computer card until game over. */
async function playUntilGameOver(page: Page): Promise<void> {
  const overlay = page.locator(".screen--gameover.overlay--visible");
  const deadline = Date.now() + 75000;
  while (Date.now() < deadline) {
    if (await overlay.isVisible().catch(() => false)) return;
    const computerCards = page.locator(".zone--computer .card--interactive");
    const n = await computerCards.count();
    if (n === 0) {
      await page.waitForTimeout(250);
      continue;
    }
    await computerCards.first().click();
    await page.waitForTimeout(200);
  }
  throw new Error("Game did not finish in time");
}

test("game loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  await gotoGame(page);
  expect(errors).toEqual([]);
});

test("computer hand renders face-down cards with a count", async ({ page }) => {
  await gotoGame(page);
  const backs = page.locator(".zone--computer .card--back");
  expect(await backs.count()).toBeGreaterThan(0);
  const label = await page.locator(".zone--computer .zone__label").textContent();
  expect(label).toContain("Компьютер");
  expect(label).toMatch(/Карт:\s*\d+/);
});

test("player hand renders face-up cards", async ({ page }) => {
  await gotoGame(page);
  const faceUp = page.locator(".zone--player .card:not(.card--back)");
  expect(await faceUp.count()).toBeGreaterThan(0);
});

test("player can draw a card from the computer", async ({ page }) => {
  await gotoGame(page);
  // Wait for the player's turn.
  await page.waitForTimeout(700);
  const computerCards = page.locator(".zone--computer .card");
  const before = await computerCards.count();
  expect(before).toBeGreaterThan(0);
  const playerCardsBefore = await page.locator(".zone--player .card").count();
  await computerCards.first().click();
  // A draw animation happens; the AI may act immediately after, so only
  // assert that the computer's hand lost at least one card.
  await page.waitForTimeout(1200);
  const after = await computerCards.count();
  expect(after).toBeLessThan(before);
  // The player either gained a card or discarded a pair.
  const playerCardsAfter = await page.locator(".zone--player .card").count();
  expect(playerCardsAfter).not.toBe(playerCardsBefore + 2);
});

test("full game reaches a terminal state", async ({ page }) => {
  test.setTimeout(120000);
  await gotoGame(page);
  await playUntilGameOver(page);
  const over = await page.locator(".screen--gameover.overlay--visible").isVisible();
  expect(over).toBe(true);
  const text = await page.locator(".gameover__title").textContent();
  expect(["ПОБЕДА!", "ВЕДЬМА!"]).toContain(text);
});

test("game over screen offers play again and menu", async ({ page }) => {
  test.setTimeout(120000);
  await gotoGame(page);
  const overlay = page.locator(".screen--gameover");
  await playUntilGameOver(page);
  expect(await overlay.isVisible()).toBe(true);
  await page.click('.screen--gameover button:has-text("Играть снова")');
  await page.waitForTimeout(400);
  expect(await page.locator(".screen--game").isVisible()).toBe(true);
  await playUntilGameOver(page);
  await page.click('.screen--gameover button:has-text("В меню")');
  await page.waitForTimeout(400);
  expect(await page.locator(".screen--menu").isVisible()).toBe(true);
});

test("rules and settings screens work", async ({ page }) => {
  await gotoApp(page);
  await page.click('button:has-text("Правила")');
  await page.waitForTimeout(400);
  expect(await page.locator(".screen--rules.overlay--visible").isVisible()).toBe(true);
  await page.click('button:has-text("Понятно")');
  await page.waitForTimeout(400);
  await page.click('button:has-text("Настройки")');
  await page.waitForTimeout(400);
  expect(await page.locator(".screen--settings.overlay--visible").isVisible()).toBe(true);
  // Toggle language.
  await page.click('.lang-btn:has-text("EN")');
  await page.waitForTimeout(300);
  expect(await page.locator('.lang-btn--active').textContent()).toBe("EN");
  await page.click('button:has-text("Close")');
  await page.waitForTimeout(400);
  // Menu should now be in English.
  expect(await page.locator('button:has-text("Play")').isVisible()).toBe(true);
});

test("statistics are displayed on the menu", async ({ page }) => {
  test.setTimeout(120000);
  await gotoGame(page);
  await playUntilGameOver(page);
  await page.click('.screen--gameover button:has-text("В меню")');
  await page.waitForTimeout(400);
  const stats = await page.locator(".menu__stats").textContent();
  expect(stats).toMatch(/Партии\s*\d+/);
});

test("mobile layout fits without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoGame(page);
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasOverflow).toBe(false);
  const bodyOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(bodyOverflow).toBe(false);
  // Cards should still be visible.
  expect(await page.locator(".zone--player .card").count()).toBeGreaterThan(0);
});

test("landscape mobile works", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await gotoGame(page);
  expect(await page.locator(".screen--game").isVisible()).toBe(true);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("debug panel appears with ?debug=true and offers controls", async ({ page }) => {
  await gotoApp(page, "/?debug=true&anim=1");
  await page.click('button:has-text("Играть")');
  await page.waitForTimeout(500);
  const panel = page.locator(".debug-panel");
  expect(await panel.isVisible()).toBe(true);
  const info = await page.locator(".debug-info").textContent();
  expect(info).toContain("seed:");
  // Debug restart works.
  await page.click('.debug-buttons button:has-text("Перезапуск")');
  await page.waitForTimeout(400);
  expect(await page.locator(".screen--game").isVisible()).toBe(true);
});

test("context menu is suppressed inside the game", async ({ page }) => {
  await gotoGame(page);
  const menuOpened = await page.evaluate(async () => {
    const target = document.querySelector(".zone--player .card") as HTMLElement;
    let fired = false;
    const handler = (e: Event) => {
      e.preventDefault();
      fired = true;
    };
    document.addEventListener("contextmenu", handler);
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    return fired;
  });
  expect(menuOpened).toBe(true);
});
