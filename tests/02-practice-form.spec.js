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
    // Click the label for the radio to ensure the UI state updates (triggers change handlers)
    await page.locator('label[for="gender-radio-2"]').click({ force: true }); // Female
    await page.fill('#userNumber', '1234567890');

    // DatePicker
    await page.click('#dateOfBirthInput');
    await page.selectOption('.react-datepicker__month-select', '5'); // June
    await page.selectOption('.react-datepicker__year-select', '1990');
    await page.click('.react-datepicker__day--015');

    // Subjects (React Select) - use the input used by the component
    await page.fill('#subjectsInput', 'Maths');
    await page.keyboard.press('Enter');

    // Ensure hobbies checkbox is actually selected via its label (triggers UI handlers)
    await page.locator('label[for="hobbies-checkbox-1"]').click({ force: true });

    await page.fill('#currentAddress', '456 Elm St');

    // State and City
    // State and City - open and select first option reliably
    await page.locator('#state').click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.locator('#city').click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Submit and wait longer for modal to appear (modal may take time)
    const submitBtn = page.locator('#submit');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(1000); // wait for form submission to process and modal to appear

    await expect(page.locator('.modal-content')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.modal-body')).toContainText('Jane Doe');

    await page.screenshot({ path: 'screenshots/practice-form-result.png' });

    // Workaround: disable pointer interception from sticky ads, then force-click close
    await page.evaluate(() => {
        const el = document.getElementById('fixedban');
        if (el) el.style.pointerEvents = 'none';
    });
    await page.locator('#closeLargeModal').click({ force: true });
});
