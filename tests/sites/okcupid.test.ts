import { OkCupidSite } from '../../src/sites/okcupid';
import { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/utils/logger');

describe('OkCupidSite', () => {
  let site: OkCupidSite;
  let config: SiteConfig;
  let logger: Logger;

  beforeEach(() => {
    config = {
      enabled: true,
      likeRatio: 0.8,
      swipeDelay: { min: 1000, max: 3000 },
      maxSwipesPerSession: 100,
    };
    logger = new Logger();
    site = new OkCupidSite(config, logger);
  });

  it('should be an instance of OkCupidSite', () => {
    expect(site).toBeInstanceOf(OkCupidSite);
  });

  it('should have a getUrl method that returns the correct URL', () => {
    expect(site.getUrl()).toBe('https://www.okcupid.com');
  });
});