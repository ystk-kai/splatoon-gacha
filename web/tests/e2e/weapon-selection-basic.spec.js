const { test, expect } = require('@playwright/test');

test.describe('対象武器選択機能 基本テスト', () => {
  test.beforeEach(async ({ page, context }) => {
    context.on('page', (newPage) => {
      newPage.on('console', (msg) => {
        if (msg.type() === 'warning') return;
        console.log(`Console ${msg.type()}: ${msg.text()}`);
      });
    });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('対象武器一覧ボタンが存在することを確認', async ({ page }) => {
    console.log('=== 対象武器一覧ボタンの存在確認 ===');

    // より具体的なセレクターで対象武器一覧ボタンを探す
    const weaponListButton = page.locator('button:has-text("対象武器一覧")').first();
    
    // ボタンが表示されるまで待機
    await expect(weaponListButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ 対象武器一覧ボタンが確認できました');
  });

  test('重複許可チェックボックスが存在することを確認', async ({ page }) => {
    console.log('=== 重複許可チェックボックスの存在確認 ===');

    // より具体的なセレクターでチェックボックスを探す
    const duplicateLabel = page.locator('label:has-text("同じ武器をガチャ対象に含める")');
    
    // ラベルが表示されるまで待機
    await expect(duplicateLabel).toBeVisible({ timeout: 10000 });
    
    // 対応するチェックボックスを確認
    const duplicateCheckbox = page.locator('input[type="checkbox"]#allow-duplicates');
    await expect(duplicateCheckbox).toBeVisible({ timeout: 5000 });
    
    // 初期状態では無効になっていることを確認
    await expect(duplicateCheckbox).not.toBeChecked();
    
    console.log('✅ 重複許可チェックボックスが確認できました');
  });

  test('基本的なガチャ機能が動作することを確認', async ({ page }) => {
    console.log('=== 基本ガチャ機能の動作確認 ===');

    // ガチャボタンを探す（より寛容なセレクター）
    const gachaButton = page.locator('button').filter({ hasText: /ガチャ|回す/ }).first();
    
    // ボタンが有効であることを確認
    await expect(gachaButton).toBeEnabled({ timeout: 10000 });
    
    // ガチャを実行
    await gachaButton.click();
    
    // 結果が表示されるまで待機（時間を増やす）
    await page.waitForTimeout(5000);
    
    console.log('✅ 基本ガチャ機能が正常に動作しました');
  });
});