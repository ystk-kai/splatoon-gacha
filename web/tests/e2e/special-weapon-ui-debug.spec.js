/**
 * スペシャル武器フィルタリングのUI動作デバッグテスト
 * ガチャモード選択→スペシャル→テイオウイカ選択→対象武器一覧の表示を確認
 */

const { test, expect } = require('@playwright/test');

test.describe('スペシャル武器UI動作デバッグ', () => {
  test('テイオウイカ選択時の対象武器一覧表示を確認', async ({ page }) => {
    // ダッシュボードを開く
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('📍 Step 1: ダッシュボード読み込み完了');

    // 初期状態の対象武器一覧ボタンを確認
    const initialWeaponButton = await page.locator('button:has-text("対象武器一覧")');
    const initialText = await initialWeaponButton.textContent();
    console.log(`📍 Step 2: 初期状態の対象武器一覧ボタン: "${initialText}"`);

    // スペシャルモードを選択
    console.log('📍 Step 3: スペシャルモードを選択');
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(1000);

    // スペシャルモード選択後の対象武器一覧ボタンを確認
    const afterModeText = await initialWeaponButton.textContent();
    console.log(`📍 Step 4: スペシャルモード選択後: "${afterModeText}"`);
    
    // テイオウイカを選択
    console.log('📍 Step 5: テイオウイカを選択');
    const krakenButton = await page.locator('img[src="/images/special/kraken_royale.png"]').locator('..');
    await krakenButton.click();
    await page.waitForTimeout(1000);

    // テイオウイカ選択後の対象武器一覧ボタンを確認
    const afterKrakenText = await initialWeaponButton.textContent();
    console.log(`📍 Step 6: テイオウイカ選択後: "${afterKrakenText}"`);

    // 対象武器一覧を開く
    console.log('📍 Step 7: 対象武器一覧を開く');
    await initialWeaponButton.click();
    await page.waitForTimeout(1000);

    // モーダル内の武器リストを確認
    const weaponModal = await page.locator('.fixed.inset-0'); // モーダルを想定
    const modalVisible = await weaponModal.isVisible();
    console.log(`📍 Step 8: モーダル表示状態: ${modalVisible}`);

    if (modalVisible) {
      // モーダル内のテキストを取得
      const modalText = await weaponModal.textContent();
      console.log('📍 Step 9: モーダル内容（抜粋）:');
      console.log(modalText.substring(0, 500) + '...');

      // テイオウイカを持つ武器を探す
      const krakenWeapons = [
        'スプラシューター煌',
        '.96ガロンデコ', 
        'ロングブラスターカスタム',
        'スプラローラーコラボ',
        'ホクサイ彗'
      ];

      for (const weaponName of krakenWeapons) {
        const weaponFound = modalText.includes(weaponName);
        console.log(`  ${weaponFound ? '✓' : '✗'} ${weaponName}`);
      }

      // 選択されている武器数を確認
      const selectedCountElement = await page.locator('text=/選択中: \\d+ \\/ \\d+種/');
      if (await selectedCountElement.isVisible()) {
        const selectedCountText = await selectedCountElement.textContent();
        console.log(`📍 Step 10: 選択数表示: "${selectedCountText}"`);
      } else {
        console.log('📍 Step 10: 選択数表示が見つからない');
        
        // 代替：全体のテキストから選択数を探す
        const allText = await page.textContent('body');
        const selectionMatch = allText.match(/選択中: (\d+) \/ (\d+)種/);
        if (selectionMatch) {
          console.log(`📍 Step 10 (代替): 選択数: ${selectionMatch[1]}/${selectionMatch[2]}種`);
        }
      }

      // 全選択ボタンがあるか確認
      const selectAllButton = await page.locator('button:has-text("全選択")');
      const selectAllVisible = await selectAllButton.isVisible();
      console.log(`📍 Step 11: 全選択ボタン表示状態: ${selectAllVisible}`);

      if (selectAllVisible) {
        console.log('📍 Step 12: 全選択を実行');
        await selectAllButton.click();
        await page.waitForTimeout(1000);

        // 全選択後の選択数を確認
        const afterSelectAllText = await page.textContent('body');
        const afterSelectionMatch = afterSelectAllText.match(/選択中: (\d+) \/ (\d+)種/);
        if (afterSelectionMatch) {
          console.log(`📍 Step 13: 全選択後の選択数: ${afterSelectionMatch[1]}/${afterSelectionMatch[2]}種`);
        }
      }

      // モーダルを閉じる
      console.log('📍 Step 14: モーダルを閉じる');
      const closeButton = await page.locator('button:has-text("閉じる")');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // 最終的な対象武器一覧ボタンの表示を確認
    const finalText = await initialWeaponButton.textContent();
    console.log(`📍 Step 15: 最終的な対象武器一覧ボタン: "${finalText}"`);

    // ガチャボタンの状態を確認
    const gachaButton = await page.locator('button:has-text("ガチャを回す")');
    const isGachaEnabled = await gachaButton.isEnabled();
    console.log(`📍 Step 16: ガチャボタン有効状態: ${isGachaEnabled}`);

    // スクリーンショットを取得
    await page.screenshot({ path: 'test-results/special-weapon-debug.png', fullPage: true });
    console.log('📍 Step 17: スクリーンショット保存完了');
  });

  test('ページのJavaScriptエラーを監視', async ({ page }) => {
    // JavaScriptエラーを監視
    const jsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
        console.log(`🚨 JavaScript Error: ${msg.text()}`);
      } else if (msg.type() === 'log') {
        console.log(`📝 Console Log: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log(`🚨 Page Error: ${error.message}`);
    });

    // ダッシュボードを開く
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);

    // テイオウイカを選択
    const krakenButton = await page.locator('img[src="/images/special/kraken_royale.png"]').locator('..');
    await krakenButton.click();
    await page.waitForTimeout(500);

    // 対象武器一覧を開く
    await page.click('button:has-text("対象武器一覧")');
    await page.waitForTimeout(1000);

    // エラー確認
    if (jsErrors.length > 0) {
      console.log('🚨 検出されたJavaScriptエラー:');
      jsErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ JavaScriptエラーは検出されませんでした');
    }

    // テスト結果
    expect(jsErrors.length).toBe(0);
  });
});