const { test, expect } = require('@playwright/test');

test('Fill Text Box', async ({ page }) => {
    await page.goto('/text-box');

    await page.fill('#userName', 'John Doe');
    await page.fill('#userEmail', 'john@example.com');
    await page.fill('#currentAddress', '123 Main St');
    await page.fill('#permanentAddress', '456 Elm St');

    await page.click('#submit');

    await expect(page.locator('#output')).toBeVisible();
    await expect(page.locator('#name')).toContainText('John Doe');
    await expect(page.locator('#email')).toContainText('john@example.com');

    await page.screenshot({ path: 'screenshots/text-box-result.png' });
});
