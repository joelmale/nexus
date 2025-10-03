/**
 * Visual Regression Tests for Layout and Toolbar Visibility
 *
 * These tests take screenshots to catch visual layout regressions,
 * particularly around toolbar visibility and panel overflow issues.
 */

import { test, expect } from '@playwright/test';

test.describe('Layout Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game/TEST-SESSION');
    await page.waitForLoadState('networkidle');
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
  });

  test('Settings panel layout with toolbar visible', async ({ page }) => {
    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    // Ensure toolbar is visible before taking screenshot
    await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();

    // Take screenshot of the entire layout
    await expect(page).toHaveScreenshot('settings-panel-with-toolbar.png', {
      fullPage: false, // Only visible viewport
      threshold: 0.2, // Allow some minor differences
    });
  });

  test('Scene panel layout with toolbar visible', async ({ page }) => {
    // Open scene panel
    await page.click('[data-testid="scene-tab"]');
    await page.waitForTimeout(500);

    // Ensure toolbar is visible
    await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();

    // Take screenshot
    await expect(page).toHaveScreenshot('scene-panel-with-toolbar.png', {
      fullPage: false,
      threshold: 0.2,
    });
  });

  test('Panel scrolling behavior - before and after scroll', async ({
    page,
  }) => {
    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    // Screenshot before scrolling
    await expect(page.locator('.layout-panel')).toHaveScreenshot(
      'panel-before-scroll.png',
    );

    // Scroll down in the settings content
    await page.evaluate(() => {
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        settingsContent.scrollTop = 200;
      }
    });

    await page.waitForTimeout(300);

    // Screenshot after scrolling - toolbar should still be visible
    await expect(page.locator('.layout-panel')).toHaveScreenshot(
      'panel-after-scroll.png',
    );

    // Toolbar should still be visible after scrolling
    await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();
  });

  test('Responsive layout - different viewport sizes', async ({ page }) => {
    const viewportSizes = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-medium' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
    ];

    for (const size of viewportSizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.waitForTimeout(500);

      // Open settings panel
      await page.click('[data-testid="settings-tab"]');
      await page.waitForTimeout(500);

      // Ensure toolbar is visible at this size
      await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();

      // Take screenshot
      await expect(page).toHaveScreenshot(`layout-${size.name}.png`, {
        fullPage: false,
        threshold: 0.2,
      });
    }
  });

  test('Panel resize handle visibility and positioning', async ({ page }) => {
    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    // Check resize handle is visible and properly positioned
    const resizeHandle = page.locator('.sidebar-resize-handle');
    await expect(resizeHandle).toBeVisible();

    // Take screenshot focusing on the resize handle area
    await expect(page.locator('.layout-panel')).toHaveScreenshot(
      'resize-handle-positioning.png',
    );

    // Test that resize handle doesn't extend beyond viewport
    const handleBounds = await resizeHandle.boundingBox();
    const viewportSize = page.viewportSize();

    if (handleBounds && viewportSize) {
      expect(handleBounds.y + handleBounds.height).toBeLessThanOrEqual(
        viewportSize.height,
      );
    }
  });
});

test.describe('Toolbar Positioning Tests', () => {
  test('Toolbar stays visible when switching between panels', async ({
    page,
  }) => {
    await page.goto('/game/TEST-SESSION');
    await page.waitForLoadState('networkidle');

    const panels = [
      { tab: '[data-testid="settings-tab"]', name: 'settings' },
      { tab: '[data-testid="scene-tab"]', name: 'scene' },
      { tab: '[data-testid="dice-tab"]', name: 'dice' },
    ];

    for (const panel of panels) {
      // Click panel tab
      await page.click(panel.tab);
      await page.waitForTimeout(500);

      // Toolbar should be visible
      await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();

      // Take screenshot for comparison
      await expect(page.locator('.scene-canvas-toolbar')).toHaveScreenshot(
        `toolbar-in-${panel.name}-panel.png`,
      );

      // Verify toolbar position is consistent
      const toolbarBounds = await page
        .locator('.scene-canvas-toolbar')
        .boundingBox();
      if (toolbarBounds) {
        // Toolbar should be near top-left (within reasonable bounds)
        expect(toolbarBounds.x).toBeLessThan(50);
        expect(toolbarBounds.y).toBeLessThan(50);
        expect(toolbarBounds.x).toBeGreaterThanOrEqual(0);
        expect(toolbarBounds.y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Toolbar remains visible with long content in panels', async ({
    page,
  }) => {
    await page.goto('/game/TEST-SESSION');
    await page.waitForLoadState('networkidle');

    // Inject extra content to force overflow
    await page.evaluate(() => {
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        // Add many dummy sections to force overflow
        for (let i = 0; i < 20; i++) {
          const section = document.createElement('div');
          section.className = 'settings-section';
          section.style.height = '200px';
          section.style.background = 'rgba(255,255,255,0.1)';
          section.style.margin = '1rem 0';
          section.innerHTML = `<h3>Test Section ${i + 1}</h3><p>This is test content to force overflow...</p>`;
          settingsContent.appendChild(section);
        }
      }
    });

    // Open settings panel
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);

    // Toolbar should still be visible despite overflow content
    await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();

    // Take screenshot to document this scenario
    await expect(page).toHaveScreenshot('toolbar-with-overflow-content.png', {
      fullPage: false,
      threshold: 0.2,
    });

    // Scroll down in the panel
    await page.evaluate(() => {
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        settingsContent.scrollTop = 1000;
      }
    });

    await page.waitForTimeout(300);

    // Toolbar should STILL be visible after scrolling
    await expect(page.locator('.scene-canvas-toolbar')).toBeVisible();
  });
});
