const { test, expect } = require('@playwright/test');

test.describe('Bore.pub 接続テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Bore.pub サービスが正常に選択できる', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 選択されていることを確認
    const boreSelected = page.locator('input[name="tunnelService"][value="bore"]:checked');
    await expect(boreSelected).toBeVisible();
    
    // Bore.pub固有の説明が表示されることを確認
    await expect(page.getByText('軽量で高速な外部公開サービス')).toBeVisible();
    await expect(page.getByText('Rust製で軽量')).toBeVisible();
  });

  test('Bore.pub接続の実際のテスト', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 接続開始前の状態確認
    await expect(page.getByText('⭕ 未接続')).toBeVisible();
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
    
    // 接続開始ボタンをクリック
    await page.click('button:has-text("接続開始")');
    
    // 接続中状態を確認（短時間） - ボタンの接続中テキストを確認
    await expect(page.getByRole('button', { name: '接続中...' })).toBeVisible({ timeout: 5000 });
    
    // 接続成功を待機（最大60秒）
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // URLが表示されることを確認
    const tunnelUrl = page.locator('code').filter({ hasText: /bore\.pub/ }).first();
    await expect(tunnelUrl).toBeVisible();
    
    // URLテキストを取得してフォーマットを確認
    const urlText = await tunnelUrl.textContent();
    expect(urlText).toMatch(/http:\/\/bore\.pub:\d+\/viewer/);
    
    // 認証情報セクションを確認
    await expect(page.getByText('認証情報:')).toBeVisible();
    await expect(page.getByText('認証不要でアクセスできます')).toBeVisible();
    
    // Bore.pubサービス情報の確認（視聴者への案内文内に表示される）
    await expect(page.getByText('視聴者への案内文')).toBeVisible();
    
    // コピーボタンが動作することを確認
    const copyButton = page.getByRole('button', { name: '📋 コピー' });
    await expect(copyButton).toBeVisible();
    
    // 視聴者への案内文セクションを確認
    await expect(page.getByText('📢 視聴者への案内文')).toBeVisible();
    const fullCopyButton = page.getByRole('button', { name: '📋 全文をコピー' });
    await expect(fullCopyButton).toBeVisible();
    
    // 停止と再接続ボタンが表示されることを確認
    await expect(page.getByRole('button', { name: '停止' })).toBeVisible();
    await expect(page.getByRole('button', { name: '再接続' })).toBeVisible();
    
    // 接続を停止
    await page.click('button:has-text("停止")');
    
    // 停止後の状態確認
    await expect(page.getByText('⭕ 未接続')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
  });

  test('Bore.pub使用方法が正しく表示される', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 使用方法セクションの確認
    await expect(page.getByText('使用方法 (Bore.pub):')).toBeVisible();
    
    // Bore.pub固有の使用方法説明を確認
    await expect(page.getByText('Bore.pub：高速で軽量なサービスを使用（認証不要）')).toBeVisible();
    await expect(page.getByText('視聴者は共有されたURL（/viewer）に直接アクセスして視聴者画面を利用可能')).toBeVisible();
  });

  test('Bore.pub再接続テスト', async ({ page }) => {
    // 最初の接続
    await page.click('input[name="tunnelService"][value="bore"]');
    await page.click('button:has-text("接続開始")');
    
    // 接続成功を待機
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // 最初のURLを記録
    const firstUrl = await page.locator('code').filter({ hasText: /bore\.pub/ }).first().textContent();
    
    // 再接続実行
    await page.click('button:has-text("再接続")');
    
    // 再接続中状態を確認
    await expect(page.getByRole('button', { name: '再接続中...' })).toBeVisible({ timeout: 5000 });
    
    // 再接続成功を待機
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // 新しいURLが表示されることを確認（ポート番号が変わる可能性）
    const newUrl = await page.locator('code').filter({ hasText: /bore\.pub/ }).first().textContent();
    expect(newUrl).toMatch(/http:\/\/bore\.pub:\d+\/viewer/);
    
    // 最終的に接続を停止
    await page.click('button:has-text("停止")');
    await expect(page.getByText('⭕ 未接続')).toBeVisible({ timeout: 10000 });
  });

  test.skip('Bore.pubエラーハンドリング（ネットワークエラー）', async ({ page }) => {
    // このテストは特殊な環境でのみ実行
    
    // ネットワークをオフラインに設定してエラーを発生させる
    await page.context().setOffline(true);
    
    try {
      await page.click('input[name="tunnelService"][value="bore"]');
      await page.click('button:has-text("接続開始")');
      
      // エラーメッセージが表示されることを確認
      await expect(page.getByText(/エラー|失敗|接続に失敗/)).toBeVisible({ timeout: 30000 });
    } finally {
      // ネットワークを復元
      await page.context().setOffline(false);
    }
  });
});