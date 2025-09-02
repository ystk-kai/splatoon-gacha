const { test, expect } = require('@playwright/test');

test.describe('Weapon Shortage Gacha Button Disable Test', () => {
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

  test('武器不足状態でガチャボタンが無効になる（武器モード）', async ({ page }) => {
    console.log('=== 武器不足状態でのガチャボタン無効化テスト ===');
    
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
    
    // すべて解除ボタンをクリック（全武器の選択を解除）
    // モーダル上部の全選択/全解除ボタンを使用
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全解除/ }).first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);
    
    // 武器を2つだけ選択（4人より少ない）
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await weaponItems.first().click();
    await page.waitForTimeout(200);
    await weaponItems.nth(1).click();
    await page.waitForTimeout(200);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 重複許可のチェックボックスが無効になっていることを確認
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 武器不足警告が表示されていることを確認
    const warningMessage = page.getByText(/武器不足/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効になっていることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    // ガチャボタンがグレーアウトスタイルになっていることを確認
    const buttonClass = await gachaButton.getAttribute('class');
    expect(buttonClass).toContain('bg-gray-600');
    expect(buttonClass).toContain('text-gray-400');
    expect(buttonClass).toContain('cursor-not-allowed');
    
    console.log('✅ 武器不足状態でガチャボタンが正しく無効化されていることを確認');
  });

  test('重複許可を有効にすると武器不足でもガチャボタンが有効になる', async ({ page }) => {
    console.log('=== 重複許可有効時のガチャボタン有効化テスト ===');
    
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
    
    // すべて解除ボタンをクリック
    // モーダル上部の全選択/全解除ボタンを使用
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全解除/ }).first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);
    
    // 武器を1つだけ選択（3人より少ない）
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await weaponItems.first().click();
    await page.waitForTimeout(200);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 最初はガチャボタンが無効であることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    // 重複許可チェックボックスをクリック
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await duplicateCheckbox.click();
    await page.waitForTimeout(100);
    
    // ガチャボタンが有効になることを確認
    await expect(gachaButton).toBeEnabled();
    
    // ガチャボタンが通常のスタイルになっていることを確認
    const buttonClass = await gachaButton.getAttribute('class');
    expect(buttonClass).toContain('from-splatoon-orange');
    expect(buttonClass).toContain('to-splatoon-purple');
    expect(buttonClass).not.toContain('bg-gray-600');
    
    console.log('✅ 重複許可有効時にガチャボタンが正しく有効化されていることを確認');
  });

  test('1種選択時の自動重複許可機能でガチャボタンが有効になる', async ({ page }) => {
    console.log('=== 1種選択時の自動重複許可テスト ===');
    
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
    
    // すべて解除ボタンをクリック
    // モーダル上部の全選択/全解除ボタンを使用
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全解除/ }).first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);
    
    // 武器を1つだけ選択
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await weaponItems.first().click();
    await page.waitForTimeout(200);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 重複許可チェックボックスが自動で無効化されていることを確認
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeDisabled();
    
    // 自動重複許可の説明が表示されていることを確認
    const autoAllowMessage = page.getByText(/自動で重複許可/);
    await expect(autoAllowMessage).toBeVisible();
    
    // ガチャボタンが有効であることを確認（自動重複許可により）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    console.log('✅ 1種選択時の自動重複許可機能が正しく動作していることを確認');
  });

  test('武器0種選択時にガチャボタンが無効になる', async ({ page }) => {
    console.log('=== 武器0種選択時のガチャボタン無効化テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // すべて解除ボタンをクリック（全武器の選択を解除）
    // モーダル上部の全選択/全解除ボタンを使用
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全解除/ }).first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 武器未選択の警告が表示されていることを確認
    const warningMessage = page.getByText(/武器未選択/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効になっていることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    console.log('✅ 武器0種選択時にガチャボタンが正しく無効化されていることを確認');
  });

  test('サブモードでもガチャボタンの無効化が動作する', async ({ page }) => {
    console.log('=== サブモードでのガチャボタン無効化テスト ===');
    
    // サブモードを選択
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(1000);
    
    // 4人に設定
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(100);
    
    // 最初は有効なサブ武器が選択されているため、ガチャボタンは有効
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // すべて解除ボタンをクリック
    // モーダル上部の全選択/全解除ボタンを使用
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全解除/ }).first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);
    
    // 武器を2つだけ選択（4人より少ない）
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await weaponItems.first().click();
    await page.waitForTimeout(200);
    await weaponItems.nth(1).click();
    await page.waitForTimeout(200);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 武器不足状態でガチャボタンが無効になることを確認
    await expect(gachaButton).toBeDisabled();
    
    console.log('✅ サブモードでもガチャボタン無効化が正しく動作していることを確認');
  });
});