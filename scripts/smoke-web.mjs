import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
await page.getByRole('heading', { name: 'Aobe WorkTrack' }).waitFor();
console.log(`Smoke check passed: ${await page.title()}`);
await browser.close();
