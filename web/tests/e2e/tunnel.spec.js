const { test, expect } = require('@playwright/test');

test.describe('外部公開機能 (トンネリング)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('ダッシュボードページが正常に表示される', async ({ page }) => {
    await expect(page).toHaveTitle(/Splatoon Gacha.*ダッシュボード/);
    await expect(page.getByText('ガチャモード選択')).toBeVisible();
    await expect(page.getByText('外部公開設定')).toBeVisible();
  });

  test('利用可能なトンネルサービスが表示される', async ({ page }) => {
    await expect(page.getByText('Localhost.run')).toBeVisible();
    await expect(page.getByText('Bore.pub')).toBeVisible();
    await expect(page.getByText('Localtunnel')).toBeVisible();
  });

  test('トンネルサービスの説明が表示される', async ({ page }) => {
    await expect(page.getByText('SSH ベースの無料外部公開サービス（推奨）')).toBeVisible();
    await expect(page.getByText('軽量で高速な外部公開サービス')).toBeVisible();
    await expect(page.getByText('完全無料の外部公開サービス')).toBeVisible();
  });

  test('デフォルトサービスが localhost-run になっている', async ({ page }) => {
    // 代替アプローチ：チェックされているradioボタンの値を確認
    const checkedInput = page.locator('input[name="tunnelService"]:checked');
    await expect(checkedInput).toHaveValue('localhost-run');
  });

  test('サービス切り替えが機能する', async ({ page }) => {
    // Bore.pubを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    const boreSelected = page.locator('input[name="tunnelService"][value="bore"]:checked');
    await expect(boreSelected).toBeVisible();

    // Localtunnelを選択
    await page.click('input[name="tunnelService"][value="localtunnel"]');
    const localtunnelSelected = page.locator('input[name="tunnelService"][value="localtunnel"]:checked');
    await expect(localtunnelSelected).toBeVisible();

    // localhost-runに戻す
    await page.click('input[name="tunnelService"][value="localhost-run"]');
    const localhostRunSelected = page.locator('input[name="tunnelService"][value="localhost-run"]:checked');
    await expect(localhostRunSelected).toBeVisible();
  });

  test('トンネル接続ボタンが表示される', async ({ page }) => {
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
  });

  test('トンネル状態が表示される', async ({ page }) => {
    await expect(page.getByText('状態:')).toBeVisible();
    await expect(page.getByText('切断済み')).toBeVisible();
  });

  test('認証情報表示エリアが存在する', async ({ page }) => {
    const authSection = page.locator('[class*="auth-info"], [class*="tunnel-info"]');
    await expect(authSection).toBeVisible();
  });

  test.skip('実際のトンネル接続テスト（SSH要件のため通常はスキップ）', async ({ page }) => {
    // このテストは SSH や bore コマンドが利用可能な環境でのみ実行
    // CI環境では通常スキップする

    // 接続開始ボタンをクリック
    await page.click('button:has-text("接続開始")');
    
    // 接続中状態を確認
    await expect(page.getByText('接続中...')).toBeVisible();
    
    // 最大60秒待機してURL取得を確認
    await page.waitForFunction(() => {
      const urlElement = document.querySelector('[data-testid="tunnel-url"]');
      return urlElement && urlElement.textContent.includes('http');
    }, { timeout: 60000 });

    // URLが表示されることを確認
    const tunnelUrl = page.locator('[data-testid="tunnel-url"]');
    await expect(tunnelUrl).toContainText('http');
    
    // 状態が「接続済み」になることを確認
    await expect(page.getByText('接続済み')).toBeVisible();
  });

  test('エラーハンドリングの表示確認', async ({ page }) => {
    // ネットワークをオフラインに設定してエラーを発生させる
    await page.context().setOffline(true);
    
    try {
      await page.click('button:has-text("接続開始")');
      
      // エラーメッセージが表示されることを確認
      await expect(page.getByText(/エラー|失敗|接続に失敗/)).toBeVisible({ timeout: 10000 });
    } finally {
      // ネットワークを復元
      await page.context().setOffline(false);
    }
  });

  test('視聴者ページへのリンクが存在する', async ({ page }) => {
    await expect(page.getByRole('link', { name: /視聴者|viewer/i })).toBeVisible();
  });

  test('視聴者ページが正常に表示される', async ({ page }) => {
    // 視聴者ページへ遷移
    await page.goto('/viewer');
    await page.waitForLoadState('networkidle');
    
    // 視聴者ページの要素が表示されることを確認
    await expect(page.getByText('Splatoon Gacha')).toBeVisible();
    
    // WebSocket接続の準備ができていることを確認（接続エラーが出ないこと）
    await page.waitForTimeout(2000);
    
    // WebSocketエラーがページに表示されていないことを確認
    const wsErrors = page.locator('text=/WebSocket.*failed|WebSocket.*error/i');
    await expect(wsErrors).toHaveCount(0);
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 主要な要素が表示されることを確認
    await expect(page.getByText('外部公開設定')).toBeVisible();
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
    
    // タブレットビューポートに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await expect(page.getByText('外部公開設定')).toBeVisible();
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
  });
});