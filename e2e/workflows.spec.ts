import { expect, test } from '@playwright/test';

async function skipSetup(page: import('@playwright/test').Page) {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Skip Setup and Start Tracking' });
  await skip.waitFor();
  await skip.click();
  await expect(page.getByText('Ready when you are.')).toBeVisible();
}

async function openQuickAdd(page: import('@playwright/test').Page) {
  const desktop = page.getByRole('button', { name: /Quick Add/ });
  if (await desktop.isVisible()) await desktop.click();
  else await page.getByRole('button', { name: 'Quick add' }).click();
}

async function navigateMore(page: import('@playwright/test').Page, name: string) {
  const direct = page.getByRole('button', { name });
  if (await direct.first().isVisible()) await direct.first().click();
  else {
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('button', { name }).last().click();
  }
}

test('simple workday survives refresh and records a break', async ({ page }) => {
  await skipSetup(page);
  await page.getByRole('button', { name: 'Start work' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByText('Working now')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Working now')).toBeVisible();
  await page.getByRole('button', { name: 'Start break' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start break' }).click();
  await expect(page.getByText('You’re on a break.')).toBeVisible();
  await page.getByRole('button', { name: 'End break' }).click();
  await page.getByRole('button', { name: 'End work' }).click();
  await expect(page.getByText('Ready when you are.')).toBeVisible();
});

test('mileage workflow adds vehicle and completes a trip', async ({ page }) => {
  await skipSetup(page);
  await navigateMore(page, 'Vehicles');
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Vehicle nickname').fill('Test Car');
  await page.getByLabel('Current odometer').fill('1000');
  await page.getByRole('dialog').getByRole('button', { name: 'Add vehicle' }).click();
  const today = page.getByRole('button', { name: 'Today' });
  if (await today.count()) await today.first().click();
  await page.getByRole('button', { name: 'Start trip' }).first().click();
  await page.getByLabel('Purpose').fill('Client visit');
  await page.getByRole('dialog').getByRole('button', { name: 'Start trip' }).click();
  await page.getByRole('button', { name: 'End trip' }).click();
  await page.getByLabel('Ending odometer').fill('1018.5');
  await page.getByRole('dialog').getByRole('button', { name: 'End trip' }).click();
  await expect(page.getByText('18.5 mi').first()).toBeVisible();
});

test('demo data produces a report preview', async ({ page }) => {
  await skipSetup(page);
  await navigateMore(page, 'Settings');
  await page.getByRole('button', { name: 'Privacy & data' }).click();
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await navigateMore(page, 'Reports');
  await expect(page.getByText('Work and mileage report')).toBeVisible();
  await expect(page.getByText(/records/).first()).toBeVisible();
});

test('complete backup restores records after local data is cleared', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Desktop coverage is sufficient for the file chooser flow.',
  );
  await skipSetup(page);
  await openQuickAdd(page);
  await page.getByRole('button', { name: 'Completed shift' }).click();
  await page.getByLabel('Total hours').fill('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Add completed shift' }).click();
  await navigateMore(page, 'Settings');
  await page.getByRole('button', { name: 'Backup & import' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back Up Now' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.getByRole('button', { name: 'Privacy & data' }).click();
  await page.getByRole('button', { name: 'Delete All Data' }).click();
  await page.getByLabel(/DELETE ALL DATA/).fill('DELETE ALL DATA');
  await page.getByRole('dialog').getByRole('button', { name: 'Permanently delete' }).click();
  await page.getByRole('button', { name: 'Skip Setup and Start Tracking' }).waitFor();
  await page.getByRole('button', { name: 'Skip Setup and Start Tracking' }).click();
  await navigateMore(page, 'Settings');
  await page.getByRole('button', { name: 'Backup & import' }).click();
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(backupPath!);
  await page.getByRole('dialog').getByRole('button', { name: 'Restore backup' }).click();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('2h 00m')).toBeVisible();
});

test('PWA keeps new shift and trip records offline after reload', async ({ page, context }) => {
  await skipSetup(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Ready when you are.')).toBeVisible();
  await openQuickAdd(page);
  await page.getByRole('button', { name: 'Completed shift' }).click();
  await page.getByLabel('Total hours').fill('1.5');
  await page.getByRole('dialog').getByRole('button', { name: 'Add completed shift' }).click();
  await openQuickAdd(page);
  await page.getByRole('button', { name: 'Completed trip' }).click();
  await page.getByLabel('Purpose').fill('Offline supply run');
  await page.getByLabel(/Total distance/).fill('12');
  await page.getByRole('dialog').getByRole('button', { name: 'Add trip' }).click();
  await page.reload();
  const history = page.getByRole('button', { name: 'History' });
  await history.first().click();
  await expect(page.getByText('Offline supply run')).toBeVisible();
  await expect(page.getByText('1h 30m')).toBeVisible();
});

test('report exports create PDF, XLSX, CSV, and printable HTML files', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop covers the browser download integration.');
  await skipSetup(page);
  await navigateMore(page, 'Settings');
  await page.getByRole('button', { name: 'Privacy & data' }).click();
  await page.getByRole('button', { name: 'Load Demo Data' }).click();
  await navigateMore(page, 'Reports');
  for (const [label, extension] of [
    ['PDF', '.pdf'],
    ['XLSX', '.xlsx'],
    ['CSV', '.csv'],
    ['Printable HTML', '.html'],
  ] as const) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(extension);
  }
});
