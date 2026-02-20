import { chromium, BrowserContext, Browser, BrowserContextOptions } from 'playwright';
import { BrowserConfig } from '../types';
import { Logger } from './logger';
import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Manages the Playwright browser instance, including profile handling.
 */
export class BrowserManager {
  private config: BrowserConfig;
  private logger: Logger;
  private browser: Browser | null = null; // Changed from context to browser
  private copiedProfilePath: string | null = null;
  private mainPersistentContext: BrowserContext | null = null; // To handle the primary storage state

  /**
   * Creates an instance of BrowserManager.
   * @param config - The browser configuration.
   * @param logger - The logger instance.
   */
  constructor(config: BrowserConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Gets the path to the default Chrome user profile.
   * @returns The path to the Chrome profile, or null if not found.
   */
  private getChromeProfilePath(): string | null {
    // Find Chrome's User Data directory
    const platform = process.platform;
    let chromeDataDir: string;

    if (platform === 'darwin') {
      // macOS
      chromeDataDir = join(homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
    } else if (platform === 'win32') {
      // Windows
      chromeDataDir = join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
    } else {
      // Linux
      chromeDataDir = join(homedir(), '.config', 'google-chrome');
    }

    if (!existsSync(chromeDataDir)) {
      return null;
    }

    // Try Default profile first, then Profile 1
    const defaultProfile = join(chromeDataDir, 'Default');
    const profile1 = join(chromeDataDir, 'Profile 1');

    if (existsSync(defaultProfile)) {
      return defaultProfile;
    } else if (existsSync(profile1)) {
      return profile1;
    }

    return null;
  }

  /**
   * Checks if a file should be skipped during profile copying.
   * @param fileName - The name of the file to check.
   * @returns True if the file should be skipped, false otherwise.
   */
  private shouldSkipFile(fileName: string): boolean {
    // Skip lock files and other problematic files
    const skipPatterns = [
      'lockfile',
      'SingletonLock',
      'SingletonSocket',
      'SingletonCookie',
      'GPUCache', // GPU cache can cause issues
      'ShaderCache', // Shader cache can cause issues
      'GrShaderCache', // Graphics shader cache
    ];

    return skipPatterns.some(pattern => fileName.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * Recursively copies a directory, skipping problematic files.
   * @param src - The source directory.
   * @param dest - The destination directory.
   */
  private copyDirectory(src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      // Skip problematic files
      if (this.shouldSkipFile(entry.name)) {
        this.logger.debug(`Skipping file: ${entry.name}`);
        continue;
      }

      if (entry.isDirectory()) {
        // Skip certain directories that might cause issues
        if (entry.name === 'GPUCache' || entry.name === 'ShaderCache' || entry.name === 'GrShaderCache') {
          continue;
        }
        this.copyDirectory(srcPath, destPath);
      } else {
        try {
          cpSync(srcPath, destPath, { force: true });
        } catch (_error: unknown) {
          // Some files might be locked, skip them
          const errorMessage = _error instanceof Error ? _error.message : String(_error);
          this.logger.debug(`Could not copy ${entry.name}: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Copies the Chrome profile to a temporary directory.
   * @returns The path to the copied profile directory.
   */
  private copyChromeProfile(): string {
    const chromeProfile = this.getChromeProfilePath();
    
    if (!chromeProfile) {
      throw new Error('Chrome profile not found. Please ensure Chrome is installed and you have logged in at least once.');
    }

    this.logger.info(`Found Chrome profile: ${chromeProfile}`);
    this.logger.info('Copying Chrome profile (this may take a moment)...');

    // Create User Data directory structure
    const userDataDir = join(process.cwd(), this.config.profilePath, 'chrome-profile-copy');
    const defaultProfileCopy = join(userDataDir, 'Default');
    
    // Ensure directory exists
    if (!existsSync(userDataDir)) {
      mkdirSync(userDataDir, { recursive: true });
    }

    // Copy the profile to Default subdirectory
    this.copyDirectory(chromeProfile, defaultProfileCopy);
    
    this.logger.success('Chrome profile copied successfully');
    this.copiedProfilePath = userDataDir;
    
    return userDataDir;
  }

  /**
   * Initializes the browser instance.
   * @returns A promise that resolves when the browser is launched.
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing browser instance...');

    // Use custom profile path if specified, otherwise copy Chrome's profile
    let userDataDir: string;
    
    if (this.config.profilePath && this.config.profilePath !== './browser-profile') {
      // User specified a custom path
      userDataDir = join(process.cwd(), this.config.profilePath);
      if (!existsSync(userDataDir)) {
        mkdirSync(userDataDir, { recursive: true });
      }
    } else {
      // Copy Chrome's profile so Chrome can stay open
      userDataDir = this.copyChromeProfile();
    }

    try {
      this.mainPersistentContext = await chromium.launchPersistentContext(userDataDir, {
        headless: this.config.headless,
        channel: 'chrome',
        viewport: { width: 1280, height: 720 },
      });
      this.browser = this.mainPersistentContext.browser(); // Get the browser instance from the persistent context

      // Hide the fact that we are using a web driver for the main context
      await this.mainPersistentContext.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      this.logger.success('Browser instance initialized with Chrome profile copy');
      this.logger.info('Note: Chrome can remain open - we\'re using a copy of your profile');
    } catch (_error: unknown) {
      const errorMessage = _error instanceof Error ? _error.message : String(_error);
      this.logger.error(`Failed to initialize browser: ${errorMessage}`);
      throw _error;
    }
  }

  /**
   * Creates a new browser context.
   * @param options - Options for the new browser context.
   * @returns A promise that resolves with the new browser context.
   */
  async newContext(options?: BrowserContextOptions): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    const context = await this.browser.newContext(options);
    // Hide the fact that we are using a web driver for this new context
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    return context;
  }

  /**
   * Saves the storage state of a given browser context to a file.
   * This is primarily for the main persistent context, or if individual contexts need saving.
   * @param context - The browser context whose state to save.
   */
  async saveStorageState(context?: BrowserContext): Promise<void> {
    const contextToSave = context || this.mainPersistentContext;
    if (contextToSave) {
      const profilePath = join(process.cwd(), this.config.profilePath);
      if (!existsSync(profilePath)) {
        mkdirSync(profilePath, { recursive: true });
      }
      try {
        await contextToSave.storageState({ path: join(profilePath, 'storage-state.json') });
        this.logger.debug('Saved browser storage state');
      } catch (_error: unknown) {
        const errorMessage = _error instanceof Error ? _error.message : String(_error);
        this.logger.debug(`Could not save storage state: ${errorMessage}`);
      }
    }
  }

  /**
   * Closes the browser instance and all its contexts.
   */
  async close(): Promise<void> {
    if (this.mainPersistentContext) {
      await this.saveStorageState(this.mainPersistentContext);
      await this.mainPersistentContext.close();
    }
    if (this.browser) {
        await this.browser.close();
    }
    this.logger.info('Browser closed');
  }

  /**
   * Gets the main persistent browser context.
   * @returns The main persistent browser context, or null if not initialized.
   */
  getContext(): BrowserContext | null {
    return this.mainPersistentContext;
  }
}