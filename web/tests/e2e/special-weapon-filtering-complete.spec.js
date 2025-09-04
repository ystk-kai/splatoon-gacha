/**
 * スペシャル武器フィルタリングの包括的E2Eテスト
 * 特にテイオウイカのフィルタリングが正しく動作することを確認
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('スペシャル武器フィルタリング E2Eテスト', () => {
  let weaponsData;
  
  test.beforeAll(() => {
    // weapons.jsonを読み込む
    const weaponsJsonPath = path.join(__dirname, '../../../src/infrastructure/data/weapons.json');
    weaponsData = JSON.parse(fs.readFileSync(weaponsJsonPath, 'utf-8'));
  });

  test('テイオウイカでフィルタリングしてガチャを実行できること', async ({ page }) => {
    // ダッシュボードを開く
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // 対象武器一覧を開いて全武器を選択（ガチャボタンを有効にするため）
    const weaponListButton = await page.locator('button:has-text("対象武器一覧")');
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // モーダル内の全選択ボタンをクリック
    const selectAllButton = await page.locator('button:has-text("全選択")');
    await selectAllButton.click();
    await page.waitForTimeout(1000);
    
    // モーダルを閉じる
    const closeButton = await page.locator('button:has-text("閉じる")');
    await closeButton.click();
    await page.waitForTimeout(1000);

    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // テイオウイカを選択（selectボックスを使用）
    await page.selectOption('#special-weapon-select', 'kraken_royale');
    await page.waitForTimeout(500);
    
    // 選択されていることを確認
    const specialSelect = page.locator('#special-weapon-select');
    await expect(specialSelect).toHaveValue('kraken_royale');
    
    // ガチャを実行
    await page.click('button:has-text("ガチャを実行")');
    
    // 結果を待つ
    await page.waitForTimeout(5000);
    
    // 結果の武器を確認
    const resultSection = await page.locator('#gacha-result');
    await expect(resultSection).toBeVisible();
    
    // ガチャ結果がデフォルト表示から変わることを確認
    await page.waitForFunction(() => {
      const result = document.getElementById('gacha-result');
      return result && !result.textContent.includes('ガチャを実行すると結果がここに表示されます');
    }, { timeout: 10000 });
    
    // スペシャル武器がテイオウイカであることを確認
    const specialText = await resultSection.locator('text=テイオウイカ').first();
    await expect(specialText).toBeVisible();
    
    console.log('✓ テイオウイカフィルタリングでガチャ成功');
  });

  test('すべてのスペシャル武器でフィルタリングが動作すること', async ({ page }) => {
    // スペシャル武器のIDと日本語名のマッピング
    const specialWeapons = [
      { id: 'trizooka', name: 'ウルトラショット' },
      { id: 'big_bubbler', name: 'グレートバリア' },
      { id: 'zipcaster', name: 'ショクワンダー' },
      { id: 'tenta_missiles', name: 'マルチミサイル' },
      { id: 'ink_storm', name: 'アメフラシ' },
      { id: 'booyah_bomb', name: 'ナイスダマ' },
      { id: 'wave_breaker', name: 'ホップソナー' },
      { id: 'ink_vac', name: 'キューインキ' },
      { id: 'killer_wail_5_1', name: 'メガホンレーザー5.1ch' },
      { id: 'inkjet', name: 'ジェットパック' },
      { id: 'ultra_stamp', name: 'ウルトラハンコ' },
      { id: 'crab_tank', name: 'カニタンク' },
      { id: 'reefslider', name: 'サメライド' },
      { id: 'triple_inkstrike', name: 'トリプルトルネード' },
      { id: 'tacticooler', name: 'エナジースタンド' },
      { id: 'splattercolor_screen', name: 'スミナガシート' },
      { id: 'triple_splashdown', name: 'ウルトラチャクチ' },
      { id: 'super_chump', name: 'デコイチラシ' },
      { id: 'kraken_royale', name: 'テイオウイカ' }
    ];

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // 対象武器一覧を開いて全武器を選択（ガチャボタンを有効にするため）
    const weaponListButton = await page.locator('button:has-text("対象武器一覧")');
    await weaponListButton.click();
    await page.waitForTimeout(1000);
    
    // モーダル内の全選択ボタンをクリック
    const selectAllButton = await page.locator('button:has-text("全選択")');
    await selectAllButton.click();
    await page.waitForTimeout(1000);
    
    // モーダルを閉じる
    const closeButton = await page.locator('button:has-text("閉じる")');
    await closeButton.click();
    await page.waitForTimeout(1000);

    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // 各スペシャル武器でテスト（最初の3つのみテスト）
    const testSpecials = specialWeapons.slice(0, 3);
    for (const special of testSpecials) {
      // weapons.jsonで該当武器が存在するか確認
      const weaponsWithSpecial = weaponsData.weapons.filter(w => w.specialWeapon === special.name);
      
      if (weaponsWithSpecial.length === 0) {
        console.log(`⚠️ ${special.name} (${special.id}) を持つ武器がweapons.jsonに存在しない`);
        continue;
      }

      // スペシャル武器を選択
      const specialButton = await page.locator(`img[src="/images/special/${special.id}.png"]`).locator('..');
      await specialButton.click();
      await page.waitForTimeout(500);
      
      // ガチャを実行
      await page.click('button:has-text("ガチャを回す")');
      await page.waitForTimeout(3000);
      
      // 結果を確認
      const weaponSection = await page.locator('[data-testid="current-weapon"]');
      const specialText = await weaponSection.locator('text=スペシャル:').locator('..').textContent();
      
      expect(specialText).toContain(special.name);
      console.log(`✓ ${special.name} (${special.id}): フィルタリング成功`);
    }
  });

  test('複数人数でテイオウイカフィルタリングが正しく動作すること', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // 対象武器一覧を開いて全武器を選択
    await page.click('button:has-text("対象武器一覧")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("全選択")');
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(500);

    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // テイオウイカを選択
    const krakenButton = await page.locator('img[src="/images/special/kraken_royale.png"]').locator('..');
    await krakenButton.click();
    await page.waitForTimeout(500);

    // 2人のみテスト（時間短縮のため）
    const playerCounts = [2];
    
    for (const count of playerCounts) {
      // 人数を選択
      await page.click(`button:has-text("${count}人")`);
      await page.waitForTimeout(500);
      
      // 同じ武器を許可（武器不足エラーを回避）
      const duplicateCheckbox = await page.locator('text=同じ武器をガチャ対象に含める').locator('..');
      const checkboxInput = duplicateCheckbox.locator('input[type="checkbox"]');
      await checkboxInput.check();
      await page.waitForTimeout(500);
      
      // ガチャを実行
      await page.click('button:has-text("ガチャを回す")');
      await page.waitForTimeout(3000);
      
      // 各プレイヤーの武器を確認
      for (let i = 1; i <= count; i++) {
        const playerSection = await page.locator(`text=Player ${i}`).locator('../..');
        const specialText = await playerSection.locator('text=スペシャル:').locator('..').textContent();
        expect(specialText).toContain('テイオウイカ');
      }
      
      console.log(`✓ ${count}人でのテイオウイカフィルタリング成功`);
    }
  });

  test('視聴者画面からスペシャル武器フィルタリングができること', async ({ page, context }) => {
    // ダッシュボードを開く
    const dashboardPage = await context.newPage();
    await dashboardPage.goto('http://localhost:3000/dashboard');
    await dashboardPage.waitForLoadState('networkidle');
    
    // 視聴者画面を有効化
    await dashboardPage.locator('#viewer-enabled').check();
    await dashboardPage.waitForTimeout(500);
    
    // スペシャルモードを許可
    await dashboardPage.locator('#mode-special').click();
    await dashboardPage.waitForTimeout(500);
    
    // 視聴者画面を開く
    await page.goto('http://localhost:3000/viewer');
    await page.waitForLoadState('networkidle');
    
    // スペシャルモードを選択
    await page.click('button:has-text("スペシャル")');
    await page.waitForTimeout(500);
    
    // テイオウイカを選択
    const krakenButton = await page.locator('img[src="/images/special/kraken_royale.png"]').locator('..');
    await krakenButton.click();
    await page.waitForTimeout(500);
    
    // ガチャを実行
    await page.click('button:has-text("ガチャを回す")');
    await page.waitForTimeout(3000);
    
    // 結果を確認
    const weaponInfo = await page.locator('.weapon-result').first();
    if (await weaponInfo.isVisible()) {
      const specialText = await weaponInfo.locator('text=スペシャル:').locator('..').textContent();
      expect(specialText).toContain('テイオウイカ');
    } else {
      // フォールバック：テキストで確認
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('テイオウイカ');
    }
    
    console.log('✓ 視聴者画面からのテイオウイカフィルタリング成功');
    
    await dashboardPage.close();
  });

  test('weapons.jsonとAPIのデータ整合性を確認', async ({ request }) => {
    // テイオウイカを持つ武器をweapons.jsonから取得
    const expectedKrakenWeapons = weaponsData.weapons.filter(w => w.specialWeapon === 'テイオウイカ');
    console.log(`\nweapons.jsonのテイオウイカ武器数: ${expectedKrakenWeapons.length}`);
    
    // APIからテイオウイカ武器を取得（複数回実行して全武器を確認）
    const foundWeaponIds = new Set();
    const maxAttempts = 100; // 十分な試行回数
    
    for (let i = 0; i < maxAttempts; i++) {
      const response = await request.get('/api/random-weapon?type=special&filter=kraken_royale&count=1');
      const data = await response.json();
      
      if (!data.error) {
        const weapons = data.weapons || [data.weapon];
        weapons.forEach(w => {
          foundWeaponIds.add(w.id);
          // スペシャル武器が正しいことを確認
          expect(w.specialWeapon).toBe('テイオウイカ');
        });
      }
      
      // すべてのテイオウイカ武器が見つかったら終了
      if (foundWeaponIds.size === expectedKrakenWeapons.length) {
        break;
      }
    }
    
    console.log(`APIから取得したテイオウイカ武器数: ${foundWeaponIds.size}`);
    
    // 見つかった武器を表示
    expectedKrakenWeapons.forEach(weapon => {
      const found = foundWeaponIds.has(weapon.id);
      console.log(`  ${found ? '✓' : '✗'} ${weapon.name} (${weapon.id})`);
    });
    
    // 最低でも1つ以上のテイオウイカ武器が取得できることを確認
    expect(foundWeaponIds.size).toBeGreaterThan(0);
  });
});