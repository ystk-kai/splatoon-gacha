const { test, expect } = require('@playwright/test');

test.describe('Basic Dashboard Operations', () => {
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

  test('ダッシュボードページが正常に読み込まれる', async ({ page }) => {
    console.log('=== ダッシュボード基本読み込みテスト ===');
    
    // タイトルが表示されていることを確認
    await expect(page.locator('text=武器ガチャ')).toBeVisible();
    
    // ガチャボタンが表示されていることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeVisible();
    
    // 人数選択ボタンが表示されていることを確認
    await expect(page.locator('button:has-text("1人")')).toBeVisible();
    await expect(page.locator('button:has-text("2人")')).toBeVisible();
    await expect(page.locator('button:has-text("3人")')).toBeVisible();
    await expect(page.locator('button:has-text("4人")')).toBeVisible();
    
    console.log('✅ ダッシュボード基本要素の表示確認完了');
  });

  test('ガチャモードの切り替えが正常に動作する', async ({ page }) => {
    console.log('=== ガチャモード切り替えテスト ===');
    
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
    await expect(page.locator('text=サブ武器を選択：')).toBeVisible();
    
    // スペシャルモードに切り替え
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // JavaScriptエラーがないことを確認
    expect(jsErrors).toHaveLength(0);
    
    const specialModeButton = page.getByRole('button', { name: 'スペシャル' });
    await expect(specialModeButton).toHaveClass(/from-splatoon-orange/);
    
    // スペシャル選択UIが表示されていることを確認
    await expect(page.locator('text=スペシャル武器を選択：')).toBeVisible();
    
    // 武器種別モードに切り替え
    await page.click('button:has-text("武器種別")');
    await page.waitForTimeout(500);
    
    // JavaScriptエラーがないことを確認
    expect(jsErrors).toHaveLength(0);
    
    const weaponTypeModeButton = page.getByRole('button', { name: '武器種別' });
    await expect(weaponTypeModeButton).toHaveClass(/from-splatoon-orange/);
    
    // すべての武器モードに戻る
    await page.click('button:has-text("すべての武器")');
    await page.waitForTimeout(500);
    
    // JavaScriptエラーがないことを確認
    expect(jsErrors).toHaveLength(0);
    
    const allWeaponModeButton = page.getByRole('button', { name: 'すべての武器' });
    await expect(allWeaponModeButton).toHaveClass(/from-splatoon-orange/);
    
    console.log('✅ ガチャモード切り替え動作確認完了（JavaScriptエラーなし）');
  });

  test('武器モードで対象武器一覧が表示される', async ({ page }) => {
    console.log('=== 武器モード対象武器一覧表示テスト ===');
    
    // すべての武器モードを選択
    await page.click('button:has-text("すべての武器")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧ボタンを探す
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await expect(weaponListButton).toBeVisible();
    
    // ボタンをクリック
    await weaponListButton.click();
    await page.waitForTimeout(500);
    
    // モーダルが開いていることを確認（より具体的なセレクター）
    await expect(page.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
    
    // 全選択/全解除ボタンが表示されていることを確認（モーダル上部のメインボタンを対象）
    const selectAllButton = page.locator('.flex.gap-4.mt-4 button').filter({ hasText: /全選択|全選択解除/ }).first();
    await expect(selectAllButton).toBeVisible();
    
    // 武器リストが表示されていることを確認
    const weaponItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /シューター|ローラー|チャージャー/ });
    await expect(weaponItems.first()).toBeVisible();
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(100);
    
    console.log('✅ 武器モード対象武器一覧表示確認完了');
  });

  test('サブウェポンモードでサブ選択が動作する', async ({ page }) => {
    console.log('=== サブウェポンモード動作テスト ===');
    
    // サブモードに切り替え
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(100);
    
    // サブウェポン選択ボタングリッドが表示されることを確認
    const subWeaponGrid = page.locator('.grid.grid-cols-3');
    await expect(subWeaponGrid).toBeVisible();
    
    // デフォルトで選択されているサブウェポンボタンがあることを確認
    const selectedSubButton = page.locator('button').filter({ hasClass: /bg-splatoon-orange/ }).first();
    await expect(selectedSubButton).toBeVisible();
    
    // 別のサブウェポンボタンをクリック（キューバンボム）
    const cubanBombButton = page.locator('button').filter({ hasText: 'キューバンボム' }).first();
    if (await cubanBombButton.count() > 0) {
      await cubanBombButton.click();
      await page.waitForTimeout(200);
    }
    
    console.log('✅ サブウェポンモード動作確認完了');
  });

  test('人数選択が正常に動作する', async ({ page }) => {
    console.log('=== 人数選択テスト ===');
    
    // 初期状態で1人が選択されていることを確認
    const onePersonButton = page.locator('button:has-text("1人")');
    await expect(onePersonButton).toHaveClass(/from-splatoon-orange/);
    
    // 2人を選択
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(100);
    
    const twoPersonButton = page.locator('button:has-text("2人")');
    await expect(twoPersonButton).toHaveClass(/from-splatoon-orange/);
    
    // 3人を選択
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(100);
    
    const threePersonButton = page.locator('button:has-text("3人")');
    await expect(threePersonButton).toHaveClass(/from-splatoon-orange/);
    
    // 4人を選択
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(100);
    
    const fourPersonButton = page.locator('button:has-text("4人")');
    await expect(fourPersonButton).toHaveClass(/from-splatoon-orange/);
    
    console.log('✅ 人数選択動作確認完了');
  });

  test('基本的なガチャ実行ができる', async ({ page }) => {
    console.log('=== 基本ガチャ実行テスト ===');
    
    // 1人に設定
    await page.click('button:has-text("1人")');
    await page.waitForTimeout(100);
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(100);
    
    // ガチャボタンが有効であることを確認
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    // ガチャを実行
    await gachaButton.click();
    
    // ガチャ実行中の表示を確認
    await page.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    console.log('ガチャ開始: ガチャボタンが\"ガチャ中...\"に変化');
    
    // ガチャ完了まで待機
    await page.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    console.log('ガチャ完了: ガチャボタンが\"ガチャを回す！\"に戻った');
    
    console.log('✅ 基本ガチャ実行確認完了');
  });

  test('重複許可設定が正常に動作する', async ({ page }) => {
    console.log('=== 重複許可設定テスト ===');
    
    // 武器モードを選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(100);
    
    // 重複許可チェックボックスを探す
    const duplicateCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(duplicateCheckbox).toBeVisible();
    
    // 初期状態を確認
    const initialChecked = await duplicateCheckbox.isChecked();
    console.log('初期状態の重複許可:', initialChecked);
    
    // チェックボックスをクリック
    await duplicateCheckbox.click();
    await page.waitForTimeout(100);
    
    // 状態が変化していることを確認
    const afterClick = await duplicateCheckbox.isChecked();
    expect(afterClick).toBe(!initialChecked);
    
    console.log('✅ 重複許可設定動作確認完了');
  });
});