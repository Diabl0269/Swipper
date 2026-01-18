/**
 * Defines the minimum and maximum delay between swipes.
 */
export interface SwipeDelay {
  /** The minimum delay in milliseconds. */
  min: number;
  /** The maximum delay in milliseconds. */
  max: number;
}

/**
 * Configuration for a specific dating site.
 */
export interface SiteConfig {
  /** Whether the bot is enabled for this site. */
  enabled: boolean;
  /** The probability of liking a profile (0.0 to 1.0). */
  likeRatio: number;
  /** The random delay between swipes. */
  swipeDelay: SwipeDelay;
  /** The maximum number of swipes per session. */
  maxSwipesPerSession: number;
}

/**
 * Configuration for the browser instance.
 */
export interface BrowserConfig {
  /** Whether to run the browser in headless mode. */
  headless: boolean;
  /** The path to store the browser profile. */
  profilePath: string;
}

/**
 * The main application configuration.
 */
export interface AppConfig {
  /** Configuration for each supported dating site. */
  sites: {
    tinder?: SiteConfig;
    [key: string]: SiteConfig | undefined;
  };
  /** Configuration for the browser. */
  browser: BrowserConfig;
}

/**
 * Represents the decision to like or dislike a profile.
 */
export interface SwipeDecision {
  /** The action to perform. */
  action: 'like' | 'dislike';
}