import { SiteConfig, SwipeDecision } from '../types.js';
import { Logger } from './logger.js';

/**
 * Manages swipe rate limiting and decision making.
 */
export class RateLimiter {
  private config: SiteConfig;
  private logger: Logger;

  /**
   * Creates an instance of RateLimiter.
   * @param config - The site configuration.
   * @param logger - The logger instance.
   */
  constructor(config: SiteConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    logger.info(`Rate limiter initialized with like ratio: ${(config.likeRatio * 100).toFixed(1)}%`);
  }

  /**
   * Generates a random delay between min and max milliseconds.
   */
  async delay(): Promise<void> {
    const delayMs = this.randomInt(
      this.config.swipeDelay.min,
      this.config.swipeDelay.max
    );
    this.logger.debug(`Waiting ${delayMs}ms before next action`);
    await this.sleep(delayMs);
  }

  /**
   * Decides whether to like or dislike based on the configured ratio.
   * @returns The swipe decision.
   */
  decideSwipe(): SwipeDecision {
    const random = Math.random();
    const action = random < this.config.likeRatio ? 'like' : 'dislike';
    this.logger.debug(`Random: ${random.toFixed(3)}, Threshold: ${this.config.likeRatio}, Action: ${action}`);
    return { action };
  }

  /**
   * Introduces a random delay to mimic reading a profile.
   */
  async readingDelay(): Promise<void> {
    // 10% chance of a longer pause (5-10 seconds) to mimic reading
    if (Math.random() < 0.1) {
      const readingDelay = this.randomInt(5000, 10000);
      this.logger.debug(`Taking a reading pause of ${readingDelay}ms`);
      await this.sleep(readingDelay);
    }
  }

  /**
   * Generates a random integer between min and max.
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns A random integer.
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Pauses execution for a specified number of milliseconds.
   * @param ms - The number of milliseconds to sleep.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}