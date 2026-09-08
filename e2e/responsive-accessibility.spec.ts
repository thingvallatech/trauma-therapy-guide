import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const pages = ['/', '/tools', '/clinicians', '/families', '/clinicians/emdr/phase-2', '/clinicians/emdr/intake-form', '/clinicians/emdr/phase-2-scripts', '/clinicians/emdr/print-package', '/families/emdr', '/clinicians/resources', '/families/resources', '/help'];
for (const locale of ['', '/es']) {
  for (const width of [320, 390, 820, 1440]) {
    test(`content fits ${locale || 'en'} ${width}px`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height: 900 });
      const overflow: string[] = [];
      for (const path of pages) {
        await page.goto(`${locale}${path}`);
        const actual = await page.evaluate(() => document.documentElement.scrollWidth);
        if (actual > width + 1) overflow.push(`${locale}${path}: ${actual}`);
      }
      expect(overflow).toEqual([]);
    });
  }
  test(`key screens have no serious accessibility violations ${locale || 'en'}`, async ({ page }) => {
    test.setTimeout(90000);
    const violations: unknown[]=[];
    for (const path of ['/', '/tools', '/families/emdr', '/clinicians/resources', '/families/resources', '/tools/breath', '/tools/feeling-wheel/fullscreen', '/tools/sud', '/tools/bls-visual/fullscreen', '/tools/sandtray/fullscreen']) {
      await page.goto(`${locale}${path}`);
      const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      for (const item of result.violations) violations.push({path:`${locale}${path}`,id:item.id,impact:item.impact,nodes:item.nodes.map(n=>n.target)});
    }
    expect(violations).toEqual([]);
  });
}
