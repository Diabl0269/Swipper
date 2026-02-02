import { Page } from 'playwright';
import { BaseSite } from '../../src/sites/base';
import { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/utils/logger');

// Create a concrete implementation of BaseSite for testing
class TestSite extends BaseSite {
  constructor(config: SiteConfig, logger: Logger) {
    super(config, logger);
  }

  async isLoggedIn(_page: Page): Promise<boolean> { return true; }
  async navigate(_page: Page): Promise<void> {}
  async waitForCards(_page: Page): Promise<boolean> { return true; }
  async swipe(_page: Page, _action: 'like' | 'dislike'): Promise<boolean> { return true; }
  async hasMoreProfiles(_page: Page): Promise<boolean> { return true; }
  getUrl(): string { return 'test.com'; }
}

describe('BaseSite', () => {
  let site: TestSite;
  let config: SiteConfig;
  let logger: Logger;
  let _page: jest.Mocked<Page>; // Renamed page to _page

  beforeEach(() => {
    config = {
      enabled: true,
      likeRatio: 0.8,
      swipeDelay: { min: 1000, max: 3000 },
      maxSwipesPerSession: 100,
    };
    logger = new Logger();
    site = new TestSite(config, logger);
    _page = {} as jest.Mocked<Page>; // Renamed page to _page
  });

  it('should be an instance of BaseSite', () => {
    expect(site).toBeInstanceOf(BaseSite);
  });

  it('dismissPopup should return false by default', async () => {
    const result = await site.dismissPopup(_page); // Used _page
    expect(result).toBe(false);
  });
});