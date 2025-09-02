const { test, expect } = require('@playwright/test');

test.describe('Auto Duplicate Restriction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
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

  test('ダッシュボード: 武器モードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== 武器モード自動重複許可テスト ===');
    
    // 確実に武器モードを選択するために、他のモードに切り替えてから武器モードに戻す
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 重複許可チェックボックスが無効化されていることを確認（自動重複許可）
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 武器モード自動重複許可動作確認完了');
  });

  test('ダッシュボード: サブモードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== サブモード自動重複許可テスト ===');
    
    // サブモードを選択
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(1000);
    
    // 重複許可チェックボックスが無効化されていることを確認（自動重複許可）
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ サブモード自動重複許可動作確認完了');
  });

  test('ダッシュボード: スペシャルモードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== スペシャルモード自動重複許可テスト ===');
    
    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 重複許可チェックボックスが無効化されていることを確認（自動重複許可）
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ スペシャルモード自動重複許可動作確認完了');
  });

  test('ダッシュボード: 武器種別モードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== 武器種別モード自動重複許可テスト ===');
    
    // 武器種別モードを選択
    await page.click('button:has-text("武器種別")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 重複許可チェックボックスが無効化されていることを確認（自動重複許可）
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 武器種別モード自動重複許可動作確認完了');
  });

  test('ダッシュボード: 武器モードで重複許可を有効にすると1武器選択時でもガチャ可能', async ({ page }) => {
    console.log('=== 武器モード重複許可有効時動作テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // 武器を2つ選択
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await weaponItems.first().click();
    await page.waitForTimeout(500);
    await weaponItems.nth(1).click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 最初はガチャボタンが無効（武器不足）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    // 重複許可チェックボックスをクリック
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await duplicateCheckbox.click();
    await page.waitForTimeout(100);
    
    // ガチャボタンが有効になる
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 武器モード重複許可有効時動作確認完了');
  });
});

test.describe('Viewer Auto Duplicate Restriction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 視聴者画面ページに移動
    await page.goto('/viewer');
    
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

  test('視聴者画面: 武器モードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== 視聴者画面武器モード自動重複許可テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 視聴者画面武器モード自動重複許可動作確認完了');
  });

  test('視聴者画面: サブモードで2人設定1武器選択時の自動重複許可が動作する', async ({ page }) => {
    console.log('=== 視聴者画面サブモード自動重複許可テスト ===');
    
    // サブモードを選択
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 視聴者画面サブモード自動重複許可動作確認完了');
  });
  
});

test.describe('Dashboard Weapon Shortage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
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

  test('ダッシュボード: 4人設定1武器選択時はガチャボタンが無効になる', async ({ page }) => {
    console.log('=== 4人設定1武器選択武器不足テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 4人に設定
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // スプラシューターを1つだけ選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(1000);
    
    // 武器不足警告が表示されていることを確認
    const warningMessage = page.getByText(/武器不足/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効であることを確認（4人設定では1武器では不足）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    console.log('✅ 4人設定1武器選択武器不足確認完了');
  });

  test('ダッシュボード: 武器0個選択時はガチャボタンが無効になる', async ({ page }) => {
    console.log('=== 武器0個選択時テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // モーダルを閉じる（0武器選択状態）
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(1000);
    
    // 武器未選択警告が表示されていることを確認
    const warningMessage = page.getByText(/武器未選択|武器を選択/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効であることを確認（0武器選択は必ず無効）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    console.log('✅ 武器0個選択時確認完了');
  });

  test('ダッシュボード: 3人設定2武器選択時は武器不足でガチャボタンが無効になる', async ({ page }) => {
    console.log('=== 3人設定2武器選択武器不足テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // 2つの武器を選択
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /スプラシューター|わかばシューター/ });
    await weaponItems.first().click();
    await page.waitForTimeout(200);
    await weaponItems.nth(1).click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(1000);
    
    // 武器不足警告が表示されていることを確認
    const warningMessage = page.getByText(/武器不足/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効であることを確認（3人に対して2武器では不足）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    console.log('✅ 3人設定2武器選択武器不足確認完了');
  });
});