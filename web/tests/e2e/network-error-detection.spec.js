const { test, expect } = require('@playwright/test');

test.describe('Network Error and 404 Detection', () => {
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

  test('画像の404エラーを検出する', async ({ page }) => {
    console.log('=== 画像404エラー検出テスト ===');
    
    // ネットワークエラーを収集するためのリスナー設定
    const networkErrors = [];
    const imageErrors = [];
    
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        
        // 画像ファイルの404エラーを特別に記録
        if (response.url().match(/\.(png|jpg|jpeg|gif|svg)$/i) && response.status() === 404) {
          imageErrors.push({
            url: response.url(),
            status: response.status()
          });
        }
      }
    });

    // 対象武器一覧を開く（画像が多数読み込まれる）
    await page.click('button:has-text("対象武器一覧")');
    await page.waitForTimeout(2000);
    
    // スペシャルモードに切り替えて画像を読み込む
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(1000);
    
    // 対象武器一覧を再度開く（スペシャル武器画像を含む）
    await page.click('button:has-text("対象武器一覧")');
    await page.waitForTimeout(3000);
    
    console.log('Network errors found:', networkErrors.length);
    console.log('Image 404 errors found:', imageErrors.length);
    
    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors);
    }
    
    if (imageErrors.length > 0) {
      console.log('Image 404 errors:', imageErrors);
    }
    
    // 画像404エラーが発生していないことを確認
    expect(imageErrors).toHaveLength(0);
    
    // 一般的なネットワークエラーも確認（ただし画像以外のリソースは除外）
    const criticalErrors = networkErrors.filter(err => 
      err.status >= 500 || (err.status === 404 && !err.url.match(/\.(png|jpg|jpeg|gif|svg)$/i))
    );
    expect(criticalErrors).toHaveLength(0);
    
    console.log('✅ 画像404エラー検出テスト完了');
  });

  test('スペシャル武器画像の読み込みエラーを検出する', async ({ page }) => {
    console.log('=== スペシャル武器画像エラー検出テスト ===');
    
    const specialWeaponImageErrors = [];
    
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/images/special/')) {
        specialWeaponImageErrors.push({
          url: response.url(),
          weaponId: response.url().split('/images/special/')[1]?.replace('.png', '')
        });
      }
    });

    // スペシャルモードに切り替え
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(2000);
    
    // すべてのスペシャル武器ボタンをクリックして画像を確実に読み込む
    const specialButtons = page.locator('button').filter({ hasText: /trizooka|big_bubbler|zipcaster|tenta_missiles|ink_storm|booyah_bomb|wave_breaker|ink_vac|killer_wail|inkjet|ultra_stamp|crab_tank|reefslider|triple_inkstrike|tacticooler|splattercolor|triple_splashdown|super_chump|kraken/ });
    const buttonCount = await specialButtons.count();
    
    console.log(`Found ${buttonCount} special weapon buttons`);
    
    for (let i = 0; i < buttonCount; i++) {
      await specialButtons.nth(i).click();
      await page.waitForTimeout(200);
    }
    
    console.log('Special weapon image 404 errors:', specialWeaponImageErrors.length);
    
    if (specialWeaponImageErrors.length > 0) {
      console.log('Special weapon image errors:', specialWeaponImageErrors);
    }
    
    // スペシャル武器画像の404エラーが発生していないことを確認
    expect(specialWeaponImageErrors).toHaveLength(0);
    
    console.log('✅ スペシャル武器画像エラー検出テスト完了');
  });

  test('サブ武器画像の読み込みエラーを検出する', async ({ page }) => {
    console.log('=== サブ武器画像エラー検出テスト ===');
    
    const subWeaponImageErrors = [];
    
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/images/sub/')) {
        subWeaponImageErrors.push({
          url: response.url(),
          weaponId: response.url().split('/images/sub/')[1]?.replace('.png', '')
        });
      }
    });

    // サブモードに切り替え
    await page.click('button:has-text("サブ")');
    await page.waitForTimeout(2000);
    
    // すべてのサブ武器ボタンをクリックして画像を確実に読み込む
    const subButtons = page.locator('button').filter({ hasText: /splat_bomb|suction_bomb|burst_bomb|curling_bomb|autobomb|ink_mine|toxic_mist|point_sensor|splash_wall|sprinkler|squid_beakon|fizzy_bomb|torpedo|angle_shooter/ });
    const buttonCount = await subButtons.count();
    
    console.log(`Found ${buttonCount} sub weapon buttons`);
    
    for (let i = 0; i < buttonCount; i++) {
      await subButtons.nth(i).click();
      await page.waitForTimeout(200);
    }
    
    console.log('Sub weapon image 404 errors:', subWeaponImageErrors.length);
    
    if (subWeaponImageErrors.length > 0) {
      console.log('Sub weapon image errors:', subWeaponImageErrors);
    }
    
    // サブ武器画像の404エラーが発生していないことを確認
    expect(subWeaponImageErrors).toHaveLength(0);
    
    console.log('✅ サブ武器画像エラー検出テスト完了');
  });

  test('ガチャ結果に表示される武器画像の404エラーを検出する', async ({ page }) => {
    console.log('=== ガチャ結果武器画像エラー検出テスト ===');
    
    const weaponImageErrors = [];
    
    page.on('response', response => {
      if (response.status() === 404 && 
          (response.url().includes('/images/weapons/') || 
           response.url().includes('/images/sub/') || 
           response.url().includes('/images/special/'))) {
        weaponImageErrors.push({
          url: response.url(),
          type: response.url().includes('/images/weapons/') ? 'weapon' :
                response.url().includes('/images/sub/') ? 'sub' : 'special'
        });
      }
    });

    // ガチャを実行
    const gachaButton = page.locator('button:has-text("ガチャを回す！")');
    await gachaButton.click();
    
    // ガチャ完了まで待機
    await page.waitForSelector('button:has-text("ガチャを回す！")', { timeout: 15000 });
    await page.waitForTimeout(2000);
    
    console.log('Weapon image 404 errors in gacha result:', weaponImageErrors.length);
    
    if (weaponImageErrors.length > 0) {
      console.log('Weapon image errors in gacha result:', weaponImageErrors);
    }
    
    // ガチャ結果の武器画像404エラーが発生していないことを確認
    expect(weaponImageErrors).toHaveLength(0);
    
    console.log('✅ ガチャ結果武器画像エラー検出テスト完了');
  });
});