const { test, expect } = require('@playwright/test');

// チェックボックス修正の検証テスト
test.describe('チェックボックス修正検証', () => {
  
  test('演出省略チェックボックスの動作確認', async ({ context }) => {
    const dashboardPage = await context.newPage();

    // ダッシュボードを開く
    await dashboardPage.goto('/dashboard');
    await dashboardPage.waitForLoadState('networkidle');

    console.log('Step 0: 設定をリセット');
    // 設定を初期状態（false）にリセット
    await dashboardPage.evaluate(async () => {
      await fetch('/api/overlay-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipAnimation: false })
      });
    });
    await dashboardPage.reload();
    await dashboardPage.waitForLoadState('networkidle');

    console.log('Step 1: 初期状態確認');
    const skipCheckbox = dashboardPage.locator('[data-testid="skip-animation-checkbox"]');
    
    // 初期状態は unchecked
    await expect(skipCheckbox).not.toBeChecked();
    console.log('✓ 初期状態: unchecked');

    console.log('Step 2: チェックボックスをクリック');
    await skipCheckbox.check();
    console.log('✓ check() 実行完了');

    // 即座に状態変更が反映されることを確認
    await expect(skipCheckbox).toBeChecked();
    console.log('✓ チェック状態確認: checked');

    console.log('Step 3: API設定確認');
    // API側で設定が保存されることを確認
    await dashboardPage.waitForTimeout(1000); // API呼び出し完了を待つ
    
    const apiResponse = await dashboardPage.evaluate(async () => {
      const response = await fetch('/api/overlay-config');
      return await response.json();
    });
    
    expect(apiResponse.skipAnimation).toBe(true);
    console.log('✓ API設定確認: skipAnimation = true');

    console.log('Step 4: チェックボックスを再度クリック（無効化）');
    await skipCheckbox.uncheck();
    await expect(skipCheckbox).not.toBeChecked();
    console.log('✓ チェック解除確認: unchecked');

    // API側でも更新されることを確認
    await dashboardPage.waitForTimeout(1000);
    const apiResponse2 = await dashboardPage.evaluate(async () => {
      const response = await fetch('/api/overlay-config');
      return await response.json();
    });
    
    expect(apiResponse2.skipAnimation).toBe(false);
    console.log('✓ API設定確認: skipAnimation = false');
    
    console.log('✅ チェックボックス修正検証完了');

    await dashboardPage.close();
  });

});