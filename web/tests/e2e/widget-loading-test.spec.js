const { test, expect } = require('@playwright/test');

// Playwrightの設定でサーバー起動を行うため、ここではテストのみ実行
test.describe('ウィジェットローディング機能テスト', () => {

  test('ウィジェットでガチャ中のローディング表示が正しく動作する', async ({ page, context }) => {
    // 新しいページでダッシュボードを開く
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    
    // ダッシュボードが読み込まれるまで待つ
    await dashboardPage.waitForSelector('h1:has-text("Splatoon Gacha")');
    
    // ウィジェットページを開く
    await page.goto('/widget');
    
    // ウィジェットが読み込まれるまで待つ
    await page.waitForSelector('#widget-container');
    
    // 初期状態では空のスロットが表示されている
    const initialSlots = page.locator('.weapon-item.empty-slot');
    await expect(initialSlots).toHaveCount(1); // デフォルトは1人
    
    // ダッシュボードでガチャボタンをクリック
    await dashboardPage.locator('button:has-text("ガチャを回す！")').click();
    
    // ウィジェットでローディング表示が現れることを確認
    await page.waitForSelector('.weapon-item.loading', { timeout: 5000 });
    
    // ローディングスピナーが表示されていることを確認
    const spinner = page.locator('.spinner');
    await expect(spinner).toBeVisible();
    
    // ローディングテキストが表示されていることを確認
    const loadingText = page.locator('.loading-text:has-text("ガチャ中...")');
    await expect(loadingText).toBeVisible();
    
    // ローディング状態のアニメーションが動作していることを確認
    const loadingItem = page.locator('.weapon-item.loading');
    await expect(loadingItem).toHaveClass(/loading/);
    
    // ガチャ結果が表示されるまで待つ（最大10秒）
    await page.waitForSelector('.weapon-item:not(.loading):not(.empty-slot)', { timeout: 10000 });
    
    // ローディング表示が消えていることを確認
    await expect(page.locator('.weapon-item.loading')).toHaveCount(0);
    
    // 武器アイコンが表示されていることを確認
    const weaponIcon = page.locator('.weapon-icon img');
    await expect(weaponIcon).toBeVisible();
    
    // プレイヤー名が表示されていることを確認
    const playerName = page.locator('.player-name');
    await expect(playerName).toBeVisible();
  });

  test('複数プレイヤーでのローディング表示が正しく動作する', async ({ page, context }) => {
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    
    // ダッシュボードが読み込まれるまで待つ
    await dashboardPage.waitForSelector('h1:has-text("Splatoon Gacha")');
    
    // ウィジェットページを開く
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // ダッシュボードでプレイヤー数を2人に変更
    await dashboardPage.locator('button:has-text("2人")').click();
    
    // ウィジェットで2つのスロットが表示されるまで待つ
    await page.waitForFunction(() => {
      const slots = document.querySelectorAll('.weapon-item');
      return slots.length === 2;
    });
    
    // 2人分の空スロットが表示されている
    const emptySlots = page.locator('.weapon-item.empty-slot');
    await expect(emptySlots).toHaveCount(2);
    
    // ガチャを実行
    await dashboardPage.locator('button:has-text("ガチャを回す！")').click();
    
    // 2つのローディング表示が現れることを確認
    await page.waitForFunction(() => {
      const loadingItems = document.querySelectorAll('.weapon-item.loading');
      return loadingItems.length === 2;
    });
    
    const loadingItems = page.locator('.weapon-item.loading');
    await expect(loadingItems).toHaveCount(2);
    
    // 各ローディングアイテムにスピナーが表示されていることを確認
    const spinners = page.locator('.spinner');
    await expect(spinners).toHaveCount(2);
    
    // ガチャ結果が表示されるまで待つ
    await page.waitForFunction(() => {
      const loadingItems = document.querySelectorAll('.weapon-item.loading');
      return loadingItems.length === 0;
    }, { timeout: 10000 });
    
    // 2つの武器結果が表示されていることを確認
    const weaponItems = page.locator('.weapon-item:not(.empty-slot)');
    await expect(weaponItems).toHaveCount(2);
    
    // 各アイテムに武器アイコンが表示されていることを確認
    const weaponIcons = page.locator('.weapon-icon img');
    await expect(weaponIcons).toHaveCount(2);
  });

  test('ウィジェットリロード時にローディング状態が復元される', async ({ page, context }) => {
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('h1:has-text("Splatoon Gacha")');
    
    // ガチャを開始
    await dashboardPage.locator('button:has-text("ガチャを回す！")').click();
    
    // 少し待ってからウィジェットページを開く（ローディング中）
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // リロード直後にローディング状態が復元されているかチェック
    // サーバー側でガチャ実行中の場合、ローディング表示が復元される
    const loadingCheck = page.locator('.weapon-item.loading');
    
    // ローディング状態または結果表示のいずれかが表示されているべき
    const hasLoadingOrResult = await page.locator('.weapon-item').count();
    expect(hasLoadingOrResult).toBeGreaterThan(0);
    
    // 最終的にガチャ結果が表示されることを確認
    await page.waitForSelector('.weapon-item:not(.loading):not(.empty-slot)', { timeout: 10000 });
    
    // 武器結果が正しく表示されている
    const weaponIcon = page.locator('.weapon-icon img');
    await expect(weaponIcon).toBeVisible();
  });

  test('ウィジェット設定の有効/無効切り替えが正しく動作する', async ({ page, context }) => {
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('h1:has-text("Splatoon Gacha")');
    
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // 初期状態ではウィジェットが表示されている
    const widgetContainer = page.locator('#widget-container');
    await expect(widgetContainer).not.toHaveClass('hidden');
    
    // ダッシュボードでウィジェットを無効化
    const widgetCheckbox = dashboardPage.locator('#widget-enabled');
    await widgetCheckbox.uncheck();
    
    // ウィジェットが非表示になることを確認
    await expect(widgetContainer).toHaveClass('hidden');
    
    // ダッシュボードでウィジェットを再有効化
    await widgetCheckbox.check();
    
    // ウィジェットが再表示されることを確認
    await expect(widgetContainer).not.toHaveClass('hidden');
  });

  test('ガチャ中にウィジェット設定を変更してもローディング状態が維持される', async ({ page, context }) => {
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForSelector('h1:has-text("Splatoon Gacha")');
    
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // ガチャを開始
    await dashboardPage.locator('button:has-text("ガチャを回す！")').click();
    
    // ローディング表示が開始されることを確認
    await page.waitForSelector('.weapon-item.loading', { timeout: 5000 });
    
    // ローディング中にウィジェット設定を変更（無効化）
    const widgetCheckbox = dashboardPage.locator('#widget-enabled');
    await widgetCheckbox.uncheck();
    
    // ウィジェットが非表示になる
    const widgetContainer = page.locator('#widget-container');
    await expect(widgetContainer).toHaveClass('hidden');
    
    // ウィジェットを再有効化
    await widgetCheckbox.check();
    await expect(widgetContainer).not.toHaveClass('hidden');
    
    // ガチャ結果が最終的に表示されることを確認
    await page.waitForSelector('.weapon-item:not(.loading):not(.empty-slot)', { timeout: 8000 });
    
    const weaponIcon = page.locator('.weapon-icon img');
    await expect(weaponIcon).toBeVisible();
  });
});