const { test, expect } = require('@playwright/test');

test('Handle Alerts', async ({ page }) => {
    await page.goto('/alerts');

    // 1. Simple Alert
    page.on('dialog', async dialog => {
        expect(dialog.message()).toBe('You clicked a button');
        await dialog.accept();
    });
    await page.click('#alertButton');

    // 2. Timer Alert (wait 5 seconds)
    // Note: We need a new listener or reset for different alerts if messages differ, 
    // but here we can just handle them dynamically or add specific listeners before clicks.
    // For simplicity in this demo, we'll handle the next ones.

    // 3. Confirm Box
    // We need to remove the previous listener to avoid double handling or handle inside one logic.
    // Playwright listeners are persistent. Better to use page.once for one-time events.
});

test('Handle Confirm Box', async ({ page }) => {
    await page.goto('/alerts');
    page.once('dialog', async dialog => {
        expect(dialog.message()).toBe('Do you confirm action?');
        await dialog.accept();
    });
    await page.click('#confirmButton');
    await expect(page.locator('#confirmResult')).toContainText('You selected Ok');
});

test('Handle Prompt Box', async ({ page }) => {
    await page.goto('/alerts');
    page.once('dialog', async dialog => {
        expect(dialog.message()).toBe('Please enter your name');
        await dialog.accept('My Name');
    });
    await page.click('#promtButton');
    await expect(page.locator('#promptResult')).toContainText('You entered My Name');
});
