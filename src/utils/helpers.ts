import { Page, Locator } from 'playwright';

/**
 * Generates a random number within a given range.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns A random number between min and max.
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Moves the mouse to a random point within the element's bounding box and then clicks.
 * This is a more human-like way to click than a direct .click() call.
 * @param page - The Playwright page instance.
 * @param locator - The Playwright locator for the element to click.
 */
export async function humanClick(page: Page, locator: Locator) {
  const boundingBox = await locator.boundingBox();
  if (!boundingBox) {
    throw new Error('Could not get bounding box for element. It might not be visible.');
  }

  // Calculate random coordinates within the element
  const targetX = boundingBox.x + random(boundingBox.width * 0.2, boundingBox.width * 0.8);
  const targetY = boundingBox.y + random(boundingBox.height * 0.2, boundingBox.height * 0.8);

  // Move the mouse in a more human-like way
  await page.mouse.move(targetX, targetY, { steps: Math.floor(random(10, 20)) });
  await page.waitForTimeout(random(50, 150)); // Small pause before clicking
  await page.mouse.down();
  await page.waitForTimeout(random(80, 200)); // Hold click for a moment
  await page.mouse.up();
}
