const { test, expect } = require('@playwright/test');

test.describe('シンプルなガチャボタン状態テスト', () => {
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
    await page.waitForTimeout(2000);
  });

  test('武器モード3人設定1武器選択時のガチャボタン状態確認', async ({ page }) => {
    console.log('=== 武器モード3人設定1武器選択ボタン状態テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(2000);
    
    // 全選択解除
    const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText && buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(1000);
      console.log('全選択解除を実行');
    }
    
    // 1つ目の武器を選択
    const weaponItems = page.locator('div.p-4.rounded-lg.transition-all.duration-200.border-2.cursor-pointer');
    const firstWeapon = weaponItems.first();
    await firstWeapon.click();
    await page.waitForTimeout(500);
    
    // 選択状態を確認
    const selectedCountElement = page.locator('div.text-sm.text-gray-300').filter({ hasText: /選択中:/ });
    const selectedCountText = await selectedCountElement.textContent();
    console.log(`選択状態: ${selectedCountText}`);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(3000);
    
    // ガチャボタン状態を確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    
    console.log('ガチャボタン状態をテスト...');
    
    // JavaScriptでボタン状態を直接取得
    const buttonState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(b => b.textContent.includes('ガチャを回す！')) || 
                     document.querySelector('[data-testid="random-gacha-button"]');
      if (button) {
        return {
          disabled: button.disabled,
          textContent: button.textContent,
          className: button.className
        };
      }
      return null;
    });
    
    console.log('JavaScript経由のボタン状態:', JSON.stringify(buttonState));
    
    // コンソールログでdashboard-app.jsのデバッグログも確認
    page.on('console', msg => {
      if (msg.text().includes('Gacha button state')) {
        console.log('Dashboard Log:', msg.text());
      }
    });
    
    // 最終確認 - 3人設定で1武器選択時は無効になるべき
    try {
      await expect(gachaButton).toBeDisabled({ timeout: 5000 });
      console.log('✅ 成功: 3人設定1武器選択時にガチャボタンが正しく無効化された');
    } catch (error) {
      await expect(gachaButton).toBeEnabled({ timeout: 5000 });
      console.log('❌ 失敗: 3人設定1武器選択時にガチャボタンが有効のまま（問題あり）');
      throw error;
    }
  });

  test('武器モード2人設定1武器選択時のガチャボタン無効確認', async ({ page }) => {
    console.log('=== 武器モード2人設定1武器選択ボタン無効テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(2000);
    
    // 全選択解除
    const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText && buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(1000);
      console.log('全選択解除を実行');
    }
    
    // 1つ目の武器を選択
    const weaponItems = page.locator('div.p-4.rounded-lg.transition-all.duration-200.border-2.cursor-pointer');
    const firstWeapon = weaponItems.first();
    await firstWeapon.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(3000);
    
    // ガチャボタンが無効であることを確認（2人設定1武器選択時も武器不足で無効）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    
    try {
      await expect(gachaButton).toBeDisabled({ timeout: 5000 });
      console.log('✅ 成功: 2人設定1武器選択時にガチャボタンが正しく無効化された');
    } catch (error) {
      console.log('❌ 失敗: 2人設定1武器選択時にガチャボタンが有効のまま（問題あり）');
      throw error;
    }
  });

  test('武器モード1人設定1武器選択時のガチャボタン有効確認', async ({ page }) => {
    console.log('=== 武器モード1人設定1武器選択ボタン有効テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 1人に設定（デフォルト）
    await page.click('button:has-text("1人")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(2000);
    
    // 全選択解除
    const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText && buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(1000);
      console.log('全選択解除を実行');
    }
    
    // 1つ目の武器を選択
    const weaponItems = page.locator('div.p-4.rounded-lg.transition-all.duration-200.border-2.cursor-pointer');
    const firstWeapon = weaponItems.first();
    await firstWeapon.click();
    await page.waitForTimeout(500);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(3000);
    
    // ガチャボタンが有効であることを確認（1人設定1武器選択時は有効）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    
    try {
      await expect(gachaButton).toBeEnabled({ timeout: 5000 });
      console.log('✅ 成功: 1人設定1武器選択時にガチャボタンが正しく有効化された');
    } catch (error) {
      console.log('❌ 失敗: 1人設定1武器選択時にガチャボタンが無効（問題あり）');
      throw error;
    }
  });

  test('武器モード0武器選択時のガチャボタン無効確認', async ({ page }) => {
    console.log('=== 武器モード0武器選択ボタン無効テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    
    // 2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(2000);
    
    // 全選択解除
    const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText && buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(1000);
      console.log('全選択解除を実行');
    }
    
    // 何も選択せずにモーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(3000);
    
    // ガチャボタンが無効であることを確認（0武器選択は必ず無効）
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    
    try {
      await expect(gachaButton).toBeDisabled({ timeout: 5000 });
      console.log('✅ 成功: 0武器選択時にガチャボタンが正しく無効化された');
    } catch (error) {
      console.log('❌ 失敗: 0武器選択時にガチャボタンが有効のまま（問題あり）');
      throw error;
    }
  });
});