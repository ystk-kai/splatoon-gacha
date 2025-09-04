const { test, expect } = require('@playwright/test');

test.describe('Dashboard-Viewer Weapon List Integration', () => {
  test('ダッシュボードで視聴者モード有効後に視聴者画面で武器一覧が正常に動作する', async ({ browser }) => {
    console.log('=== ダッシュボード-視聴者画面統合テスト ===');
    
    // 2つのコンテキストを作成（ダッシュボード用と視聴者画面用）
    const dashboardContext = await browser.newContext();
    const viewerContext = await browser.newContext();
    
    const dashboardPage = await dashboardContext.newPage();
    const viewerPage = await viewerContext.newPage();
    
    try {
      // JavaScriptエラーを監視
      const dashboardErrors = [];
      const viewerErrors = [];
      
      dashboardPage.on('console', msg => {
        if (msg.type() === 'error') {
          dashboardErrors.push(`Dashboard: ${msg.text()}`);
        }
      });
      
      dashboardPage.on('pageerror', error => {
        dashboardErrors.push(`Dashboard: ${error.toString()}`);
      });
      
      viewerPage.on('console', msg => {
        if (msg.type() === 'error') {
          viewerErrors.push(`Viewer: ${msg.text()}`);
        }
      });
      
      viewerPage.on('pageerror', error => {
        viewerErrors.push(`Viewer: ${error.toString()}`);
      });
      
      // Step 1: ダッシュボードページを開く
      console.log('Step 1: ダッシュボードページを開く');
      await dashboardPage.goto('/dashboard');
      await dashboardPage.waitForSelector('.splatoon-font');
      await dashboardPage.waitForTimeout(2000); // WebSocket接続とロード完了を待機
      
      // Step 2: 視聴者モードを有効化（直接IDで指定）
      console.log('Step 2: 視聴者モードを有効化');
      const viewerToggle = dashboardPage.locator('#viewer-enabled');
      await expect(viewerToggle).toBeVisible();
      
      const isChecked = await viewerToggle.isChecked();
      console.log(`視聴者モードの現在の状態: ${isChecked}`);
      
      if (!isChecked) {
        await viewerToggle.click();
        console.log('視聴者モードを有効化しました');
        await dashboardPage.waitForTimeout(1000);
      } else {
        console.log('視聴者モードは既に有効です');
      }
      
      // サブ武器モードを許可（視聴者画面でサブモードをテストするため）
      console.log('Step 2.5: サブ武器モードを許可');
      const subModeCheckbox = dashboardPage.locator('input[type="checkbox"]').filter({ hasText: /サブ武器/ }).or(dashboardPage.locator('label').filter({ hasText: 'サブ武器' }).locator('+ input[type="checkbox"]')).or(dashboardPage.locator('label:has-text("サブ武器") input[type="checkbox"]'));
      
      // より具体的にサブ武器のチェックボックスを探す
      const subCheckbox = dashboardPage.locator('input[type="checkbox"]').nth(2); // 3番目のチェックボックス（0=重複許可、1=視聴者有効、2=サブ武器）
      const subIsChecked = await subCheckbox.isChecked();
      if (!subIsChecked) {
        await subCheckbox.click();
        console.log('サブ武器モードを許可しました');
        await dashboardPage.waitForTimeout(500);
      }
      
      // Step 3: 視聴者画面を開く
      console.log('Step 3: 視聴者画面を開く');
      await viewerPage.goto('/viewer');
      await viewerPage.waitForSelector('.splatoon-font');
      await viewerPage.waitForTimeout(2000); // WebSocket接続とロード完了を待機
      
      // Step 4: 視聴者画面でサブモードに切り替え
      console.log('Step 4: 視聴者画面でサブモードに切り替え');
      await viewerPage.click('button:has-text("サブ")');
      await viewerPage.waitForTimeout(500);
      
      // Step 5: 対象武器一覧を開く（ここでエラーが発生する可能性がある）
      console.log('Step 5: 対象武器一覧を開く');
      const weaponListButton = viewerPage.locator('button').filter({ hasText: /対象武器一覧/ });
      await expect(weaponListButton).toBeVisible();
      await weaponListButton.click();
      await viewerPage.waitForTimeout(1000);
      
      // Step 6: モーダルが正常に開いていることを確認
      console.log('Step 6: モーダルが正常に開いていることを確認');
      await expect(viewerPage.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
      
      // Step 7: フィルタリング説明文が正常に表示されていることを確認（WeaponUtilsエラーのチェック）
      console.log('Step 7: フィルタリング説明文を確認');
      const filterDescription = viewerPage.getByText(/サブ『.*』を持つ武器/);
      await expect(filterDescription).toBeVisible();
      
      // フィルタリング説明文の内容を確認
      const filterText = await filterDescription.textContent();
      console.log('フィルタリング説明文:', filterText);
      expect(filterText).toMatch(/サブ『.*』を持つ武器/);
      
      // Step 8: 武器リストが表示されていることを確認
      console.log('Step 8: 武器リストが表示されていることを確認');
      const weaponItems = viewerPage.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー|ブラスター|スピナー|マニューバー|シェルター|ストリンガー|ワイパー/ });
      const weaponCount = await weaponItems.count();
      console.log(`表示された武器数: ${weaponCount}`);
      expect(weaponCount).toBeGreaterThan(0);
      
      // Step 9: モーダルを閉じる
      console.log('Step 9: モーダルを閉じる');
      await viewerPage.click('button:has-text("閉じる")');
      await viewerPage.waitForTimeout(500);
      
      // Step 10: JavaScriptエラーがないことを確認
      console.log('Step 10: JavaScriptエラーチェック');
      console.log('ダッシュボードエラー:', dashboardErrors);
      console.log('視聴者画面エラー:', viewerErrors);
      
      expect(dashboardErrors).toHaveLength(0);
      expect(viewerErrors).toHaveLength(0);
      
      console.log('✅ ダッシュボード-視聴者画面統合テスト完了');
      
    } finally {
      // コンテキストをクリーンアップ
      await dashboardContext.close();
      await viewerContext.close();
    }
  });
  
  test('視聴者画面で全武器モードでも武器一覧が正常に動作する', async ({ browser }) => {
    console.log('=== 視聴者画面全武器モード武器一覧テスト ===');
    
    const dashboardContext = await browser.newContext();
    const viewerContext = await browser.newContext();
    
    const dashboardPage = await dashboardContext.newPage();
    const viewerPage = await viewerContext.newPage();
    
    try {
      // JavaScriptエラーを監視
      const viewerErrors = [];
      
      viewerPage.on('console', msg => {
        if (msg.type() === 'error') {
          viewerErrors.push(`Viewer: ${msg.text()}`);
        }
      });
      
      viewerPage.on('pageerror', error => {
        viewerErrors.push(`Viewer: ${error.toString()}`);
      });
      
      // 視聴者モードを有効化
      await dashboardPage.goto('/dashboard');
      await dashboardPage.waitForSelector('.splatoon-font');
      await dashboardPage.waitForTimeout(2000);
      
      const viewerToggle = dashboardPage.locator('#viewer-enabled');
      const isChecked = await viewerToggle.isChecked();
      if (!isChecked) {
        await viewerToggle.click();
        await dashboardPage.waitForTimeout(1000);
      }
      
      // すべての武器モードを許可
      const allWeaponsCheckbox = dashboardPage.locator('input[type="checkbox"]').nth(2); // すべての武器のチェックボックス
      const allWeaponsChecked = await allWeaponsCheckbox.isChecked();
      if (!allWeaponsChecked) {
        await allWeaponsCheckbox.click();
        await dashboardPage.waitForTimeout(500);
      }
      
      // 視聴者画面を開く
      await viewerPage.goto('/viewer');
      await viewerPage.waitForSelector('.splatoon-font');
      await viewerPage.waitForTimeout(2000);
      
      // すべての武器モードを選択
      await viewerPage.click('button:has-text("すべての武器")');
      await viewerPage.waitForTimeout(500);
      
      // 対象武器一覧を開く
      const weaponListButton = viewerPage.locator('button').filter({ hasText: /対象武器一覧/ });
      await weaponListButton.click();
      await viewerPage.waitForTimeout(1000);
      
      // モーダルが正常に開いていることを確認
      await expect(viewerPage.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
      
      // 全選択/全選択解除ボタンが表示されていることを確認
      const selectAllButton = viewerPage.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択|全選択解除/ }).first();
      await expect(selectAllButton).toBeVisible();
      
      // 武器リストが表示されていることを確認
      const weaponItems = viewerPage.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
      const weaponCount = await weaponItems.count();
      console.log(`表示された武器数: ${weaponCount}`);
      expect(weaponCount).toBeGreaterThan(0);
      
      // モーダルを閉じる
      await viewerPage.click('button:has-text("閉じる")');
      await viewerPage.waitForTimeout(500);
      
      // JavaScriptエラーがないことを確認
      expect(viewerErrors).toHaveLength(0);
      
      console.log('✅ 視聴者画面全武器モード武器一覧テスト完了');
      
    } finally {
      await dashboardContext.close();
      await viewerContext.close();
    }
  });
});