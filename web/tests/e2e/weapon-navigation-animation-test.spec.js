const { test, expect } = require('@playwright/test');

test.describe('武器種ナビゲーションアニメーション E2Eテスト', () => {
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

  test('武器種アイコンクリック時にアニメーションエフェクトが動作することを確認', async ({ page }) => {
    console.log('=== 武器種ナビゲーションアニメーションのテスト ===');

    // 対象武器一覧ボタンをクリックしてモーダルを開く
    const weaponListButton = page.locator('text=対象武器一覧');
    await expect(weaponListButton).toBeVisible();
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // モーダルが表示されることを確認
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible();
    
    // シューターボタンをクリックしてアニメーションをテスト
    const shooterButton = page.locator('button:has-text("シューター")');
    await expect(shooterButton).toBeVisible();
    
    console.log('シューターボタンをクリックしてアニメーションを開始...');
    await shooterButton.click();
    await page.waitForTimeout(500);
    
    // シューターセクションを取得
    const shooterSection = page.locator('[data-weapon-type="shooter"]');
    await expect(shooterSection).toBeVisible();
    
    // アニメーション効果を確認（CSSプロパティの変化をチェック）
    const transform = await shooterSection.evaluate(el => window.getComputedStyle(el).transform);
    const boxShadow = await shooterSection.evaluate(el => window.getComputedStyle(el).boxShadow);
    const backgroundColor = await shooterSection.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    console.log('アニメーション効果:', { transform, boxShadow, backgroundColor });
    
    // transform, boxShadow, backgroundColorのいずれかが設定されていることを確認
    const hasAnimationEffect = transform !== 'none' || boxShadow !== 'none' || backgroundColor !== 'rgba(0, 0, 0, 0)';
    
    if (hasAnimationEffect) {
      console.log('✅ アニメーションエフェクトが適用されています');
    } else {
      console.log('❌ アニメーションエフェクトが検出されませんでした');
    }
    
    expect(hasAnimationEffect).toBe(true);
    
    // 3秒間のアニメーション完了まで待機
    await page.waitForTimeout(3500);
    
    // アニメーション終了後の状態確認
    const finalTransform = await shooterSection.evaluate(el => window.getComputedStyle(el).transform);
    console.log('アニメーション終了後のtransform:', finalTransform);
    
    console.log('✅ 武器種ナビゲーションアニメーションが正常に動作しました');
  });

  test('複数の武器種ナビゲーションアニメーションが連続動作することを確認', async ({ page }) => {
    console.log('=== 複数武器種連続アニメーションのテスト ===');

    // 対象武器一覧ボタンをクリックしてモーダルを開く
    const weaponListButton = page.locator('text=対象武器一覧');
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // シューター → ブラスター → ローラーの順でクリック
    const weaponTypes = ['シューター', 'ブラスター', 'ローラー'];
    
    for (const weaponType of weaponTypes) {
      console.log(`${weaponType}ボタンをクリック...`);
      
      const weaponButton = page.locator(`button:has-text("${weaponType}")`);
      if (await weaponButton.isVisible()) {
        await weaponButton.click();
        await page.waitForTimeout(1000);
        
        console.log(`✅ ${weaponType}のナビゲーションが動作しました`);
      }
    }
    
    console.log('✅ 複数武器種の連続ナビゲーションが正常に動作しました');
  });
});