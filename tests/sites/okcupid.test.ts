import { Page, Locator } from '@playwright/test';
import { OkCupidSite } from '../../src/sites/okcupid';
import type { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';
import { humanClick, random } from '../../src/utils/helpers';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/utils/logger');
// Mock the actual helpers module
jest.mock('../../src/utils/helpers', () => ({
  humanClick: jest.fn(),
  random: jest.fn(),
}));

describe('OkCupidSite', () => {
  let site: OkCupidSite;
  let config: SiteConfig;
  let logger: Logger;
  let page: jest.Mocked<Page>;
  let locator: jest.Mocked<Locator>;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      enabled: true,
      likeRatio: 0.8,
      swipeDelay: { min: 1000, max: 3000 },
      maxSwipesPerSession: 100,
    };
    logger = new Logger();
    site = new OkCupidSite(config, logger);

    // Mock Locator methods
    const mockLocatorFirst = jest.fn<() => Locator>().mockReturnThis();
    const mockLocatorWaitFor = jest.fn<() => Promise<void>>();
    const mockLocatorCount = jest.fn<() => Promise<number>>();
    const mockLocatorIsVisible = jest.fn<() => Promise<boolean>>();
    const mockLocatorGetByRole = jest.fn<() => Locator>().mockReturnThis();
    const mockLocatorTextContent = jest.fn<() => Promise<string | null>>();
    const mockLocatorLocator = jest.fn<() => Locator>().mockReturnThis();

    // Assign mock implementations
    mockLocatorWaitFor.mockResolvedValue(undefined);
    mockLocatorCount.mockResolvedValue(0);
    mockLocatorIsVisible.mockResolvedValue(true);
    mockLocatorTextContent.mockResolvedValue(null);

    locator = {
      first: mockLocatorFirst,
      waitFor: mockLocatorWaitFor,
      count: mockLocatorCount,
      isVisible: mockLocatorIsVisible,
      getByRole: mockLocatorGetByRole,
      textContent: mockLocatorTextContent,
      locator: mockLocatorLocator,
    } as unknown as jest.Mocked<Locator>;


    // Mock Page methods
    const mockPageLocator = jest.fn<() => Locator>();
    const mockPageGetByRole = jest.fn<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>();
    const mockPageGoto = jest.fn<() => Promise<void>>();
    const mockPageWaitForTimeout = jest.fn<() => Promise<void>>();
    
    // Assign mock implementations
    mockPageLocator.mockReturnValue(locator);
    mockPageGetByRole.mockReturnValue(locator); // This might need more complex implementation based on 'role' and 'options'
    mockPageGoto.mockResolvedValue(undefined);
    mockPageWaitForTimeout.mockResolvedValue(undefined);

    page = {
      locator: mockPageLocator,
      getByRole: mockPageGetByRole,
      goto: mockPageGoto,
      waitForTimeout: mockPageWaitForTimeout,
    } as unknown as jest.Mocked<Page>;


    (random as jest.Mock).mockClear();
    (humanClick as jest.Mock).mockClear();
    (random as jest.Mock).mockReturnValue(2000);
  });

  it('should be an instance of OkCupidSite', () => {
    expect(site).toBeInstanceOf(OkCupidSite);
  });

  it('should have a getUrl method that returns the correct URL', () => {
    expect(site.getUrl()).toBe('https://www.okcupid.com');
  });

  describe('isLoggedIn', () => {
    it('should return true if the logged-in indicator is found', async () => {
      (locator.first as jest.Mock).mockReturnThis();
      locator.waitFor.mockResolvedValue(undefined);
      const result = await site.isLoggedIn(page);
      expect(result).toBe(true);
      expect(page.locator).toHaveBeenCalledWith('a[href="/profile"], nav[aria-label="Primary"]');
      expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 5000 });
    });

    it('should return true if no logged-out indicators are found', async () => {
      locator.waitFor.mockRejectedValue(new Error('timeout'));
      locator.count.mockResolvedValue(0);
      const result = await site.isLoggedIn(page);
      expect(result).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('link', { name: /Sign In|Join OkCupid/i });
    });

    it('should return false if logged-out indicators are found', async () => {
      locator.waitFor.mockRejectedValue(new Error('timeout'));
      locator.count.mockResolvedValue(1);
      const result = await site.isLoggedIn(page);
      expect(result).toBe(false);
    });
  });

  describe('navigate', () => {
    it('should navigate to the correct URL and handle the cookie banner', async () => {
      locator.waitFor.mockResolvedValue(undefined);
      await site.navigate(page);
      expect(page.goto).toHaveBeenCalledWith('https://www.okcupid.com', { waitUntil: 'domcontentloaded' });
      expect(page.locator).toHaveBeenCalledWith('#onetrust-accept-btn-handler');
      expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 10000 });
      expect(humanClick).toHaveBeenCalledWith(page, locator);
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should navigate to the correct URL and not fail if the cookie banner is not present', async () => {
      locator.waitFor.mockRejectedValue(new Error('timeout'));
      await site.navigate(page);
      expect(page.goto).toHaveBeenCalledWith('https://www.okcupid.com', { waitUntil: 'domcontentloaded' });
      expect(humanClick).not.toHaveBeenCalled();
    });
  });

  describe('dismissPopup', () => {
    it('should return true if "New likes" banner is visible and closed', async () => {
      // Mock for "New likes" banner (visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockImplementation((selector) => {
        if (selector === 'a:has-text("New likes")') {
          return {
            isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            getByRole: jest.fn<() => Locator>().mockReturnValue({
              isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            } as unknown as Locator),
          } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Like Them Anyway" button is visible and clicked', async () => {
      // Mock for "New likes" banner (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for "Like Them Anyway" button (visible)
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true) } as unknown as Locator;
        }
        // Default to not visible for other getByRole calls unless specifically mocked
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "IT’S A MATCH!" popup is visible and closed', async () => {
      // Mock for "New likes" banner (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for "Like Them Anyway" button (not visible)
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });

      // Mock for "IT’S A MATCH!" popup (visible)
      const mutualMatchModalLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        locator: jest.fn<() => Locator>().mockReturnValue({
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        } as unknown as Locator),
      } as unknown as Locator;
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce(mutualMatchModalLocator);


      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(mutualMatchModalLocator.isVisible).toHaveBeenCalled();
      expect(mutualMatchModalLocator.locator).toHaveBeenCalledWith('button[data-cy="matchEvent.closeButton"]');
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Priority Likes" upsell popup is visible and closed', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator);
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator);

      // Mock for "Priority Likes" upsell popup (visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as unknown as Locator);
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "Close") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });


      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Enable Notifications" popup is visible and "Not now" is clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator);
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for "Enable Notifications" popup (visible)
      const notificationsDialogLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getByRole: jest.fn<() => Locator>().mockReturnValue({
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        } as unknown as Locator),
      } as unknown as Locator;
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce(notificationsDialogLocator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(notificationsDialogLocator.isVisible).toHaveBeenCalled();
      expect(notificationsDialogLocator.getByRole).toHaveBeenCalledWith('button', { name: 'Not now' });
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "MAYBE LATER" button is visible and clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for "Like Them Anyway" button (not visible)
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for "MAYBE LATER" button (visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as unknown as Locator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if a generic dialog with a close button is visible and clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockImplementation((role, options) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator;
      });
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      // Mock for generic dialog (visible)
      const genericDialogLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getByRole: jest.fn<() => Locator>().mockReturnValue({
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
          textContent: jest.fn<() => Promise<string | null>>().mockResolvedValue('Close'),
        } as unknown as Locator),
      } as unknown as Locator;
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValueOnce(genericDialogLocator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(genericDialogLocator.isVisible).toHaveBeenCalled();
      expect(genericDialogLocator.getByRole).toHaveBeenCalledWith('button', { name: /Close|No Thanks|Dismiss|Maybe Later/i });
      expect(humanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return false if no popups are visible', async () => {
      // Mock for all popups (not visible)
      (page.locator as jest.Mock<(selector: string | Locator, options?: Parameters<Page['locator']>[1]) => Locator>).mockReturnValue({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as unknown as Locator);
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValue({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(false);
      expect(humanClick).not.toHaveBeenCalled();
    });
  });

  describe('waitForCards', () => {
    it('should return true if like and pass buttons are visible', async () => {
      // Mock dismissPopup to return false (no popups)
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      // Mock page.getByRole for like and pass buttons
      const likeButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Locator;
      const passButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Locator;

      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>)
        .mockReturnValueOnce(likeButtonLocator)
        .mockReturnValueOnce(passButtonLocator);

      const result = await site.waitForCards(page);
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Like and view the next profile' });
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Pass and view the next profile' });
      expect(likeButtonLocator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 15000 });
      // The Promise.race means only one of the .waitFor calls needs to resolve,
      // so we only assert on the one that is mocked to resolve.
    });

    it('should return false if like and pass buttons are not visible within timeout', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const likeButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('timeout')),
      } as unknown as Locator;
      const passButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('timeout')),
      } as unknown as Locator;

      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>)
        .mockReturnValueOnce(likeButtonLocator)
        .mockReturnValueOnce(passButtonLocator);

      const result = await site.waitForCards(page);
      expect(result).toBe(false);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(likeButtonLocator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 15000 });
    });
  });

  describe('swipe', () => {
    it('should return true and call humanClick for "like" action if button is visible', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const likeButtonLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValueOnce(likeButtonLocator);

      const result = await site.swipe(page, 'like');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Like and view the next profile' });
      expect(humanClick).toHaveBeenCalledWith(page, likeButtonLocator);
    });

    it('should return true and call humanClick for "dislike" action if button is visible', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const dislikeButtonLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValueOnce(dislikeButtonLocator);

      const result = await site.swipe(page, 'dislike');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Pass and view the next profile' });
      expect(humanClick).toHaveBeenCalledWith(page, dislikeButtonLocator);
    });

    it('should return false if the button is not visible', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const buttonLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValueOnce(buttonLocator);

      const result = await site.swipe(page, 'like');
      expect(result).toBe(false);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Like and view the next profile' });
      expect(humanClick).not.toHaveBeenCalled();
    });
  });

  describe('hasMoreProfiles', () => {
    it('should return false if "You\'re out of people" message is visible', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValue(mockLocator);

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(false);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled();
    });

    it('should return true if "You\'re out of people" message is not visible', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValue(mockLocator);

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled();
    });

    it('should return true if an error occurs while checking for "no more profiles" message', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockRejectedValue(new Error('Locator error')),
      } as unknown as Locator;
      (page.getByRole as jest.Mock<(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]) => Locator>).mockReturnValue(mockLocator);

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled();
    });
  });
});
