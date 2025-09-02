const { test, expect } = require('@playwright/test');

test.describe('ランダム性検証テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
  });

  test('武器選択のランダム性確認：分散度テスト', async ({ page }) => {
    console.log('=== 武器選択ランダム性テスト ===');
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 4人選択
    await page.click('button:has-text("4人")');
    await page.waitForTimeout(1000);
    
    // 結果を格納する配列
    const weaponResults = [];
    const testCount = 10; // 10回ガチャを実行
    
    for (let i = 0; i < testCount; i++) {
      console.log(`ガチャ実行 ${i + 1}/${testCount}`);
      
      // ガチャボタンクリック
      const gachaButton = page.locator('[data-testid="random-gacha-button"]');
      await gachaButton.click();
      
      // ガチャ完了まで待機
      await page.waitForTimeout(4000);
      
      // 武器名を取得
      const weaponNames = await page.locator('.weapon-result .weapon-name').allTextContents();
      weaponResults.push(weaponNames);
      
      console.log(`結果${i + 1}:`, weaponNames);
      
      // 次のテストのために少し待機
      await page.waitForTimeout(1000);
    }
    
    // ランダム性の分析
    const allWeapons = weaponResults.flat();
    const weaponCounts = {};
    
    allWeapons.forEach(weapon => {
      weaponCounts[weapon] = (weaponCounts[weapon] || 0) + 1;
    });
    
    const uniqueWeaponCount = Object.keys(weaponCounts).length;
    const totalWeaponSelections = allWeapons.length;
    
    console.log(`総選択数: ${totalWeaponSelections}回`);
    console.log(`ユニーク武器数: ${uniqueWeaponCount}種類`);
    console.log('武器別出現回数:', weaponCounts);
    
    // ランダム性の検証
    // 1. ユニーク武器数が十分に多いこと（少なくとも総選択数の50%以上）
    const uniquenessRatio = uniqueWeaponCount / totalWeaponSelections;
    console.log(`ユニーク率: ${(uniquenessRatio * 100).toFixed(2)}%`);
    
    // 2. 同一結果の連続発生がないこと
    let consecutiveDuplicates = 0;
    for (let i = 1; i < weaponResults.length; i++) {
      if (JSON.stringify(weaponResults[i]) === JSON.stringify(weaponResults[i - 1])) {
        consecutiveDuplicates++;
      }
    }
    
    console.log(`連続重複回数: ${consecutiveDuplicates}回`);
    
    // アサーション
    expect(uniqueWeaponCount).toBeGreaterThan(totalWeaponSelections * 0.3); // 30%以上のユニーク性
    expect(consecutiveDuplicates).toBeLessThanOrEqual(1); // 連続重複は最大1回まで許容
  });

  test('ガチャID生成のユニーク性確認', async ({ page }) => {
    console.log('=== ガチャID生成テスト ===');
    
    // コンソールメッセージを記録
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('gachaId') || text.includes('gacha_')) {
        consoleMessages.push(text);
      }
    });
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 1人選択
    await page.click('button:has-text("1人")');
    await page.waitForTimeout(1000);
    
    const idPattern = /gacha_[A-Za-z0-9]{14}/g;
    const foundIds = new Set();
    
    // 5回連続でガチャを実行
    for (let i = 0; i < 5; i++) {
      console.log(`ガチャ実行 ${i + 1}/5`);
      
      const gachaButton = page.locator('[data-testid="random-gacha-button"]');
      await gachaButton.click();
      await page.waitForTimeout(3000);
    }
    
    // コンソールメッセージからガチャIDを抽出
    consoleMessages.forEach(message => {
      const matches = message.match(idPattern);
      if (matches) {
        matches.forEach(id => foundIds.add(id));
      }
    });
    
    const uniqueIds = Array.from(foundIds);
    console.log('生成されたガチャID:', uniqueIds);
    console.log(`ユニークID数: ${uniqueIds.length}`);
    
    // ID形式の検証
    uniqueIds.forEach(id => {
      expect(id).toMatch(/^gacha_[A-Za-z0-9]{14}$/);
      console.log(`ID形式OK: ${id}`);
    });
    
    // ユニーク性の検証
    expect(uniqueIds.length).toBeGreaterThanOrEqual(3); // 少なくとも3つのユニークIDが生成されること
    
    // 時間ベースでない高エントロピー性の検証（IDが予測可能でない）
    if (uniqueIds.length >= 2) {
      const id1 = uniqueIds[0].substring(6); // "gacha_"を除去
      const id2 = uniqueIds[1].substring(6);
      
      // 2つのIDが大きく異なることを確認（ハミング距離）
      let differences = 0;
      for (let i = 0; i < Math.min(id1.length, id2.length); i++) {
        if (id1[i] !== id2[i]) differences++;
      }
      
      const differenceRatio = differences / Math.min(id1.length, id2.length);
      console.log(`ID差異率: ${(differenceRatio * 100).toFixed(2)}%`);
      
      // 50%以上の文字が異なることを期待
      expect(differenceRatio).toBeGreaterThan(0.5);
    }
  });

  test('シャッフルアルゴリズムの均等性確認', async ({ page }) => {
    console.log('=== シャッフル均等性テスト ===');
    
    // 武器モード選択
    await page.click('button:has-text("武器")');
    await page.waitForTimeout(1000);
    
    // 3人選択
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(1000);
    
    // 対象武器を少数に限定
    await page.click('button:has-text("対象武器")');
    await page.waitForTimeout(2000);
    
    // 全選択解除
    try {
      await page.click('button:has-text("全選択解除")', { timeout: 3000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('全選択解除ボタンなし');
    }
    
    // 特定の5つの武器のみ選択
    const weaponSelectors = [
      'div[data-weapon-id="52gal"]',
      'div[data-weapon-id="96gal"]',
      'div[data-weapon-id="splattershot"]',
      'div[data-weapon-id="splattershot_jr"]',
      'div[data-weapon-id="splat_roller"]'
    ];
    
    // 使用可能な武器を順次選択
    let selectedCount = 0;
    for (const selector of weaponSelectors) {
      try {
        await page.click(selector, { timeout: 1000 });
        selectedCount++;
        if (selectedCount >= 5) break;
      } catch (e) {
        // 武器が見つからない場合はスキップ
        console.log(`武器が見つからない: ${selector}`);
      }
    }
    
    // 見つからない場合は最初の5つの武器を選択
    if (selectedCount < 5) {
      const weaponElements = await page.locator('.cursor-pointer[data-weapon-id]').first().count();
      if (weaponElements > 0) {
        for (let i = 0; i < Math.min(5, weaponElements); i++) {
          await page.locator('.cursor-pointer[data-weapon-id]').nth(i).click();
        }
      }
    }
    
    await page.click('button:has-text("閉じる")');
    await page.waitForTimeout(2000);
    
    // 10回ガチャを実行して順序の分析
    const orderResults = [];
    for (let i = 0; i < 10; i++) {
      console.log(`順序テスト ${i + 1}/10`);
      
      const gachaButton = page.locator('[data-testid="random-gacha-button"]');
      await gachaButton.click();
      await page.waitForTimeout(3000);
      
      // 武器の順序を記録
      const weaponOrder = await page.locator('.weapon-result .weapon-name').allTextContents();
      orderResults.push(weaponOrder);
      
      console.log(`順序${i + 1}:`, weaponOrder);
      
      await page.waitForTimeout(1000);
    }
    
    // 順序の均等性を分析
    const positionAnalysis = {};
    for (let pos = 0; pos < 3; pos++) {
      positionAnalysis[pos] = {};
    }
    
    orderResults.forEach(result => {
      result.forEach((weapon, pos) => {
        if (!positionAnalysis[pos][weapon]) {
          positionAnalysis[pos][weapon] = 0;
        }
        positionAnalysis[pos][weapon]++;
      });
    });
    
    console.log('ポジション別武器分布:', positionAnalysis);
    
    // 各ポジションで最も多く選ばれた武器の出現率
    for (let pos = 0; pos < 3; pos++) {
      const weapons = Object.keys(positionAnalysis[pos]);
      if (weapons.length > 0) {
        const maxCount = Math.max(...Object.values(positionAnalysis[pos]));
        const dominanceRatio = maxCount / orderResults.length;
        
        console.log(`ポジション${pos + 1}の最大支配率: ${(dominanceRatio * 100).toFixed(2)}%`);
        
        // 特定の武器が70%以上支配しないことを確認
        expect(dominanceRatio).toBeLessThan(0.7);
      }
    }
  });
});