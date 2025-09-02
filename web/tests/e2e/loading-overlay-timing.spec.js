const { test, expect } = require('@playwright/test');

test.describe('ローディングオーバーレイ表示タイミング', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright設定でローディング状態をテストしやすくするために、
    // ネットワーク速度を遅くしてAPI処理時間を延長
    await page.route('/api/**', async route => {
      // API呼び出しを100ms遅延させる
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
  });

  test('WebSocket正常接続時のローディングオーバーレイ', async ({ page }) => {
    console.log('=== WebSocket正常接続時のローディング表示テスト ===');

    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ローディングオーバーレイが表示されることを確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    // ローディングオーバーレイ内のテキストを確認
    await expect(loadingOverlay.locator('text=状態を復元中...')).toBeVisible();
    
    console.log('✓ ローディングオーバーレイが表示されました');

    // WebSocket接続とAPI設定取得が完了するまで待機
    // 人数選択ボタンが表示されるまで待機（初期化完了の指標）
    await page.waitForSelector('button:has-text("1人")', { timeout: 15000 });
    
    // ローディングオーバーレイが消えることを確認
    await expect(loadingOverlay).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ すべての初期化処理完了後にローディングオーバーレイが消えました');
    
    // 設定が正しく読み込まれていることを確認
    const playerCountButtons = page.locator('button:has-text("人")');
    await expect(playerCountButtons.first()).toBeVisible();
    
    console.log('✓ プレイヤー数設定が正常に表示されました');
  });

  test('WebSocket接続失敗時のローディングオーバーレイ', async ({ page }) => {
    console.log('=== WebSocket接続失敗時のローディング表示テスト ===');

    // WebSocket接続を失敗させる
    await page.route('**/ws', route => route.abort());
    
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ローディングオーバーレイが表示されることを確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    console.log('✓ WebSocket接続失敗時もローディングオーバーレイが表示されました');

    // localStorageフォールバック処理とAPI設定取得が完了するまで待機
    await page.waitForSelector('button:has-text("1人")', { timeout: 15000 });
    
    // ローディングオーバーレイが消えることを確認
    await expect(loadingOverlay).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ WebSocket接続失敗後もすべての初期化処理完了後にローディングオーバーレイが消えました');
    
    // 設定が正しく読み込まれていることを確認（デフォルト値）
    const playerCountButtons = page.locator('button:has-text("人")');
    await expect(playerCountButtons.first()).toBeVisible();
    
    console.log('✓ WebSocket接続失敗時もプレイヤー数設定が正常に表示されました');
  });

  test('タイムアウト後のローディングオーバーレイ', async ({ page }) => {
    console.log('=== 状態復元タイムアウト後のローディング表示テスト ===');

    // WebSocket接続は成功するが、状態復元レスポンスを返さない
    await page.route('**/ws', async route => {
      if (route.request().headers()['upgrade'] === 'websocket') {
        // WebSocket接続は許可するが、レスポンス処理をモック
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // JavaScript実行でWebSocketメッセージハンドリングをモック
    await page.addInitScript(() => {
      // WebSocketのonmessageをオーバーライドして状態復元レスポンスを無効化
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(...args) {
          super(...args);
          const originalOnMessage = this.onmessage;
          this.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // dashboard-state-responseは無視（タイムアウト処理をテストするため）
            if (data.type !== 'dashboard-state-response') {
              originalOnMessage && originalOnMessage.call(this, event);
            }
          };
        }
      };
    });
    
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ローディングオーバーレイが表示されることを確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    console.log('✓ タイムアウト待機中にローディングオーバーレイが表示されました');

    // タイムアウト（5秒）+ API取得処理が完了するまで待機
    await page.waitForSelector('button:has-text("1人")', { timeout: 20000 });
    
    // ローディングオーバーレイが消えることを確認
    await expect(loadingOverlay).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ タイムアウト処理完了後にローディングオーバーレイが消えました');
    
    // 設定が正しく読み込まれていることを確認（localStorage値）
    const playerCountButtons = page.locator('button:has-text("人")');
    await expect(playerCountButtons.first()).toBeVisible();
    
    console.log('✓ タイムアウト後もプレイヤー数設定が正常に表示されました');
  });

  test('API設定取得の遅延耐性テスト', async ({ page }) => {
    console.log('=== API設定取得の遅延耐性テスト ===');

    // API呼び出しを大幅に遅延させる
    await page.route('/api/viewer-config', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.route('/api/widget-config', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.route('/api/overlay-config', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ローディングオーバーレイが表示されることを確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    console.log('✓ API遅延テスト中にローディングオーバーレイが表示されました');

    // すべてのAPI設定取得が完了するまで待機
    // 最も遅いAPI（2秒遅延）+ 余裕時間
    await page.waitForSelector('button:has-text("1人")', { timeout: 25000 });
    
    // ローディングオーバーレイが消えることを確認
    await expect(loadingOverlay).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ すべてのAPI設定取得完了後にローディングオーバーレイが消えました');
    
    // 設定が正しく読み込まれていることを確認
    const playerCountButtons = page.locator('button:has-text("人")');
    await expect(playerCountButtons.first()).toBeVisible();
    
    // オーバーレイ設定が読み込まれていることを確認
    const settingsSection = page.locator('text=設定');
    await expect(settingsSection).toBeVisible();
    
    console.log('✓ 遅延したAPI設定も正常に読み込まれました');
  });

  test('プレイヤー設定復元とローディング完了の同期', async ({ page }) => {
    console.log('=== プレイヤー設定復元とローディング完了の同期テスト ===');
    
    // まず初期設定を行う
    await page.goto('/dashboard');
    await page.waitForSelector('button:has-text("1人")', { timeout: 15000 });
    
    // プレイヤー設定を変更
    await page.click('button:has-text("3人")');
    await page.fill('input[placeholder="Player 1"]', 'プレイヤーA');
    await page.fill('input[placeholder="Player 2"]', 'プレイヤーB');
    await page.fill('input[placeholder="Player 3"]', 'プレイヤーC');
    await page.waitForTimeout(500); // localStorageへの保存を待つ
    
    console.log('✓ プレイヤー設定を変更しました');
    
    // ページをリロード
    await page.reload();
    
    // ローディングオーバーレイが表示されることを確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    console.log('✓ リロード後にローディングオーバーレイが表示されました');
    
    // 完全な初期化が完了するまで待機
    await page.waitForSelector('button:has-text("3人")', { timeout: 15000 });
    
    // ローディングオーバーレイが消えることを確認
    await expect(loadingOverlay).not.toBeVisible({ timeout: 5000 });
    
    console.log('✓ すべての初期化処理完了後にローディングオーバーレイが消えました');
    
    // プレイヤー設定が正しく復元されていることを確認
    const player3Button = page.locator('button:has-text("3人")');
    await expect(player3Button).toHaveClass(/bg-blue-500/);
    
    // プレイヤー名が復元されていることを確認
    await expect(page.locator('input[value="プレイヤーA"]')).toBeVisible();
    await expect(page.locator('input[value="プレイヤーB"]')).toBeVisible();
    await expect(page.locator('input[value="プレイヤーC"]')).toBeVisible();
    
    console.log('✓ プレイヤー設定が正しく復元されました');
  });
});