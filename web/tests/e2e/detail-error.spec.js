const { test, expect } = require('@playwright/test');

test.describe('詳細エラー確認', () => {
  test('JavaScriptエラーの詳細', async ({ page }) => {
    // ページエラーを記録
    page.on('pageerror', error => {
      console.log('🔴 Page Error:', error.message);
      console.log('   Stack:', error.stack);
    });
    
    // コンソールメッセージを記録
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
        // エラーの引数を取得
        msg.args().forEach(async arg => {
          try {
            const value = await arg.jsonValue();
            console.log('   Arg:', value);
          } catch (e) {
            // ignore
          }
        });
      }
    });
    
    // ページアクセス
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    
    // 少し待機
    await page.waitForTimeout(3000);
    
    // ページのHTML取得
    const bodyHTML = await page.$eval('body', el => el.innerHTML);
    
    // エラーメッセージがHTMLに含まれているか確認
    if (bodyHTML.includes('error') || bodyHTML.includes('Error')) {
      console.log('⚠️ HTML contains error text');
      // エラー部分を抽出
      const errorMatch = bodyHTML.match(/error[^<]*/gi);
      if (errorMatch) {
        console.log('Error text found:', errorMatch[0]);
      }
    }
    
    // React開発ツールのエラー確認
    const reactErrors = await page.evaluate(() => {
      const errors = [];
      // React DevToolsのエラーメッセージを探す
      const errorNodes = document.querySelectorAll('[style*="color: red"]');
      errorNodes.forEach(node => {
        errors.push(node.textContent);
      });
      return errors;
    });
    
    if (reactErrors.length > 0) {
      console.log('React Error Messages:', reactErrors);
    }
    
    // コンポーネントの状態を確認
    const componentState = await page.evaluate(() => {
      try {
        // ControlAppが定義されているか
        const hasControlApp = typeof ControlApp !== 'undefined';
        
        // Reactコンポーネントが正常にレンダリングされているか
        const rootElement = document.getElementById('root');
        const hasChildren = rootElement && rootElement.children.length > 0;
        
        return {
          hasControlApp,
          hasChildren,
          rootHTML: rootElement ? rootElement.innerHTML.substring(0, 200) : 'no root'
        };
      } catch (e) {
        return { error: e.toString() };
      }
    });
    
    console.log('Component State:', componentState);
  });
});