const { test, expect } = require('@playwright/test');

test.describe('Bore.pub シンプル接続テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // テスト開始前にトンネル接続をリセット
    await page.request.post('/api/tunnel/stop');
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にトンネル接続を停止
    await page.request.post('/api/tunnel/stop');
  });

  test('Bore.pub基本的な接続と停止テスト', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 初期状態の確認
    await expect(page.getByText('⭕ 未接続')).toBeVisible();
    
    // 接続開始
    await page.click('button:has-text("接続開始")');
    
    // 接続完了を待機（最大60秒）
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // URLが生成されることを確認
    await expect(page.locator('code').filter({ hasText: /bore\.pub/ })).toBeVisible();
    
    // 停止ボタンが表示されることを確認
    await expect(page.getByRole('button', { name: '停止' })).toBeVisible();
    
    // 接続停止
    await page.click('button:has-text("停止")');
    
    // 停止後の状態確認
    await expect(page.getByText('⭕ 未接続')).toBeVisible({ timeout: 10000 });
  });

  test('Bore.pub URL形式の確認', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 接続開始
    await page.click('button:has-text("接続開始")');
    
    // 接続完了を待機
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // URL形式を確認
    const urlElement = page.locator('code').filter({ hasText: /bore\.pub/ }).first();
    await expect(urlElement).toBeVisible();
    
    const urlText = await urlElement.textContent();
    expect(urlText).toMatch(/http:\/\/bore\.pub:\d+\/viewer/);
    
    // 停止
    await page.click('button:has-text("停止")');
  });

  test('Bore.pub使用方法表示確認', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 使用方法にBore.pub固有の内容が表示されることを確認
    await expect(page.getByText('使用方法 (Bore.pub):')).toBeVisible();
    await expect(page.getByText('Bore.pub：高速で軽量なサービスを使用（認証不要）')).toBeVisible();
  });
});