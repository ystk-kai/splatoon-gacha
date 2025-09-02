const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Weapon Shortage Tests', () => {
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

  // 武器モードでの武器不足テスト
  test.describe('武器モード武器不足テスト', () => {
    test('2人設定0武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== 武器モード2人設定0武器選択テスト ===');
      
      // 武器モードを選択
      await page.click('button:has-text("武器")');
      await page.waitForTimeout(100);
      
      // 2人に設定
      await page.click('button:has-text("2人")');
      await page.waitForTimeout(100);
      
      // 対象武器一覧を開いて全選択解除
      const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
      await weaponListButton.click();
      await page.waitForTimeout(1000);
      
      const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
      const buttonText = await deselectAllButton.textContent();
      
      if (buttonText.includes('全選択解除')) {
        await deselectAllButton.click();
        await page.waitForTimeout(500);
      }
      
      // モーダルを閉じる（0武器選択状態）
      await page.click('button:has-text("閉じる")');
      await page.waitForTimeout(1000);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ 武器モード2人設定0武器選択確認完了');
    });

    test('3人設定1武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== 武器モード3人設定1武器選択テスト ===');
      
      // 武器モードを選択
      await page.click('button:has-text("武器")');
      await page.waitForTimeout(100);
      
      // 3人に設定
      await page.click('button:has-text("3人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ 武器モード3人設定1武器選択確認完了');
    });

    test('4人設定2武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== 武器モード4人設定2武器選択テスト ===');
      
      // 武器モードを選択
      await page.click('button:has-text("武器")');
      await page.waitForTimeout(100);
      
      // 4人に設定
      await page.click('button:has-text("4人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 2);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ 武器モード4人設定2武器選択確認完了');
    });

    test('2人設定1武器選択時は自動重複許可でガチャボタンが有効', async ({ page }) => {
      console.log('=== 武器モード2人設定1武器選択自動重複許可テスト ===');
      
      // 武器モードを選択
      await page.click('button:has-text("武器")');
      await page.waitForTimeout(100);
      
      // 2人に設定
      await page.click('button:has-text("2人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // 自動重複許可メッセージが表示されていることを確認
      const autoAllowMessage = page.getByText(/自動で重複許可/);
      await expect(autoAllowMessage).toBeVisible();
      
      // ガチャボタンが有効であることを確認（自動重複許可により）
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeEnabled();
      
      console.log('✅ 武器モード2人設定1武器選択自動重複許可確認完了');
    });
  });

  // サブモードでの武器不足テスト
  test.describe('サブモード武器不足テスト', () => {
    test('3人設定0武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== サブモード3人設定0武器選択テスト ===');
      
      // サブモードを選択
      await page.click('button:has-text("サブ")');
      await page.waitForTimeout(500);
      
      // 3人に設定
      await page.click('button:has-text("3人")');
      await page.waitForTimeout(100);
      
      // 対象武器一覧を開いて全選択解除
      const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
      await weaponListButton.click();
      await page.waitForTimeout(1000);
      
      const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
      const buttonText = await deselectAllButton.textContent();
      
      if (buttonText.includes('全選択解除')) {
        await deselectAllButton.click();
        await page.waitForTimeout(500);
      }
      
      // モーダルを閉じる（0武器選択状態）
      await page.click('button:has-text("閉じる")');
      await page.waitForTimeout(1000);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ サブモード3人設定0武器選択確認完了');
    });

    test('4人設定1武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== サブモード4人設定1武器選択テスト ===');
      
      // サブモードを選択
      await page.click('button:has-text("サブ")');
      await page.waitForTimeout(500);
      
      // 4人に設定
      await page.click('button:has-text("4人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ サブモード4人設定1武器選択確認完了');
    });

    test('2人設定1武器選択時は自動重複許可でガチャボタンが有効', async ({ page }) => {
      console.log('=== サブモード2人設定1武器選択自動重複許可テスト ===');
      
      // サブモードを選択
      await page.click('button:has-text("サブ")');
      await page.waitForTimeout(500);
      
      // 2人に設定
      await page.click('button:has-text("2人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // 自動重複許可メッセージが表示されていることを確認
      const autoAllowMessage = page.getByText(/自動で重複許可/);
      await expect(autoAllowMessage).toBeVisible();
      
      // ガチャボタンが有効であることを確認（自動重複許可により）
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeEnabled();
      
      console.log('✅ サブモード2人設定1武器選択自動重複許可確認完了');
    });
  });

  // スペシャルモードでの武器不足テスト
  test.describe('スペシャルモード武器不足テスト', () => {
    test('4人設定0武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== スペシャルモード4人設定0武器選択テスト ===');
      
      // スペシャルモードを選択
      await page.click('button:has-text("スペシャル")');
      await page.waitForTimeout(500);
      
      // 4人に設定
      await page.click('button:has-text("4人")');
      await page.waitForTimeout(100);
      
      // 対象武器一覧を開いて全選択解除
      const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
      await weaponListButton.click();
      await page.waitForTimeout(1000);
      
      const deselectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択解除|全選択/ }).first();
      const buttonText = await deselectAllButton.textContent();
      
      if (buttonText.includes('全選択解除')) {
        await deselectAllButton.click();
        await page.waitForTimeout(500);
      }
      
      // モーダルを閉じる（0武器選択状態）
      await page.click('button:has-text("閉じる")');
      await page.waitForTimeout(1000);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ スペシャルモード4人設定0武器選択確認完了');
    });

    test('3人設定2武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== スペシャルモード3人設定2武器選択テスト ===');
      
      // スペシャルモードを選択
      await page.click('button:has-text("スペシャル")');
      await page.waitForTimeout(500);
      
      // 3人に設定
      await page.click('button:has-text("3人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 2);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ スペシャルモード3人設定2武器選択確認完了');
    });
  });

  // 武器種別モードでの武器不足テスト
  test.describe('武器種別モード武器不足テスト', () => {
    test('4人設定3武器選択時はガチャボタンが無効', async ({ page }) => {
      console.log('=== 武器種別モード4人設定3武器選択テスト ===');
      
      // 武器種別モードを選択
      await page.click('button:has-text("武器種別")');
      await page.waitForTimeout(500);
      
      // 4人に設定
      await page.click('button:has-text("4人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 3);
      
      // ガチャボタンが無効であることを確認
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      console.log('✅ 武器種別モード4人設定3武器選択確認完了');
    });

    test('2人設定1武器選択時は自動重複許可でガチャボタンが有効', async ({ page }) => {
      console.log('=== 武器種別モード2人設定1武器選択自動重複許可テスト ===');
      
      // 武器種別モードを選択
      await page.click('button:has-text("武器種別")');
      await page.waitForTimeout(500);
      
      // 2人に設定
      await page.click('button:has-text("2人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // 自動重複許可メッセージが表示されていることを確認
      const autoAllowMessage = page.getByText(/自動で重複許可/);
      await expect(autoAllowMessage).toBeVisible();
      
      // ガチャボタンが有効であることを確認（自動重複許可により）
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeEnabled();
      
      console.log('✅ 武器種別モード2人設定1武器選択自動重複許可確認完了');
    });
  });

  // 手動重複許可での正常ケース
  test.describe('手動重複許可正常ケーステスト', () => {
    test('4人設定1武器選択で手動重複許可を有効にするとガチャボタンが有効', async ({ page }) => {
      console.log('=== 4人設定1武器選択手動重複許可テスト ===');
      
      // 武器モードを選択
      await page.click('button:has-text("武器")');
      await page.waitForTimeout(100);
      
      // 4人に設定
      await page.click('button:has-text("4人")');
      await page.waitForTimeout(100);
      
      await selectSpecificNumberOfWeapons(page, 1);
      
      // 最初はガチャボタンが無効（武器不足）
      const gachaButton = page.locator('button:has-text("ガチャを回す！")');
      await expect(gachaButton).toBeDisabled();
      
      // 重複許可チェックボックスをクリック
      const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
      await duplicateCheckbox.click();
      await page.waitForTimeout(100);
      
      // ガチャボタンが有効になることを確認
      await expect(gachaButton).toBeEnabled();
      
      console.log('✅ 4人設定1武器選択手動重複許可確認完了');
    });
  });
});

// ヘルパー関数：指定された数の武器を選択
async function selectSpecificNumberOfWeapons(page, count) {
  console.log(`selectSpecificNumberOfWeapons: 選択予定数 = ${count}`);
  
  // 対象武器一覧を開く
  const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
  await weaponListButton.click();
  await page.waitForTimeout(2000);
  
  // 正確なセレクターで全選択解除ボタンを取得
  const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
  const buttonText = await deselectAllButton.textContent().catch(() => '未検出');
  console.log(`selectSpecificNumberOfWeapons: ボタンテキスト = "${buttonText}"`);
  
  // 全選択解除を実行（全選択解除テキストの場合のみ）
  if (buttonText && buttonText.includes('全選択解除')) {
    await deselectAllButton.click();
    await page.waitForTimeout(1000);
    console.log('selectSpecificNumberOfWeapons: 全選択解除を実行');
    
    // 選択解除後の確認
    const afterDeselectText = await deselectAllButton.textContent().catch(() => '未検出');
    console.log(`selectSpecificNumberOfWeapons: 全選択解除後のボタンテキスト = "${afterDeselectText}"`);
  }
  
  // 正確なセレクターで武器選択項目を取得
  const weaponItems = page.locator('div.p-4.rounded-lg.transition-all.duration-200.border-2.cursor-pointer');
  
  const availableCount = await weaponItems.count();
  console.log(`selectSpecificNumberOfWeapons: 利用可能な武器数 = ${availableCount}`);
  
  // 指定された数だけ武器を選択
  const actualSelectCount = Math.min(count, availableCount);
  for (let i = 0; i < actualSelectCount; i++) {
    const weapon = weaponItems.nth(i);
    
    // 武器名を取得（より正確に）
    const weaponNameElement = weapon.locator('div.font-semibold.text-white.text-sm');
    const weaponText = await weaponNameElement.textContent().catch(() => `武器${i+1}`);
    console.log(`selectSpecificNumberOfWeapons: 武器 ${i+1} を選択中: ${weaponText.trim()}`);
    
    await weapon.click();
    await page.waitForTimeout(500);
    
    // 選択状態の確認
    const isSelected = await weapon.evaluate(el => el.classList.contains('bg-splatoon-orange'));
    console.log(`selectSpecificNumberOfWeapons: 武器 ${i+1} 選択状態 = ${isSelected}`);
  }
  
  console.log(`selectSpecificNumberOfWeapons: ${actualSelectCount}個の武器選択完了`);
  
  // 選択数の確認
  const selectedCountElement = page.locator('div.text-sm.text-gray-300').filter({ hasText: /選択中:/ });
  const selectedCountText = await selectedCountElement.textContent().catch(() => '選択数未検出');
  console.log(`selectSpecificNumberOfWeapons: モーダル内選択数表示 = "${selectedCountText}"`);
  
  // モーダルを閉じる
  await page.click('button:has-text("閉じる")');
  
  // UI状態の更新を確実に待機
  await page.waitForFunction(() => {
    // モーダルが確実に閉じられることを確認
    const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
    return !modal || modal.style.display === 'none' || !modal.offsetParent;
  }, { timeout: 10000 });
  
  await page.waitForTimeout(2000); // 追加の安定化待機
  
  // 選択後の状態をより正確に確認
  try {
    // selectedWeaponCount の表示を確認
    const weaponCountText = await page.locator('text=/\\d+種選択中/').first().textContent({ timeout: 5000 });
    console.log(`selectSpecificNumberOfWeapons: モーダル閉じた後の表示 = "${weaponCountText}"`);
  } catch (e) {
    console.log('selectSpecificNumberOfWeapons: 選択数表示が見つからない');
  }
}

// ヘルパー関数：ガチャボタン状態を確認
async function checkGachaButtonState(page, expectedState, testName) {
  console.log(`checkGachaButtonState: ${testName} - 期待状態: ${expectedState}`);
  
  const gachaButton = page.locator('button:has-text("ガチャを回す！")').or(page.locator('button:has-text("ガチャ中...")'));
  
  // ボタンの存在確認
  await expect(gachaButton).toBeVisible({ timeout: 10000 });
  
  // ボタンのテキスト確認
  const buttonText = await gachaButton.textContent();
  console.log(`checkGachaButtonState: ボタンテキスト = "${buttonText}"`);
  
  // 実際の状態確認
  const actualDisabled = await gachaButton.isDisabled();
  console.log(`checkGachaButtonState: 実際の状態 = ${actualDisabled ? 'disabled' : 'enabled'}`);
  
  // UI上の警告メッセージやヒント表示の確認
  try {
    const warningMessages = await page.locator('div').filter({ 
      hasText: /武器不足|自動で重複許可|武器未選択|武器を選択/ 
    }).allTextContents();
    console.log(`checkGachaButtonState: 表示メッセージ = ${JSON.stringify(warningMessages)}`);
  } catch (e) {
    console.log('checkGachaButtonState: 警告メッセージ未検出');
  }
  
  // 期待状態との比較
  if (expectedState === 'disabled') {
    await expect(gachaButton).toBeDisabled();
  } else {
    await expect(gachaButton).toBeEnabled();
  }
  
  console.log(`✅ checkGachaButtonState: ${testName} 確認完了`);
}