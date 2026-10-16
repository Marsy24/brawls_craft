import { test, expect } from "@playwright/test";

for (const classId of ["warrior", "mage", "hunter", "necromancer", "assassin"]) {
  test(`${classId}: create, render battle, cast, pause, retreat and restore`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("./");
    await page.locator('[data-action="create"]').click();
    await page.locator(`[data-action="class"][data-id="${classId}"]`).click();
    await page.locator("#hero-name").fill(`Проверка ${classId}`);
    await page.locator('[data-action="create-confirm"]').click();
    await expect(page.locator("h1")).toContainText("Карта экспедиций");
    await page.locator('[data-action="launch"]').click();
    await expect(page.locator("#game-host canvas")).toBeVisible();
    await expect(page.locator("#hp-text")).toContainText("/");
    await expect(page.locator("#time-text")).toContainText("0:01");
    await page.mouse.move(1000, 450);
    await page.keyboard.press("1");
    await expect(page.locator("#skill-0 .cooldown")).not.toBeEmpty();
    await page.keyboard.down("d");
    await page.waitForTimeout(250);
    await page.keyboard.up("d");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    const pausedTime = await page.locator("#time-text").textContent();
    const pausedCooldown = await page.locator("#skill-0 .cooldown").textContent();
    await page.keyboard.press("2");
    await page.waitForTimeout(300);
    await expect(page.locator("#time-text")).toHaveText(pausedTime!);
    await expect(page.locator("#skill-0 .cooldown")).toHaveText(pausedCooldown!);
    await expect(page.locator("#hud")).toHaveJSProperty("inert", true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#hud")).toHaveJSProperty("inert", false);
    await page.locator('[data-action="pause"]').click();
    await page.locator('[data-action="retreat"]').click();
    await expect(page.locator("h1")).toContainText("Новая попытка");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.locator('[data-action="camp"]').last().click();
    await page.reload();
    await expect(page.locator("h1")).toContainText("Карта экспедиций");
    await expect(page.locator(".profile")).toContainText(`Проверка ${classId}`);
    expect(errors).toEqual([]);
  });
}

test("camp screens fit desktop and tablet layouts", async ({ page }) => {
  await page.goto("./");
  await page.locator('[data-action="create"]').click();
  await page.locator('[data-action="create-confirm"]').click();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const tab of ["missions", "character", "talents", "inventory", "collection", "settings"]) {
      await page.locator(`.sidebar [data-id="${tab}"]`).click();
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  }
});
