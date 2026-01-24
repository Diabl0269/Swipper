import { Page } from 'playwright';
import { BaseSite } from './base';
import { SiteConfig } from '../types';
import { Logger } from '../utils/logger';

export class OkCupidSite extends BaseSite {
  private readonly URL = 'https://www.okcupid.com';

  constructor(config: SiteConfig, logger: Logger) {
    super(config, logger);
  }

  getUrl(): string {
    return this.URL;
  }

  async isLoggedIn(page: Page): Promise<boolean> {
    try {
      const currentUrl = page.url();
      this.logger.debug(`Current URL: ${currentUrl}`);

      // Check for elements that are only visible when logged in
      // For OkCupid, this could be a profile icon, a navigation bar, or the main feed
      const loggedInIndicator = await page.locator(
        'a[aria-label="Profile"], [data-testid="main-nav"], [data-test="match-stack-card"]'
      ).count();

      if (loggedInIndicator > 0) {
        this.logger.info("Logged in indicator found.");
        return true;
      }

      // Check if we are on a login/signup page
      const loginForm = await page.locator(
        'input[name="username"], input[name="password"], button:has-text("Log in")'
      ).count();

      if (loginForm > 0 && !currentUrl.includes("/app")) { // /app is usually logged in
        this.logger.warn("Login form detected, not logged in.");
        return false;
      }

      // If on okcupid.com and no login form, assume logged in
      if (currentUrl.includes("okcupid.com")) {
        this.logger.info("On OkCupid domain, no login form detected. Assuming logged in.");
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error checking login status: ${error}`);
      return false;
    }
  }

  async navigate(page: Page): Promise<void> {
    this.logger.info("Navigating to OkCupid...");
    await page.goto(this.URL, { waitUntil: "domcontentloaded" });

    // Wait for page to potentially redirect
    await page.waitForTimeout(3000);

    // Wait for navigation to complete if there's a redirect
    try {
      await page.waitForURL(/okcupid\.com/, { timeout: 5000 });
    } catch (e) {
      // URL might already be correct, continue
    }

    this.logger.info("Page navigation complete");
  }

  async dismissPopup(page: Page): Promise<boolean> {
    const selectors = [
      'button[aria-label="Close the Mutual Match modal"]', // Match popup: Close button
      'button:has-text("LIKE THEM ANYWAY")', // SuperLike popup: Like button
      'button[aria-label="Close"]', // Generic close button
      'button:has-text("No Thanks")', // Generic "No Thanks" button
      'button[aria-label="No Thanks"]', // Specific "No Thanks" button
      'button[data-qa-auto="superlike-upsell-nope"]', // Superlike upsell
      'button[data-qa-auto="match-banner-close"]', // Match banner close button
      'button[aria-label="Dismiss"]', // Another generic dismiss
      'div[role="dialog"] button:has-text("No thanks")', // More generic "No thanks" within a dialog
      'a[aria-label="Close window"]', // Close button for specific popups
      'div[role="dialog"] button[aria-label="Close"]', // Generic close button within a dialog
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 }); // Increased timeout
        const locator = page.locator(selector);
        if (await locator.isVisible()) { // Re-check visibility after waiting
          this.logger.info(`Dismissing popup using selector: ${selector}`);
          await locator.click();
          await page.waitForTimeout(1000); // Give more time for the popup to disappear
          return true;
        }
      } catch (e) {
        // Selector not found or not visible, continue to next
      }
    }
    return false;
  }

  async waitForCards(page: Page): Promise<boolean> {
    try {
      this.logger.info("Waiting for profile cards to load on OkCupid...");

      // Check for and dismiss any popups
      const popupDismissed = await this.dismissPopup(page);
      if (popupDismissed) {
        this.logger.info("Waiting for cards to appear after popup dismissal...");
        await page.waitForTimeout(2000);
      }

      // Try multiple selectors that OkCupid might use
        const selectors = [
            'button[aria-label="Like and view the next profile"]', // Like button
            'button[aria-label="Pass and view the next profile"]', // Pass button
            '.tabpanel > div > div > div', // Main profile card container
        ];

      // First attempt: check if cards are already visible (quick check)
      this.logger.info("Checking for cards...");
      for (const selector of selectors) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) {
            const firstCard = page.locator(selector).first();
            const isVisible = await firstCard
              .isVisible({ timeout: 1000 })
              .catch(() => false);
            if (isVisible) {
              this.logger.success(
                `Found visible profile cards using selector: ${selector} (count: ${count})`
              );
              await page.waitForTimeout(1000);
              return true;
            }
          }
        } catch (e) {
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
        } catch (e) {
          this.logger.debug(`Selector ${selector} not found, trying next...`);
          continue;
        }
      }

      this.logger.error("Could not find profile cards after all attempts.");
      return false;
    } catch (error) {
      this.logger.error(`Error waiting for cards: ${error}`);
      return false;
    }
  }

  async swipe(page: Page, action: 'like' | 'dislike'): Promise<boolean> {
    try {
      let selector: string;
      if (action === 'like') {
        selector = 'button[aria-label="Like and view the next profile"]';
      } else {
        selector = 'button[aria-label="Pass and view the next profile"]';
      }

      const button = page.locator(selector);
      if (await button.isVisible()) {
        await button.click();
        this.logger.info(`${action === 'like' ? 'Liked' : 'Passed'} a profile.`);
        return true;
      } else {
        this.logger.warn(`Could not find ${action} button.`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error during swipe action: ${error}`);
      return false;
    }
  }

  async hasMoreProfiles(page: Page): Promise<boolean> {
    try {
      const noMoreProfilesSelector = 'text=You\'ve seen all your available matches'; // Example selector

      const noMoreProfiles = await page.locator(noMoreProfilesSelector).isVisible();
      if (noMoreProfiles) {
        this.logger.info("No more profiles found.");
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Error checking for more profiles: ${error}`);
      return true; // Assume there are more profiles if an error occurs
    }
  }
}
