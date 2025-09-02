const { test, expect } = require('@playwright/test');

test.describe('ガチャボタン詳細デバッグテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ページの console ログを取得
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.text());
    });

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

  test('3人設定1武器選択時のガチャボタン状態詳細確認', async ({ page }) => {
    console.log('=== 3人設定1武器選択詳細デバッグテスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(500);
    console.log('✓ 武器モード選択完了');
    
    // 3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(1000);
    console.log('✓ 3人設定完了');
    
    // 対象武器一覧を開く
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ 武器一覧モーダル開始');
    
    // 全選択解除
    const deselectAllButton = page.locator('button.px-4.py-2.rounded-lg.text-sm.bg-splatoon-orange').first();
    const buttonText = await deselectAllButton.textContent();
    
    if (buttonText && buttonText.includes('全選択解除')) {
      await deselectAllButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ 全選択解除実行完了');
    }
    
    // 1つ目の武器を選択
    const weaponItems = page.locator('div.p-4.rounded-lg.transition-all.duration-200.border-2.cursor-pointer');
    const firstWeapon = weaponItems.first();
    await firstWeapon.click();
    await page.waitForTimeout(500);
    console.log('✓ 1つ目の武器選択完了');
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(3000);
    console.log('✓ モーダル閉じる完了');
    
    // 状態をJavaScriptで詳細に取得
    const detailedState = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const gachaButton = buttons.find(b => b.textContent.includes('ガチャを回す！'));
      
      // playerCount を取得
      const playerCountElement = document.querySelector('.bg-splatoon-yellow');
      let playerCount = 'not found';
      if (playerCountElement) {
        const text = playerCountElement.textContent;
        const match = text.match(/(\d+)人/);
        if (match) {
          playerCount = parseInt(match[1]);
        }
      }
      
      // gachaMode を取得
      const gachaModeButtons = Array.from(document.querySelectorAll('button')).filter(b => 
        b.textContent.includes('武器') || b.textContent.includes('サブ') || 
        b.textContent.includes('スペシャル') || b.textContent.includes('武器種別')
      );
      let activeGachaMode = 'unknown';
      for (const btn of gachaModeButtons) {
        if (btn.classList.contains('bg-splatoon-yellow')) {
          activeGachaMode = btn.textContent.trim();
          break;
        }
      }
      
      // allowDuplicates チェックボックスの状態
      const duplicateCheckbox = document.querySelector('input[type="checkbox"]');
      const allowDuplicates = duplicateCheckbox ? duplicateCheckbox.checked : false;
      const checkboxDisabled = duplicateCheckbox ? duplicateCheckbox.disabled : false;
      
      return {
        playerCount: playerCount,
        gachaMode: activeGachaMode,
        allowDuplicates: allowDuplicates,
        checkboxDisabled: checkboxDisabled,
        gachaButton: gachaButton ? {
          disabled: gachaButton.disabled,
          textContent: gachaButton.textContent.trim(),
          className: gachaButton.className
        } : null
      };
    });
    
    console.log('詳細状態:', JSON.stringify(detailedState, null, 2));
    
    // 期待値との比較
    console.log('=== 期待値チェック ===');
    console.log(`プレイヤー数: ${detailedState.playerCount} (期待値: 3)`);
    console.log(`ガチャモード: ${detailedState.gachaMode} (期待値: 武器)`);
    console.log(`重複許可: ${detailedState.allowDuplicates} (期待値: false)`);
    console.log(`チェックボックス無効: ${detailedState.checkboxDisabled} (期待値: false)`);
    
    if (detailedState.gachaButton) {
      console.log(`ガチャボタン無効: ${detailedState.gachaButton.disabled} (期待値: true)`);
      
      // ロジック確認
      const selectedWeaponCount = 1; // テストで1武器選択している
      const playerCount = detailedState.playerCount;
      const allowDuplicates = detailedState.allowDuplicates;
      
      const shouldAutoAllowDuplicates = selectedWeaponCount === 1 && playerCount === 2;
      const effectiveAllowDuplicates = shouldAutoAllowDuplicates ? true : allowDuplicates;
      const expectedDisabled = selectedWeaponCount === 0 || (selectedWeaponCount < playerCount && !effectiveAllowDuplicates);
      
      console.log('=== ロジック計算 ===');
      console.log(`selectedWeaponCount: ${selectedWeaponCount}`);
      console.log(`playerCount: ${playerCount}`);
      console.log(`allowDuplicates: ${allowDuplicates}`);
      console.log(`shouldAutoAllowDuplicates: ${shouldAutoAllowDuplicates}`);
      console.log(`effectiveAllowDuplicates: ${effectiveAllowDuplicates}`);
      console.log(`expectedDisabled: ${expectedDisabled}`);
      console.log(`actualDisabled: ${detailedState.gachaButton.disabled}`);
      
      if (expectedDisabled) {
        try {
          expect(detailedState.gachaButton.disabled).toBe(true);
          console.log('✅ 成功: ガチャボタンが正しく無効化されている');
        } catch (error) {
          console.log('❌ 失敗: ガチャボタンが有効のまま');
          throw error;
        }
      } else {
        console.log('⚠️ 予期しない状態: ボタンは有効であるべき');
      }
    } else {
      console.log('❌ エラー: ガチャボタンが見つからない');
    }
  });
});