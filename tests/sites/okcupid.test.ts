import { Page, Locator } from '@playwright/test';
import { OkCupidSite } from '../../src/sites/okcupid';
import type { SiteConfig } from '../../src/types';
import { Logger } from '../../src/utils/logger';
import * as helpers from '../../src/utils/helpers'; // Import the original module for type information
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/utils/logger');
// Mock the actual helpers module
jest.mock('../../src/utils/helpers', () => ({
  humanClick: jest.fn(),
  random: jest.fn(),
}));

// Get the mocked versions of the functions
const mockedHumanClick = jest.mocked(helpers.humanClick);
const mockedRandom = jest.mocked(helpers.random);



describe('OkCupidSite', () => {
  let site: OkCupidSite;
  let config: SiteConfig;
  let logger: Logger;
  let page: any; // Using 'any' for now to bypass strict checks on the mock object itself
  let locator: any; // Using 'any' for now to bypass strict checks on the mock object itself

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

    // Simplified mocks for Page and Locator
    // We will cast them to the correct type when passing to the site object
    locator = {
      first: jest.fn<() => Locator>().mockReturnThis(),
      waitFor: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      count: jest.fn<() => Promise<number>>().mockResolvedValue(0),
      isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      getByRole: jest.fn<() => Locator>().mockReturnThis(),
      textContent: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
      locator: jest.fn<() => Locator>().mockReturnThis(),
    } as any; // Use any to bypass strict type checking for the mock object itself

    page = {
      locator: jest.fn<() => Locator>().mockReturnValue(locator),
      getByRole: jest.fn<() => Locator>().mockReturnValue(locator),
      goto: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      waitForTimeout: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as any; // Use any to bypass strict type checking for the mock object itself

    mockedRandom.mockClear();
    mockedHumanClick.mockClear();
    mockedRandom.mockReturnValue(2000);
  });

  it('should be an instance of OkCupidSite', () => {
    expect(site).toBeInstanceOf(OkCupidSite);
  });

  it('should have a getUrl method that returns the correct URL', () => {
    expect(site.getUrl()).toBe('https://www.okcupid.com');
  });

  describe('isLoggedIn', () => {
    it('should return true if the logged-in indicator is found', async () => {
      locator.first.mockReturnValue(locator);
      locator.waitFor.mockResolvedValue(undefined); // Explicitly type
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
      locator.waitFor.mockResolvedValue(undefined); // Explicitly type
      await site.navigate(page);
      expect(page.goto).toHaveBeenCalledWith('https://www.okcupid.com', { waitUntil: 'domcontentloaded' });
      expect(page.locator).toHaveBeenCalledWith('#onetrust-accept-btn-handler');
      expect(locator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: 10000 });
      expect(mockedHumanClick).toHaveBeenCalledWith(page, locator);
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should navigate to the correct URL and not fail if the cookie banner is not present', async () => {
      locator.waitFor.mockRejectedValue(new Error('timeout')); // Explicitly type
      await site.navigate(page);
      expect(page.goto).toHaveBeenCalledWith('https://www.okcupid.com', { waitUntil: 'domcontentloaded' });
      expect(mockedHumanClick).not.toHaveBeenCalled();
    });
  });

  describe('dismissPopup', () => {
    it('should return true if "New likes" banner is visible and closed', async () => {
      // Mock for "New likes" banner (visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockImplementation((selector) => {
        if (selector === 'a:has-text("New likes")') {
          return {
            isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            getByRole: jest.fn<() => Locator>().mockReturnValue({
              isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            } as any),
          } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });

      const result = await site.dismissPopup(page);
      expect(result).toBe(true); // Banner was dismissed, so it returned true
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Like Them Anyway" button is visible and clicked', async () => {
      // Mock for "New likes" banner (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any);

      // Mock for "Like Them Anyway" button (visible)
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true) } as any;
        }
        // Default to not visible for other getByRole calls unless specifically mocked
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "IT’S A MATCH!" popup is visible and closed', async () => {
      // Mock for "New likes" banner (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any);

      // Mock for "Like Them Anyway" button (not visible)
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });

      // Mock for "IT’S A MATCH!" popup (visible)
      const mutualMatchModalLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        locator: jest.fn<() => Locator>().mockReturnValue({ // Mock the nested locator for the close button
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        } as any),
      } as any;
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(mutualMatchModalLocator);


      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(mutualMatchModalLocator.isVisible).toHaveBeenCalled();
      expect(mutualMatchModalLocator.locator).toHaveBeenCalledWith('button[data-cy="matchEvent.closeButton"]');
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Priority Likes" upsell popup is visible and closed', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any); // New likes
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any); // IT’S A MATCH!

      // Mock for "Priority Likes" upsell popup (visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as any);
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "Close") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });


      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "Enable Notifications" popup is visible and "Not now" is clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any); // New likes
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // IT’S A MATCH!
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Priority Likes

      // Mock for "Enable Notifications" popup (visible)
      const notificationsDialogLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getByRole: jest.fn<() => Locator>().mockReturnValue({
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        } as any),
      } as any;
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(notificationsDialogLocator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(notificationsDialogLocator.isVisible).toHaveBeenCalled();
      expect(notificationsDialogLocator.getByRole).toHaveBeenCalledWith('button', { name: 'Not now' });
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if "MAYBE LATER" button is visible and clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any);

      // Mock for "Like Them Anyway" button (not visible)
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // IT’S A MATCH!
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Priority Likes
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Enable Notifications

      // Mock for "MAYBE LATER" button (visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as any);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return true if a generic dialog with a close button is visible and clicked', async () => {
      // Mock for previous popups (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // New likes
      type GetByRoleOptions = { name?: string | RegExp; exact?: boolean };
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockImplementation((role, options: GetByRoleOptions) => {
        if (options && options.name === "LIKE THEM ANYWAY") {
          return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
        }
        return { isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any;
      });
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // IT’S A MATCH!
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Priority Likes
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Enable Notifications
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any); // Maybe Later

      // Mock for generic dialog (visible)
      const genericDialogLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getByRole: jest.fn<() => Locator>().mockReturnValue({
          isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
          textContent: jest.fn<() => Promise<string | null>>().mockResolvedValue('Close'),
        } as any),
      } as any;
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(genericDialogLocator);

      const result = await site.dismissPopup(page);
      expect(result).toBe(true);
      expect(genericDialogLocator.isVisible).toHaveBeenCalled();
      expect(genericDialogLocator.getByRole).toHaveBeenCalledWith('button', { name: /Close|No Thanks|Dismiss|Maybe Later/i });
      expect(mockedHumanClick).toHaveBeenCalled();
      expect(page.waitForTimeout).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should return false if no popups are visible', async () => {
      // Mock for all popups (not visible)
      (page.locator as jest.Mock<(...args: any[]) => Locator>).mockReturnValue({ isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false) } as any);
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValue({
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any);

      const result = await site.dismissPopup(page);
      expect(result).toBe(false);
      expect(mockedHumanClick).not.toHaveBeenCalled();
    });
  });

  describe('waitForCards', () => {
    it('should return true if like and pass buttons are visible', async () => {
      // Mock dismissPopup to return false (no popups)
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      // Mock page.getByRole for like and pass buttons
      const likeButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as any;
      const passButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as any;

      (page.getByRole as jest.Mock<(...args: any[]) => Locator>)
        .mockReturnValueOnce(likeButtonLocator) // for 'like' button
        .mockReturnValueOnce(passButtonLocator); // for 'pass' button

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
      } as any;
      const passButtonLocator = {
        waitFor: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('timeout')),
      } as any;

      (page.getByRole as jest.Mock<(...args: any[]) => Locator>)
        .mockReturnValueOnce(likeButtonLocator) // for 'like' button
        .mockReturnValueOnce(passButtonLocator); // for 'pass' button

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
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(likeButtonLocator);

      const result = await site.swipe(page, 'like');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Like and view the next profile' });
      expect(mockedHumanClick).toHaveBeenCalledWith(page, likeButtonLocator);
    });

    it('should return true and call humanClick for "dislike" action if button is visible', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const dislikeButtonLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(dislikeButtonLocator);

      const result = await site.swipe(page, 'dislike');
      expect(result).toBe(true);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Pass and view the next profile' });
      expect(mockedHumanClick).toHaveBeenCalledWith(page, dislikeButtonLocator);
    });

    it('should return false if the button is not visible', async () => {
      jest.spyOn(site, 'dismissPopup').mockResolvedValue(false);

      const buttonLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValueOnce(buttonLocator);

      const result = await site.swipe(page, 'like');
      expect(result).toBe(false);
      expect(site.dismissPopup).toHaveBeenCalledWith(page);
      expect(page.getByRole).toHaveBeenCalledWith('button', { name: 'Like and view the next profile' });
      expect(mockedHumanClick).not.toHaveBeenCalled();
    });
  });

  describe('hasMoreProfiles', () => {
    it('should return false if "You\'re out of people" message is visible', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValue(mockLocator); // Use mockReturnValue for consistency

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(false);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled(); // Assert isVisible was called
    });

    it('should return true if "You\'re out of people" message is not visible', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValue(mockLocator); // Use mockReturnValue for consistency

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled(); // Assert isVisible was called
    });

    it('should return true if an error occurs while checking for "no more profiles" message', async () => {
      const mockLocator = {
        isVisible: jest.fn<() => Promise<boolean>>().mockRejectedValue(new Error('Locator error')),
      } as any;
      (page.getByRole as jest.Mock<(...args: any[]) => Locator>).mockReturnValue(mockLocator); // Use mockReturnValue for consistency

      const result = await site.hasMoreProfiles(page);
      expect(result).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('heading', { name: /You're out of people|No more matches/i });
      expect(mockLocator.isVisible).toHaveBeenCalled(); // Assert isVisible was called
    });
  });
});
