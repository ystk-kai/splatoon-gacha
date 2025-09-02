const { test, expect } = require('@playwright/test');

test.describe('Viewer Player Count Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ダッシュボードページに移動してセットアップ
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

  test('ダッシュボードで設定した人数が視聴者画面のガチャ結果に反映される', async ({ page, context }) => {
    console.log('=== 視聴者画面ガチャ人数連携テスト ===');
    
    // ダッシュボードで3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(500);
    
    // 外部公開設定を有効にする
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御を有効にする
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await viewerToggle.check();
    await page.waitForTimeout(200);
    
    // 武器ガチャを許可
    await page.click('text=武器ガチャ');
    await page.waitForTimeout(100);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // 視聴者画面を新しいページで開く
    const viewerPage = await context.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // 武器ガチャモードを選択
    await viewerPage.click('button:has-text("武器")');
    await viewerPage.waitForTimeout(200);
    
    // APIエンドポイントをモニタリング
    let gachaRequestData = null;
    viewerPage.on('request', request => {
      if (request.url().includes('/api/random-weapon') && request.url().includes('viewer=true')) {
        const url = new URL(request.url());
        gachaRequestData = {
          count: url.searchParams.get('count'),
          viewer: url.searchParams.get('viewer')
        };
      }
    });
    
    // ガチャボタンが有効であることを確認
    const gachaButton = viewerPage.locator('button:has-text("ガチャを回す！")');
    await expect(gachaButton).toBeEnabled();
    
    // ガチャを実行
    await gachaButton.click();
    
    // ガチャ実行中の表示を確認
    await viewerPage.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    console.log('視聴者画面: ガチャ開始');
    
    // ガチャ完了まで待機
    await viewerPage.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    console.log('視聴者画面: ガチャ完了');
    
    // ガチャ結果が3人分表示されていることを確認
    const gachaResults = viewerPage.locator('[class*="weapon-result"]');
    const resultCount = await gachaResults.count();
    
    // 結果がない場合は、別のセレクタで確認
    if (resultCount === 0) {
      const weaponImages = viewerPage.locator('img[src*="/images/weapons/"]');
      const imageCount = await weaponImages.count();
      expect(imageCount).toBeGreaterThanOrEqual(3);
      console.log(`✅ ガチャ結果確認: ${imageCount}個の武器が表示されています`);
    } else {
      expect(resultCount).toBeGreaterThanOrEqual(3);
      console.log(`✅ ガチャ結果確認: ${resultCount}個の結果が表示されています`);
    }
    
    // プレイヤー名が3人分表示されていることを確認
    const playerNames = viewerPage.locator('text=/Player [1-4]|プレイヤー[1-4]/');
    const nameCount = await playerNames.count();
    expect(nameCount).toBeGreaterThanOrEqual(3);
    console.log(`✅ プレイヤー名確認: ${nameCount}個のプレイヤー名が表示されています`);
    
    await viewerPage.close();
    console.log('✅ 視聴者画面ガチャ人数連携確認完了');
  });

  test('ダッシュボードの人数変更が即座に視聴者画面に反映される', async ({ page, context }) => {
    console.log('=== ダッシュボード人数変更の即座反映テスト ===');
    
    // 外部公開設定を有効にする
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御を有効にする
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await viewerToggle.check();
    await page.waitForTimeout(200);
    
    // 武器ガチャを許可
    await page.click('text=武器ガチャ');
    await page.waitForTimeout(100);
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // 初期状態で2人に設定
    await page.click('button:has-text("2人")');
    await page.waitForTimeout(500);
    
    // 視聴者画面を新しいページで開く
    const viewerPage = await context.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // 武器ガチャモードを選択
    await viewerPage.click('button:has-text("武器")');
    await viewerPage.waitForTimeout(200);
    
    // 最初のガチャを実行（2人分）
    await viewerPage.click('button:has-text("ガチャを回す！")');
    await viewerPage.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    await viewerPage.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    console.log('初回ガチャ完了（2人設定）');
    
    // ダッシュボードで4人に変更
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(1000); // WebSocket同期のための待機時間
    
    // 視聴者画面で再度ガチャを実行（4人分になるはず）
    await viewerPage.click('button:has-text("ガチャを回す！")');
    await viewerPage.waitForSelector('button:has-text("ガチャ中...")', { timeout: 5000 });
    await viewerPage.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    console.log('2回目ガチャ完了（4人設定に変更後）');
    
    // ガチャ結果が4人分表示されていることを確認
    const weaponImages = viewerPage.locator('img[src*="/images/weapons/"]');
    const imageCount = await weaponImages.count();
    expect(imageCount).toBeGreaterThanOrEqual(4);
    console.log(`✅ 4人分のガチャ結果確認: ${imageCount}個の武器が表示されています`);
    
    await viewerPage.close();
    console.log('✅ ダッシュボード人数変更の即座反映確認完了');
  });

  test('視聴者画面が無効状態でもダッシュボードの人数設定は維持される', async ({ page, context }) => {
    console.log('=== 視聴者画面無効時の人数設定維持テスト ===');
    
    // ダッシュボードで3人に設定
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(500);
    
    // 外部公開設定で視聴者画面制御を無効にする
    await page.click('button:has-text("外部公開設定")');
    await page.waitForTimeout(500);
    
    // 視聴者画面制御が無効であることを確認
    const viewerToggle = page.locator('input[type="checkbox"]').first();
    await expect(viewerToggle).not.toBeChecked();
    
    // 設定を保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(500);
    
    // 視聴者画面を新しいページで開く
    const viewerPage = await context.newPage();
    await viewerPage.goto('/viewer');
    await viewerPage.waitForSelector('.splatoon-font');
    await viewerPage.waitForTimeout(1000);
    
    // 視聴者画面が無効状態であることを確認
    const disabledMessage = viewerPage.locator('text=視聴者からのガチャ機能は無効');
    await expect(disabledMessage).toBeVisible();
    console.log('✅ 視聴者画面が無効状態であることを確認');
    
    // ダッシュボードに戻り、人数設定が維持されていることを確認
    const threePersonButton = page.locator('button:has-text("3人")');
    await expect(threePersonButton).toHaveClass(/from-splatoon-orange/);
    console.log('✅ ダッシュボードの3人設定が維持されていることを確認');
    
    await viewerPage.close();
    console.log('✅ 視聴者画面無効時の人数設定維持確認完了');
  });
});