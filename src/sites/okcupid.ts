import { Page } from 'playwright';
import { BaseSite } from './base';
import { SiteConfig } from '../types';
import { Logger } from '../utils/logger';
import { humanClick, random } from '../utils/helpers';

export class OkCupidSite extends BaseSite {
  private readonly URL = 'https://www.okcupid.com';

  constructor(config: SiteConfig, logger: Logger) {
    super(config, logger);
  }

  getUrl(): string {
    return this.URL;
  }

  async isLoggedIn(page: Page): Promise<boolean> {
    this.logger.debug("Checking OkCupid login status...");
    try {
      // 1. Primary Check: Wait for a reliable logged-in indicator to be visible.
      // The profile icon or the main navigation are good candidates.
      const loggedInLocator = page.locator('a[href="/profile"], nav[aria-label="Primary"]');
      this.logger.debug("Waiting for logged-in indicator...");
      await loggedInLocator.first().waitFor({ state: 'visible', timeout: 5000 });
      this.logger.info("Logged-in indicator found, user is logged in.");
      return true;
    } catch (e) {
      this.logger.debug("Primary logged-in indicator not found within timeout.");
      // 2. Secondary Check: If the primary indicator fails, check for the *absence* of logged-out indicators.
      // If there's no "Sign In" or "Join" button, we can be reasonably sure the user is logged in.
      const loggedOutLocator = page.getByRole('link', { name: /Sign In|Join OkCupid/i });
      const count = await loggedOutLocator.count();
      if (count === 0) {
        this.logger.info("Logged-out indicators not found, assuming user is logged in.");
        return true;
      } else {
        this.logger.warn("Logged-out indicators found, user is not logged in.");
        return false;
      }
    }
  }

  async navigate(page: Page): Promise<void> {
    this.logger.info("Navigating to OkCupid...");
    await page.goto(this.URL, { waitUntil: "domcontentloaded" });
    this.logger.info("Page navigation complete, handling cookie banner...");

    try {
      // Handle the OneTrust cookie consent banner
      const acceptButton = page.locator('#onetrust-accept-btn-handler');
      await acceptButton.waitFor({ state: 'visible', timeout: 10000 });
      this.logger.info("Cookie consent banner found. Clicking 'Accept'.");
      await humanClick(page, acceptButton);
      // Wait for the banner to disappear
      await page.waitForTimeout(random(1500, 2500));
    } catch (error) {
      this.logger.debug("Cookie consent banner not found or already accepted.");
    }
    
    // The subsequent isLoggedIn check will act as the explicit wait for a usable page.
  }

  async dismissPopup(page: Page): Promise<boolean> {
    try {
      // Check for the "New likes" banner and close it.
      const newLikesBanner = page.locator('a:has-text("New likes")');
      if (await newLikesBanner.isVisible()) {
          const closeButton = newLikesBanner.getByRole('button', { name: 'Close' });
          if (await closeButton.isVisible()) {
              this.logger.info("Found and closing the 'New likes' notification banner.");
              await humanClick(page, closeButton);
              await page.waitForTimeout(random(500, 1000));
              // This popup doesn't block interaction, so we don't return true,
              // allowing other popups to be checked.
          }
      }
      
      // Fallback for SuperLike upsell, which might not be a standard dialog
      const likeAnywayButton = page.getByRole('button', { name: "LIKE THEM ANYWAY" });
      if (await likeAnywayButton.isVisible()) {
          this.logger.info("Found 'Like Them Anyway' button, dismissing SuperLike popup...");
          await humanClick(page, likeAnywayButton);
          await page.waitForTimeout(random(1000, 1500));
          return true;
      }

      // Check for "IT'S A MATCH!" popup
      const mutualMatchModal = page.locator('div.RwExEGDmxyCOmxlC8VqG:has-text("IT’S A MATCH!")');
      if (await mutualMatchModal.isVisible()) {
        const closeMatchButton = mutualMatchModal.locator('button[data-cy="matchEvent.closeButton"]');
        if (await closeMatchButton.isVisible()) {
          this.logger.info("Found 'IT’S A MATCH!' popup, dismissing...");
          await humanClick(page, closeMatchButton);
          await page.waitForTimeout(random(1000, 1500));
          return true;
        }
      }
      
      // Check for "Priority Likes" upsell popup
      const priorityLikesPopup = page.locator('p:has-text("Get your Likes seen sooner with Priority Likes, included in Premium Plus.")');
      if (await priorityLikesPopup.isVisible()) {
        const closeButton = page.getByRole('button', { name: 'Close' });
        if (await closeButton.isVisible()) {
          this.logger.info("Found 'Priority Likes' upsell popup, dismissing...");
          await humanClick(page, closeButton);
          await page.waitForTimeout(random(1000, 1500));
          return true;
        }
      }
      
      // Prioritize checking for the "Enable Notifications" popup
      const notificationsDialog = page.locator('div[role="dialog"], div[role="alertdialog"]');
      if (await notificationsDialog.isVisible()) {
        const notNowButton = notificationsDialog.getByRole('button', { name: 'Not now' });
        if (await notNowButton.isVisible()) {
          this.logger.info("Found 'Enable Notifications' popup, dismissing with 'Not now'.");
          await humanClick(page, notNowButton);
          await page.waitForTimeout(random(1000, 1500));
          return true;
        }
      }
      
      // Check for the specific "MAYBE LATER" button from the likes-celebration popup
      const maybeLaterButton = page.locator('button.likes-celebration-actions-anticta:has-text("MAYBE LATER")');
      if (await maybeLaterButton.isVisible()) {
        this.logger.info("Found 'MAYBE LATER' button on likes-celebration popup, dismissing...");
        await humanClick(page, maybeLaterButton);
        await page.waitForTimeout(random(1000, 1500));
        return true;
      }

      // A more robust way to find popups is to look for dialog roles and then find a close button within them
      const dialog = page.locator('div[role="dialog"], div[role="alertdialog"]');
      if (await dialog.isVisible()) {
        this.logger.info("Generic dialog popup detected. Trying to dismiss...");
        // Prioritize specific, user-visible close buttons
        const closeButton = dialog.getByRole('button', { name: /Close|No Thanks|Dismiss|Maybe Later/i });
        if (await closeButton.isVisible()) {
          this.logger.info(`Found close button with text: "${await closeButton.textContent()}"`);
          await humanClick(page, closeButton);
          await page.waitForTimeout(random(1000, 1500));
          return true;
        }
      }

    } catch (e) {
      // It's okay if no popup is found
    }
    return false;
  }

  async waitForCards(page: Page): Promise<boolean> {
    try {
      this.logger.info("Waiting for profile cards to load on OkCupid...");
      await this.dismissPopup(page); // Always check for popups first

      this.logger.debug("Waiting for 'Like' or 'Pass' button to be visible...");
      const likeButton = page.getByRole('button', { name: 'Like and view the next profile' });
      const passButton = page.getByRole('button', { name: 'Pass and view the next profile' });

      // Use Promise.race to wait for whichever button appears first
      await Promise.race([
        likeButton.waitFor({ state: 'visible', timeout: 15000 }),
        passButton.waitFor({ state: 'visible', timeout: 15000 }),
      ]);
      
      this.logger.success("Profile card action buttons are visible.");
      return true;
    } catch (error) {
      this.logger.error(`Error waiting for cards: ${error}`);
      return false;
    }
  }

  async swipe(page: Page, action: 'like' | 'dislike'): Promise<boolean> {
    try {
      await this.dismissPopup(page); // Always check for popups before a swipe

      const button = action === 'like'
        ? page.getByRole('button', { name: 'Like and view the next profile' })
        : page.getByRole('button', { name: 'Pass and view the next profile' });

      if (await button.isVisible()) {
        await humanClick(page, button);
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
      // OkCupid often shows a "You're out of people" message
      const noMoreProfiles = page.getByRole('heading', { name: /You're out of people|No more matches/i });
      if (await noMoreProfiles.isVisible()) {
        this.logger.info("No more profiles found.");
        return false;
      }
      return true;
    } catch (error) {
      // If we can't find the "no more profiles" message, assume there are still profiles
      return true;
    }
  }
}
