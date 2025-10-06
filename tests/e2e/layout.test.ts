/**
 * Layout Tests - Preventing Panel Overflow and Toolbar Visibility Issues
 *
 * These tests catch layout bugs where panels exceed viewport bounds,
 * causing toolbar positioning and scrolling issues.
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to get element's bounding box relative to viewport
async function getViewportBounds(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      height: rect.height,
      width: rect.width,
      exceedsViewportHeight: rect.bottom > viewportHeight,
      exceedsViewportWidth: rect.right > viewportWidth,
      isAboveViewport: rect.top < 0,
      isLeftOfViewport: rect.left < 0,
      viewportHeight,
      viewportWidth,
    };
  }, selector);
}

// Helper function to check if scrollbar is present
async function hasScrollbar(
  page: Page,
  selector: string,
  direction: 'vertical' | 'horizontal' = 'vertical',
) {
  return await page.evaluate(
    ([sel, dir]) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      if (dir === 'vertical') {
        return element.scrollHeight > element.clientHeight;
      } else {
        return element.scrollWidth > element.clientWidth;
      }
    },
    [selector, direction],
  );
}

test.describe('Panel Layout Constraints', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game with a session (adjust URL as needed)
    await page.goto('/game/TEST-SESSION', { waitUntil: 'domcontentloaded' });
    // Wait for layout to stabilize
    await page.waitForLoadState('networkidle');
  });

  test('Layout panels should not exceed viewport height', async ({ page }) => {
    // Open the settings panel
    await page.click('[data-testid="settings-tab"]'); // Adjust selector as needed
    await page.waitForTimeout(500); // Wait for panel animation

    const panelBounds = await getViewportBounds(page, '.layout-panel');

    if (panelBounds) {
      expect(panelBounds.exceedsViewportHeight).toBe(false);
      expect(panelBounds.height).toBeLessThanOrEqual(
        panelBounds.viewportHeight,
      );

      // Panel should start at top of content area (not negative)
      expect(panelBounds.top).toBeGreaterThanOrEqual(0);
    }
  });

  test('Scene canvas toolbar should be visible when panel has overflow content', async ({
    page,
  }) => {
    // Open scene panel (which might have overflowing content)
    await page.click('[data-testid="scene-tab"]'); // Adjust selector as needed
    await page.waitForTimeout(500);

    // Check if toolbar is visible
    const toolbar = page.locator('.scene-canvas-toolbar');
    await expect(toolbar).toBeVisible();

    // Toolbar should be positioned within the visible viewport
    const toolbarBounds = await getViewportBounds(
      page,
      '.scene-canvas-toolbar',
    );

    if (toolbarBounds) {
      expect(toolbarBounds.top).toBeGreaterThanOrEqual(0);
      expect(toolbarBounds.left).toBeGreaterThanOrEqual(0);
      expect(toolbarBounds.bottom).toBeLessThanOrEqual(
        toolbarBounds.viewportHeight,
      );
      expect(toolbarBounds.right).toBeLessThanOrEqual(
        toolbarBounds.viewportWidth,
      );
    }
  });

  test('Settings panel should be scrollable when content overflows', async ({
    page,
  }) => {
    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    const settingsContent = '.settings-content';
    const hasVerticalScrollbar = await hasScrollbar(
      page,
      settingsContent,
      'vertical',
    );

    // If content is taller than container, should have scrollbar
    const contentHeight = await page.evaluate(() => {
      const content = document.querySelector('.settings-content');
      return content ? content.scrollHeight : 0;
    });

    const containerHeight = await page.evaluate(() => {
      const content = document.querySelector('.settings-content');
      return content ? content.clientHeight : 0;
    });

    if (contentHeight > containerHeight) {
      expect(hasVerticalScrollbar).toBe(true);
    }
  });

  test('Sidebar resize handle should not exceed viewport height', async ({
    page,
  }) => {
    // Open any panel to show resize handle
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    const resizeHandleBounds = await getViewportBounds(
      page,
      '.sidebar-resize-handle',
    );

    if (resizeHandleBounds) {
      expect(resizeHandleBounds.exceedsViewportHeight).toBe(false);
      expect(resizeHandleBounds.top).toBeGreaterThanOrEqual(0);
      expect(resizeHandleBounds.bottom).toBeLessThanOrEqual(
        resizeHandleBounds.viewportHeight,
      );
    }
  });

  test('Panel content should be properly constrained in different viewport sizes', async ({
    page,
  }) => {
    const viewportSizes = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 }, // tablet portrait
    ];

    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);

      // Test with settings panel
      await page.click('[data-testid="settings-tab"]');
      await page.waitForTimeout(500);

      const panelBounds = await getViewportBounds(page, '.layout-panel');

      if (panelBounds) {
        expect(panelBounds.exceedsViewportHeight).toBe(false);
        expect(panelBounds.height).toBeLessThanOrEqual(size.height);
      }
    }
  });

  test('Panel scrolling should work properly', async ({ page }) => {
    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    const settingsContent = '.settings-content';

    // Get initial scroll position
    const initialScrollTop = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.scrollTop : 0;
    }, settingsContent);

    // Try to scroll down
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollTop = 100;
    }, settingsContent);

    // Check if scroll position changed (meaning scrolling works)
    const newScrollTop = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.scrollTop : 0;
    }, settingsContent);

    // If there's scrollable content, scrollTop should change
    const hasScrollableContent = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.scrollHeight > el.clientHeight : false;
    }, settingsContent);

    if (hasScrollableContent) {
      expect(newScrollTop).toBeGreaterThan(initialScrollTop);
    }
  });
});

test.describe('Visual Layout Validation', () => {
  test('No elements should overflow the main layout container', async ({
    page,
  }) => {
    await page.goto('/game/TEST-SESSION');
    await page.waitForLoadState('networkidle');

    // Check that no elements exceed the game layout bounds
    const overflowingElements = await page.evaluate(() => {
      const gameLayout = document.querySelector('.game-layout');
      if (!gameLayout) return [];

      const layoutRect = gameLayout.getBoundingClientRect();
      const allElements = document.querySelectorAll('*');
      const overflowing = [];

      for (const el of allElements) {
        const rect = el.getBoundingClientRect();

        // Skip if element is not visible or is the game layout itself
        if (rect.width === 0 || rect.height === 0 || el === gameLayout)
          continue;

        // Check if element extends beyond layout bounds
        if (
          rect.bottom > layoutRect.bottom + 5 || // 5px tolerance
          rect.right > layoutRect.right + 5 ||
          rect.top < layoutRect.top - 5 ||
          rect.left < layoutRect.left - 5
        ) {
          overflowing.push({
            selector:
              el.tagName +
              (el.className ? '.' + Array.from(el.classList).join('.') : ''),
            bounds: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
            },
            layoutBounds: {
              top: layoutRect.top,
              bottom: layoutRect.bottom,
              left: layoutRect.left,
              right: layoutRect.right,
            },
          });
        }
      }

      return overflowing;
    });

    if (overflowingElements.length > 0) {
      console.log('Overflowing elements:', overflowingElements);
    }

    expect(overflowingElements.length).toBe(0);
  });
});
