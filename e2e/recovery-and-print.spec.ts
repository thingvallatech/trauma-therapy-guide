import { test, expect } from '@playwright/test';
for (const locale of ['', '/es']) {
  test(`print selection is honest and reversible ${locale || 'en'}`, async ({ page }) => {
    await page.goto(`${locale}/clinicians/emdr/print-package`);
    const print = page.locator(locale ? '#print-selected' : '#print-btn');
    await expect(print).toBeEnabled({ timeout: 20000 });
    await page.locator('#select-none').click();
    await expect(print).toBeDisabled();
    await page.locator('input[name="print-section"]').first().check();
    await expect(print).toBeEnabled();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-print-section]:visible')).toHaveCount(1);
    await expect(page.locator('[data-print-section]:visible').getByRole('heading').first()).toBeVisible();
    if (!locale) {
      const line = page.locator('[data-print-section]:visible .form-line').first();
      await expect(line).toHaveCSS('border-bottom-width', '1px');
    }
  });
}
test('sandtray undo restores removals and protects unsaved navigation', async ({ page }) => {
  test.setTimeout(60000); // Includes model fetch, decode and WebGL initialization.
  await page.goto('/tools/sandtray/fullscreen');
  await page.locator('[data-sandtray-palette-item]').first().click();
  const canvas = page.locator('[data-sandtray-canvas]');
  await canvas.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-fig-remove]').click();
  await page.locator('[data-sandtray-undo]').click();
  await expect(page.locator('[data-sandtray-status]')).toHaveText('Last change undone.');
  await page.locator('#tool-exit').click();
  await expect(page.locator('[data-sandtray-leave]')).toBeVisible();
  await page.locator('[data-sandtray-stay]').click();
  await expect(page).toHaveURL(/fullscreen/);
  await expect(page.locator('[data-sandtray-undo]')).toBeEnabled();
  await page.locator('[data-sandtray-undo]').click();
  await expect(page.locator('[data-sandtray-undo]')).toBeDisabled();
});
test('sandtray failed model exposes a retryable message', async ({ page }) => {
  test.setTimeout(60000); // Includes model fetch, decode and WebGL initialization.
  await page.route('**/sandtray/models/Knight.glb', route => route.abort());
  await page.goto('/tools/sandtray/fullscreen');
  await page.locator('[data-sandtray-palette-item="knight"]').click();
  await page.locator('[data-sandtray-canvas]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-sandtray-status]')).toContainText('could not load');
  await page.unroute('**/sandtray/models/Knight.glb');
  await page.locator('[data-sandtray-palette-item="knight"]').click();
  await page.locator('[data-sandtray-canvas]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-sandtray-figure-toolbar]')).toBeVisible({ timeout: 15000 });
});

test('Escape cancels a palette choice while focus remains on its button', async ({ page }) => {
  test.setTimeout(60000); // Includes model fetch, decode and WebGL initialization.
  await page.goto('/tools/sandtray');
  await page.locator('[data-client-view-toggle]').click();
  const figure = page.locator('[data-sandtray-palette-item]').first();
  await figure.click(); await page.keyboard.press('Escape');
  await expect(figure).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).toHaveAttribute('data-client-view', 'true');
});

for (const locale of ['', '/es']) {
  test(`resource search opens the matching card ${locale || 'en'}`, async ({ page }) => {
    await page.goto(`${locale}/`); await page.keyboard.press('Control+k');
    await page.locator('#search-input').fill('Knipe');
    const result = page.locator('#search-results a').first();
    await expect(result).toContainText('EMDR'); await result.click();
    await expect(page).toHaveURL(/resources#res-emdr-toolbox/);
    await expect(page.locator(':target')).toBeVisible();
  });
}
