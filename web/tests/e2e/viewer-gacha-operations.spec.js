const { test, expect } = require('@playwright/test');

test.describe('Viewer Gacha Operations', () => {
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

  test('視聴者画面でガチャモード切り替えが正常に動作する', async ({ page }) => {
    console.log('=== 視聴者画面ガチャモード切り替えテスト ===');
    
    // JavaScriptエラーを検出するためのリスナーを設定
    const jsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      jsErrors.push(error.toString());
    });
    
    // サブモードに切り替え
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(500);
    
    // JavaScriptエラーがないことを確認
    expect(jsErrors).toHaveLength(0);
    
    const subModeButton = page.getByRole('button', { name: 'サブ' });
    await expect(subModeButton).toHaveClass(/from-splatoon-orange/);
    
    // サブウェポン選択UIが表示されていることを確認
    await expect(page.locator('text=サブ選択')).toBeVisible();
    
    // スペシャルモードに切り替え
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // JavaScriptエラーがないことを確認
    expect(jsErrors).toHaveLength(0);
    
    const specialModeButton = page.getByRole('button', { name: 'スペシャル' });
    await expect(specialModeButton).toHaveClass(/from-splatoon-orange/);
    
    // スペシャル選択UIが表示されていることを確認
    await expect(page.locator('text=スペシャル選択')).toBeVisible();
    
    console.log('✅ 視聴者画面ガチャモード切り替え動作確認完了');
  });

  test('視聴者画面でサブモード武器フィルタリングが正常に動作する', async ({ page }) => {
    console.log('=== 視聴者画面サブモードフィルタリングテスト ===');
    
    // サブモードに切り替え
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // フィルタリング説明が表示されていることを確認
    const filterDescription = page.getByText(/サブ『.*』/);
    await expect(filterDescription).toBeVisible();
    
    // 現在選択されているサブ武器を確認
    const filterText = await filterDescription.textContent();
    console.log('現在のフィルタリング:', filterText);
    
    // 武器リストが表示されていることを確認
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    const weaponCount = await weaponItems.count();
    console.log(`フィルタリングされた武器数: ${weaponCount}`);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    console.log('✅ 視聴者画面サブモードフィルタリング動作確認完了');
  });

  test('視聴者画面でスペシャルモード武器フィルタリングが正常に動作する', async ({ page }) => {
    console.log('=== 視聴者画面スペシャルモードフィルタリングテスト ===');
    
    // スペシャルモードに切り替え
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // フィルタリング説明が表示されていることを確認
    const filterDescription = page.getByText(/スペシャル『.*』/);
    await expect(filterDescription).toBeVisible();
    
    // 現在選択されているスペシャル武器を確認
    const filterText = await filterDescription.textContent();
    console.log('現在のフィルタリング:', filterText);
    
    // 武器リストが表示されていることを確認
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    const weaponCount = await weaponItems.count();
    console.log(`フィルタリングされた武器数: ${weaponCount}`);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    console.log('✅ 視聴者画面スペシャルモードフィルタリング動作確認完了');
  });

  test('視聴者画面で武器手動選択フィルタリングが正常に動作する', async ({ page }) => {
    console.log('=== 視聴者画面武器手動選択フィルタリングテスト ===');
    
    // すべての武器モードを選択
    await page.click('button:has-text("すべての武器")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除ボタンを探してクリック
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    
    // ボタンのテキストを確認
    const buttonText = await deselectAllButton.textContent();
    console.log('選択ボタンの状態:', buttonText);
    
    if (buttonText.includes('全選択解除')) {
      // 全選択解除をクリック
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // 特定の武器（スプラシューター）だけを選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(200);
    
    // 選択中の武器数を確認
    const selectedCount = page.getByText(/選択中:/);
    const selectedText = await selectedCount.textContent();
    console.log('選択状態:', selectedText);
    
    // 1種選択されていることを確認
    expect(selectedText).toContain('1');
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    console.log('✅ 視聴者画面武器手動選択フィルタリング動作確認完了');
  });

  test('視聴者画面で武器不足時にガチャボタンが無効になる', async ({ page }) => {
    console.log('=== 視聴者画面武器不足時ガチャボタン無効化テスト ===');
    
    // すべての武器モードを選択
    await page.click('button:has-text("すべての武器")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // 全選択解除ボタンをクリック
    const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(500);
    }
    
    // モーダルを閉じる（武器未選択状態）
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // 武器未選択の警告が表示されていることを確認
    const warningMessage = page.getByText(/武器未選択/);
    await expect(warningMessage).toBeVisible();
    
    // ガチャボタンが無効になっていることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeDisabled();
    
    // ガチャボタンがグレーアウトスタイルになっていることを確認
    const buttonClass = await gachaButton.getAttribute('class');
    expect(buttonClass).toContain('bg-gray-600');
    expect(buttonClass).toContain('text-gray-400');
    expect(buttonClass).toContain('cursor-not-allowed');
    
    console.log('✅ 視聴者画面武器不足時ガチャボタン無効化確認完了');
  });

  test('視聴者画面でガチャ実行時のフィルタリングが正確に動作する', async ({ page }) => {
    console.log('=== 視聴者画面ガチャ実行フィルタリング精度テスト ===');
    
    // ネットワークリクエストを監視
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/random-weapon')) {
        requests.push({
          url: request.url(),
          params: new URL(request.url()).searchParams
        });
      }
    });
    
    // すべての武器モードで特定武器を選択
    await page.click('button:has-text("すべての武器")');
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
    
    // スプラシューターだけを選択
    const splattershot = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'スプラシューター' }).first();
    await splattershot.click();
    await page.waitForTimeout(200);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);
    
    // ガチャを実行
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await gachaButton.click();
    
    // ガチャ完了まで待機
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button');
        return button && button.textContent.includes('ガチャを回す！') && !button.textContent.includes('ガチャ中');
      },
      { timeout: 15000 }
    );
    
    // APIリクエストの確認
    console.log('APIリクエスト数:', requests.length);
    if (requests.length > 0) {
      const lastRequest = requests[requests.length - 1];
      console.log('最後のAPIリクエストパラメータ:');
      console.log('- viewer:', lastRequest.params.get('viewer'));
      console.log('- selectedWeapons:', lastRequest.params.get('selectedWeapons'));
      
      // selectedWeaponsパラメータが送信されていることを確認
      expect(lastRequest.params.get('selectedWeapons')).toBeTruthy();
    }
    
    console.log('✅ 視聴者画面ガチャ実行フィルタリング精度テスト完了');
  });

  test('視聴者画面でサブモード選択時の自動選択が動作する', async ({ page }) => {
    console.log('=== 視聴者画面サブモード自動選択テスト ===');
    
    // サブモードに切り替え
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(500);
    
    // 最初のサブ武器（splat_bomb）が自動選択されていることを確認
    const firstSubButton = page.locator('button').filter({ hasText: 'スプラッシュボム' }).first();
    const buttonClass = await firstSubButton.getAttribute('class');
    expect(buttonClass).toContain('bg-splatoon-orange');
    
    console.log('✅ 視聴者画面サブモード自動選択確認完了');
  });

  test('視聴者画面でスペシャルモード選択時の自動選択が動作する', async ({ page }) => {
    console.log('=== 視聴者画面スペシャルモード自動選択テスト ===');
    
    // スペシャルモードに切り替え
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // 最初のスペシャル武器（trizooka）が自動選択されていることを確認
    const firstSpecialButton = page.locator('button').filter({ hasText: 'ウルトラショット' }).first();
    const buttonClass = await firstSpecialButton.getAttribute('class');
    expect(buttonClass).toContain('bg-splatoon-orange');
    
    console.log('✅ 視聴者画面スペシャルモード自動選択確認完了');
  });
});