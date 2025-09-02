const { test, expect } = require('@playwright/test');

// ウィジェットの再ガチャ時表示ロジックを詳細に検証するPlaywrightテスト

test.describe('ウィジェット 再ガチャ表示ロジック 詳細E2Eテスト', () => {

  test('再ガチャ時に選択されたプレイヤーのみローディング、非選択プレイヤーは元の武器を表示', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    // ダッシュボードとウィジェットページを開く
    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // プレイヤー数を4人に設定
    const playerCountInput = dashboardPage.locator('[data-testid="player-count-input"]');
    await playerCountInput.fill('4');
    await dashboardPage.waitForTimeout(1000);

    // プレイヤー名を設定
    const playerNames = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];
    for (let i = 0; i < 4; i++) {
      const nameInput = dashboardPage.locator(`[data-testid="player-name-${i}"]`);
      await nameInput.fill(playerNames[i]);
    }
    await dashboardPage.waitForTimeout(1000);

    // 最初のガチャを実行して全員に武器を配布
    console.log('Step 1: Initial gacha for all players');
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // ウィジェットで4つの武器が表示されることを確認
    await widgetPage.waitForTimeout(2000);
    const initialWeaponItems = widgetPage.locator('.weapon-item:not(.empty-slot)');
    await expect(initialWeaponItems).toHaveCount(4);

    // 各プレイヤーの武器画像URLを記録（後で比較用）
    const initialWeaponUrls = [];
    for (let i = 0; i < 4; i++) {
      const weaponImg = widgetPage.locator('.weapon-item').nth(i).locator('.weapon-icon img');
      const weaponSrc = await weaponImg.getAttribute('src');
      initialWeaponUrls.push(weaponSrc);
      console.log(`Player ${i + 1} initial weapon: ${weaponSrc}`);
    }

    console.log('Step 2: Select specific players for re-gacha (1st and 3rd players)');
    
    // 1番目と3番目のプレイヤーを選択
    const firstPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-0"]');
    const thirdPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-2"]');
    await firstPlayerCheckbox.check();
    await thirdPlayerCheckbox.check();

    // 再ガチャを実行
    await dashboardPage.click('[data-testid="re-gacha-button"]');
    
    console.log('Step 3: Verify loading state and weapon display during re-gacha');
    
    // 少し待ってローディング状態を確認
    await widgetPage.waitForTimeout(1500);
    
    // 各プレイヤーの状態を個別に確認
    const allItems = widgetPage.locator('.weapon-item');
    
    // 1番目のプレイヤー: ローディング状態
    const firstItemClass = await allItems.nth(0).getAttribute('class');
    expect(firstItemClass).toContain('loading');
    
    // 1番目のプレイヤー名が表示されていることを確認
    const firstPlayerNameText = await allItems.nth(0).locator('.player-name').textContent();
    expect(firstPlayerNameText).toBe('プレイヤー1');
    
    // 2番目のプレイヤー: 元の武器を表示（ローディングではない）
    const secondItemClass = await allItems.nth(1).getAttribute('class');
    expect(secondItemClass).not.toContain('loading');
    expect(secondItemClass).not.toContain('empty-slot');
    
    // 2番目のプレイヤーの武器画像が変わっていないことを確認
    const secondWeaponImg = allItems.nth(1).locator('.weapon-icon img');
    const secondWeaponSrc = await secondWeaponImg.getAttribute('src');
    expect(secondWeaponSrc).toBe(initialWeaponUrls[1]);
    console.log(`Player 2 weapon unchanged: ${secondWeaponSrc}`);
    
    // 3番目のプレイヤー: ローディング状態
    const thirdItemClass = await allItems.nth(2).getAttribute('class');
    expect(thirdItemClass).toContain('loading');
    
    // 3番目のプレイヤー名が表示されていることを確認
    const thirdPlayerNameText = await allItems.nth(2).locator('.player-name').textContent();
    expect(thirdPlayerNameText).toBe('プレイヤー3');
    
    // 4番目のプレイヤー: 元の武器を表示（ローディングではない）
    const fourthItemClass = await allItems.nth(3).getAttribute('class');
    expect(fourthItemClass).not.toContain('loading');
    expect(fourthItemClass).not.toContain('empty-slot');
    
    // 4番目のプレイヤーの武器画像が変わっていないことを確認
    const fourthWeaponImg = allItems.nth(3).locator('.weapon-icon img');
    const fourthWeaponSrc = await fourthWeaponImg.getAttribute('src');
    expect(fourthWeaponSrc).toBe(initialWeaponUrls[3]);
    console.log(`Player 4 weapon unchanged: ${fourthWeaponSrc}`);

    console.log('Step 4: Wait for re-gacha completion and verify final state');
    
    // 再ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // 完了後の状態を確認
    await widgetPage.waitForTimeout(2000);
    
    // 全員がローディング状態でなくなることを確認
    const finalItems = widgetPage.locator('.weapon-item');
    for (let i = 0; i < 4; i++) {
      const itemClass = await finalItems.nth(i).getAttribute('class');
      expect(itemClass).not.toContain('loading');
      expect(itemClass).not.toContain('empty-slot');
    }
    
    // 1番目と3番目の武器は変わっている可能性がある（再ガチャ対象）
    const finalFirstWeaponSrc = await finalItems.nth(0).locator('.weapon-icon img').getAttribute('src');
    const finalThirdWeaponSrc = await finalItems.nth(2).locator('.weapon-icon img').getAttribute('src');
    console.log(`Player 1 final weapon: ${finalFirstWeaponSrc} (was: ${initialWeaponUrls[0]})`);
    console.log(`Player 3 final weapon: ${finalThirdWeaponSrc} (was: ${initialWeaponUrls[2]})`);
    
    // 2番目と4番目の武器は変わっていないことを確認（非選択プレイヤー）
    const finalSecondWeaponSrc = await finalItems.nth(1).locator('.weapon-icon img').getAttribute('src');
    const finalFourthWeaponSrc = await finalItems.nth(3).locator('.weapon-icon img').getAttribute('src');
    expect(finalSecondWeaponSrc).toBe(initialWeaponUrls[1]);
    expect(finalFourthWeaponSrc).toBe(initialWeaponUrls[3]);
    console.log(`Player 2 weapon still: ${finalSecondWeaponSrc}`);
    console.log(`Player 4 weapon still: ${finalFourthWeaponSrc}`);

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('通常ガチャ時は全員がローディング状態になる', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

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

    console.log('Normal gacha test: All players should be in loading state');
    
    // 通常ガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    
    // ローディング状態を確認
    await widgetPage.waitForTimeout(1000);
    
    // 全てのプレイヤーがローディング状態になることを確認
    const allItems = widgetPage.locator('.weapon-item');
    for (let i = 0; i < 3; i++) {
      const itemClass = await allItems.nth(i).getAttribute('class');
      expect(itemClass).toContain('loading');
      
      // スピナーが表示されていることを確認
      const spinner = allItems.nth(i).locator('.spinner');
      await expect(spinner).toBeVisible();
    }

    // ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('再ガチャでプレイヤーを1人だけ選択した場合の表示確認', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

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
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // 中央のプレイヤー（2番目）のみを選択して再ガチャ
    const secondPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-1"]');
    await secondPlayerCheckbox.check();

    await dashboardPage.click('[data-testid="re-gacha-button"]');
    
    // ローディング状態を確認
    await widgetPage.waitForTimeout(1500);
    
    const allItems = widgetPage.locator('.weapon-item');
    
    // 1番目: 通常表示（武器あり）
    const firstItemClass = await allItems.nth(0).getAttribute('class');
    expect(firstItemClass).not.toContain('loading');
    expect(firstItemClass).not.toContain('empty-slot');
    
    // 2番目: ローディング状態
    const secondItemClass = await allItems.nth(1).getAttribute('class');
    expect(secondItemClass).toContain('loading');
    
    // 3番目: 通常表示（武器あり）
    const thirdItemClass = await allItems.nth(2).getAttribute('class');
    expect(thirdItemClass).not.toContain('loading');
    expect(thirdItemClass).not.toContain('empty-slot');

    // 再ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

  test('全プレイヤー選択での再ガチャは通常ガチャと同じ表示', async ({ context }) => {
    const dashboardPage = await context.newPage();
    const widgetPage = await context.newPage();

    await dashboardPage.goto('/dashboard');
    await widgetPage.goto('/widget');
    
    await Promise.all([
      dashboardPage.waitForLoadState('networkidle'),
      widgetPage.waitForLoadState('networkidle')
    ]);

    // プレイヤー数を2人に設定
    const playerCountInput = dashboardPage.locator('[data-testid="player-count-input"]');
    await playerCountInput.fill('2');
    await dashboardPage.waitForTimeout(1000);

    // 最初のガチャを実行
    await dashboardPage.click('[data-testid="random-gacha-button"]');
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    // 全プレイヤーを選択
    const firstPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-0"]');
    const secondPlayerCheckbox = dashboardPage.locator('[data-testid="player-checkbox-1"]');
    await firstPlayerCheckbox.check();
    await secondPlayerCheckbox.check();

    await dashboardPage.click('[data-testid="re-gacha-button"]');
    
    // 全員がローディング状態になることを確認
    await widgetPage.waitForTimeout(1000);
    
    const allItems = widgetPage.locator('.weapon-item');
    for (let i = 0; i < 2; i++) {
      const itemClass = await allItems.nth(i).getAttribute('class');
      expect(itemClass).toContain('loading');
    }

    // 再ガチャ完了を待つ
    await expect(dashboardPage.locator('[data-testid="gacha-spinner"]')).toBeHidden({ timeout: 10000 });

    await dashboardPage.close();
    await widgetPage.close();
  });

});