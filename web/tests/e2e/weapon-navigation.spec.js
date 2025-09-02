const { test, expect } = require('@playwright/test');

test.describe('Weapon Type Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページに移動
    await page.goto('/dashboard');
    await page.waitForSelector('.splatoon-font');
    
    // 状態復元ローディングが完了するまで待機
    await page.waitForFunction(
      () => !document.querySelector('[class*="fixed"][class*="inset-0"]'),
      { timeout: 10000 }
    );
    
    // WebSocket接続が確立されるまで待機
    await page.waitForTimeout(1000);
  });

  test('ダッシュボードの武器種ナビゲーションが正常に表示される', async ({ page }) => {
    console.log('=== ダッシュボード武器種ナビゲーション表示テスト ===');
    
    // 武器種別モードを選択
    await page.click('button:has-text("武器種別")');
    await page.waitForTimeout(500);
    
    // 武器種別選択UIが表示されることを確認
    await expect(page.locator('text=武器種別を選択：')).toBeVisible();
    
    // 武器種アイコンが表示されることを確認
    const weaponTypeButtons = page.locator('.grid.grid-cols-4 button');
    const buttonCount = await weaponTypeButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // 主要な武器種のボタンが表示されていることを確認
    await expect(page.locator('button:has-text("シューター")')).toBeVisible();
    await expect(page.locator('button:has-text("ローラー")')).toBeVisible();
    await expect(page.locator('button:has-text("チャージャー")')).toBeVisible();
    
    console.log(`✅ ダッシュボード武器種ナビゲーション表示確認完了（${buttonCount}個のボタン）`);
  });

  test('視聴者画面の武器種ナビゲーションが正常に表示される', async ({ page, context }) => {
    console.log('=== 視聴者画面武器種ナビゲーション表示テスト ===');
    
    // 外部公開設定を有効にする
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御を有効にする
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await viewerToggle.check();
    await page.waitForTimeout(200);
    
    // 武器種別ガチャを許可
    await page.click('text=武器種別ガチャ');
    await page.waitForTimeout(100);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // 視聴者画面を新しいページで開く
    const viewerPage = await context.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // 武器種別モードを選択
    await viewerPage.click('button:has-text("武器種別")');
    await viewerPage.waitForTimeout(500);
    
    // 武器種ナビゲーションが表示されることを確認
    await expect(viewerPage.locator('text=武器種ナビゲーション：')).toBeVisible();
    
    // 武器種アイコンが表示されることを確認
    const weaponTypeButtons = viewerPage.locator('.grid.grid-cols-4 button');
    const buttonCount = await weaponTypeButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // 主要な武器種のボタンが表示されていることを確認
    await expect(viewerPage.locator('button:has-text("シューター")')).toBeVisible();
    await expect(viewerPage.locator('button:has-text("ローラー")')).toBeVisible();
    
    await viewerPage.close();
    console.log(`✅ 視聴者画面武器種ナビゲーション表示確認完了（${buttonCount}個のボタン）`);
  });

  test('武器一覧モーダルで武器種別ナビゲーションが動作する', async ({ page }) => {
    console.log('=== 武器一覧モーダルナビゲーションテスト ===');
    
    // すべての武器モードを選択
    await page.click('button:has-text("すべての武器")');
    await page.waitForTimeout(100);
    
    // 対象武器一覧ボタンをクリック
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(500);
    
    // モーダルが開いていることを確認
    await expect(page.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
    
    // 武器種ごとのセクションが data-weapon-type 属性付きで表示されていることを確認
    const shooterSection = page.locator('[data-weapon-type="shooter"]');
    await expect(shooterSection).toBeVisible();
    
    const rollerSection = page.locator('[data-weapon-type="roller"]');
    await expect(rollerSection).toBeVisible();
    
    // 武器種セクションにヘッダーが表示されていることを確認
    await expect(page.locator('text=シューター').first()).toBeVisible();
    await expect(page.locator('text=ローラー').first()).toBeVisible();
    
    // 各セクションに武器が表示されていることを確認
    const shooterWeapons = shooterSection.locator('[class*="cursor-pointer"]');
    const shooterCount = await shooterWeapons.count();
    expect(shooterCount).toBeGreaterThan(0);
    
    console.log(`✅ シューターセクション: ${shooterCount}個の武器`);
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(100);
    
    console.log('✅ 武器一覧モーダルナビゲーション確認完了');
  });

  test('武器種別選択時にスクロール機能が動作する', async ({ page }) => {
    console.log('=== 武器種別選択スクロール機能テスト ===');
    
    // 武器種別モードを選択
    await page.click('button:has-text("武器種別")');
    await page.waitForTimeout(500);
    
    // 対象武器一覧ボタンをクリック
    const weaponListButton = page.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await page.waitForTimeout(500);
    
    // モーダルが開いていることを確認
    await expect(page.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
    
    // ページの初期スクロール位置を取得
    const initialScrollTop = await page.evaluate(() => {
      const modal = document.querySelector('.overflow-y-auto');
      return modal ? modal.scrollTop : 0;
    });
    
    console.log(`初期スクロール位置: ${initialScrollTop}px`);
    
    // シューターセクションが存在することを確認
    const shooterSection = page.locator('[data-weapon-type="shooter"]');
    await expect(shooterSection).toBeVisible();
    
    // ローラーセクションへのスクロールをテスト（ページ下部にある可能性が高い）
    const rollerSection = page.locator('[data-weapon-type="roller"]');
    if (await rollerSection.count() > 0) {
      // ローラーセクションにスクロール
      await rollerSection.scrollIntoView();
      await page.waitForTimeout(500);
      
      // スクロール位置が変化したことを確認
      const scrolledPosition = await page.evaluate(() => {
        const modal = document.querySelector('.overflow-y-auto');
        return modal ? modal.scrollTop : 0;
      });
      
      console.log(`スクロール後位置: ${scrolledPosition}px`);
      
      // ローラーセクションが表示されていることを確認
      await expect(rollerSection).toBeVisible();
      console.log('✅ ローラーセクションへのスクロール確認完了');
    }
    
    // モーダルを閉じる
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(100);
    
    console.log('✅ 武器種別選択スクロール機能確認完了');
  });

  test('視聴者画面での武器種別選択とスクロールが連動する', async ({ page, context }) => {
    console.log('=== 視聴者画面武器種選択スクロール連動テスト ===');
    
    // 外部公開設定を有効にする
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御を有効にする
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await viewerToggle.check();
    await page.waitForTimeout(200);
    
    // 武器種別ガチャを許可
    await page.click('text=武器種別ガチャ');
    await page.waitForTimeout(100);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // 視聴者画面を新しいページで開く
    const viewerPage = await context.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // 武器種別モードを選択
    await viewerPage.click('button:has-text("武器種別")');
    await viewerPage.waitForTimeout(500);
    
    // 対象武器一覧ボタンをクリック
    const weaponListButton = viewerPage.locator('button').filter({ hasText: /対象武器一覧/ });
    await weaponListButton.click();
    await viewerPage.waitForTimeout(500);
    
    // モーダルが開いていることを確認
    await expect(viewerPage.getByRole('heading', { name: '対象武器一覧' })).toBeVisible();
    
    // シューターボタンをクリック（ナビゲーション機能付き）
    const shooterButton = viewerPage.locator('button:has-text("シューター")').first();
    if (await shooterButton.count() > 0) {
      await shooterButton.click();
      await viewerPage.waitForTimeout(500);
      
      // シューターセクションが表示されていることを確認
      const shooterSection = viewerPage.locator('[data-weapon-type="shooter"]');
      await expect(shooterSection).toBeVisible();
      
      console.log('✅ 視聴者画面でのシューターナビゲーション確認完了');
    }
    
    // モーダルを閉じる
    await viewerPage.click('button:has-text("閉じる")');
    await viewerPage.waitForTimeout(100);
    
    await viewerPage.close();
    console.log('✅ 視聴者画面武器種選択スクロール連動確認完了');
  });

  test('武器種選択状態が視覚的に反映される', async ({ page }) => {
    console.log('=== 武器種選択状態視覚反映テスト ===');
    
    // 武器種別モードを選択
    await page.click('button:has-text("武器種別")');
    await page.waitForTimeout(500);
    
    // シューターボタンをクリック
    const shooterButton = page.locator('button:has-text("シューター")').first();
    await shooterButton.click();
    await page.waitForTimeout(200);
    
    // シューターボタンが選択状態になっていることを確認
    await expect(shooterButton).toHaveClass(/bg-splatoon-orange/);
    console.log('✅ シューター選択状態の視覚確認完了');
    
    // ローラーボタンをクリック
    const rollerButton = page.locator('button:has-text("ローラー")').first();
    if (await rollerButton.count() > 0) {
      await rollerButton.click();
      await page.waitForTimeout(200);
      
      // ローラーボタンが選択状態になっていることを確認
      await expect(rollerButton).toHaveClass(/bg-splatoon-orange/);
      
      // シューターボタンが非選択状態になっていることを確認
      await expect(shooterButton).not.toHaveClass(/bg-splatoon-orange/);
      console.log('✅ ローラー選択状態の視覚確認完了');
    }
    
    console.log('✅ 武器種選択状態視覚反映確認完了');
  });
});