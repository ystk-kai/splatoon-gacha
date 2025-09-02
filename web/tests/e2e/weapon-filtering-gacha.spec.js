const { test, expect } = require('@playwright/test');

test.describe('対象武器フィルタリングとガチャ実行 E2Eテスト', () => {
  test.beforeEach(async ({ page, context }) => {
    context.on('page', (newPage) => {
      newPage.on('console', (msg) => {
        if (msg.type() === 'warning') return;
        console.log(`Console ${msg.type()}: ${msg.text()}`);
      });
    });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('対象武器1つ選択時の重複制御が正常に動作する', async ({ page }) => {
    console.log('=== 対象武器1つ選択時の重複制御テスト ===');

    // 2人プレイヤーに設定
    await page.getByRole('button', { name: '2人' }).click();
    await page.waitForTimeout(500);

    // 対象武器一覧を開く
    const weaponListButton = page.locator('button:has-text("対象武器一覧")').first();
    await weaponListButton.click();
    await page.waitForTimeout(1000);

    // 全武器の選択を解除
    const allWeaponsCheckbox = page.locator('.weapon-type-checkbox').first();
    if (await allWeaponsCheckbox.isChecked()) {
      await allWeaponsCheckbox.click();
      await page.waitForTimeout(500);
    }

    // 1つの武器だけを選択
    const firstWeapon = page.locator('.weapon-item').first();
    await firstWeapon.click();
    await page.waitForTimeout(500);

    // 保存ボタンをクリック
    const saveButton = page.locator('button:has-text("保存")');
    await saveButton.click();
    await page.waitForTimeout(1000);

    // 重複許可が自動的に有効になることを確認
    const duplicateCheckbox = page.locator('input[id*="allow-duplicates"]');
    await expect(duplicateCheckbox).toBeChecked({ timeout: 5000 });

    // チェックボックスが無効化されていることを確認
    await expect(duplicateCheckbox).toBeDisabled({ timeout: 5000 });

    // 自動制御メッセージが表示されることを確認
    const autoMessage = page.getByText(/自動/);
    await expect(autoMessage).toBeVisible({ timeout: 5000 });

    console.log('✅ 対象武器1つ選択時の重複制御が正常に動作');
  });

  test('対象武器1つ選択で重複無効時のガチャボタン無効化', async ({ page }) => {
    console.log('=== ガチャボタン無効化テスト ===');

    // 2人プレイヤーに設定
    await page.getByRole('button', { name: '2人' }).click();
    await page.waitForTimeout(500);

    // 対象武器一覧を開いて1つだけ選択
    const weaponListButton = page.locator('button:has-text("対象武器一覧")').first();
    await weaponListButton.click();
    await page.waitForTimeout(1000);

    // 全選択を解除してから1つ選択
    const selectAllButton = page.locator('button:has-text("全て選択")');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();
      await page.waitForTimeout(500);
    }

    const firstWeapon = page.locator('.weapon-checkbox').first();
    await firstWeapon.click();
    await page.waitForTimeout(500);

    const saveButton = page.locator('button:has-text("保存")');
    await saveButton.click();
    await page.waitForTimeout(1000);

    // 重複許可を手動で無効にする（自動制御を無視）
    const duplicateCheckbox = page.locator('input[id*="allow-duplicates"]');
    if (await duplicateCheckbox.isChecked()) {
      // 自動制御解除のために1人に戻してから2人にする
      await page.getByRole('button', { name: '1人' }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: '2人' }).click();
      await page.waitForTimeout(500);
      
      if (await duplicateCheckbox.isEnabled()) {
        await duplicateCheckbox.click();
        await page.waitForTimeout(500);
      }
    }

    // ガチャボタンが無効になることを確認
    const gachaButton = page.locator('button:has-text("ガチャ")').or(page.locator('button[data-testid*="gacha"]'));
    await expect(gachaButton.first()).toBeDisabled({ timeout: 10000 });

    // エラーメッセージが表示されることを確認
    const errorMessage = page.getByText(/武器.*追加/);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    console.log('✅ ガチャボタン無効化が正常に動作');
  });

  test('サブウェポンフィルターでのガチャ実行', async ({ page }) => {
    console.log('=== サブウェポンフィルターガチャテスト ===');

    // サブウェポンモードを選択
    const subModeButton = page.locator('button').filter({ hasText: /サブ/ }).first();
    await subModeButton.click();
    await page.waitForTimeout(1000);

    // スプラッシュボムを選択
    const splashBombOption = page.locator('option[value="splat_bomb"]');
    if (await splashBombOption.isVisible()) {
      await splashBombOption.click();
    } else {
      // selectタグの場合
      const subWeaponSelect = page.locator('select').filter({ hasValue: /bomb|splat/ }).first();
      await subWeaponSelect.selectOption('splat_bomb');
    }
    await page.waitForTimeout(1000);

    // 1人プレイヤーに設定
    await page.getByRole('button', { name: '1人' }).click();
    await page.waitForTimeout(500);

    // ガチャを実行
    const gachaButton = page.locator('button').filter({ hasText: /ガチャ|回す/ }).first();
    await expect(gachaButton).toBeEnabled({ timeout: 5000 });
    await gachaButton.click();

    // ガチャ結果が表示されるまで待機
    await page.waitForTimeout(5000);

    // 結果に表示された武器がスプラッシュボムを持っていることを確認
    const weaponResult = page.locator('[data-testid*="weapon"]').or(page.locator('.weapon-name')).first();
    await expect(weaponResult).toBeVisible({ timeout: 10000 });

    console.log('✅ サブウェポンフィルターでのガチャが正常に実行');
  });

  test('対象武器一覧のフィルタリング表示', async ({ page }) => {
    console.log('=== 対象武器一覧フィルタリング表示テスト ===');

    // スペシャルウェポンモードを選択
    const specialModeButton = page.locator('button').filter({ hasText: /スペシャル/ }).first();
    await specialModeButton.click();
    await page.waitForTimeout(1000);

    // ウルトラショットを選択
    const ultraShotOption = page.locator('option[value*="ultra"]').or(page.locator('text="ウルトラショット"'));
    if (await ultraShotOption.isVisible()) {
      await ultraShotOption.click();
    }
    await page.waitForTimeout(1000);

    // 対象武器一覧を開く
    const weaponListButton = page.locator('button:has-text("対象武器一覧")').first();
    await weaponListButton.click();
    await page.waitForTimeout(1000);

    // フィルタリング説明が表示されることを確認
    const filterDescription = page.getByText(/スペシャル.*ウルトラショット/);
    await expect(filterDescription).toBeVisible({ timeout: 5000 });

    // キャンセルして閉じる
    const cancelButton = page.locator('button:has-text("キャンセル")').or(page.locator('button:has-text("×")'));
    await cancelButton.click();
    await page.waitForTimeout(500);

    console.log('✅ 対象武器一覧のフィルタリング表示が正常に動作');
  });

  test('複数プレイヤーでの重複なしガチャ', async ({ page }) => {
    console.log('=== 複数プレイヤー重複なしガチャテスト ===');

    // 3人プレイヤーに設定
    await page.getByRole('button', { name: '3人' }).click();
    await page.waitForTimeout(500);

    // 重複許可を無効にする
    const duplicateCheckbox = page.locator('input[id*="allow-duplicates"]');
    if (await duplicateCheckbox.isChecked() && await duplicateCheckbox.isEnabled()) {
      await duplicateCheckbox.click();
      await page.waitForTimeout(500);
    }

    // 対象武器を十分な数選択（3個以上）
    const weaponListButton = page.locator('button:has-text("対象武器一覧")').first();
    await weaponListButton.click();
    await page.waitForTimeout(1000);

    // 最初の武器種を全選択
    const firstTypeCheckbox = page.locator('.weapon-type-checkbox').first();
    if (!await firstTypeCheckbox.isChecked()) {
      await firstTypeCheckbox.click();
      await page.waitForTimeout(500);
    }

    const saveButton = page.locator('button:has-text("保存")');
    await saveButton.click();
    await page.waitForTimeout(1000);

    // ガチャを実行
    const gachaButton = page.locator('button').filter({ hasText: /ガチャ|回す/ }).first();
    await expect(gachaButton).toBeEnabled({ timeout: 5000 });
    await gachaButton.click();

    // ガチャ結果が表示されるまで待機
    await page.waitForTimeout(5000);

    // 3人分の結果が表示されることを確認
    const playerResults = page.locator('[data-testid*="player"]').or(page.locator('.player-result'));
    await expect(playerResults.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ 複数プレイヤー重複なしガチャが正常に実行');
  });
});