import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url);
const output = new URL('docs/screenshots/dashboard.png', root);
await mkdir(new URL('docs/screenshots/', root), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
await page.goto(process.argv[2] ?? 'http://127.0.0.1:43992');
await page.getByRole('button', { name: 'Skip Setup and Start Tracking' }).click();
await page.getByRole('button', { name: 'Settings' }).click();
await page.getByRole('button', { name: 'Privacy & data' }).click();
await page.getByRole('button', { name: 'Load Demo Data' }).click();
await page.getByRole('button', { name: 'Today' }).click();
await page.getByText('Recent activity').waitFor();
await page.screenshot({ path: fileURLToPath(output), fullPage: true });
await browser.close();
console.log(`Saved ${output.pathname}`);
