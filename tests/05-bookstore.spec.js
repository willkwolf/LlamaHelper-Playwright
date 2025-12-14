const { test, expect } = require('@playwright/test');

test('Book Store Search', async ({ page }) => {
    await page.goto('/books');

    const searchBox = page.locator('#searchBox');
    await searchBox.fill('Git Pocket Guide');

    // Wait for grid to update
    const row = page.locator('.rt-tr-group').filter({ hasText: 'Git Pocket Guide' });
    await expect(row).toBeVisible();

    // Verify author
    await expect(row).toContainText('Richard E. Silverman');

    await page.screenshot({ path: 'screenshots/bookstore-result.png' });
});
