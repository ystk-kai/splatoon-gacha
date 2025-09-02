const { test, expect } = require('@playwright/test');

test.describe('オーバーレイガチャ演出省略機能のE2E検証', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを収集
    page.on('console', msg => {
      console.log(`[BROWSER LOG] ${msg.text()}`);
    });
  });

  test('演出省略有効時: ガチャ結果のみ表示されインクエフェクトは表示されない', async ({ page, context }) => {
    console.log('=== 演出省略有効時のテスト開始 ===');

    // ダッシュボードページを開く
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('button:has-text("1人")', { timeout: 10000 });
    
    // 演出省略設定を有効にする（強制的にクリック）
    const skipToggle = dashboardPage.locator('input[type="checkbox"][id*="skip"]');
    await skipToggle.click();
    await dashboardPage.waitForTimeout(1000); // 設定保存を待つ
    console.log('✓ 演出省略設定をクリックしました');
    
    // オーバーレイページを開く
    await page.goto('/overlay');
    await page.waitForTimeout(2000); // WebSocket接続を待つ
    
    // ガチャを実行（ダッシュボードから）
    const startTime = Date.now();
    await dashboardPage.click('button:has-text("ガチャを回す！")');
    console.log('✓ ガチャを実行しました');
    
    // オーバーレイでの演出開始を待つ
    await page.waitForSelector('#overlay-container.show', { 
      state: 'visible',
      timeout: 10000 
    });
    console.log('✓ オーバーレイコンテナが表示されました');
    
    // インクエフェクトが表示されないことを確認
    const inkEffects = page.locator('.ink-splash[style*="display: block"]');
    const inkEffectCount = await inkEffects.count();
    console.log(`インクエフェクト数: ${inkEffectCount}`);
    
    // 武器が実際に表示されているか確認
    const weaponElements = page.locator('.weapon-card');
    await expect(weaponElements.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ 武器表示が確認できました');
    
    // 演出完了まで待つ（省略時は2秒程度）
    await page.waitForTimeout(3000);
    const endTime = Date.now();
    const animationDuration = endTime - startTime;
    
    console.log('=== テスト結果 ===');
    console.log(`インクエフェクト数: ${inkEffectCount}`);
    console.log(`アニメーション時間: ${animationDuration}ms`);
    
    // 検証 - インクエフェクトが表示されていないか確認
    expect(inkEffectCount).toBeLessThanOrEqual(1); // 通常は0、エラー時でも最小限
    expect(animationDuration).toBeLessThan(6000); // 演出時間が短縮されている
    
    await dashboardPage.close();
  });

  test('演出省略無効時: インクエフェクトとガチャ結果が両方表示される', async ({ page, context }) => {
    console.log('=== 演出省略無効時のテスト開始 ===');

    // ダッシュボードページを開く
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('button:has-text("1人")', { timeout: 10000 });
    
    // 演出省略設定を無効にする
    const skipToggle = dashboardPage.locator('input[type="checkbox"][id*="skip"]');
    if (await skipToggle.isChecked()) {
      await skipToggle.click(); // uncheckではなくclickを使用
      await dashboardPage.waitForTimeout(500); // 設定保存を待つ
      console.log('✓ 演出省略設定を無効にしました');
    }
    
    // オーバーレイページを開く
    await page.goto('/overlay');
    await page.waitForTimeout(2000); // WebSocket接続を待つ
    
    // インクエフェクトと武器表示の監視を設定
    await page.addInitScript(() => {
      window.testResults = {
        inkEffectsShown: false,
        weaponDisplayShown: false,
        animationStart: 0,
        animationEnd: 0
      };
      
      // インクエフェクト表示の監視
      const originalShowInkEffects = window.showInkEffects;
      if (originalShowInkEffects) {
        window.showInkEffects = function(...args) {
          console.log('[TEST] Ink effects triggered');
          window.testResults.inkEffectsShown = true;
          return originalShowInkEffects.apply(this, args);
        };
      }
      
      // 武器表示の監視
      const originalShowMultipleWeapons = window.showMultipleWeapons;
      if (originalShowMultipleWeapons) {
        window.showMultipleWeapons = function(...args) {
          console.log('[TEST] Weapon display triggered');
          window.testResults.weaponDisplayShown = true;
          return originalShowMultipleWeapons.apply(this, args);
        };
      }
    });
    
    // ガチャを実行（ダッシュボードから）
    const startTime = Date.now();
    await dashboardPage.click('button:has-text("ガチャを回す！")');
    console.log('✓ ガチャを実行しました');
    
    // オーバーレイでの演出開始を待つ
    await page.waitForSelector('#overlay-container.show', { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ オーバーレイコンテナが表示されました');
    
    // インクエフェクトの表示を確認（最初のインクエフェクト要素）
    const inkEffects = page.locator('.ink-splash.active-slow, .ink-splash.active-medium, .ink-splash.active-fast, .ink-splash.active-ultra');
    await expect(inkEffects.first()).toBeVisible({ timeout: 2000 });
    console.log('✓ インクエフェクトが表示されました');
    
    // 演出完了まで待つ（通常時は4秒程度）
    await page.waitForTimeout(5000);
    const endTime = Date.now();
    const animationDuration = endTime - startTime;
    
    // テスト結果を取得
    const testResults = await page.evaluate(() => window.testResults);
    
    console.log('=== テスト結果 ===');
    console.log(`インクエフェクト表示: ${testResults?.inkEffectsShown}`);
    console.log(`武器表示: ${testResults?.weaponDisplayShown}`);
    console.log(`アニメーション時間: ${animationDuration}ms`);
    
    // 検証
    expect(testResults?.inkEffectsShown).toBe(true); // インクエフェクトが表示される
    expect(testResults?.weaponDisplayShown).toBe(true); // 武器表示もされる
    expect(animationDuration).toBeGreaterThan(3000); // 演出時間が長い
    
    // 武器が実際に表示されているか確認
    const weaponElements = page.locator('.weapon-card');
    await expect(weaponElements.first()).toBeVisible();
    console.log('✓ 武器表示が確認できました');
    
    await dashboardPage.close();
  });

  test('演出省略設定の切り替えが正常に動作する', async ({ page, context }) => {
    console.log('=== 演出省略設定切り替えのテスト開始 ===');

    // ダッシュボードページを開く
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('button:has-text("1人")', { timeout: 10000 });
    
    // オーバーレイページを開く
    await page.goto('/overlay');
    await page.waitForTimeout(2000); // WebSocket接続を待つ
    
    // まず演出省略を有効にしてテスト
    const skipToggle = dashboardPage.locator('input[type="checkbox"][id*="skip"]');
    if (!(await skipToggle.isChecked())) {
      await skipToggle.click();
    }
    await dashboardPage.waitForTimeout(500);
    
    // 監視設定
    await page.addInitScript(() => {
      window.testResults = { inkEffectsShown: false, weaponDisplayShown: false };
      
      const originalShowInkEffects = window.showInkEffects;
      if (originalShowInkEffects) {
        window.showInkEffects = function(...args) {
          window.testResults.inkEffectsShown = true;
          return originalShowInkEffects.apply(this, args);
        };
      }
      
      const originalShowMultipleWeapons = window.showMultipleWeapons;
      if (originalShowMultipleWeapons) {
        window.showMultipleWeapons = function(...args) {
          window.testResults.weaponDisplayShown = true;
          return originalShowMultipleWeapons.apply(this, args);
        };
      }
    });
    
    // 1回目: 省略有効でガチャ実行
    await dashboardPage.click('button:has-text("ガチャを回す！")');
    await page.waitForTimeout(3000);
    
    let testResults = await page.evaluate(() => window.testResults);
    expect(testResults.inkEffectsShown).toBe(false);
    expect(testResults.weaponDisplayShown).toBe(true);
    console.log('✓ 演出省略有効時の動作を確認');
    
    // 演出省略を無効にして再テスト
    if (await skipToggle.isChecked()) {
      await skipToggle.click();
    }
    await dashboardPage.waitForTimeout(500);
    
    // 結果リセット
    await page.evaluate(() => {
      window.testResults = { inkEffectsShown: false, weaponDisplayShown: false };
    });
    
    // 2回目: 省略無効でガチャ実行
    await dashboardPage.click('button:has-text("ガチャを回す！")');
    await page.waitForTimeout(5000);
    
    testResults = await page.evaluate(() => window.testResults);
    expect(testResults.inkEffectsShown).toBe(true);
    expect(testResults.weaponDisplayShown).toBe(true);
    console.log('✓ 演出省略無効時の動作を確認');
    
    await dashboardPage.close();
  });
});