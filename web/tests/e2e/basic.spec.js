const { test, expect } = require('@playwright/test');

test.describe('基本機能', () => {
  test('ダッシュボードページの基本動作', async ({ page }) => {
    await page.goto('/dashboard');
    
    // ページタイトルが正しいことを確認
    await expect(page).toHaveTitle(/Splatoon Gacha.*ダッシュボード/);
    
    // 主要なUIコンポーネントが表示されることを確認
    await expect(page.getByText('ガチャモード選択')).toBeVisible();
    await expect(page.getByText('外部公開設定')).toBeVisible();
    await expect(page.getByText('人数選択')).toBeVisible();
    await expect(page.getByText('武器ガチャ')).toBeVisible();
  });

  test('視聴者ページの基本動作', async ({ page }) => {
    await page.goto('/viewer');
    
    // ページタイトルが正しいことを確認
    await expect(page).toHaveTitle(/Splatoon Gacha/);
    
    // 視聴者ページの主要要素が表示されることを確認
    await expect(page.getByText('Splatoon Gacha')).toBeVisible();
  });

  test('ナビゲーション機能', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 視聴者ページへのリンクをクリック
    const viewerLink = page.getByRole('link', { name: /視聴者|viewer/i });
    if (await viewerLink.isVisible()) {
      await viewerLink.click();
      await page.waitForLoadState('networkidle');
      
      // 視聴者ページに遷移したことを確認
      await expect(page).toHaveURL(/viewer/);
      await expect(page.getByText('Splatoon Gacha')).toBeVisible();
    }
  });

  test('APIエンドポイントの可用性確認', async ({ page }) => {
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // APIエンドポイントをテスト
    const response = await page.request.get('/api/status');
    expect(response.status()).toBe(200);
    
    const tunnelServicesResponse = await page.request.get('/api/tunnel/services');
    expect(tunnelServicesResponse.status()).toBe(200);
    
    const data = await tunnelServicesResponse.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test('React コンポーネントの読み込み確認', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Reactコンポーネントが正常にレンダリングされていることを確認
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    // 子コンポーネントが存在することを確認
    await expect(root.locator('*')).toHaveCount.greaterThan(0);
  });

  test('JavaScriptエラーがないことを確認', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 重大なJavaScriptエラーがないことを確認
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Uncaught') || 
      error.includes('ReferenceError') ||
      error.includes('TypeError')
    );
    
    expect(criticalErrors).toEqual([]);
  });

  test('CSS と外部リソースの読み込み確認', async ({ page }) => {
    await page.goto('/dashboard');
    
    // CSSが正常に読み込まれていることを確認
    const hasStyles = await page.evaluate(() => {
      const stylesheets = document.styleSheets;
      return stylesheets.length > 0;
    });
    
    expect(hasStyles).toBe(true);
    
    // React や Babel などの外部ライブラリが読み込まれていることを確認
    const hasReact = await page.evaluate(() => {
      return typeof window.React !== 'undefined';
    });
    
    expect(hasReact).toBe(true);
  });
});