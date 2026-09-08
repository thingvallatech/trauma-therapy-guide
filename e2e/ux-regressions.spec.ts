import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
  await page.goto('/tools/sandtray/fullscreen');
  await page.locator('[data-sandtray-palette-item]').first().click();
  const canvas = page.locator('[data-sandtray-canvas]');
  await canvas.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/tools\/sandtray\/fullscreen\/?$/);
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeHidden();
  await expect(page.locator('[data-sandtray-undo]')).toBeEnabled();
});
