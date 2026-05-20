import { TinderSite } from '../../src/sites/tinder';
import type { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';
import { Page, Locator, Keyboard } from 'playwright';

jest.mock('../../src/utils/logger');

describe('TinderSite', () => {
  let site: TinderSite;
  let config: SiteConfig;
  let logger: Logger;
  let mockPage: jest.Mocked<Page>;

  beforeEach(() => {
    config = {
      enabled: true,
      likeRatio: 0.8,
      swipeDelay: { min: 1000, max: 3000 },
      maxSwipesPerSession: 100,
    };
    logger = new Logger();
    mockPage = {
      locator: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      isVisible: jest.fn(),
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      goto: jest.fn(),
      waitForURL: jest.fn(),
      reload: jest.fn(),
      waitForLoadState: jest.fn(),
      url: jest.fn(),
      waitForSelector: jest.fn(),
      keyboard: {
        press: jest.fn(),
      } as unknown as jest.Mocked<Keyboard>,
      viewportSize: jest.fn(),
      getByRole: jest.fn().mockReturnThis(),
      textContent: jest.fn(),
      innerText: jest.fn(),
    } as unknown as jest.Mocked<Page>;
    site = new TinderSite(config, logger);
  });

  it('should be an instance of TinderSite', () => {
    expect(site).toBeInstanceOf(TinderSite);
  });
});
