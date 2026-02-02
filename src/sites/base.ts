import { Page } from 'playwright';
import { Logger } from '../utils/logger';
import { SiteConfig } from '../types';

/**
 * Interface for a site module, defining the required methods for interacting with a dating site.
 */
export interface SiteModule {
  /**
   * Checks if the user is logged in.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if logged in, false otherwise.
   */
  isLoggedIn(_page: Page): Promise<boolean>;

  /**
   * Navigates to the site and waits for it to load.
   * @param page - The Playwright page instance.
   */
  navigate(_page: Page): Promise<void>;

  /**
   * Waits for profile cards to be available on the page.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if cards are found, false otherwise.
   */
  waitForCards(_page: Page): Promise<boolean>;

  /**
   * Performs a swipe action (like or dislike).
   * @param page - The Playwright page instance.
   * @param action - The swipe action to perform.
   * @returns A promise that resolves to true if the swipe was successful, false otherwise.
   */
  swipe(_page: Page, action: 'like' | 'dislike'): Promise<boolean>;

  /**
   * Checks if there are more profiles available to swipe.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if more profiles are available, false otherwise.
   */
  hasMoreProfiles(_page: Page): Promise<boolean>;

  /**
   * Dismisses any active popups or modals on the page.
   * @param page - The Playwright page instance.
   * @returns A promise that resolves to true if a popup was dismissed, false otherwise.
   */
  dismissPopup(_page: Page): Promise<boolean>;

  /**
   * Gets the base URL of the site.
   * @returns The site's URL.
   */
  getUrl(): string;
}

/**
 * Abstract base class for site modules.
 */
export abstract class BaseSite implements SiteModule {
  protected config: SiteConfig;
  protected logger: Logger;

  /**
   * Creates an instance of BaseSite.
   * @param config - The site configuration.
   * @param logger - The logger instance.
   */
  constructor(config: SiteConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  abstract isLoggedIn(_page: Page): Promise<boolean>;
  abstract navigate(_page: Page): Promise<void>;
  abstract waitForCards(_page: Page): Promise<boolean>;
  abstract swipe(_page: Page, action: 'like' | 'dislike'): Promise<boolean>;
  abstract hasMoreProfiles(_page: Page): Promise<boolean>;
  abstract getUrl(): string;

  async dismissPopup(_page: Page): Promise<boolean> {
    // Default implementation: do nothing and return false
    return false;
  }
}
