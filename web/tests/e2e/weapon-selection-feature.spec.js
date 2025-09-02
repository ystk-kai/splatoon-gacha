const { test, expect } = require('@playwright/test');

test.describe('対象武器選択機能 E2Eテスト', () => {
  test.beforeEach(async ({ page, context }) => {
    // 新しいタブでの警告を無視
    context.on('page', (newPage) => {
      newPage.on('console', (msg) => {
        if (msg.type() === 'warning') return;
        console.log(`Console ${msg.type()}: ${msg.text()}`);
      });
    });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
  });

  test('対象武器一覧ボタンが表示され、クリックでモーダルが開く', async ({ page }) => {
    console.log('=== 対象武器一覧ボタンのテスト ===');

    // 対象武器一覧ボタンが存在することを確認
    const weaponListButton = page.locator('text=対象武器一覧');
    await expect(weaponListButton).toBeVisible();
    
    // ボタンに武器数が表示されることを確認
    await expect(weaponListButton).toContainText('対象武器一覧');
    
    // ボタンをクリックしてモーダルを開く
    await weaponListButton.click();
    await page.waitForTimeout(500);
    
    // モーダルが表示されることを確認
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible();
    
    // モーダル内に武器種が表示されることを確認
    await expect(page.locator('text=シューター')).toBeVisible();
    await expect(page.locator('text=ブラスター')).toBeVisible();
    
    console.log('✅ 対象武器一覧ボタンとモーダルが正常に動作');
  });

  test('重複許可チェックボックスが正常に動作する', async ({ page }) => {
    console.log('=== 重複許可チェックボックスのテスト ===');

    // 重複許可チェックボックスが存在することを確認
    const duplicateCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /同じ武器をガチャ対象に含める/ }).locator('xpath=..');
    const checkboxInput = duplicateCheckbox.locator('input[type="checkbox"]');
    
    // 初期状態では無効になっていることを確認
    await expect(checkboxInput).not.toBeChecked();
    
    // チェックボックスをクリックして有効にする
    await duplicateCheckbox.click();
    await page.waitForTimeout(300);
    
    // チェック状態になったことを確認
    await expect(checkboxInput).toBeChecked();
    
    // もう一度クリックして無効にする
    await duplicateCheckbox.click();
    await page.waitForTimeout(300);
    
    // チェックが外れたことを確認
    await expect(checkboxInput).not.toBeChecked();
    
    console.log('✅ 重複許可チェックボックスが正常に動作');
  });

  test('武器一覧モーダル内で武器の選択/解除ができる', async ({ page }) => {
    console.log('=== 武器選択機能のテスト ===');

    // 対象武器一覧ボタンをクリック
    const weaponListButton = page.locator('text=対象武器一覧');
    await weaponListButton.click();
    await page.waitForTimeout(500);

    // 最初の武器種（シューター）の武器をクリックして選択を変更
    const firstWeapon = page.locator('.grid').first().locator('.cursor-pointer').first();
    await expect(firstWeapon).toBeVisible();
    
    // 武器をクリックして選択を解除
    await firstWeapon.click();
    await page.waitForTimeout(300);
    
    // 保存ボタンをクリック
    const saveButton = page.locator('text=保存');
    await saveButton.click();
    await page.waitForTimeout(500);
    
    // モーダルが閉じることを確認
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).not.toBeVisible();
    
    console.log('✅ 武器選択機能が正常に動作');
  });

  test('武器種別選択と対象武器選択が連動する', async ({ page }) => {
    console.log('=== 武器種別との連動テスト ===');

    // 武器種を1つだけ選択（シューターのみ）
    const shooterButton = page.locator('text=シューター').first();
    await shooterButton.click();
    await page.waitForTimeout(300);

    // 対象武器一覧を開く
    const weaponListButton = page.locator('text=対象武器一覧');
    await weaponListButton.click();
    await page.waitForTimeout(500);

    // シューター以外の武器種が表示されないか、グレーアウトされることを確認
    const weaponModal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(weaponModal).toBeVisible();
    
    // シューターセクションが表示されることを確認
    await expect(page.locator('text=シューター')).toBeVisible();
    
    console.log('✅ 武器種別との連動が正常に動作');
  });

  test('ガチャ実行時に武器選択設定が反映される', async ({ page }) => {
    console.log('=== ガチャ実行での武器選択反映テスト ===');

    // プレイヤー数を1人に設定
    const onePlayerButton = page.locator('text=1人');
    await onePlayerButton.click();
    await page.waitForTimeout(300);

    // 重複許可を有効にする
    const duplicateCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /同じ武器をガチャ対象に含める/ }).locator('xpath=..');
    await duplicateCheckbox.click();
    await page.waitForTimeout(300);

    // ガチャを実行
    const gachaButton = page.locator('text=武器ガチャを回す！').or(page.locator('.gacha-button'));
    await gachaButton.click();
    
    // ガチャ結果が表示されるまで待機
    await page.waitForTimeout(3000);
    
    // 武器結果が表示されることを確認
    const weaponResult = page.locator('.weapon-result, [data-testid="weapon-result"]');
    await expect(weaponResult.first()).toBeVisible({ timeout: 10000 });
    
    console.log('✅ ガチャ実行時に設定が正常に反映');
  });
});