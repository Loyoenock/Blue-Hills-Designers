# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Accessibility Audits >> axe accessibility audit for Product Detail Page (/product/1)
- Location: e2e/accessibility.spec.ts:14:9

# Error details

```
Error: Found 2 critical/serious accessibility violations on Product Detail Page

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 86

- Array []
+ Array [
+   Object {
+     "description": "Ensure each HTML document contains a non-empty <title> element",
+     "help": "Documents must have <title> element to aid in navigation",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/document-title?application=playwright",
+     "id": "document-title",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "doc-has-title",
+             "impact": "serious",
+             "message": "Document does not have a non-empty <title> element",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Document does not have a non-empty <title> element",
+         "html": "<html>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "html",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.text-alternatives",
+       "wcag2a",
+       "wcag242",
+       "TTv5",
+       "TT12.a",
+       "EN-301-549",
+       "EN-9.2.4.2",
+       "ACT",
+       "RGAAv4",
+       "RGAA-8.5.1",
+     ],
+   },
+   Object {
+     "description": "Ensure every HTML document has a lang attribute",
+     "help": "<html> element must have a lang attribute",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/html-has-lang?application=playwright",
+     "id": "html-has-lang",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "messageKey": "noLang",
+             },
+             "id": "has-lang",
+             "impact": "serious",
+             "message": "The <html> element does not have a lang attribute",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   The <html> element does not have a lang attribute",
+         "html": "<html>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "html",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.language",
+       "wcag2a",
+       "wcag311",
+       "TTv5",
+       "TT11.a",
+       "EN-301-549",
+       "EN-9.3.1.1",
+       "ACT",
+       "RGAAv4",
+       "RGAA-8.3.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active]:
  - alert [ref=f1e1]
  - dialog [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]:
        - navigation [ref=f1e8]:
          - button "previous" [disabled] [ref=f1e9]:
            - img "previous" [ref=f1e10]
          - button "next" [disabled] [ref=f1e12]:
            - img "next" [ref=f1e13]
          - generic [ref=f1e15]: 1 of 1 error
        - generic [ref=f1e16]:
          - heading "Server Error" [level=1] [ref=f1e17]
          - generic [ref=f1e18]:
            - button "Copy error stack" [ref=f1e19] [cursor=pointer]
            - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools" [ref=f1e23] [cursor=pointer]:
              - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
        - paragraph [ref=f1e27]: "Error: Cannot find module './vendor-chunks/motion.js' Require stack: - /app/applet/.next/server/webpack-runtime.js - /app/applet/.next/server/app/product/[id]/page.js - /app/applet/node_modules/next/dist/server/require.js - /app/applet/node_modules/next/dist/server/load-components.js - /app/applet/node_modules/next/dist/build/utils.js - /app/applet/node_modules/next/dist/server/dev/static-paths-worker.js - /app/applet/node_modules/next/dist/compiled/jest-worker/processChild.js"
        - generic [ref=f1e28]: This error happened while generating the page. Any console logs will be displayed in the terminal window.
      - generic [ref=f1e29]:
        - generic [ref=f1e30]:
          - heading "__webpack_require__.f.require" [level=3] [ref=f1e31]
          - generic [ref=f1e32]: file:///app/applet/.next/server/webpack-runtime.js (203:28)
        - button "Show ignored frames" [ref=f1e34] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | test.describe('Accessibility Audits', () => {
  5  |   const pagesToScan = [
  6  |     { name: 'Home Page', path: '/' },
  7  |     { name: 'Shop Page', path: '/shop' },
  8  |     { name: 'Product Detail Page', path: '/product/1' },
  9  |     { name: 'Cart Page', path: '/cart' },
  10 |     { name: 'Checkout Page', path: '/checkout' },
  11 |   ];
  12 | 
  13 |   for (const target of pagesToScan) {
  14 |     test(`axe accessibility audit for ${target.name} (${target.path})`, async ({ page }) => {
  15 |       if (target.name === 'Product Detail Page') {
  16 |         await page.goto('/shop');
  17 |         await page.waitForLoadState('domcontentloaded');
  18 |         const productLink = page.locator('a[href^="/product/"]').first();
  19 |         if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
  20 |           const href = await productLink.getAttribute('href');
  21 |           if (href) {
  22 |             await page.goto(href);
  23 |           } else {
  24 |             await page.goto(target.path);
  25 |           }
  26 |         } else {
  27 |           await page.goto(target.path);
  28 |         }
  29 |       } else {
  30 |         await page.goto(target.path);
  31 |       }
  32 | 
  33 |       await page.waitForLoadState('domcontentloaded');
  34 | 
  35 |       const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  36 | 
  37 |       const criticalOrSerious = accessibilityScanResults.violations.filter(
  38 |         (v) => v.impact === 'critical' || v.impact === 'serious'
  39 |       );
  40 | 
  41 |       console.log(`\n=== Accessibility Scan Results for ${target.name} (${page.url()}) ===`);
  42 |       console.log(`Total Violations: ${accessibilityScanResults.violations.length}`);
  43 |       for (const v of accessibilityScanResults.violations) {
  44 |         console.log(`- [${v.impact ? v.impact.toUpperCase() : 'UNKNOWN'}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
  45 |         console.log(`  Help URL: ${v.helpUrl}`);
  46 |       }
  47 | 
  48 |       expect(
  49 |         criticalOrSerious,
  50 |         `Found ${criticalOrSerious.length} critical/serious accessibility violations on ${target.name}`
> 51 |       ).toEqual([]);
     |         ^ Error: Found 2 critical/serious accessibility violations on Product Detail Page
  52 |     });
  53 |   }
  54 | });
  55 | 
```