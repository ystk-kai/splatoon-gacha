const { test, expect } = require('@playwright/test');

test.describe('最終検証：新仕様での武器不足制御', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // より緩いタイムアウト設定
    await page.waitForTimeout(5000);
  });

  test('1人設定1武器選択：有効', async ({ page }) => {
    console.log('=== 1人1武器：有効テスト ===');
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 1人選択
    await page.click('button:has-text("1人")');
    await page.waitForTimeout(1000);
    
    // 武器選択リストを開く
    await page.click('button:has-text("対象武器")');
    await page.waitForTimeout(2000);
    
    // 全選択解除
    try {
      await page.click('button:has-text("全選択解除")', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('全選択解除実行');
    } catch (e) {
      console.log('全選択解除ボタンなし、スキップ');
    }
    
    // 最初の武器を選択
    await page.click('div.cursor-pointer', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // リスト閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(2000);
    
    // ガチャボタン状態確認
    const gachaButton = page.locator('[data-testid="random-gacha-button"]');
    const isEnabled = await gachaButton.isEnabled({ timeout: 3000 });
    
    console.log(`1人1武器：ボタン有効=${isEnabled}`);
    expect(isEnabled).toBe(true);
  });

  test('2人設定1武器選択：無効', async ({ page }) => {
    console.log('=== 2人1武器：無効テスト ===');
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 2人選択
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(1000);
    
    // 武器選択リストを開く
    await page.click('button:has-text("対象武器")');
    await page.waitForTimeout(2000);
    
    // 全選択解除
    try {
      await page.click('button:has-text("全選択解除")', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('全選択解除実行');
    } catch (e) {
      console.log('全選択解除ボタンなし、スキップ');
    }
    
    // 最初の武器を選択
    await page.click('div.cursor-pointer', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // リスト閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(2000);
    
    // ガチャボタン状態確認
    const gachaButton = page.locator('[data-testid="random-gacha-button"]');
    const isEnabled = await gachaButton.isEnabled({ timeout: 3000 });
    
    console.log(`2人1武器：ボタン有効=${isEnabled}`);
    expect(isEnabled).toBe(false);
  });

  test('3人設定1武器選択：無効', async ({ page }) => {
    console.log('=== 3人1武器：無効テスト ===');
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 3人選択
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(1000);
    
    // 武器選択リストを開く
    await page.click('button:has-text("対象武器")');
    await page.waitForTimeout(2000);
    
    // 全選択解除
    try {
      await page.click('button:has-text("全選択解除")', { timeout: 3000 });
      await page.waitForTimeout(1000);
      console.log('全選択解除実行');
    } catch (e) {
      console.log('全選択解除ボタンなし、スキップ');
    }
    
    // 最初の武器を選択
    await page.click('div.cursor-pointer', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // リスト閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(2000);
    
    // ガチャボタン状態確認
    const gachaButton = page.locator('[data-testid="random-gacha-button"]');
    const isEnabled = await gachaButton.isEnabled({ timeout: 3000 });
    
    console.log(`3人1武器：ボタン有効=${isEnabled}`);
    expect(isEnabled).toBe(false);
  });
});