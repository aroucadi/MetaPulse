import { test, expect } from '@playwright/test';

test.describe('MetaPulse Core Regression Suite', () => {
  test('01 - API health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.app).toBe('MetaPulse');
  });

  test('02 - Feed loads threads and header renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.brand-text')).toHaveText('MetaPulse');
    const cards = page.locator('.thread-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
  });

  test('03 - Category filter updates threads list', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.selectOption('#select-category', 'announcement');
    const cards = page.locator('.thread-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    await expect(cards.first()).toContainText('Excited to announce the new open multimodal weights');
  });

  test('04 - Inline composer posts new thread', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.fill('#inline-compose-input', 'Testing verified Playwright regression pulse.');
    await page.click('#btn-inline-submit');
    const cards = page.locator('.thread-card');
    await expect(cards.first()).toContainText('Testing verified Playwright regression pulse.');
  });

  test('05 - Quote repost modal opens and cancels cleanly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const quoteBtn = page.locator('.action-btn.btn-repost').first();
    await quoteBtn.click();
    await expect(page.locator('#thread-modal')).toBeVisible({ timeout: 3000 });
    await page.click('#btn-cancel-modal');
    await expect(page.locator('#thread-modal')).toBeHidden({ timeout: 3000 });
  });

  test('06 - Creator follow button toggles following state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const followBtn = page.locator('.btn-follow').first();
    await followBtn.click();
    await expect(followBtn).toHaveText('Following');
  });
});
