import { expect, test } from '@playwright/test';

for (const locale of ['en', 'es']) {
  const prefix = locale === 'es' ? '/es' : '';
  test(`${locale}: grounding can skip, go back, and finish without completing senses`, async ({ page }) => {
    await page.goto(`${prefix}/tools/grounding`);
    const widget = page.locator('[data-grounding-widget]');
    await widget.locator('[data-grounding-skip]').click();
    await expect(widget.locator('[data-grounding-count]')).toHaveText('4');
    await widget.locator('[data-grounding-back]').click();
    await expect(widget.locator('[data-grounding-count]')).toHaveText('5');
    await widget.locator('[data-guided-finish]').click();
    await expect(widget.locator('[data-guided-finished]')).toBeVisible();
    await expect(widget.locator('[data-guided-finished] h2')).toBeFocused();
    await widget.locator('[data-guided-return]').click();
    await expect(widget.locator('[data-grounding-prompt]')).toBeVisible();
  });

  test(`${locale}: calm place keeps choices when going back and displays chosen scene`, async ({ page }) => {
    await page.goto(`${prefix}/tools/safe-place`);
    const widget = page.locator('[data-safeplace-widget]');
    await widget.locator('[data-pick-env="beach"]').click();
    await expect(widget.locator('[data-step="comfort"] h2')).toBeFocused();
    await widget.locator('[data-pick-comfort="animal"]').click();
    await expect(widget.locator('[data-pick-comfort="animal"]')).toHaveAttribute('aria-pressed', 'true');
    await widget.locator('[data-back-to="env"]').click();
    await expect(widget.locator('[data-pick-env="beach"]')).toHaveAttribute('aria-pressed', 'true');
    await widget.locator('[data-pick-env="beach"]').click();
    await widget.locator('[data-to-senses]').click();
    await widget.locator('[data-to-done]').click();
    await expect(widget.locator('[data-safe-scene="beach"]')).toBeVisible();
    await widget.locator('[data-guided-finish]').click();
    await expect(widget.locator('[data-guided-finished]')).toBeVisible();
  });

  test(`${locale}: container writing is optional and entries can be edited or removed`, async ({ page }) => {
    await page.goto(`${prefix}/tools/container`);
    const widget = page.locator('[data-container-widget]');
    await widget.locator('[data-pick-container="wooden-box"]').click();
    await widget.locator('[data-worry-input]').fill('Synthetic test note');
    await widget.locator('[data-worry-add]').click();
    await widget.locator('[data-worry-edit]').click();
    await expect(widget.locator('[data-worry-input]')).toHaveValue('Synthetic test note');
    await widget.locator('[data-worry-input]').fill('Changed synthetic note');
    await widget.locator('[data-worry-add]').click();
    await expect(widget.locator('[data-worry-list]')).toContainText('Changed synthetic note');
    await widget.locator('[data-worry-remove]').click();
    await expect(widget.locator('[data-worry-list] li')).toHaveCount(1);
    await widget.locator('[data-worry-remove]').click();
    await expect(widget.locator('[data-worry-list] li')).toHaveCount(0);
    await widget.locator('[data-container-undo]').click();
    await expect(widget.locator('[data-worry-list]')).toContainText('Changed synthetic note');
    await widget.locator('[data-worry-remove]').click();
    await widget.locator('[data-worry-remove]').click();
    await widget.locator('[data-to-step-3]').click();
    await expect(widget.locator('[data-step="3"]')).toBeVisible();
    await widget.locator('[data-back-to="2"]').click();
    await expect(widget.locator('[data-step="2"]')).toBeVisible();
  });

  test(`${locale}: feeling cards expose selected details and allow no fitting word`, async ({ page }) => {
    await page.goto(`${prefix}/tools/feeling-wheel`);
    const widget = page.locator('[data-feeling-widget]');
    await widget.locator('[data-core-button="0"]').click();
    await widget.locator('[data-secondary-grid] button').first().click();
    await expect(widget.locator('[data-secondary-grid] button').first()).toHaveAttribute('aria-pressed', 'true');
    await widget.locator('[data-feeling-none]').click();
    await expect(widget.locator('[data-feeling-none]')).toHaveAttribute('aria-pressed', 'true');
    await expect(widget.locator('[data-secondary-wrap]')).toBeHidden();
    await widget.locator('[data-feeling-clear]').click();
    await expect(widget.locator('[aria-pressed="true"]')).toHaveCount(0);
  });

  test(`${locale}: lightstream allows back, skip and early finish`, async ({ page }) => {
    await page.goto(`${prefix}/tools/lightstream`);
    const widget = page.locator('[data-lightstream-widget]');
    await widget.locator('[data-pick-color]').first().click();
    const firstPrompt = await widget.locator('[data-flow-script]').textContent();
    await widget.locator('[data-flow-skip]').click();
    await widget.locator('[data-flow-back]').click();
    await expect(widget.locator('[data-flow-script]')).toHaveText(firstPrompt!);
    await widget.locator('[data-flow-next]').click();
    await widget.locator('[data-flow-next]').click();
    const currentPrompt = await widget.locator('[data-flow-script]').textContent();
    await widget.locator('[data-change-color]').click();
    await widget.locator('[data-pick-color]').nth(1).click();
    await expect(widget.locator('[data-flow-script]')).toHaveText(currentPrompt!);
    await widget.locator('[data-guided-finish]').click();
    await expect(widget.locator('[data-guided-finished]')).toBeVisible();
  });
}

test('Spanish scale choices can remain unset and kid wording stays Spanish', async ({ page }) => {
  await page.goto('/es/tools/sud');
  const sud = page.locator('[data-sud-widget]');
  await expect(sud.locator('[data-sud-display]')).toHaveText('—');
  await sud.locator('[data-scale-use]').click();
  await expect(sud.locator('[data-sud-display]')).toHaveText('5');
  await sud.locator('[data-sud-kid-toggle]').check();
  await expect(sud.locator('[data-sud-wording]')).not.toContainText('yucky');
  await sud.locator('[data-sud-slider]').fill('8');
  await expect(sud.locator('[data-sud-display]')).toHaveText('8');
  await sud.locator('[data-scale-clear]').click();
  await expect(sud.locator('[data-sud-display]')).toHaveText('—');
  await sud.locator('[data-scale-use]').click();
  await expect(sud.locator('[data-sud-display]')).toHaveText('8');
  await page.goto('/es/tools/voc');
  const voc = page.locator('[data-voc-widget]');
  await voc.locator('[data-scale-use]').click();
  await expect(voc.locator('[data-voc-display]')).toHaveText('4');
  await voc.locator('[data-voc-slider]').fill('6');
  await voc.locator('[data-scale-clear]').click();
  await expect(voc.locator('[data-voc-display]')).toHaveText('—');
  await voc.locator('[data-scale-use]').click();
  await expect(voc.locator('[data-voc-display]')).toHaveText('6');
});
