import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits', () => {
  const pagesToScan = [
    { name: 'Home Page', path: '/' },
    { name: 'Shop Page', path: '/shop' },
    { name: 'Product Detail Page', path: '/product/1' },
    { name: 'Cart Page', path: '/cart' },
    { name: 'Checkout Page', path: '/checkout' },
  ];

  for (const target of pagesToScan) {
    test(`axe accessibility audit for ${target.name} (${target.path})`, async ({ page }) => {
      await page.goto(target.path, { waitUntil: 'domcontentloaded' });

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      const criticalOrSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      console.log(`\n=== Accessibility Scan Results for ${target.name} (${page.url()}) ===`);
      console.log(`Total Violations: ${accessibilityScanResults.violations.length}`);
      for (const v of accessibilityScanResults.violations) {
        console.log(`- [${v.impact ? v.impact.toUpperCase() : 'UNKNOWN'}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
        console.log(`  Help URL: ${v.helpUrl}`);
      }

      expect(
        criticalOrSerious,
        `Found ${criticalOrSerious.length} critical/serious accessibility violations on ${target.name}`
      ).toEqual([]);
    });
  }
});
