const { test, expect } = require('@playwright/test');

test.describe('Bore.pub 外部アクセステスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // テスト開始前にトンネル接続をリセット
    await page.request.post('/api/tunnel/stop');
    await page.waitForTimeout(1000);
  });

  test.afterEach(async ({ page }) => {
    // テスト終了後にトンネル接続を停止
    await page.request.post('/api/tunnel/stop');
  });

  test('Bore.pub トンネル作成と外部アクセステスト', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 初期状態確認
    await expect(page.getByText('⭕ 未接続')).toBeVisible();
    
    // 接続開始
    await page.click('button:has-text("接続開始")');
    
    // 接続完了を待機（最大60秒）
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // URLが表示されることを確認
    const urlElement = page.locator('code').filter({ hasText: /bore\.pub/ }).first();
    await expect(urlElement).toBeVisible();
    
    const tunnelUrlText = await urlElement.textContent();
    console.log('Generated tunnel URL:', tunnelUrlText);
    
    // URL形式の確認
    expect(tunnelUrlText).toMatch(/http:\/\/bore\.pub:\d+\/viewer/);
    
    // bore.pubのURLを抽出
    const urlMatch = tunnelUrlText.match(/(http:\/\/bore\.pub:\d+)\/viewer/);
    const boreUrl = urlMatch ? urlMatch[1] : null;
    
    if (boreUrl) {
      console.log('Testing external access to:', boreUrl + '/viewer');
      
      // 新しいブラウザコンテキストで外部URLにアクセステスト
      const newContext = await page.context().browser().newContext();
      const externalPage = await newContext.newPage();
      
      try {
        // タイムアウトを延長してbore.pubにアクセス
        await externalPage.goto(boreUrl + '/viewer', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // ページタイトルやコンテンツの確認
        const title = await externalPage.title();
        console.log('External page title:', title);
        
        // Splatoon Gachaのコンテンツが読み込まれているか確認
        await expect(externalPage.getByText('Splatoon Gacha')).toBeVisible({ timeout: 10000 });
        
        console.log('✅ External access via bore.pub successful!');
        
      } catch (error) {
        console.log('❌ External access failed:', error.message);
        
        // デバッグ用：ページのHTMLを取得
        const html = await externalPage.content();
        console.log('Page HTML (first 500 chars):', html.substring(0, 500));
        
        throw error;
      } finally {
        await externalPage.close();
        await newContext.close();
      }
    } else {
      throw new Error('Could not extract bore.pub URL from tunnel URL');
    }
    
    // 停止テスト
    await page.click('button:has-text("停止")');
    await expect(page.getByText('⭕ 未接続')).toBeVisible({ timeout: 10000 });
  });

  test('Bore.pub トンネル接続情報の詳細確認', async ({ page }) => {
    // Bore.pub サービスを選択
    await page.click('input[name="tunnelService"][value="bore"]');
    
    // 接続開始
    await page.click('button:has-text("接続開始")');
    
    // 接続完了を待機
    await expect(page.getByText('🌐 接続中')).toBeVisible({ timeout: 60000 });
    
    // 認証情報の確認
    await expect(page.getByText('認証情報:')).toBeVisible();
    await expect(page.getByText('認証不要でアクセスできます')).toBeVisible();
    
    // 視聴者への案内文の確認
    await expect(page.getByText('📢 視聴者への案内文')).toBeVisible();
    
    // コピーボタンの確認
    await expect(page.getByRole('button', { name: '📋 コピー' })).toBeVisible();
    await expect(page.getByRole('button', { name: '📋 全文をコピー' })).toBeVisible();
    
    // API経由でステータス確認
    const response = await page.request.get('/api/tunnel/status');
    const status = await response.json();
    
    console.log('Tunnel status from API:', status);
    
    expect(status.status).toBe('connected');
    expect(status.serviceType).toBe('bore');
    expect(status.authInfo.type).toBe('none');
    expect(status.url).toMatch(/http:\/\/bore\.pub:\d+/);
    
    // 停止
    await page.click('button:has-text("停止")');
    await expect(page.getByText('⭕ 未接続')).toBeVisible({ timeout: 10000 });
  });
});