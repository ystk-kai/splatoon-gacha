const { test, expect } = require('@playwright/test');

test.describe('Player Count Button Disable During Gacha', () => {
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

  test('ガチャ演出中は人数選択ボタンが無効になる', async ({ page }) => {
    console.log('=== ガチャ演出中の人数選択ボタン無効化テスト ===');
    
    // 初期状態で1人に設定
    await page.click('button:has-text("1人")');
    await page.waitForTimeout(100);
    
    // 人数選択ボタンが有効であることを確認
    const button2 = page.locator('button:has-text("2人")');
    const button3 = page.locator('button:has-text("3人")');
    const button4 = page.locator('button:has-text("4人")');
    
    await expect(button2).toBeEnabled();
    await expect(button3).toBeEnabled();
    await expect(button4).toBeEnabled();
    
    console.log('ガチャ前: 人数選択ボタンが有効であることを確認');
    
    // ガチャボタンをクリック
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await gachaButton.click();
    
    // ガチャが開始されたことを確認（ボタンテキストが変わる）
    await page.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    console.log('ガチャ開始: ガチャボタンが"ガチャ中..."に変化');
    
    // 人数選択ボタンが無効になっていることを確認
    await expect(button2).toBeDisabled();
    await expect(button3).toBeDisabled(); 
    await expect(button4).toBeDisabled();
    
    console.log('ガチャ中: 人数選択ボタンが無効化されていることを確認');
    
    // ガチャ完了まで待機（ガチャボタンが元に戻るまで）
    await page.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    console.log('ガチャ完了: ガチャボタンが"ガチャを回す！"に戻った');
    
    // 人数選択ボタンが再び有効になっていることを確認
    await expect(button2).toBeEnabled();
    await expect(button3).toBeEnabled();
    await expect(button4).toBeEnabled();
    
    console.log('ガチャ後: 人数選択ボタンが再び有効化されていることを確認');
    
    // 実際に人数選択が動作することを確認
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    const button2Selected = page.locator('button:has-text("2人")');
    await expect(button2Selected).toHaveClass(/from-splatoon-orange/);
    
    console.log('✅ ガチャ演出中の人数選択ボタン無効化テスト完了');
  });

  test('ガチャ中の人数選択ボタンの視覚的変化を確認', async ({ page }) => {
    console.log('=== 人数選択ボタンの視覚的変化テスト ===');
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    const button1 = page.locator('button:has-text("1人")');
    const button3 = page.locator('button:has-text("3人")');
    
    // ガチャ前のクラス名を確認（通常の背景色）
    const beforeClass1 = await button1.getAttribute('class');
    const beforeClass3 = await button3.getAttribute('class');
    
    console.log('ガチャ前のボタンクラス確認完了');
    
    // ガチャを開始
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await gachaButton.click();
    
    // ガチャ中になるまで待機
    await page.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    
    // ガチャ中のクラス名を確認（グレーアウト）
    const duringClass1 = await button1.getAttribute('class');
    const duringClass3 = await button3.getAttribute('class');
    
    // グレーアウトスタイルが適用されていることを確認
    expect(duringClass1).toContain('bg-gray-600');
    expect(duringClass1).toContain('text-gray-400');
    expect(duringClass1).toContain('cursor-not-allowed');
    
    expect(duringClass3).toContain('bg-gray-600');
    expect(duringClass3).toContain('text-gray-400');
    expect(duringClass3).toContain('cursor-not-allowed');
    
    console.log('ガチャ中: ボタンがグレーアウトスタイルで表示されていることを確認');
    
    // ガチャ完了まで待機
    await page.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    
    // ガチャ後のクラス名を確認（元に戻っている）
    const afterClass1 = await button1.getAttribute('class');
    const afterClass3 = await button3.getAttribute('class');
    
    // グレーアウトスタイルが解除されていることを確認
    expect(afterClass1).not.toContain('bg-gray-600');
    expect(afterClass1).not.toContain('cursor-not-allowed');
    
    expect(afterClass3).not.toContain('bg-gray-600');
    expect(afterClass3).not.toContain('cursor-not-allowed');
    
    console.log('✅ ガチャ後: ボタンスタイルが元に戻っていることを確認');
  });

  test('再ガチャ中も人数選択ボタンが無効になる', async ({ page }) => {
    console.log('=== 再ガチャ中の人数選択ボタン無効化テスト ===');
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    // 初回ガチャを実行
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await gachaButton.click();
    
    // ガチャ完了まで待機
    await page.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // プレイヤーを選択
    const weaponCards = page.locator('[class*="bg-gray-900"][class*="cursor-pointer"]');
    const firstCard = weaponCards.first();
    await firstCard.click();
    await page.waitForTimeout(100);
    
    // 再ガチャボタンを探してクリック
    const reGachaButton = page.locator('button').filter({ hasText: /再ガチャ/ });
    await reGachaButton.click();
    
    // 再ガチャ中になるまで待機
    await page.waitForSelector('button:has-text("再ガチャ中...")', { timeout: 5000 });
    console.log('再ガチャ開始: 再ガチャボタンが"再ガチャ中..."に変化');
    
    // 再ガチャ中も人数選択ボタンが無効になっていることを確認
    const button1 = page.locator('button:has-text("1人")');
    const button3 = page.locator('button:has-text("3人")');
    const button4 = page.locator('button:has-text("4人")');
    
    await expect(button1).toBeDisabled();
    await expect(button3).toBeDisabled();
    await expect(button4).toBeDisabled();
    
    console.log('再ガチャ中: 人数選択ボタンが無効化されていることを確認');
    
    // 再ガチャ完了まで待機
    await page.waitForFunction(
      () => !document.querySelector('button:has-text("再ガチャ中...")'),
      { timeout: 15000 }
    );
    
    // 人数選択ボタンが再び有効になっていることを確認
    await expect(button1).toBeEnabled();
    await expect(button3).toBeEnabled();
    await expect(button4).toBeEnabled();
    
    console.log('✅ 再ガチャ完了後: 人数選択ボタンが再び有効化されていることを確認');
  });
});