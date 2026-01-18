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
    throw new Error('Method not implemented.');
  }

  async navigate(page: Page): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async waitForCards(page: Page): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async swipe(page: Page, action: 'like' | 'dislike'): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async hasMoreProfiles(page: Page): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
