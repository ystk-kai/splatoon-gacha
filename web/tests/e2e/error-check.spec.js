const { test, expect } = require('@playwright/test');

test.describe('エラーチェック', () => {
  test('ページロードエラーの確認', async ({ page }) => {
    // コンソールエラーを記録
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // ページアクセス
    const response = await page.goto('/dashboard', { timeout: 15000 });
    console.log('Response Status:', response?.status());
    
    // ページロード待機
    await page.waitForTimeout(5000);
    
    // ページタイトル確認
    const title = await page.title();
    console.log('Page Title:', title);
    
    // ページコンテンツ確認
    const content = await page.content();
    console.log('Has content:', content.length > 1000);
    
    // 主要要素を確認
    const hasReactRoot = await page.locator('#root').count();
    console.log('Has React root:', hasReactRoot > 0);
    
    // JavaScript実行確認
    const jsResult = await page.evaluate(() => {
      return {
        hasReact: typeof React !== 'undefined',
        hasReactDOM: typeof ReactDOM !== 'undefined',
        hasBabel: typeof Babel !== 'undefined',
        hasControlApp: typeof ControlApp !== 'undefined'
      };
    });
    console.log('JS Environment:', jsResult);
    
    // エラーがないことを確認
    if (consoleErrors.length > 0) {
      console.log('❌ JavaScript Errors Found:', consoleErrors);
    } else {
      console.log('✅ No JavaScript Errors');
    }
    
    expect(consoleErrors.length).toBe(0);
  });
});