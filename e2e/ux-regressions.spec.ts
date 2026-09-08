import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['', '/es']) {
  test(`keyboard focus follows activity Start and Stop ${locale || 'en'}`, async ({ page }) => {
    for (const slug of ['bls-visual', 'bls-audio', 'bls-combined', 'bls-tapping', 'breath', 'butterfly-hug']) {
      await page.goto(`${locale}/tools/${slug}`);
      const start = page.locator('[data-session-start]');
      const stop = page.locator('[data-session-stop]');
      await start.focus();
      await page.keyboard.press('Enter');
      await expect(stop).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(start).toBeFocused();
    }
  });
  test(`activity choices wait for scripts and accept the first ready click ${locale || 'en'}`, async ({ page }) => {
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/_astro/*.js', async route => { await blocked; await route.continue(); });
    try {
      await page.goto(`${locale}/tools/safe-place`, { waitUntil: 'commit' });
      await expect(page.locator('[data-activity-loading]')).toBeVisible();
      await expect(page.locator('[data-activity-widget]')).toHaveAttribute('inert', '');
      const first = page.locator('[data-pick-env]').first();
      await first.click({ force: true });
      await expect(first).toHaveAttribute('aria-pressed', 'false');
      await page.locator('[data-activity-loading] a').last().focus();
      release();
      await expect(page.locator('[data-activity-loading]')).toBeHidden();
      await expect(page.locator('[data-activity-widget]')).toBeFocused();
      await first.click();
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-pick-comfort]').first()).toBeVisible();
    } finally { release(); }
  });
  test(`search Escape preserves mobile menu and restores visible focus ${locale || 'en'}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${locale}/clinicians`);
    await page.locator('#mobile-menu-button').click();
    await page.locator('.search-trigger-mobile').click();
    await expect(page.locator('#search-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-modal')).not.toBeVisible();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await expect(page.locator('.search-trigger-mobile')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-menu')).not.toBeVisible();
    await expect(page.locator('#mobile-menu-button')).toBeFocused();
  });
}

test('clinical content reflows on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/clinicians/emdr/phase-2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Spanish tablet navigation fits and keeps help visible', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto('/es/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
  await expect(page.locator('header a[href="/es/help"]:visible')).toBeInViewport();
});

test('search finds intake, scripts and unaccented Spanish queries', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.locator('#search-input').fill('intake');
  await expect(page.locator('#search-results a[href="/clinicians/emdr/intake-form"]')).toBeVisible();
  await page.locator('#search-input').fill('Notice what is around you');
  await expect(page.locator('#search-results a[href="/tools/grounding"]')).toBeVisible();
  await page.locator('#search-input').fill('preparation script');
  await expect(page.locator('#search-results a[href="/clinicians/emdr/phase-2-scripts"]')).toBeVisible();
  await page.goto('/es/');
  await page.keyboard.press('Control+k');
  await page.locator('#search-input').fill('respiracion');
  await expect(page.locator('#search-results a[href="/es/tools/breath"]')).toBeVisible();
});

test('search has an explicit close action and Enter opens its first result', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('button', { name: 'Close search', exact: true })).toBeVisible();
  await page.locator('#search-input').fill('intake');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/clinicians\/emdr\/intake-form\/?$/);
});

test('client presentation preserves the selected scale and child mode', async ({ page }) => {
  await page.goto('/tools/sud');
  await page.locator('[data-sud-kid-toggle]').check();
  await page.locator('[data-sud-slider]').fill('8');
  await page.locator('[data-client-view-toggle]').click();
  await expect(page.locator('body')).toHaveAttribute('data-client-view', 'true');
  await expect(page.locator('[data-sud-kid-toggle]')).toBeChecked();
  await expect(page.locator('[data-sud-slider]')).toHaveValue('8');
  await page.locator('[data-client-view-exit]').click();
  await expect(page.locator('[data-sud-slider]')).toHaveValue('8');
});

test('running activity has a visible stop while settings are open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/bls-visual/fullscreen');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.locator('[data-tool-settings] summary').click();
  await expect(page.locator('[data-session-stop]')).toBeInViewport();
  await page.locator('[data-session-stop]').click();
  await expect(page.locator('[data-bls-toggle]')).toHaveText('Start');
});

test('breathing selected controls and emotion choices meet contrast requirements', async ({ page }) => {
  for (const path of ['/tools/breath', '/tools/feeling-wheel/fullscreen']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  }
});

test('Escape deselects a sandtray figure without leaving or losing it', async ({ page }) => {
  test.setTimeout(60000); // Includes model fetch, decode and WebGL initialization.
  await page.goto('/tools/sandtray/fullscreen');
  await page.locator('[data-sandtray-palette-item]').first().click();
  const canvas = page.locator('[data-sandtray-canvas]');
  await canvas.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/tools\/sandtray\/fullscreen\/?$/);
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeHidden();
  await expect(page.locator('[data-sandtray-undo]')).toBeEnabled();
});
