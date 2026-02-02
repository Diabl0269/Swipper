import { TinderSite } from '../../src/sites/tinder';
import type { SiteConfig } from '../../src/types';
import type { Logger } from '../../src/utils/logger';
import { Page, Locator, Keyboard } from 'playwright'; // Import Keyboard

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
      goto: jest.fn(), // Explicitly mock goto
      waitForURL: jest.fn(), // Explicitly mock waitForURL
      reload: jest.fn(), // Explicitly mock reload
      waitForLoadState: jest.fn(), // Explicitly mock waitForLoadState
      url: jest.fn(), // For isLoggedIn tests
      waitForSelector: jest.fn(), // For waitForCards tests
      keyboard: {
        press: jest.fn(), // Correctly mock press here
      } as unknown as jest.Mocked<Keyboard>, // Changed to as unknown as jest.Mocked<Keyboard>
      viewportSize: jest.fn(), // For dismissPopup
      getByRole: jest.fn().mockReturnThis(), // For isLoggedIn and hasMoreProfiles
      textContent: jest.fn(), // For hasMoreProfiles
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
      } as unknown as Locator); // Changed to as unknown as Locator

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
      } as unknown as Locator); // Changed to as unknown as Locator

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(false);
      expect(mockFirst.click).not.toHaveBeenCalled();
    });
    
    it('should not dismiss a popup if bounding box is not available', async () => {
      const mockFirst = {
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn(),
        boundingBox: jest.fn().mockResolvedValue(null),
      };
      mockPage.locator.mockReturnValue({
        first: () => mockFirst,
      } as unknown as Locator); // Changed to as unknown as Locator

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(false);
      expect(mockFirst.click).not.toHaveBeenCalled();
    });
    
    it('should not dismiss a popup if viewport size is not available', async () => {
      const mockFirst = {
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn(),
        boundingBox: jest.fn().mockResolvedValue({
          x: 10,
          y: 10,
          width: 100,
          height: 50,
        }),
      };
      mockPage.locator.mockReturnValue({
        first: () => mockFirst,
      } as unknown as Locator); // Changed to as unknown as Locator
      mockPage.viewportSize = jest.fn().mockReturnValue(null);

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(false);
      expect(mockFirst.click).not.toHaveBeenCalled();
    });

    it('should not dismiss a popup if it is too large', async () => {
      const mockFirst = {
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn(),
        boundingBox: jest.fn().mockResolvedValue({
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        }),
      };
      mockPage.locator.mockReturnValue({
        first: () => mockFirst,
      } as unknown as Locator); // Changed to as unknown as Locator
      mockPage.viewportSize = jest.fn().mockReturnValue({
        width: 800,
        height: 600,
      });

      const dismissed = await site.dismissPopup(mockPage);
      expect(dismissed).toBe(false);
      expect(mockFirst.click).not.toHaveBeenCalled();
    });
  });

  describe('navigate', () => {
    it('should navigate to the correct URL and handle redirects', async () => {
      mockPage.goto.mockResolvedValue(null);
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForURL.mockResolvedValue(undefined);

      await site.navigate(mockPage);

      expect(mockPage.goto).toHaveBeenCalledWith('https://tinder.com', { waitUntil: 'domcontentloaded' });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
      expect(mockPage.waitForURL).toHaveBeenCalledWith(/tinder\.com/, { timeout: 5000 });
    });

    it('should navigate to the correct URL and not fail if waitForURL times out', async () => {
      mockPage.goto.mockResolvedValue(null);
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForURL.mockRejectedValue(new Error('timeout'));

      await site.navigate(mockPage);

      expect(mockPage.goto).toHaveBeenCalledWith('https://tinder.com', { waitUntil: 'domcontentloaded' });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
      expect(mockPage.waitForURL).toHaveBeenCalledWith(/tinder\.com/, { timeout: 5000 });
    });
  });

  describe('refresh', () => {
    it('should refresh the page and wait for content to load', async () => {
      mockPage.reload.mockResolvedValue(null);
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForURL.mockResolvedValue(undefined);
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      await site.refresh(mockPage);

      expect(mockPage.reload).toHaveBeenCalledWith({ waitUntil: 'domcontentloaded' });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
      expect(mockPage.waitForURL).toHaveBeenCalledWith(/tinder\.com/, { timeout: 5000 });
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
    });

    it('should refresh the page and not fail if waitForURL times out', async () => {
      mockPage.reload.mockResolvedValue(null);
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForURL.mockRejectedValue(new Error('timeout'));
      mockPage.waitForLoadState.mockResolvedValue(undefined);

      await site.refresh(mockPage);

      expect(mockPage.reload).toHaveBeenCalledWith({ waitUntil: 'domcontentloaded' });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
      expect(mockPage.waitForURL).toHaveBeenCalledWith(/tinder\.com/, { timeout: 5000 });
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
    });

    it('should refresh the page and not fail if waitForLoadState times out', async () => {
      mockPage.reload.mockResolvedValue(null);
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForURL.mockResolvedValue(undefined);
      mockPage.waitForLoadState.mockRejectedValue(new Error('timeout'));

      await site.refresh(mockPage);

      expect(mockPage.reload).toHaveBeenCalledWith({ waitUntil: 'domcontentloaded' });
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000);
      expect(mockPage.waitForURL).toHaveBeenCalledWith(/tinder\.com/, { timeout: 5000 });
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 10000 });
    });
  });

  describe('isLoggedIn', () => {
    beforeEach(() => {
      mockPage.url.mockClear();
      mockPage.waitForTimeout.mockClear();
      mockPage.waitForSelector.mockClear();
      mockPage.locator.mockClear();
      mockPage.getByRole.mockClear();
    });

    it('should return true if current URL includes "/app"', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(null); // Simulate cards found

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
      expect(mockPage.waitForSelector).toHaveBeenCalled();
    });

    it('should return true if current URL includes "/app" but cards not immediately visible', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockRejectedValue(new Error('timeout')); // Simulate cards not found

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
      expect(mockPage.waitForSelector).toHaveBeenCalled();
    });

    it('should return false if login form is present and no cards/nav are found', async () => {
      mockPage.url.mockReturnValue('https://tinder.com');
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('input[type="email"]')) { // Login form
          return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
        } else if (selector.includes('[data-testid="card"]') || selector.includes('[aria-label*="Profile"]')) { // Cards/Nav
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(false);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.locator).toHaveBeenCalledWith('input[type="email"], input[type="tel"], button:has-text("Log in")');
    });

    it('should return true if profile cards are detected', async () => {
      mockPage.url.mockReturnValue('https://tinder.com');
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('[data-testid="card"]')) { // Cards
          return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
        } else if (selector.includes('input[type="email"]')) { // Login form
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="card"], [class*="Card"], button[aria-label*="Like"], button[aria-label*="Nope"]');
    });

    it('should return true if navigation menu is detected', async () => {
      mockPage.url.mockReturnValue('https://tinder.com');
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('[aria-label*="Profile"]')) { // Nav menu
          return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
        } else if (selector.includes('input[type="email"]')) { // Login form
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.locator).toHaveBeenCalledWith('[aria-label*="Profile"], [aria-label*="Messages"], nav');
    });

    it('should return true if on base URL, waits, and then /app URL is detected', async () => {
      mockPage.url
        .mockReturnValueOnce('https://tinder.com') // Initial URL
        .mockReturnValueOnce('https://tinder.com/app'); // URL after wait
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No cards initially

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalledTimes(2);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
    });

    it('should return true if on base URL, waits, and then cards are detected', async () => {
      // Mock page.url to return base URL twice to ensure both calls are consumed
      mockPage.url
        .mockReturnValueOnce('https://tinder.com')
        .mockReturnValueOnce('https://tinder.com');

      // Mock page.waitForTimeout
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      let locatorCallOrder = 0; // Declare locatorCallOrder here, reset for each test

      // Mock page.locator for count() calls
      // The first calls (loginForm, initial profileCards, navMenu) should return 0
      // The call for cardsAfterWait should return 1
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('input[type="email"]')) { // loginForm
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        } else if (selector.includes('[data-testid="card"]') || selector.includes('[class*="Card"]')) { // profileCards, cardsAfterWait
          locatorCallOrder++; // Increment for each relevant call
          if (locatorCallOrder === 1) { // Initial profileCards count
            return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
          } else if (locatorCallOrder === 2) { // cardsAfterWait count
            return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
          }
        } else if (selector.includes('[aria-label*="Profile"]') || selector.includes('nav')) { // navMenu
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(true);
      expect(mockPage.url).toHaveBeenCalledTimes(2); // Initial currentUrl and urlAfterWait
      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="card"], [class*="Card"], button[aria-label*="Like"]');
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
    });

    it('should return false if no indicators are found after all checks', async () => {
      mockPage.url.mockReturnValue('https://tinder.com');
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No cards/nav, no login form

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(false);
      expect(mockPage.url).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000);
    });

    it('should return false if an error occurs during login check', async () => {
      mockPage.url.mockImplementation(() => { throw new Error('URL error'); });

      const result = await site.isLoggedIn(mockPage);
      expect(result).toBe(false);
      expect(mockPage.url).toHaveBeenCalled();
    });
  });

  describe('waitForCards', () => {
    beforeEach(() => {
      // Clear mocks for this describe block
      mockPage.url.mockClear();
      mockPage.locator.mockClear();
      jest.spyOn(site, 'dismissPopup').mockClear();
      jest.spyOn(site, 'refresh').mockClear();
      mockPage.waitForTimeout.mockClear();
      mockPage.waitForSelector.mockClear();
    });

    it('should return false if current URL does not include "tinder.com"', async () => {
      mockPage.url.mockReturnValue('https://example.com'); // Simulate wrong URL

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(false);
      expect(mockPage.url).toHaveBeenCalled();
    });

    it('should call dismissPopup and wait if popup was dismissed', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(true);
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No loading screen, no cards
      mockPage.waitForTimeout.mockResolvedValue(undefined); // dismissPopup wait and other waits

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(false); // Should return false as no cards are found eventually
      expect(site.dismissPopup).toHaveBeenCalledWith(mockPage);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000); // After dismissPopup if true
    });

    it('should call dismissPopup and not wait if no popup was dismissed', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No loading screen, no cards
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(false); // Should return false as no cards are found eventually
      expect(site.dismissPopup).toHaveBeenCalledWith(mockPage);
      // Ensure waitForTimeout is not called after dismissPopup when it returns false
      expect(mockPage.waitForTimeout).not.toHaveBeenCalledWith(2000);
    });

    // it('should detect loading screen and refresh if still present', async () => {
    //   mockPage.url.mockReturnValue('https://tinder.com/app');
    //   jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
    //   jest.spyOn(site, 'refresh').mockResolvedValue(undefined);

    //   // Explicitly mock page.locator for the loading screen selector calls
    //   let loadingScreenLocatorMock = {
    //     count: jest.fn()
    //       .mockResolvedValueOnce(1) // Initial loadingScreen count
    //       .mockResolvedValueOnce(1) // stillLoading count after first wait
    //   };
    //   mockPage.locator.mockImplementation((selector) => {
    //     if (selector === '[data-testid="root-loading-screen"]') {
    //       return loadingScreenLocatorMock;
    //     }
    //     return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Default for other locators // Changed as any
    //   });
    //   mockPage.waitForTimeout.mockResolvedValue(undefined);

    //   const result = await site.waitForCards(mockPage);
    //   expect(result).toBe(false);
    //   expect(site.refresh).toHaveBeenCalledWith(mockPage);
    //   expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000); // After initial loading screen check
    //   expect(mockPage.waitForTimeout).toHaveBeenCalledWith(3000); // After refresh
    // });

    // it('should detect loading screen and proceed if no longer present after initial wait', async () => {
    //   mockPage.url.mockReturnValue('https://tinder.com/app');
    //   jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
    //   jest.spyOn(site, 'refresh').mockResolvedValue(undefined); // Ensure refresh is mocked but not called

    //   // Explicitly mock page.locator for the loading screen selector calls
    //   let loadingScreenLocatorMock = {
    //     count: jest.fn()
    //       .mockResolvedValueOnce(1) // Initial loadingScreen count
    //       .mockResolvedValueOnce(0) // stillLoading count after first wait
    //   };
    //   mockPage.locator.mockImplementation((selector) => {
    //     if (selector === '[data-testid="root-loading-screen"]') {
    //       return loadingScreenLocatorMock;
    //     }
    //     return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Default for other locators // Changed as any
    //   });
    //   mockPage.waitForTimeout.mockResolvedValue(undefined);

    //   const result = await site.waitForCards(mockPage);
    //   expect(result).toBe(false);
    //   expect(site.refresh).not.toHaveBeenCalled();
    //   expect(mockPage.waitForTimeout).toHaveBeenCalledWith(5000); // After initial loading screen check
    //   expect(mockPage.waitForTimeout).not.toHaveBeenCalledWith(3000); // No refresh, so no wait after refresh
    // });
    
    it('should return true if cards are immediately visible', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      jest.spyOn(site, 'refresh').mockResolvedValue(undefined); // Ensure refresh is mocked but not called

      mockPage.locator.mockImplementation((selector) => {
        if (selector === '[data-testid="root-loading-screen"]') {
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any // No loading screen
        }
        if (selector.includes('[data-testid="card"]')) { // Card selector
          return {
            count: jest.fn().mockResolvedValue(1),
            first: jest.fn().mockReturnValue({
              isVisible: jest.fn().mockResolvedValue(true),
            } as unknown as Locator),
          } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any // Default for other locators
      });
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledTimes(3); // Initial, before quick check, and within quick check
      expect(mockPage.locator).toHaveBeenCalledWith('button[aria-label*="Like"]'); // Should check for cards
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000); // After successful card detection
    });

    it('should return true if cards become visible after waiting for selector', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      jest.spyOn(site, 'refresh').mockResolvedValue(undefined); // Ensure refresh is mocked but not called

      // Mock locator for initial count to be 0 for cards, and 0 for loading screen
      mockPage.locator.mockImplementationOnce((selector) => { // Initial loading screen check
        if (selector === '[data-testid="root-loading-screen"]') {
          return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });
      mockPage.locator.mockImplementationOnce((selector) => { // Before quick check card loop
        if (selector.includes('button[aria-label*="Like"]')) {
          return {
            count: jest.fn().mockResolvedValue(0),
            first: jest.fn().mockReturnValue({
              isVisible: jest.fn().mockResolvedValue(false),
            } as unknown as Locator),
          } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });
      // Mock other selectors in the quick check loop to return 0
      for (let i = 0; i < 6; i++) { // For the remaining 6 selectors in the quick check loop
        mockPage.locator.mockImplementationOnce(() => ({
          count: jest.fn().mockResolvedValue(0),
          first: jest.fn().mockReturnValue({ isVisible: jest.fn().mockResolvedValue(false) })
        } as unknown as Locator)); // Changed as any
      }

      mockPage.waitForSelector.mockResolvedValue(null); // Simulate selector found after wait

      // Mock locator again for subsequent calls (after waitForSelector)
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('[data-testid="card"]') || selector.includes('button[aria-label*="Like"]')) { // Card selector
          return {
            count: jest.fn().mockResolvedValue(1),
            first: jest.fn().mockReturnValue({
              isVisible: jest.fn().mockResolvedValue(true),
            } as unknown as Locator),
          } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any // Default for other locators
      });
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledTimes(3); // Initial, before quick check, and within quick check
      expect(mockPage.waitForSelector).toHaveBeenCalled();
      expect(mockPage.locator).toHaveBeenCalledWith('button[aria-label*="Like"]'); // Should check for cards
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000); // After successful card detection
    });

    it('should return false if an error occurs waiting for cards', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No loading screen, no cards
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector timeout')); // Simulate waitForSelector throwing an error
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(false);
      expect(site.dismissPopup).toHaveBeenCalledTimes(2); // Initial and before quick check loop
      expect(mockPage.waitForSelector).toHaveBeenCalled();
    });

    it('should return true if final fallback interactive elements are found on /app', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app');
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      jest.spyOn(site, 'refresh').mockResolvedValue(undefined);

      // Mock all locator calls to return 0 count (no cards, no loading screen)
      mockPage.locator.mockImplementation((selector) => {
        if (selector === 'button, [role="button"], a') { // Interactive elements selector
          return { count: jest.fn().mockResolvedValue(4) } as unknown as Locator; // Changed as any // > 3 interactive elements
        }
        if (selector === 'body') { // Body text content
          return { textContent: jest.fn().mockResolvedValue('a'.repeat(200)) } as unknown as Locator; // Changed as any // Long enough text
        }
        // All card selectors in both loops should return 0, and isVisible should be false
        return {
          count: jest.fn().mockResolvedValue(0),
          first: jest.fn().mockReturnValue({
            isVisible: jest.fn().mockResolvedValue(false),
          } as unknown as Locator),
        } as unknown as Locator; // Changed as any
      });

      // Ensure waitForSelector also throws an error for the loops to fail
      mockPage.waitForSelector.mockRejectedValue(new Error('timeout')); 
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const result = await site.waitForCards(mockPage);
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledTimes(3); // Initial, before quick check loop, and after refresh
      expect(mockPage.locator).toHaveBeenCalledWith('button, [role="button"], a');
      expect(mockPage.locator).toHaveBeenCalledWith('body');
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000); // Final fallback wait
    });
  });

  describe('swipe', () => {
    beforeEach(() => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);
      mockPage.keyboard.press = jest.fn(); // Correctly mock press
      mockPage.waitForTimeout.mockResolvedValue(undefined);
    });

    it('should perform a "like" swipe and return true', async () => {
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No error messages

      const result = await site.swipe(mockPage, 'like');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(mockPage);
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('ArrowRight');
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should perform a "dislike" swipe and return true', async () => {
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any // No error messages

      const result = await site.swipe(mockPage, 'dislike');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(mockPage);
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('ArrowLeft');
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should return false if an error message is found', async () => {
      const mockErrorLocator = {
        count: jest.fn().mockResolvedValue(1),
        first: jest.fn().mockReturnThis(),
        textContent: jest.fn().mockResolvedValue('You are out of likes!'),
      } as unknown as Locator; // Changed as any
      mockPage.locator.mockReturnValue(mockErrorLocator);

      const result = await site.swipe(mockPage, 'like');
      expect(result).toBe(false);
      expect(mockPage.locator).toHaveBeenCalledWith('text=/out of likes|limit|upgrade/i');
    });

    it('should return false if an error occurs during the swipe action', async () => {
      mockPage.keyboard.press = jest.fn().mockImplementation(() => { throw new Error('Keyboard error'); });

      const result = await site.swipe(mockPage, 'like');
      expect(result).toBe(false);
    });
  });

  describe('hasMoreProfiles', () => {
    it('should return false if a limit message is found', async () => {
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('text=/out of likes|no more|limit/i')) {
          return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.hasMoreProfiles(mockPage);
      expect(result).toBe(false);
      expect(mockPage.locator).toHaveBeenCalledWith('text=/out of likes|no more|limit/i');
    });

    it('should return true if cards are present and no limit message', async () => {
      mockPage.locator.mockImplementation((selector) => {
        if (selector.includes('[data-testid="card"], [class*="Card"]')) {
          return { count: jest.fn().mockResolvedValue(1) } as unknown as Locator; // Changed as any
        }
        return { count: jest.fn().mockResolvedValue(0) } as unknown as Locator; // Changed as any
      });

      const result = await site.hasMoreProfiles(mockPage);
      expect(result).toBe(true);
      expect(mockPage.locator).toHaveBeenCalledWith('[data-testid="card"], [class*="Card"]');
    });

    it('should return false if no cards are present and no limit message', async () => {
      mockPage.locator.mockImplementation(() => ({ count: jest.fn().mockResolvedValue(0) } as unknown as Locator)); // Changed as any

      const result = await site.hasMoreProfiles(mockPage);
      expect(result).toBe(false);
    });

    it('should return false if an error occurs', async () => {
      mockPage.locator.mockImplementation(() => { throw new Error('Locator error'); });

      const result = await site.hasMoreProfiles(mockPage);
      expect(result).toBe(false);
    });
  });
});
