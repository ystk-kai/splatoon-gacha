const { test, expect } = require('@playwright/test');

test.describe('サービス固有の使用方法表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.skip('localhost.run 接続時の固有情報表示確認', async ({ page }) => {
    // このテストは実際の接続が必要なため通常はスキップ
    // SSH が利用可能な環境でのみ実行
    
    // localhost.run を選択（デフォルト）
    await page.click('input[name="tunnelService"][value="localhost-run"]');
    
    // 接続開始
    await page.click('button:has-text("接続開始")');
    
    // 接続成功まで待機
    await expect(page.getByText('接続済み')).toBeVisible({ timeout: 60000 });
    
    // localhost.run 固有の情報が表示されることを確認
    // 接続IDの表示
    await expect(page.getByText('接続ID:')).toBeVisible();
    
    // 追加情報の表示（永続ドメインやQRコード情報など）
    await expect(page.getByText('追加情報')).toBeVisible();
    
    // 視聴者案内文に接続IDが含まれることを確認
    const copyButton = page.getByRole('button', { name: '📋 全文をコピー' });
    await expect(copyButton).toBeVisible();
    
    // コピー機能のテスト
    await copyButton.click();
    await expect(page.getByText('案内文を全てコピーしました')).toBeVisible();
  });

  test('サービス選択に応じた説明文の動的変更', async ({ page }) => {
    // localhost.run の場合
    await page.click('input[name="tunnelService"][value="localhost-run"]');
    await expect(page.getByText('SSH設定不要')).toBeVisible();
    await expect(page.getByText('時間制限なし')).toBeVisible();
    
    // bore.pub の場合
    await page.click('input[name="tunnelService"][value="bore"]');
    await expect(page.getByText('cargo install bore-cli が必要')).toBeVisible();
    await expect(page.getByText('Rust製で軽量')).toBeVisible();
    
    // localtunnel の場合
    await page.click('input[name="tunnelService"][value="localtunnel"]');
    await expect(page.getByText('IPアドレス認証必要')).toBeVisible();
    await expect(page.getByText('表示が遅い')).toBeVisible();
  });

  test('サービス選択UIの正常動作確認', async ({ page }) => {
    // 各サービスが正しく選択できることを確認
    const services = ['localhost-run', 'bore', 'localtunnel'];
    
    for (const service of services) {
      await page.click(`input[name="tunnelService"][value="${service}"]`);
      const selectedInput = page.locator(`input[name="tunnelService"][value="${service}"]`);
      await expect(selectedInput).toBeChecked();
    }
  });

  test('接続ボタンの状態管理確認', async ({ page }) => {
    // 初期状態では接続開始ボタンが表示される
    await expect(page.getByRole('button', { name: '接続開始' })).toBeVisible();
    await expect(page.getByRole('button', { name: '接続開始' })).toBeEnabled();
    
    // 状態表示が「切断済み」または対応する表示があることを確認
    // Note: 実際の状態表示テキストは実装に依存
  });

  test('サービス固有のメッセージ生成ロジック確認', async ({ page }) => {
    // TunnelSettings コンポーネントが正しく読み込まれていることを確認
    await expect(page.getByText('外部公開設定')).toBeVisible();
    
    // サービス選択エリアが表示されていることを確認
    await expect(page.getByText('サービス選択:')).toBeVisible();
    
    // 各サービスの名前が表示されていることを確認
    await expect(page.getByText('Localhost.run')).toBeVisible();
    await expect(page.getByText('Bore.pub')).toBeVisible();
    await expect(page.getByText('Localtunnel')).toBeVisible();
  });
});