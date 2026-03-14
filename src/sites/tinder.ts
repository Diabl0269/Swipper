import { Page } from "playwright";
import { BaseSite } from "./base";



/**
 * The site module for Tinder.
 */
export class TinderSite extends BaseSite {
  private readonly URL = "https://tinder.com";

  /**
   * Gets the base URL of the site.
   * @returns The site's URL.
   */
  getUrl(): string {
    return this.URL;
  }

  /**
   * Navigates to the site and waits for it to load.
   * @param page - The Playwright page instance.
   */
  async navigate(page: Page): Promise<void> {
    this.logger.info("Navigating to Tinder...");
    await page.goto(this.URL, { waitUntil: "domcontentloaded" });

    // Wait for page to potentially redirect (Tinder often redirects logged-in users to /app)
    await page.waitForTimeout(3000);

    // Wait for navigation to complete if there's a redirect
    try {
      await page.waitForURL(/tinder\.com/, { timeout: 5000 });
    } catch (_e) { // Renamed e to _e
      this.logger.debug(`URL might already be correct, continuing: ${String(_e)}`);
    }

    this.logger.info("Page navigation complete");
  }

  /**
   * Refreshes the Tinder page.
   * @param page - The Playwright page instance.
   */
  async refresh(page: Page): Promise<void> {
    this.logger.info("Refreshing Tinder page...");
    await page.reload({ waitUntil: "domcontentloaded" });

    // Wait for page to load after refresh
    await page.waitForTimeout(3000);

    // Wait for navigation if redirected
    try {
      await page.waitForURL(/tinder\.com/, { timeout: 5000 });
    } catch (_e) { // Renamed e to _e
      this.logger.debug(`URL might already be correct after refresh: ${String(_e)}`);
    }

    // Wait for network idle
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
      this.logger.debug(
        "Network idle timeout after refresh, continuing anyway"
      );
    });

    this.logger.info("Page refresh complete");
  }

  /**
   * Dismisses any popups that may appear on the page.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if a popup was dismissed, false otherwise.
   */
  async dismissPopup(page: Page): Promise<boolean> {
    this.logger.debug("Attempting to dismiss popup...");
    try {
      // Check for "Maybe Later" button in various possible locations
      const maybeLaterSelectors = [
        '[aria-label="Close"]', // Added for match popup
        'button[aria-label="Close"]', // Added for match popup
        'button:has-text("X")', // Generic close button
        'button:has-text("Keep Swiping")', // Specifically for match popup
        'text="Keep Swiping"', // Specifically for match popup
        'button:has-text("Back to Tinder")', // Specifically for match popup
        'text="Back to Tinder"', // Specifically for match popup
        'button:has-text("Maybe Later")',
        'text="Maybe Later"',
        '[aria-label*="Maybe Later"]',
        'button:has-text("Not now")',
        'text="Not now"',
        'button:has-text("Not interested")',
        'text="Not interested"',
        '[aria-label*="Not interested"]',
        'button:has-text("No Thanks")',
        'text="No Thanks"',
        'button:has-text("Great!")',
        'text="Great!"',
      ];

      for (const selector of maybeLaterSelectors) {
        this.logger.debug(`Trying selector: "${selector}"`);
        try {
          const button = page.locator(selector).first();
          const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false); // Reduced timeout to quickly check
          if (isVisible) {
            this.logger.debug(`Button found and visible with selector: "${selector}"`);
            // Get bounding box of the button
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              this.logger.debug(
                `Button bounding box: x=${boundingBox.x}, y=${boundingBox.y}, width=${boundingBox.width}, height=${boundingBox.height}`
              );
              // Get viewport size
              const viewportSize = page.viewportSize();
              if (viewportSize) {
                this.logger.debug(`Viewport size: width=${viewportSize.width}, height=${viewportSize.height}`);
                // Check if the button is smaller than the viewport (to avoid dismissing large background elements)
                if (
                  boundingBox.width < viewportSize.width &&
                  boundingBox.height < viewportSize.height
                ) {
                  this.logger.info(`Found popup button with selector: "${selector}", dismissing...`);
                  await button.click();
                  // Wait longer for popup to close and page to update
                  await page.waitForTimeout(3000);
                  this.logger.success("Popup dismissed successfully.");
                  return true;
                } else {
                  this.logger.debug(`Button with selector "${selector}" found but too large to be a popup (likely a background element).`);
                }
              } else {
                this.logger.debug("Could not get viewport size.");
              }
            } else {
              this.logger.debug(`Could not get bounding box for button with selector: "${selector}"`);
            }
          } else {
            this.logger.debug(`Button with selector "${selector}" not visible.`);
          }
        } catch (_e) { // Renamed e to _e
          this.logger.debug(`Error with selector "${selector}": ${String(_e)}`);
          // Try next selector
          continue;
        }
      }
      this.logger.debug("No popup dismissed after trying all selectors.");
      return false;
    } catch (_error) { // Renamed error to _error
      this.logger.debug(`Error in dismissPopup: ${String(_error)}`);
      return false;
    }
  }

  /**
   * Checks if the user is logged in.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if logged in, false otherwise.
   */
  async isLoggedIn(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url();
      this.logger.debug(`Current URL: ${currentUrl}`);

      // If we're redirected to /app, we're likely logged in (even if cards haven't loaded yet)
      if (currentUrl.includes("/app")) {
        this.logger.info(
          "Detected /app URL - likely logged in, waiting for cards to load..."
        );
        // Give cards time to load
        await page.waitForTimeout(5000);
        // Try to wait for cards with a longer timeout
        try {
          await page.waitForSelector(
            '[data-testid="card"], [class*="Card"], button[aria-label*="Like"], button[aria-label*="Nope"]',
            {
              timeout: 15000,
              state: "attached",
            }
          );
          this.logger.info("Cards detected - confirmed logged in");
          return true;
        } catch (_e) { // Renamed e to _e
          this.logger.debug(
            `Cards not yet visible, but /app URL indicates logged in status: ${String(_e)}`
          );
          return true;
        }
      }

      // Check for login form - if present and prominent, we're not logged in
      const loginForm = await page
        .locator(
          'input[type="email"], input[type="tel"], button:has-text("Log in")'
        )
        .count();
      if (loginForm > 0) {
        // Check if we also see cards/nav (might be a false positive)
        const profileCards = await page
          .locator(
            '[data-testid="card"], [class*="Card"], button[aria-label*="Like"]'
          )
          .count();
        const navMenu = await page
          .locator('[aria-label*="Profile"], [aria-label*="Messages"], nav')
          .count();

        if (profileCards === 0 && navMenu === 0) {
          this.logger.warn(
            "Login form detected with no cards/nav - not logged in"
          );
          return false;
        }
      }

      // Check for profile cards or navigation menu
      const profileCards = await page
        .locator(
          '[data-testid="card"], [class*="Card"], button[aria-label*="Like"], button[aria-label*="Nope"]'
        )
        .count();
      const navMenu = await page
        .locator('[aria-label*="Profile"], [aria-label*="Messages"], nav')
        .count();

      if (profileCards > 0 || navMenu > 0) {
        this.logger.info("Cards or nav menu detected - logged in");
        return true;
      }

      // If we're on the base URL and no clear indicators, wait a bit more
      if (currentUrl === this.URL || currentUrl === `${this.URL}/`) {
        this.logger.debug("On base URL, waiting for page to load...");
        await page.waitForTimeout(5000);

        // Check again after waiting
        const cardsAfterWait = await page
          .locator(
            '[data-testid="card"], [class*="Card"], button[aria-label*="Like"]'
          )
          .count();
        const urlAfterWait = page.url();

        if (urlAfterWait.includes("/app")) {
          return true;
        }

        if (cardsAfterWait > 0) {
          this.logger.info("Cards detected after wait - logged in");
          return true;
        }
      }

      return false;
    } catch (_error) { // Renamed error to _error
      this.logger.error(`Error checking login status: ${String(_error)}`);
      return false;
    }
  }

  /**
   * Waits for profile cards to be available on the page.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if cards are found, false otherwise.
   */
  async waitForCards(page: Page): Promise<boolean> {
    try {
      this.logger.info("Waiting for profile cards to load...");

      // First, ensure we're on the right page (might have redirected)
      const currentUrl = page.url();
      if (!currentUrl.includes("tinder.com")) {
        this.logger.warn(`Unexpected URL: ${currentUrl}`);
        return false;
      }

      // Check for and dismiss any popups (like "You Received X Likes")
      const popupDismissed = await this.dismissPopup(page);
      if (popupDismissed) {
        // If popup was dismissed, wait a bit more for cards to become visible
        this.logger.info(
          "Waiting for cards to appear after popup dismissal..."
        );
        await page.waitForTimeout(2000);
      }

      // Check for loading screen - if present, refresh immediately
      const loadingScreen = await page
        .locator('[data-testid="root-loading-screen"]')
        .count();
      if (loadingScreen > 0) {
        this.logger.warn(
          "Loading screen detected. Waiting a moment, then refreshing if still present..."
        );
        await page.waitForTimeout(5000);

        // Check again - if still showing loading screen, refresh
        const stillLoading = await page
          .locator('[data-testid="root-loading-screen"]')
          .count();
        if (stillLoading > 0) {
          this.logger.warn("Loading screen still present. Refreshing page...");
          await this.refresh(page);

          // Wait a moment after refresh
          await page.waitForTimeout(3000);
        }
      }

      // Try multiple selectors that Tinder might use (in order of specificity)
      const selectors = [
        'button[aria-label*="Like"]', // Like button
        'button[aria-label*="Nope"]', // Dislike button
        '[data-testid="card"]', // Card test ID
        '[class*="Card"][class*="Stack"]', // Card stack
        '[class*="ProfileCard"]', // Profile card
        'div[role="button"]:has-text("Like")', // Like button alternative
        'div[role="button"]:has-text("Nope")', // Dislike button alternative
        '[class*="Card"]', // Generic card
      ];

      // First attempt: check if cards are already visible (quick check)
      this.logger.info("Checking for cards...");

      // Check for popups before checking cards
      await this.dismissPopup(page);

      // Quick check: are cards already visible?
      for (const selector of selectors) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            // Verify at least one is visible
            const firstCard = page.locator(selector).first();
            const isVisible = await firstCard
              .isVisible({ timeout: 1000 })
              .catch(() => false);
            if (isVisible) {
              // Dismiss any popup that might be blocking
              await this.dismissPopup(page);
              // Re-check visibility after popup dismissal
              const stillVisible = await firstCard
                .isVisible({ timeout: 1000 })
                .catch(() => false);
              if (stillVisible) {
                this.logger.success(
                  `Found visible profile cards using selector: ${selector} (count: ${count})`
                );
                await page.waitForTimeout(1000);
                return true;
              }
            }
          }
        } catch (_e) { // Renamed e to _e
          this.logger.debug(`Selector ${selector} check failed: ${String(_e)}`);
          // Continue to next selector
          continue;
        }
      }

      // If cards aren't immediately visible, wait for them to appear
      this.logger.info(
        "Cards not immediately visible, waiting for them to load..."
      );
      for (const selector of selectors) {
        try {
          this.logger.debug(`Waiting for selector: ${selector}`);
          await page.waitForSelector(selector, {
            timeout: 10000,
            state: "visible",
          });
          const count = await page.locator(selector).count();
          if (count > 0) {
            // Dismiss any popup
            await this.dismissPopup(page);
            // Verify still visible after popup dismissal
            const firstCard = page.locator(selector).first();
            const isVisible = await firstCard
              .isVisible({ timeout: 2000 })
              .catch(() => false);
            if (isVisible) {
              this.logger.success(
                `Found profile cards after waiting using selector: ${selector} (count: ${count})`
              );
              await page.waitForTimeout(1000);
              return true;
            }
          }
        } catch (_e) { // Renamed e to _e
          // Try next selector
          this.logger.debug(`Selector ${selector} not found, trying next: ${String(_e)}`);
          continue;
        }
      }

      // If we're on /app but cards aren't found, check for loading screen again
      if (currentUrl.includes("/app")) {
        // Check if loading screen appeared
        const loadingScreenCheck = await page
          .locator('[data-testid="root-loading-screen"]')
          .count();
        if (loadingScreenCheck > 0) {
          this.logger.warn(
            "Loading screen detected on /app. Refreshing page..."
          );
          await this.refresh(page);
          await page.waitForTimeout(3000);
        } else {
          this.logger.warn(
            "On /app but cards not found. Waiting a bit longer..."
          );
          // Wait additional time for cards to potentially load
          await page.waitForTimeout(10000);

          // Check one more time before refreshing - check visibility, not just count
          for (const selector of selectors.slice(0, 4)) {
            try {
              const count = await page.locator(selector).count();
              if (count > 0) {
                const firstCard = page.locator(selector).first();
                const isVisible = await firstCard
                  .isVisible({ timeout: 2000 })
                  .catch(() => false);
                if (isVisible) {
                  this.logger.success(
                    `Found visible cards after extended wait using selector: ${selector}`
                  );
                  await page.waitForTimeout(1000);
                  return true;
                }
              }
            } catch (_e) { // Renamed e to _e
              this.logger.debug(`Extended wait for selector ${selector} failed: ${String(_e)}`);
              continue;
            }
          }
        }

        // Still no cards - refresh the page
        this.logger.warn(
          "Cards still not found after waiting. Refreshing page..."
        );
        await this.refresh(page);

        // After refresh, wait for cards again
        this.logger.info("Waiting for cards after refresh...");
        await page.waitForTimeout(5000);

        // Check for popups again after refresh
        const popupDismissedAfterRefresh = await this.dismissPopup(page);
        if (popupDismissedAfterRefresh) {
          // Wait for cards to appear after dismissing popup
          this.logger.info("Waiting for cards after popup dismissal...");
          await page.waitForTimeout(3000);
        }

        // Try selectors again after refresh
        for (const selector of selectors.slice(0, 4)) {
          try {
            await page.waitForSelector(selector, {
              timeout: 15000,
              state: "visible",
            });
            const count = await page.locator(selector).count();
            if (count > 0) {
              // Verify visibility
              const firstCard = page.locator(selector).first();
              const isVisible = await firstCard
                .isVisible({ timeout: 2000 })
                .catch(() => false);
              if (isVisible) {
                this.logger.success(
                  `Found visible profile cards after refresh using selector: ${selector} (count: ${count})`
                );
                await page.waitForTimeout(1000);
                return true;
              }
            }
          } catch (_e) { // Renamed e to _e
            this.logger.debug(`Refresh selector ${selector} check failed: ${String(_e)}`);
            continue;
          }
        }

        // Final fallback: check if page seems interactive
        const anyInteractive = await page
          .locator('button, [role="button"]')
          .count();
        if (anyInteractive > 5) {
          this.logger.info(
            "Found interactive elements after refresh, assuming cards are present"
          );
          return true;
        }
      }

      // Final fallback: if we're on /app, check if page is interactive at all
      if (currentUrl.includes("/app")) {
        this.logger.warn(
          "Could not find cards with selectors, but on /app - checking if page is interactive..."
        );
        await page.waitForTimeout(2000);

        // Check for any interactive elements
        const interactiveElements = await page
          .locator('button, [role="button"], a')
          .count();
        const bodyText = await page.locator("body").textContent();

        // If we have interactive elements and the page has content, assume it's working
        if (interactiveElements > 3 && bodyText && bodyText.length > 100) {
          this.logger.info(
            `Page seems interactive (${interactiveElements} interactive elements found). Assuming cards are present and proceeding.`
          );
          return true;
        }
      }

      this.logger.error(
        "Could not find profile cards after all attempts and refresh"
      );
      return false;
    } catch (_error) { // Renamed error to _error
      this.logger.error(`Error waiting for cards: ${String(_error)}`);
      return false;
    }
  }

  /**
   * Performs a swipe action (like or dislike).
   * @param page - The Playwright page instance.
   * @param action - The swipe action to perform.
   * @returns A promise that resolves to true if the swipe was successful, false otherwise.
   */
  async swipe(page: Page, action: "like" | "dislike"): Promise<boolean> {
    try {
      // Always check for popups before swiping
      await this.dismissPopup(page);

      // Tinder uses keyboard shortcuts or buttons
      // Right arrow = like, Left arrow = dislike
      if (action === "like") {
        // Try keyboard shortcut first (more natural)
        await page.keyboard.press("ArrowRight");
        this.logger.info("Swiped right (like)");
      } else {
        await page.keyboard.press("ArrowLeft");
        this.logger.info("Swiped left (dislike)");
      }

      // Wait for card animation to complete
      await page.waitForTimeout(1000);

      // Check if we hit a limit or error message
      // Look for various limit-related messages from Tinder
      const errorMessages = await page
        .locator("text=/out of likes|limit|upgrade|refresh|try again|no more|send as many likes/i")
        .count();
      if (errorMessages > 0) {
        const message = await page
          .locator("text=/out of likes|limit|upgrade|refresh|try again|no more|send as many likes/i")
          .first()
          .textContent();
        this.logger.warn(`Hit a limit: ${message}`);
        return false;
      }

      return true;
    } catch (_error) { // Renamed error to _error
      this.logger.error(`Error performing swipe: ${String(_error)}`);
      return false;
    }
  }

  /**
   * Checks if there are more profiles available to swipe.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if more profiles are available, false otherwise.
   */
  async hasMoreProfiles(page: Page): Promise<boolean> {
    try {
      // Check for "out of likes" or similar messages that indicate we can't swipe anymore
      const limitMessages = await page
        .locator("text=/out of likes|no more|limit|upgrade|refresh|try again|send as many likes/i")
        .count();
      if (limitMessages > 0) {
        const message = await page
          .locator("text=/out of likes|no more|limit|upgrade|refresh|try again|send as many likes/i")
          .first()
          .textContent();
        this.logger.warn(`No more profiles available: ${message}`);
        return false;
      }

      // Check if cards are still present
      let cards = await page
        .locator('[data-testid="card"], [class*="Card"]')
        .count();

      // If no cards found, a popup (like a match) might be blocking them
      if (cards === 0) {
        this.logger.debug("No cards found, checking for blocking popups...");
        const dismissed = await this.dismissPopup(page);
        if (dismissed) {
          this.logger.info("Popup dismissed, re-checking for cards...");
          await page.waitForTimeout(2000);
          cards = await page
            .locator('[data-testid="card"], [class*="Card"]')
            .count();
        }
      }

      return cards > 0;
    } catch (_error) { // Renamed error to _error
      this.logger.error(`Error checking for more profiles: ${String(_error)}`);
      return false;
    }
  }
}