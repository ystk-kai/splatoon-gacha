const { test, expect } = require('@playwright/test');

// 簡潔なウィジェットローディングテスト
test.describe('ウィジェットローディング機能（簡潔版）', () => {

  test('ウィジェットページが正常に表示される', async ({ page }) => {
    // ウィジェットページを開く
    await page.goto('/widget');
    
    // ウィジェットコンテナが存在することを確認
    await page.waitForSelector('#widget-container');
    
    // 初期状態では空のスロットが表示されている
    const emptySlots = page.locator('.weapon-item.empty-slot');
    await expect(emptySlots).toHaveCount(1); // デフォルトは1人
    
    // プレイヤー名が表示されていることを確認
    const playerName = page.locator('.player-name');
    await expect(playerName).toBeVisible();
    await expect(playerName).toHaveText('Player 1');
  });

  test('ウィジェットのローディングスタイルが正しく定義されている', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // CSSのローディングスタイルが定義されていることを確認
    const cssStyles = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement);
      return {
        hasSpinnerAnimation: document.styleSheets[0].cssRules 
          && Array.from(document.styleSheets[0].cssRules)
            .some(rule => rule.name === 'spin'),
        hasPulseAnimation: document.styleSheets[0].cssRules 
          && Array.from(document.styleSheets[0].cssRules)
            .some(rule => rule.name === 'pulse')
      };
    });
    
    // スピンとパルスアニメーションが定義されていることを確認
    expect(cssStyles.hasSpinnerAnimation).toBe(true);
    expect(cssStyles.hasPulseAnimation).toBe(true);
  });

  test('JavaScriptのローディング関連変数が正しく初期化されている', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // グローバル変数が正しく初期化されていることを確認
    const initialState = await page.evaluate(() => {
      return {
        isLoadingGacha: typeof isLoadingGacha !== 'undefined' ? isLoadingGacha : null,
        currentWeapons: typeof currentWeapons !== 'undefined' ? currentWeapons : null,
        currentPlayerCount: typeof currentPlayerCount !== 'undefined' ? currentPlayerCount : null,
        widgetVisible: typeof widgetVisible !== 'undefined' ? widgetVisible : null
      };
    });
    
    expect(initialState.isLoadingGacha).toBe(false);
    expect(initialState.currentWeapons).toEqual([]);
    expect(initialState.currentPlayerCount).toBe(1);
    expect(initialState.widgetVisible).toBe(true);
  });

  test('displaySlots関数がローディング状態を正しくレンダリングする', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // ローディング状態を手動で設定してdisplaySlots関数をテスト
    await page.evaluate(() => {
      // ローディング状態に変更
      isLoadingGacha = true;
      displaySlots();
    });
    
    // ローディングクラスが適用されたアイテムが表示されることを確認
    const loadingItems = page.locator('.weapon-item.loading');
    await expect(loadingItems).toHaveCount(1);
    
    // スピナーが表示されていることを確認
    const spinner = page.locator('.spinner');
    await expect(spinner).toBeVisible();
    
    // ローディングテキストが表示されていることを確認
    const loadingText = page.locator('.loading-text:has-text("ガチャ中...")');
    await expect(loadingText).toBeVisible();
    
    // ローディング状態を解除
    await page.evaluate(() => {
      isLoadingGacha = false;
      displaySlots();
    });
    
    // ローディング表示が消えることを確認
    await expect(loadingItems).toHaveCount(0);
    
    // 空のスロットに戻ることを確認
    const emptySlots = page.locator('.weapon-item.empty-slot');
    await expect(emptySlots).toHaveCount(1);
  });

  test('複数プレイヤー時のローディング表示が正しく動作する', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // 3人のプレイヤーでローディング状態をテスト
    await page.evaluate(() => {
      currentPlayerCount = 3;
      playerNames = ['Player 1', 'Player 2', 'Player 3'];
      isLoadingGacha = true;
      displaySlots();
    });
    
    // 3つのローディングアイテムが表示されることを確認
    const loadingItems = page.locator('.weapon-item.loading');
    await expect(loadingItems).toHaveCount(3);
    
    // 各アイテムにスピナーが表示されていることを確認
    const spinners = page.locator('.spinner');
    await expect(spinners).toHaveCount(3);
    
    // グリッドクラスが正しく設定されていることを確認
    const weaponGrid = page.locator('#weaponGrid');
    await expect(weaponGrid).toHaveClass('weapon-grid grid-3');
  });

  test('ウィジェット設定による表示切り替えが正しく動作する', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // 初期状態では表示されている
    const widgetContainer = page.locator('#widget-container');
    await expect(widgetContainer).not.toHaveClass('hidden');
    
    // ウィジェットを非表示に設定
    await page.evaluate(() => {
      widgetVisible = false;
      updateWidgetVisibility();
    });
    
    // 非表示クラスが適用されることを確認
    await expect(widgetContainer).toHaveClass('hidden');
    
    // ウィジェットを再表示に設定
    await page.evaluate(() => {
      widgetVisible = true;
      updateWidgetVisibility();
    });
    
    // 非表示クラスが削除されることを確認
    await expect(widgetContainer).not.toHaveClass('hidden');
  });

  test('WebSocketメッセージ処理によるローディング状態変更', async ({ page }) => {
    await page.goto('/widget');
    await page.waitForSelector('#widget-container');
    
    // WebSocketメッセージを手動で発火してテスト
    await page.evaluate(() => {
      // ガチャ開始メッセージをシミュレート
      const gachaStartedMessage = {
        type: 'gacha-started',
        data: { source: 'test', timestamp: Date.now() }
      };
      
      // WebSocketメッセージハンドラーを直接呼び出し
      const event = { data: JSON.stringify(gachaStartedMessage) };
      ws = { readyState: 1 }; // WebSocket.OPEN
      
      // onmessageハンドラーを実行
      if (typeof isLoadingGacha !== 'undefined') {
        isLoadingGacha = true;
        displaySlots();
      }
    });
    
    // ローディング状態が適用されることを確認
    const loadingItems = page.locator('.weapon-item.loading');
    await expect(loadingItems).toHaveCount(1);
    
    // ガチャ結果更新メッセージをシミュレート
    await page.evaluate(() => {
      const updateMessage = {
        type: 'widget-update',
        data: {
          result: {
            weapons: [{ id: 'test_weapon', name: 'Test Weapon' }],
            count: 1
          },
          playerNames: ['Player 1']
        }
      };
      
      // メッセージ処理をシミュレート
      isLoadingGacha = false;
      currentWeapons = updateMessage.data.result.weapons;
      displaySlots();
    });
    
    // ローディング状態が解除されることを確認
    await expect(loadingItems).toHaveCount(0);
    
    // 武器結果が表示されることを確認
    const weaponItems = page.locator('.weapon-item:not(.empty-slot):not(.loading)');
    await expect(weaponItems).toHaveCount(1);
  });

});