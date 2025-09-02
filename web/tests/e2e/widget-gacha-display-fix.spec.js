const { test, expect } = require('@playwright/test');

// ウィジェットのガチャ中演出修正を検証するPlaywrightテスト

test.describe('ウィジェット ガチャ演出修正 E2Eテスト', () => {

  test('修正1: ガチャ中の背景がガチャ結果と同じ背景になる', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // ウィジェットが表示されることを確認
    const widgetContainer = widgetPage.locator('#widget-container');
    await expect(widgetContainer).toBeVisible();

    // ガチャを開始
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ウィジェットでローディング状態を確認
    await widgetPage.waitForTimeout(1000);
    const loadingItems = widgetPage.locator('.weapon-item.loading');
    await expect(loadingItems.first()).toBeVisible();

    // ローディング中の背景色を確認（通常の黒背景）
    const loadingItemStyle = await loadingItems.first().evaluate(element => {
      const computedStyle = window.getComputedStyle(element);
      return {
        backgroundColor: computedStyle.backgroundColor,
        border: computedStyle.border
      };
    });

    // rgba(0, 0, 0, 0.8) の背景色を確認
    expect(loadingItemStyle.backgroundColor).toContain('rgba(0, 0, 0, 0.8)');
    
    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('修正2: 再ガチャ時に選択されたプレイヤーのみがローディング状態になる', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // プレイヤー数を3人に設定
    const playerCountInput = dashboardPage.locator('[data-testid="player-count-input"]');
    await playerCountInput.fill('3');
    await dashboardPage.waitForTimeout(1000);

    // 最初のガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // ウィジェットで3つの武器が表示されることを確認
    const weaponItems = widgetPage.locator('.weapon-item:not(.empty-slot)');
    await expect(weaponItems).toHaveCount(3);

    // 1番目と3番目のプレイヤーを選択して再ガチャ
    const firstPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-0"]');
    const thirdPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-2"]');
    await firstPlayerCheckbox.check();
    await thirdPlayerCheckbox.check();

    // 再ガチャボタンをクリック
    await dashboardPage.click('[data-testid="re-gacha-button"]');
    
    // ウィジェット側で選択したプレイヤーのみがローディング状態になることを確認
    await widgetPage.waitForTimeout(1500);
    
    // ローディング状態のアイテムを取得
    const allItems = widgetPage.locator('.weapon-item');
    
    // 各アイテムの状態を個別に確認
    const firstItemClass = await allItems.nth(0).getAttribute('class');
    const secondItemClass = await allItems.nth(1).getAttribute('class');
    const thirdItemClass = await allItems.nth(2).getAttribute('class');
    
    // 1番目と3番目がローディング状態、2番目は通常状態
    expect(firstItemClass).toContain('loading');
    expect(secondItemClass).not.toContain('loading');
    expect(thirdItemClass).toContain('loading');

    // 再ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('修正3: ガチャ中の文字が「ガチャ中...」ではなくプレイヤー名になる', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // プレイヤー名を設定
    const playerNameInput = dashboardPage.locator('[data-testid="player-name-0"]');
    await playerNameInput.fill('テストプレイヤー1');
    await dashboardPage.waitForTimeout(1000);

    // ガチャを開始
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ウィジェットでローディング状態を確認
    await widgetPage.waitForTimeout(1000);
    const loadingItem = widgetPage.locator('.weapon-item.loading');
    await expect(loadingItem).toBeVisible();

    // プレイヤー名が表示されることを確認（「ガチャ中...」ではない）
    const playerNameElement = loadingItem.locator('.player-name');
    const playerNameText = await playerNameElement.textContent();
    
    expect(playerNameText).toBe('テストプレイヤー1');
    expect(playerNameText).not.toBe('ガチャ中...');

    // 文字色が白色であることを確認
    const playerNameStyle = await playerNameElement.evaluate(element => {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle.color;
    });

    // 白色またはrgb(255, 255, 255)であることを確認
    expect(playerNameStyle).toMatch(/(white|rgb\(255,\s*255,\s*255\))/);

    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('修正4: スピナーアイコンが正常に表示される', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // ガチャを開始
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ウィジェットでローディング状態を確認
    await widgetPage.waitForTimeout(1000);
    const loadingItem = widgetPage.locator('.weapon-item.loading');
    await expect(loadingItem).toBeVisible();

    // スピナーアイコンが表示されることを確認
    const spinner = loadingItem.locator('.spinner');
    await expect(spinner).toBeVisible();

    // スピナーのスタイルを確認（回転アニメーション）
    const spinnerStyle = await spinner.evaluate(element => {
      const computedStyle = window.getComputedStyle(element);
      return {
        borderTopColor: computedStyle.borderTopColor,
        borderRadius: computedStyle.borderRadius,
        animation: computedStyle.animation
      };
    });

    // 円形のスピナーであることを確認
    expect(spinnerStyle.borderRadius).toBe('50%');
    // 回転アニメーションが設定されていることを確認
    expect(spinnerStyle.animation).toContain('spin');

    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('統合テスト: すべての修正が同時に動作する', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // プレイヤー数を2人に設定し、名前を設定
    const playerCountInput = dashboardPage.locator('[data-testid="player-count-input"]');
    await playerCountInput.fill('2');
    await dashboardPage.waitForTimeout(500);

    const playerName1 = dashboardPage.locator('[data-testid="player-name-0"]');
    const playerName2 = dashboardPage.locator('[data-testid="player-name-1"]');
    await playerName1.fill('プレイヤー1');
    await playerName2.fill('プレイヤー2');
    await dashboardPage.waitForTimeout(1000);

    // 最初のガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ウィジェットで両プレイヤーがローディング状態になることを確認
    await widgetPage.waitForTimeout(1000);
    
    let loadingItems = widgetPage.locator('.weapon-item.loading');
    await expect(loadingItems).toHaveCount(2);

    // 各ローディングアイテムの状態を確認
    const firstLoadingItem = loadingItems.first();
    const secondLoadingItem = loadingItems.nth(1);

    // 背景色確認
    const firstItemBg = await firstLoadingItem.evaluate(element => 
      window.getComputedStyle(element).backgroundColor
    );
    expect(firstItemBg).toContain('rgba(0, 0, 0, 0.8)');

    // プレイヤー名表示確認
    const firstName = await firstLoadingItem.locator('.player-name').textContent();
    const secondName = await secondLoadingItem.locator('.player-name').textContent();
    expect(firstName).toBe('プレイヤー1');
    expect(secondName).toBe('プレイヤー2');

    // スピナー表示確認
    await expect(firstLoadingItem.locator('.spinner')).toBeVisible();
    await expect(secondLoadingItem.locator('.spinner')).toBeVisible();

    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // 2番目のプレイヤーのみ選択して再ガチャ
    const secondPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-1"]');
    await secondPlayerCheckbox.check();

    // 再ガチャを実行
    await dashboardPage.click('[data-testid="re-gacha-button"]');
    
    // 2番目のプレイヤーのみがローディング状態になることを確認
    await widgetPage.waitForTimeout(1500);
    
    loadingItems = widgetPage.locator('.weapon-item.loading');
    const normalItems = widgetPage.locator('.weapon-item:not(.loading):not(.empty-slot)');
    
    await expect(loadingItems).toHaveCount(1);
    await expect(normalItems).toHaveCount(1);

    // ローディング中のプレイヤー名確認
    const reGachaPlayerName = await loadingItems.first().locator('.player-name').textContent();
    expect(reGachaPlayerName).toBe('プレイヤー2');

    // 再ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

});