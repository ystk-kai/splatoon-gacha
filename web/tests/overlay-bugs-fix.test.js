const { test } = require('node:test');
const assert = require('node:assert');

// 報告されたオーバーレイ関連の不具合を検証・修正するテスト（Node.js版）

test.describe = (name, fn) => {
  console.log(`\n🧪 ${name}`);
  return fn();
};

test.describe('オーバーレイ不具合修正テスト（統合テスト）', () => {
  let dashboardPage, overlayPage, context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    dashboardPage = await context.newPage();
    overlayPage = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('不具合1: 復元時のローディングオーバーレイが表示されない', async () => {
    // ダッシュボードページを開く
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForLoadState('networkidle');

    // 初期状態を確認
    const connectionStatus = await dashboardPage.locator('[data-testid="connection-status"]').textContent();
    expect(connectionStatus).toContain('connected');

    // ガチャを実行して状態を作る
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    await dashboardPage.waitForTimeout(2000); // ガチャ完了まで待機

    // ガチャ結果が表示されることを確認
    const hasResult = await dashboardPage.locator('[data-testid="current-weapon"]').isVisible();
    expect(hasResult).toBe(true);

    // ページをリロード
    await dashboardPage.reload();

    // 復元時のローディングオーバーレイを確認
    const loadingOverlay = dashboardPage.locator('[data-testid="restoration-loading"]');
    
    // ローディング表示が一時的に表示されることを確認
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    // その後非表示になることを確認
    await expect(loadingOverlay).toBeHidden({ timeout: 5000 });

    // 復元後にガチャ結果が正しく表示されることを確認
    const restoredResult = await dashboardPage.locator('[data-testid="current-weapon"]').isVisible();
    expect(restoredResult).toBe(true);
  });

  test('不具合2: オーバーレイ側をリロードするとガチャ中のままになる', async () => {
    // ダッシュボードとオーバーレイページを開く
    await dashboardPage.goto('/dashboard');
    await overlayPage.goto('/overlay');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      overlayPage.waitForLoadState('networkidle')
    ]);

    // ダッシュボードでガチャを開始
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ガチャ開始直後にオーバーレイ側をリロード
    await overlayPage.waitForTimeout(500); // ガチャ演出開始を待つ
    await overlayPage.reload();
    
    // オーバーレイがリロード後に正常に動作することを確認
    await overlayPage.waitForLoadState('networkidle');
    
    // オーバーレイ側でガチャ中状態が適切にクリアされることを確認
    const overlayStatus = await overlayPage.evaluate(() => {
      return window.isGachaRunning || false;
    });
    
    // リロード後はガチャ実行状態がfalseになるべき
    expect(overlayStatus).toBe(false);

    // ダッシュボード側でガチャが完了することを確認
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 8000 });
    
    // 新しいガチャが実行できることを確認
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeVisible();
  });

  test('不具合3: 演出省略有効でもインクエフェクトが表示される', async () => {
    // ダッシュボードとオーバーレイページを開く
    await dashboardPage.goto('/dashboard');
    await overlayPage.goto('/overlay');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      overlayPage.waitForLoadState('networkidle')
    ]);

    // 演出省略設定を有効にする
    const skipCheckbox = dashboardPage.locator('[data-testid="skip-animation-checkbox"]');
    await skipCheckbox.check();
    
    // 設定が有効になったことを確認
    const isChecked = await skipCheckbox.isChecked();
    expect(isChecked).toBe(true);

    // 設定変更がオーバーレイ側に伝わるまで少し待つ
    await dashboardPage.waitForTimeout(500);

    // オーバーレイ側でスキップ設定が適用されていることを確認
    const overlayConfig = await overlayPage.evaluate(() => {
      return window.overlayConfig;
    });
    expect(overlayConfig.skipAnimation).toBe(true);

    // ガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');

    // オーバーレイ側でインクエフェクトが表示されないことを確認
    const inkEffects = overlayPage.locator('[id^="inkSplash"]');
    
    // インクエフェクトが一定時間内に表示されないことを確認
    await overlayPage.waitForTimeout(2000);
    const visibleInkEffects = await inkEffects.count();
    
    // 演出省略時はインクエフェクトが0個であるべき
    if (visibleInkEffects > 0) {
      const hasVisibleEffect = await inkEffects.first().isVisible();
      expect(hasVisibleEffect).toBe(false);
    }

    // ガチャ結果は正常に表示されることを確認
    const overlayResult = overlayPage.locator('#overlay-container.show');
    await expect(overlayResult).toBeVisible({ timeout: 5000 });

    // ダッシュボード側でもガチャが完了することを確認
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 8000 });
  });

  test('不具合3補足: 演出省略無効時はインクエフェクトが正常に表示される', async () => {
    // ダッシュボードとオーバーレイページを開く
    await dashboardPage.goto('/dashboard');
    await overlayPage.goto('/overlay');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      overlayPage.waitForLoadState('networkidle')
    ]);

    // 演出省略設定を無効にする（デフォルト状態）
    const skipCheckbox = dashboardPage.locator('[data-testid="skip-animation-checkbox"]');
    await skipCheckbox.uncheck();
    
    // 設定が無効になったことを確認
    const isChecked = await skipCheckbox.isChecked();
    expect(isChecked).toBe(false);

    // ガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');

    // オーバーレイ側でインクエフェクトが表示されることを確認
    const inkEffect = overlayPage.locator('[id^="inkSplash"]').first();
    
    // インクエフェクトが表示されることを確認（通常演出時）
    await expect(inkEffect).toBeVisible({ timeout: 3000 });

    // ガチャ結果も正常に表示されることを確認
    const overlayResult = overlayPage.locator('#overlay-container.show');
    await expect(overlayResult).toBeVisible({ timeout: 8000 });
  });

  test('統合テスト: 複数の不具合が同時に発生しても正常動作', async () => {
    // ダッシュボードとオーバーレイページを開く
    await dashboardPage.goto('/dashboard');
    await overlayPage.goto('/overlay');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      overlayPage.waitForLoadState('networkidle')
    ]);

    // 演出省略を有効にする
    const skipCheckbox = dashboardPage.locator('[data-testid="skip-animation-checkbox"]');
    await skipCheckbox.check();
    
    // ガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ガチャ演出中にオーバーレイをリロード
    await overlayPage.waitForTimeout(500);
    await overlayPage.reload();
    await overlayPage.waitForLoadState('networkidle');

    // その後ダッシュボードもリロード（復元テスト）
    await dashboardPage.waitForTimeout(1000);
    await dashboardPage.reload();
    
    // 復元ローディングが表示されることを確認
    const loadingOverlay = dashboardPage.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    // 復元完了後、新しいガチャが実行できることを確認
    await expect(loadingOverlay).toBeHidden({ timeout: 5000 });
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // 演出省略が維持されていることを確認
    const isSkipChecked = await skipCheckbox.isChecked();
    expect(isSkipChecked).toBe(true);

    // オーバーレイでインクエフェクトが表示されないことを確認
    await overlayPage.waitForTimeout(2000);
    const inkEffects = overlayPage.locator('[id^="inkSplash"]');
    const visibleInkEffects = await inkEffects.count();
    
    if (visibleInkEffects > 0) {
      const hasVisibleEffect = await inkEffects.first().isVisible();
      expect(hasVisibleEffect).toBe(false);
    }
  });

});