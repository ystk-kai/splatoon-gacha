const { test, expect } = require('@playwright/test');

test.describe('外部公開機能 (エラーハンドリング)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Bore.pub サービスが正常に利用可能', async ({ page }) => {
    // bore コマンドがインストールされている環境でのテスト
    
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // Bore.pub の説明が正しく表示されることを確認
    await expect(page.getByText('軽量で高速な外部公開サービス')).toBeVisible();
    await expect(page.getByText('Rust製で軽量')).toBeVisible();
    
    // 接続開始ボタンが有効であることを確認
    const connectButton = page.getByRole('button', { name: '接続開始' });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();
  });

  test('サービス説明の詳細情報確認', async ({ page }) => {
    // Bore.pub の説明で cargo install が必要であることを確認
    await expect(page.getByText('cargo install bore-cli が必要')).toBeVisible();
    
    // Localhost.run の説明でSSH設定不要であることを確認
    await expect(page.getByText('SSH設定不要')).toBeVisible();
    
    // Localtunnel の説明でIPアドレス認証が必要であることを確認
    await expect(page.getByText('IPアドレス認証必要')).toBeVisible();
  });

  test('デフォルトサービス（localhost-run）の安全性確認', async ({ page }) => {
    // デフォルトで選択されているサービスが localhost-run であることを確認
    const checkedInput = page.locator('input[name="tunnelService"]:checked');
    await expect(checkedInput).toHaveValue('localhost-run');
    
    // localhost-run の利点が表示されることを確認
    await expect(page.getByText('SSH設定不要')).toBeVisible();
    await expect(page.getByText('時間制限なし')).toBeVisible();
  });

  test('サービス切り替えで制約情報が正しく表示される', async ({ page }) => {
    // Bore.pub に切り替え
    await page.click('input[name="tunnelService"][value="bore"]');
    await expect(page.getByText('cargo install bore-cli が必要')).toBeVisible();
    
    // Localtunnel に切り替え
    await page.click('input[name="tunnelService"][value="localtunnel"]');
    await expect(page.getByText('IPアドレス認証必要')).toBeVisible();
    await expect(page.getByText('表示が遅い')).toBeVisible();
    
    // localhost-run に戻す
    await page.click('input[name="tunnelService"][value="localhost-run"]');
    await expect(page.getByText('SSH設定不要')).toBeVisible();
  });

  test('接続中状態の UI 確認', async ({ page }) => {
    // 接続開始ボタンがデフォルトで表示されることを確認
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
    
    // 状態表示が切断済みであることを確認
    await expect(page.getByText('切断済み')).toBeVisible();
  });

  test('サービス選択時の制約メッセージ確認', async ({ page }) => {
    // 各サービスの制約が適切に表示されることを確認
    const services = [
      { value: 'localhost-run', constraint: 'ランダムURL' },
      { value: 'bore', constraint: 'cargo install bore-cli が必要' },
      { value: 'localtunnel', constraint: 'IPアドレス認証必要' }
    ];

    for (const service of services) {
      await page.click(`input[name="tunnelService"][value="${service.value}"]`);
      await expect(page.getByText(service.constraint)).toBeVisible();
    }
  });
});