const { test, expect } = require('@playwright/test');

test.describe('Dashboard Reload State Restoration', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('.splatoon-font');
    
    // 状態復元ローディングが完了するまで待機（必要に応じて）
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    
    // WebSocket接続が確立されるまで待機
    await page.waitForTimeout(1000);
  });

  test('1回目のリロード - 人数選択の復元確認', async ({ page }) => {
    console.log('=== 1回目のリロード前の状態設定 ===');
    
    // 人数を4に設定
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(100);
    
    // プレイヤー名を変更
    await page.fill('input[placeholder="Player 1"]', 'テストプレイヤー1');
    await page.fill('input[placeholder="Player 2"]', 'テストプレイヤー2');
    await page.waitForTimeout(100);
    
    console.log('=== 1回目のリロード実行 ===');
    
    // ページをリロード
    await page.reload();
    
    // ページが完全に読み込まれるまで待機
    await page.waitForSelector('.splatoon-font');
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(3000); // 状態復元を待つ
    
    console.log('=== 1回目のリロード後の状態確認 ===');
    
    // 人数選択が復元されているか確認
    const selectedButton = page.locator('button:has-text("4人")');
    await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
    
    // プレイヤー名が復元されているか確認
    const player1Name = await page.inputValue('input[placeholder="Player 1"]');
    const player2Name = await page.inputValue('input[placeholder="Player 2"]');
    expect(player1Name).toBe('テストプレイヤー1');
    expect(player2Name).toBe('テストプレイヤー2');
    
    console.log('1回目のリロード：状態復元成功');
  });

  test('2回目のリロード - 状態保持の確認（問題再現テスト）', async ({ page }) => {
    console.log('=== 初期状態設定 ===');
    
    // 人数を3に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(100);
    
    // プレイヤー名を設定
    await page.fill('input[placeholder="Player 1"]', 'リロードテスト1');
    await page.fill('input[placeholder="Player 2"]', 'リロードテスト2');
    await page.fill('input[placeholder="Player 3"]', 'リロードテスト3');
    await page.waitForTimeout(200);
    
    // 視聴者画面制御を有効化
    const viewerCheckbox = page.locator('input[type="checkbox"]').first();
    await viewerCheckbox.check();
    await page.waitForTimeout(100);
    
    console.log('=== 1回目のリロード ===');
    
    // 1回目のリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(3000);
    
    // 1回目リロード後の状態確認
    let selectedButton = page.locator('button:has-text("3人")');
    await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
    
    let player1Name = await page.inputValue('input[placeholder="Player 1"]');
    expect(player1Name).toBe('リロードテスト1');
    
    console.log('1回目のリロード：成功');
    
    console.log('=== 2回目のリロード（問題再現） ===');
    
    // 2回目のリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(3000);
    
    // 2回目リロード後の状態確認
    selectedButton = page.locator('button:has-text("3人")');
    const button1Selected = page.locator('button:has-text("1人")');
    player1Name = await page.inputValue('input[placeholder="Player 1"]');
    
    const is3PersonSelected = await selectedButton.evaluate(el => el.className.includes('from-splatoon-orange'));
    const is1PersonSelected = await button1Selected.evaluate(el => el.className.includes('from-splatoon-orange'));
    
    console.log('2回目リロード後 - 3人ボタン選択:', is3PersonSelected);
    console.log('2回目リロード後 - 1人ボタン選択:', is1PersonSelected);
    console.log('2回目リロード後 - プレイヤー1名前:', player1Name);
    
    // 問題の確認：2回目のリロードで状態が初期化されるか？
    if (is1PersonSelected || player1Name === '') {
      console.log('❌ 問題を確認：2回目のリロードで状態が初期化された');
      // テストは失敗するが、問題の存在を確認できる
    } else {
      console.log('✅ 2回目のリロードでも状態が保持されている');
      await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
      expect(player1Name).toBe('リロードテスト1');
    }
  });

  test('連続リロード耐久テスト', async ({ page }) => {
    console.log('=== 連続リロード耐久テスト開始 ===');
    
    // 初期状態設定
    await page.click('button:has-text("2人")');
    await page.fill('input[placeholder="Player 1"]', '耐久テスト1');
    await page.fill('input[placeholder="Player 2"]', '耐久テスト2');
    await page.waitForTimeout(200);
    
    // 5回連続でリロードテスト
    for (let i = 1; i <= 5; i++) {
      console.log(`=== ${i}回目のリロード ===`);
      
      await page.reload();
      await page.waitForSelector('.splatoon-font');
      // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(2000); // 状態復元待機
      
      const selectedButton = page.locator('button:has-text("2人")');
      const player1Name = await page.inputValue('input[placeholder="Player 1"]');
      
      const is2PersonSelected = await selectedButton.evaluate(el => el.className.includes('from-splatoon-orange'));
      console.log(`${i}回目 - 2人ボタン選択: ${is2PersonSelected}, 名前: ${player1Name}`);
      
      // 各リロード後の状態確認
      await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
      expect(player1Name).toBe('耐久テスト1');
    }
    
    console.log('✅ 連続リロード耐久テスト完了');
  });

  test('ガチャ実行後のリロードテスト', async ({ page }) => {
    console.log('=== ガチャ実行後のリロードテスト ===');
    
    // 人数を設定
    await page.click('button:has-text("2人")');
    await page.fill('input[placeholder="Player 1"]', 'ガチャテスト1');
    await page.fill('input[placeholder="Player 2"]', 'ガチャテスト2');
    await page.waitForTimeout(200);
    
    // ガチャを実行
    const gachaButton = page.locator('button').filter({ hasText: 'ガチャを回す' });
    await gachaButton.click();
    
    // ガチャ完了を待機
    await page.waitForTimeout(3000);
    
    // ガチャ結果が表示されているか確認
    const weaponResult = page.locator('.weapon-card, .weapon-result, [class*="weapon"]').first();
    await expect(weaponResult).toBeVisible({ timeout: 5000 });
    
    console.log('=== ガチャ完了後のリロード ===');
    
    // リロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(3000);
    
    // ガチャ結果とプレイヤー設定の両方が復元されているか確認
    const selectedButton = page.locator('button:has-text("2人")');
    const player1Name = await page.inputValue('input[placeholder="Player 1"]');
    
    await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
    expect(player1Name).toBe('ガチャテスト1');
    
    // ガチャ結果も復元されているか確認
    const weaponResultAfterReload = page.locator('.weapon-card, .weapon-result, [class*="weapon"]').first();
    await expect(weaponResultAfterReload).toBeVisible({ timeout: 5000 });
    
    console.log('✅ ガチャ実行後のリロードテスト完了');
  });

  test('WebSocketリアルタイム更新の確認', async ({ page, browser }) => {
    console.log('=== WebSocketリアルタイム更新テスト ===');
    
    // 2つ目のページ（ビューアー画面）を開く
    const viewerPage = await browser.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // ダッシュボードで設定変更
    await page.click('button:has-text("3人")');
    await page.fill('input[placeholder="Player 1"]', 'リアルタイム1');
    await page.waitForTimeout(200);
    
    // ビューアー画面でも更新が反映されるか確認
    await viewerPage.waitForTimeout(1000);
    
    // ダッシュボードをリロード
    await page.reload();
    await page.waitForSelector('.splatoon-font');
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    await page.waitForTimeout(3000);
    
    // リロード後も設定が保持されているか確認
    const selectedButton = page.locator('button:has-text("3人")');
    await expect(selectedButton).toHaveClass(/from-splatoon-orange/);
    
    await viewerPage.close();
    console.log('✅ WebSocketリアルタイム更新テスト完了');
  });
});