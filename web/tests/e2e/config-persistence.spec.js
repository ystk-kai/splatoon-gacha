const { test, expect } = require('@playwright/test');

test.describe('Configuration Persistence Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ローカルストレージをクリア
    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('.splatoon-font');
    
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    
    // WebSocket接続が確立されるまで待機
    await page.waitForTimeout(1000);
  });

  test('視聴者画面制御設定がページリロード後も保持される', async ({ page }) => {
    console.log('=== 視聴者画面制御設定の永続化テスト ===');
    
    // 外部公開設定を開く
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御を有効にする
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await viewerToggle.check();
    await page.waitForTimeout(200);
    
    // ガチャモードを選択（武器とサブウェポン）
    await page.click('text=武器ガチャ');
    await page.waitForTimeout(100);
    await page.click('text=サブウェポンガチャ');
    await page.waitForTimeout(100);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // localStorageに保存されていることを確認
    const storedViewerEnabled = await page.evaluate(() => 
      localStorage.getItem('viewerEnabled')
    );
    const storedAllowedModes = await page.evaluate(() => 
      localStorage.getItem('allowedGachaModes')
    );
    
    expect(storedViewerEnabled).toBe('true');
    expect(JSON.parse(storedAllowedModes)).toContain('weapon');
    expect(JSON.parse(storedAllowedModes)).toContain('sub');
    
    // ページリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    
    // 外部公開設定を再度開く
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 設定が保持されていることを確認
    const viewerToggleAfterReload = page.locator('input[type="checkbox"]').first();
    await expect(viewerToggleAfterReload).toBeChecked();
    
    // 選択されたガチャモードが保持されていることを確認
    await expect(page.locator('input[value="weapon"]:checked')).toBeVisible();
    await expect(page.locator('input[value="sub"]:checked')).toBeVisible();
    
    console.log('✅ 視聴者画面制御設定の永続化確認完了');
  });

  test('オーバーレイ設定がページリロード後も保持される', async ({ page }) => {
    console.log('=== オーバーレイ設定の永続化テスト ===');
    
    // オーバーレイ設定を開く
    await page.click('button:has-text("オーバーレイ設定")');
    await page.waitForTimeout(500);
    
    // ガチャ演出スキップを有効にする
    const skipAnimationCheckbox = page.locator('input[type="checkbox"]').first();
    await skipAnimationCheckbox.check();
    await page.waitForTimeout(200);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // localStorageに保存されていることを確認
    const storedSkipAnimation = await page.evaluate(() => 
      localStorage.getItem('skipGachaAnimation')
    );
    expect(storedSkipAnimation).toBe('true');
    
    // ページリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    
    // オーバーレイ設定を再度開く
    await page.click('button:has-text("オーバーレイ設定")');
    await page.waitForTimeout(500);
    
    // 設定が保持されていることを確認
    const skipAnimationAfterReload = page.locator('input[type="checkbox"]').first();
    await expect(skipAnimationAfterReload).toBeChecked();
    
    console.log('✅ オーバーレイ設定の永続化確認完了');
  });

  test('ウィジェット制御設定がページリロード後も保持される', async ({ page }) => {
    console.log('=== ウィジェット制御設定の永続化テスト ===');
    
    // ウィジェット設定を開く
    await page.click('button:has-text("ウィジェット設定")');
    await page.waitForTimeout(500);
    
    // ウィジェットを無効にする
    const widgetToggle = page.locator('input[type="checkbox"]').first();
    await widgetToggle.uncheck();
    await page.waitForTimeout(200);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // localStorageに保存されていることを確認
    const storedWidgetEnabled = await page.evaluate(() => 
      localStorage.getItem('widgetEnabled')
    );
    expect(storedWidgetEnabled).toBe('false');
    
    // ページリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    
    // ウィジェット設定を再度開く
    await page.click('button:has-text("ウィジェット設定")');
    await page.waitForTimeout(500);
    
    // 設定が保持されていることを確認
    const widgetToggleAfterReload = page.locator('input[type="checkbox"]').first();
    await expect(widgetToggleAfterReload).not.toBeChecked();
    
    console.log('✅ ウィジェット制御設定の永続化確認完了');
  });

  test('プレイヤー数設定がページリロード後も保持される', async ({ page }) => {
    console.log('=== プレイヤー数設定の永続化テスト ===');
    
    // プレイヤー数を3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(500);
    
    // localStorageに保存されていることを確認
    const storedPlayerCount = await page.evaluate(() => 
      localStorage.getItem('playerCount')
    );
    expect(storedPlayerCount).toBe('3');
    
    // ページリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    
    // 3人ボタンが選択状態であることを確認
    const threePersonButton = page.locator('button:has-text("3人")');
    await expect(threePersonButton).toHaveClass(/from-splatoon-orange/);
    
    console.log('✅ プレイヤー数設定の永続化確認完了');
  });

  test('プレイヤー名設定がページリロード後も保持される', async ({ page }) => {
    console.log('=== プレイヤー名設定の永続化テスト ===');
    
    // プレイヤー名を変更
    const playerNameInput = page.locator('input[placeholder*="プレイヤー"]').first();
    await playerNameInput.clear();
    await playerNameInput.fill('テストプレイヤー1');
    await playerNameInput.blur();
    await page.waitForTimeout(500);
    
    // localStorageに保存されていることを確認
    const storedPlayerNames = await page.evaluate(() => 
      localStorage.getItem('playerNames')
    );
    const playerNames = JSON.parse(storedPlayerNames);
    expect(playerNames[0]).toBe('テストプレイヤー1');
    
    // ページリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(1000);
    
    // プレイヤー名が保持されていることを確認
    const playerNameAfterReload = page.locator('input[placeholder*="プレイヤー"]').first();
    await expect(playerNameAfterReload).toHaveValue('テストプレイヤー1');
    
    console.log('✅ プレイヤー名設定の永続化確認完了');
  });
});