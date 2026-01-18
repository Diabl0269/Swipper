import { Page } from 'playwright';
import { BrowserManager } from './utils/browser.js';
import { SiteModule } from './sites/base.js';
import { RateLimiter } from './utils/rateLimiter.js';
import { Logger } from './utils/logger.js';
import { SiteConfig } from './types.js';
import { TinderSite } from './sites/tinder.js';

/**
 * Statistics for a swiping session.
 */
export interface SwiperStats {
  /** The total number of swipes performed. */
  totalSwipes: number;
  /** The number of profiles liked. */
  likes: number;
  /** The number of profiles disliked. */
  dislikes: number;
  /** The number of errors encountered during swiping. */
  errors: number;
}

/**
 * The core class for managing the swiping process.
 */
export class Swiper {
  private browserManager: BrowserManager;
  private siteModule: SiteModule;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private config: SiteConfig;
  private stats: SwiperStats;

  /**
   * Creates an instance of Swiper.
   * @param browserManager - The browser manager instance.
   * @param siteModule - The site module for the target dating site.
   * @param rateLimiter - The rate limiter instance.
   * @param logger - The logger instance.
   * @param config - The configuration for the target site.
   */
  constructor(
    browserManager: BrowserManager,
    siteModule: SiteModule,
    rateLimiter: RateLimiter,
    logger: Logger,
    config: SiteConfig
  ) {
    this.browserManager = browserManager;
    this.siteModule = siteModule;
    this.rateLimiter = rateLimiter;
    this.logger = logger;
    this.config = config;
    this.stats = {
      totalSwipes: 0,
      likes: 0,
      dislikes: 0,
      errors: 0,
    };
  }

  /**
   * Runs the swiping session.
   * @returns A promise that resolves with the session statistics.
   */
  async run(): Promise<SwiperStats> {
    const context = this.browserManager.getContext();
    if (!context) {
      throw new Error('Browser context not initialized');
    }

    const page = await context.newPage();

    try {
      // Navigate to the site immediately
      await this.siteModule.navigate(page);

      // Check if logged in
      let loggedIn = await this.siteModule.isLoggedIn(page);
      if (!loggedIn) {
        this.logger.warn('Not logged in. Please log in manually in the browser window.');
        this.logger.info('Waiting for you to log in... (Press Ctrl+C when done)');
        
        // Wait for user to log in (check every 5 seconds)
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait
        while (attempts < maxAttempts) {
          await page.waitForTimeout(5000);
          loggedIn = await this.siteModule.isLoggedIn(page);
          if (loggedIn) {
            this.logger.success('Login detected! Waiting for page to stabilize...');
            // Give page time to fully load after login
            await page.waitForTimeout(3000);
            break;
          }
          attempts++;
          if (attempts % 12 === 0) {
            this.logger.info(`Still waiting for login... (${attempts * 5}s elapsed)`);
          }
        }

        if (!loggedIn) {
          throw new Error('Login timeout. Please ensure you are logged in and try again.');
        }
      } else {
        // Already logged in, give page a moment to stabilize
        this.logger.info('Already logged in, waiting for page to stabilize...');
        await page.waitForTimeout(2000);
      }

      // Wait for cards to load
      const cardsAvailable = await this.siteModule.waitForCards(page);
      if (!cardsAvailable) {
        throw new Error('Could not find profile cards. The page may have changed or you may need to refresh.');
      }

      // Start swiping loop
      this.logger.info(`Starting swiping session (max ${this.config.maxSwipesPerSession} swipes)...`);
      
      while (this.stats.totalSwipes < this.config.maxSwipesPerSession) {
        // Check for and dismiss any popups that might appear during swiping
        if (this.siteModule instanceof TinderSite) {
          await this.siteModule.dismissPopup(page);
        }

        // Check if we still have profiles
        const hasMore = await this.siteModule.hasMoreProfiles(page);
        if (!hasMore) {
          this.logger.warn('No more profiles available or hit a limit');
          break;
        }

        // Decide on swipe action
        const decision = this.rateLimiter.decideSwipe();
        
        // Perform swipe
        const success = await this.siteModule.swipe(page, decision.action);
        
        if (success) {
          this.stats.totalSwipes++;
          if (decision.action === 'like') {
            this.stats.likes++;
          } else {
            this.stats.dislikes++;
          }
          
          this.logger.info(
            `Swipe ${this.stats.totalSwipes}/${this.config.maxSwipesPerSession}: ${decision.action.toUpperCase()} ` +
            `(Total: ${this.stats.likes} likes, ${this.stats.dislikes} dislikes)`
          );
        } else {
          this.stats.errors++;
          this.logger.warn('Swipe failed or hit a limit');
          // If swipe failed, we might have hit a limit
          const stillHasMore = await this.siteModule.hasMoreProfiles(page);
          if (!stillHasMore) {
            break;
          }
        }

        // Random delay before next swipe
        await this.rateLimiter.delay();

        // Occasional reading delay
        await this.rateLimiter.readingDelay();
      }

      this.logger.success('Swiping session completed!');
      this.printStats();

      return this.stats;
    } catch (error) {
      this.logger.error(`Error during swiping: ${error}`);
      throw error;
    } finally {
      await page.close();
      await this.browserManager.saveStorageState();
    }
  }

  /**
   * Prints the session statistics to the console.
   */
  private printStats(): void {
    this.logger.info('=== Session Statistics ===');
    this.logger.info(`Total Swipes: ${this.stats.totalSwipes}`);
    this.logger.info(`Likes: ${this.stats.likes} (${((this.stats.likes / this.stats.totalSwipes) * 100).toFixed(1)}%)`);
    this.logger.info(`Dislikes: ${this.stats.dislikes} (${((this.stats.dislikes / this.stats.totalSwipes) * 100).toFixed(1)}%)`);
    this.logger.info(`Errors: ${this.stats.errors}`);
  }

  /**
   * Gets the current session statistics.
   * @returns The session statistics.
   */
  getStats(): SwiperStats {
    return { ...this.stats };
  }
}