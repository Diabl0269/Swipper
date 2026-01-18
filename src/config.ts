import { readFileSync } from "fs";
import { join } from "path";
import { AppConfig, SiteConfig, BrowserConfig } from "./types.js";

const DEFAULT_CONFIG: AppConfig = {
  sites: {
    tinder: {
      enabled: true,
      likeRatio: 0.9,
      swipeDelay: {
        min: 1000,
        max: 2000,
      },
      maxSwipesPerSession: 400,
    },
  },
  browser: {
    headless: false,
    profilePath: "./browser-profile",
  },
};

/**
 * Manages the application configuration, loading from a file and merging with defaults.
 */
export class Config {
  private config: AppConfig;

  /**
   * Creates an instance of Config.
   * @param configPath - The path to the configuration file.
   */
  constructor(configPath?: string) {
    try {
      const path = configPath || join(process.cwd(), "config.json");
      const configFile = readFileSync(path, "utf-8");
      const fileConfig = JSON.parse(configFile) as Partial<AppConfig>;
      this.config = this.mergeConfig(DEFAULT_CONFIG, fileConfig);
    } catch (error) {
      console.warn("Could not load config.json, using defaults");
      this.config = DEFAULT_CONFIG;
    }
  }

  /**
   * Deep merges the default configuration with the user-provided configuration.
   * @param defaultConfig - The default configuration.
   * @param fileConfig - The configuration loaded from the file.
   * @returns The merged application configuration.
   */
  private mergeConfig(
    defaultConfig: AppConfig,
    fileConfig: Partial<AppConfig>
  ): AppConfig {
    // Deep merge sites configuration
    const mergedSites: AppConfig["sites"] = { ...defaultConfig.sites };

    if (fileConfig.sites) {
      for (const [siteName, siteConfig] of Object.entries(fileConfig.sites)) {
        if (siteConfig) {
          const defaultSiteConfig = defaultConfig.sites[siteName];
          // Merge individual site configs deeply
          mergedSites[siteName] = {
            ...defaultSiteConfig,
            ...siteConfig,
            // Deep merge swipeDelay if it exists
            swipeDelay:
              siteConfig.swipeDelay && defaultSiteConfig?.swipeDelay
                ? { ...defaultSiteConfig.swipeDelay, ...siteConfig.swipeDelay }
                : siteConfig.swipeDelay || defaultSiteConfig?.swipeDelay,
          } as SiteConfig;
        }
      }
    }

    return {
      sites: mergedSites,
      browser: {
        ...defaultConfig.browser,
        ...fileConfig.browser,
      },
    };
  }

  /**
   * Gets the configuration for a specific site.
   * @param siteName - The name of the site.
   * @returns The site configuration, or null if not found or disabled.
   */
  getSiteConfig(siteName: string): SiteConfig | null {
    const siteConfig = this.config.sites[siteName];
    if (!siteConfig || !siteConfig.enabled) {
      return null;
    }
    return siteConfig;
  }

  /**
   * Gets the browser configuration.
   * @returns The browser configuration.
   */
  getBrowserConfig(): BrowserConfig {
    return this.config.browser;
  }

  /**
   * Gets a list of all enabled sites.
   * @returns An array of enabled site names.
   */
  getAllSites(): string[] {
    return Object.keys(this.config.sites).filter(
      (site) => this.config.sites[site]?.enabled
    );
  }
}
