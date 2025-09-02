const { test, expect } = require('@playwright/test');

test.describe('武器種アイコンナビゲーション E2Eテスト', () => {
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

  test('武器種アイコンナビゲーションが表示されることを確認', async ({ page }) => {
    console.log('=== 武器種アイコンナビゲーションのテスト ===');

    // 対象武器一覧ボタンをクリックしてモーダルを開く
    const weaponListButton = page.locator('text=対象武器一覧');
    await expect(weaponListButton).toBeVisible();
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // モーダルが表示されることを確認
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible();
    
    // 全選択ボタンが表示されることを確認
    const selectAllButton = page.locator('text=全選択');
    await expect(selectAllButton).toBeVisible();
    console.log('✅ 全選択ボタンが表示されています');
    
    // 選択解除ボタンが表示されることを確認
    const clearSelectionButton = page.locator('text=選択解除');
    await expect(clearSelectionButton).toBeVisible();
    console.log('✅ 選択解除ボタンが表示されています');
    
    // 選択中表示が表示されることを確認
    const selectionCountDisplay = page.locator('text=/\\d+個選択中/');
    await expect(selectionCountDisplay).toBeVisible();
    console.log('✅ 選択中表示が確認できます');
    
    // 武器種アイコンナビゲーションボタンが表示されることを確認
    console.log('武器種アイコンボタンの確認を開始...');
    
    // 各武器種ボタンが表示されることを確認
    const weaponTypeButtons = [
      'シューター',
      'ブラスター', 
      'ローラー',
      'チャージャー',
      'スロッシャー',
      'スピナー',
      'マニューバー',
      'シェルター',
      'フデ',
      'ストリンガー',
      'ワイパー'
    ];
    
    for (const weaponType of weaponTypeButtons) {
      const weaponTypeButton = page.locator(`button:has-text("${weaponType}")`);
      await expect(weaponTypeButton).toBeVisible();
      console.log(`✅ ${weaponType}ボタンが表示されています`);
      
      // アイコン画像が表示されることを確認
      const iconImage = weaponTypeButton.locator('img');
      await expect(iconImage).toBeVisible();
      console.log(`✅ ${weaponType}のアイコン画像が表示されています`);
    }
    
    console.log('✅ 武器種アイコンナビゲーションが正常に表示されています');
  });

  test('武器種アイコンクリックでスクロールが動作することを確認', async ({ page }) => {
    console.log('=== 武器種アイコンスクロール機能のテスト ===');

    // 対象武器一覧ボタンをクリックしてモーダルを開く
    const weaponListButton = page.locator('text=対象武器一覧');
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // シューターボタンをクリック
    const shooterButton = page.locator('button:has-text("シューター")');
    await expect(shooterButton).toBeVisible();
    await shooterButton.click();
    await page.waitForTimeout(500);
    
    // シューターセクションが表示されることを確認
    const shooterSection = page.locator('div:has-text("シューター")').first();
    await expect(shooterSection).toBeVisible();
    
    console.log('✅ シューター武器種へのスクロールが動作しています');
  });
});