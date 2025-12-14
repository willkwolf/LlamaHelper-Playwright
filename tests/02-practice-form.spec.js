const { test, expect } = require('@playwright/test');

test('Fill Practice Form', async ({ page }) => {
    await page.goto('/automation-practice-form');

    // Disable or remove common obstructive elements (ads, modals, iframes) early
    await page.evaluate(() => {
        // disable pointer events for sticky banners and modals
        document.querySelectorAll('#fixedban, .modal, [role="dialog"]').forEach(el => el.style.pointerEvents = 'none');
        // remove third-party iframes that commonly intercept pointer events
        document.querySelectorAll('iframe').forEach(i => i.remove());
    });

    await page.fill('#firstName', 'Jane');
    await page.fill('#lastName', 'Doe');
    await page.fill('#userEmail', 'jane@example.com');
    await page.locator('#gender-radio-2').check({ force: true }); // Female
    await page.fill('#userNumber', '1234567890');

    // DatePicker
    await page.click('#dateOfBirthInput');
    await page.selectOption('.react-datepicker__month-select', '5'); // June
    await page.selectOption('.react-datepicker__year-select', '1990');
    await page.click('.react-datepicker__day--015');

    // Subjects (React Select)
    await page.click('#subjectsContainer');
    await page.keyboard.type('Maths');
    await page.keyboard.press('Enter');

    // Set checkbox state via JS to avoid pointer interception issues
    await page.evaluate(() => {
        const cb = document.getElementById('hobbies-checkbox-1');
        if (cb) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    await page.fill('#currentAddress', '456 Elm St');

    // State and City
    await page.locator('#state').click({ force: true });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.locator('#city').click({ force: true });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('#submit');

    await expect(page.locator('.modal-content')).toBeVisible();
    await expect(page.locator('.modal-body')).toContainText('Jane Doe');

    await page.screenshot({ path: 'screenshots/practice-form-result.png' });

    // Workaround: disable pointer interception from sticky ads, then force-click close
    await page.evaluate(() => {
        const el = document.getElementById('fixedban');
        if (el) el.style.pointerEvents = 'none';
    });
    await page.locator('#closeLargeModal').click({ force: true });
});
