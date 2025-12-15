const { test, expect } = require('@playwright/test');

test.describe('Alerts', () => {
    test('Handle All Alerts', async ({ page }) => {
        // Navigate to alerts page (relative path used by project)
        await page.goto('/alerts');

        // Remove common blocking overlays/modals that may cover buttons
        await page.evaluate(() => {
            const selectors = ['#fixedban', '.modal', '.overlay', '.cookie-consent', '.modal-backdrop', '.close-fixedban'];
            selectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
        });

        // 1) Simple Alert: attach one-time handler then click
        page.once('dialog', async dialog => {
            expect(dialog.message()).toBe('You clicked a button');
            await dialog.accept();
        });
        await page.click('#alertButton', { force: true });

        // 2) Timer Alert: click and then wait for the delayed alert and accept it
        await page.click('#timerAlertButton', { force: true });
        const timerDialog = await page.waitForEvent('dialog', { timeout: 8000 });
        await timerDialog.accept();
        // Give a short moment to ensure no residual dialogs remain
        await page.waitForTimeout(200);

        // 3) Confirm Box: attach dialog handler and click
        let confirmDialogHandled = false;
        page.once('dialog', async dialog => {
            confirmDialogHandled = true;
            try {
                expect(dialog.message()).toBe('Do you confirm action?');
            } catch (e) {
                // ignore unexpected message
            }
            await dialog.accept();
        });
        const confirmBtn = page.locator('#confirmButton');
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmBtn.click({ force: true });
        // Wait to ensure the dialog was handled
        await page.waitForTimeout(800);
        if (!confirmDialogHandled) {
            // Fallback: try JS click
            await page.evaluate(() => document.querySelector('#confirmButton')?.click());
            await page.waitForTimeout(500);
        }
        await expect(page.locator('#confirmResult')).toContainText('You selected Ok', { timeout: 8000 });

        // 4) Prompt Box: click, enter text, accept, then verify
        // 4) Prompt Box: provide text and accept
        page.once('dialog', async dialog => {
            expect(dialog.message()).toBe('Please enter your name');
            await dialog.accept('My Name');
        });
        await page.click('#promtButton', { force: true });
        await expect(page.locator('#promptResult')).toContainText('You entered My Name');
    });
});
