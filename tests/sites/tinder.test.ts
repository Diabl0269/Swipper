import { TinderSite } from '../../src/sites/tinder';
import { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';
import { Page } from 'playwright';

// Mock dependencies
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
    } as unknown as jest.Mocked<Page>;
    site = new TinderSite(config, logger);
  });

  it('should be an instance of TinderSite', () => {
    expect(site).toBeInstanceOf(TinderSite);
  });

  it('should have a getUrl method that returns the correct URL', () => {
    expect(site.getUrl()).toBe('https://tinder.com');
  });

  describe('dismissPopup', () => {
    it('should dismiss a match popup with a close button', async () => {
      const mockFirst = {
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn().mockResolvedValue(undefined),
        boundingBox: jest.fn().mockResolvedValue({
          x: 10,
          y: 10,
          width: 100,
          height: 50,
        }),
      };
      mockPage.locator.mockReturnValue({
        first: () => mockFirst,
      } as any);

      // Mock viewportSize
      mockPage.viewportSize = jest.fn().mockReturnValue({
        width: 800,
        height: 600,
      });

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(true);
      expect(mockFirst.click).toHaveBeenCalled();
    });

    it('should not dismiss a popup if no close button is visible', async () => {
      const mockFirst = {
        isVisible: jest.fn().mockResolvedValue(false),
        click: jest.fn().mockResolvedValue(undefined),
      };
      mockPage.locator.mockReturnValue({
        first: () => mockFirst,
      } as any);

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(false);
      expect(mockFirst.click).not.toHaveBeenCalled();
    });
  });
});
