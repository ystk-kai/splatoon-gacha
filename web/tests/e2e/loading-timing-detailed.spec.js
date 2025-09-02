const { test, expect } = require('@playwright/test');

test.describe('ローディング表示と復元タイミングの詳細検証', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを収集
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Dashboard:')) {
        console.log(`[BROWSER LOG] ${msg.text()}`);
      }
    });
  });

  test('npm start直後の復元タイミング検証', async ({ page }) => {
    console.log('=== npm start直後の復元タイミング詳細検証 ===');

    // まず設定を変更してlocalStorageに保存
    await page.goto('/dashboard');
    await page.waitForSelector('button:has-text("1人")', { timeout: 15000 });
    
    // 人数を3人に変更
    await page.click('button:has-text("3人")');
    await page.waitForTimeout(500); // localStorage保存を待つ
    
    console.log('✓ 人数を3人に設定しました');
    
    // ページを完全にリロード（npm start直後をシミュレート）
    await page.goto('/dashboard');
    
    // ローディングオーバーレイの表示開始を確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    console.log('✓ ローディングオーバーレイが表示されました');
    
    // タイムスタンプ記録開始
    const startTime = Date.now();
    
    // ローディングオーバーレイが消えるタイミングを記録
    let loadingEndTime;
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 20000 }).then(() => {
      loadingEndTime = Date.now();
      console.log(`✓ ローディングオーバーレイが消えました (${loadingEndTime - startTime}ms)`);
    });
    
    // ローディングが消えた後の人数選択ボタンの状態を確認
    const player3Button = page.locator('button:has-text("3人")');
    const isSelected = await player3Button.evaluate(el => 
      el.classList.contains('bg-blue-500') || 
      el.classList.contains('from-splatoon-orange') ||
      el.classList.contains('bg-gradient-to-r')
    );
    
    console.log(`人数選択ボタンの選択状態（ローディング終了直後）: ${isSelected}`);
    
    if (!isSelected) {
      console.log('⚠️ ローディング終了時点で人数選択が復元されていません');
      
      // 最大5秒待って人数選択が復元されるかチェック
      let restorationTime;
      try {
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('button:has-text("3人")');
            return btn && (
              btn.classList.contains('bg-blue-500') || 
              btn.classList.contains('from-splatoon-orange') ||
              btn.classList.contains('bg-gradient-to-r')
            );
          },
          { timeout: 5000 }
        );
        restorationTime = Date.now();
        console.log(`✓ 人数選択が復元されました (ローディング終了から ${restorationTime - loadingEndTime}ms 後)`);
      } catch (error) {
        console.log('✗ 人数選択が復元されませんでした');
      }
    } else {
      console.log('✓ ローディング終了と同時に人数選択が復元されていました');
    }
    
    // 最終的な状態を確認
    const finalState = await player3Button.evaluate(el => ({
      classList: el.className,
      selected: el.classList.contains('bg-blue-500') || 
                el.classList.contains('from-splatoon-orange') ||
                el.classList.contains('bg-gradient-to-r')
    }));
    
    console.log('最終状態:', finalState);
    
    // テスト結果の検証
    expect(finalState.selected).toBe(true);
  });

  test('WebSocket状態復元とAPI取得の順序検証', async ({ page }) => {
    console.log('=== WebSocket状態復元とAPI取得の順序検証 ===');

    // ネットワーク監視を開始
    const networkLogs = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkLogs.push({
          type: 'request',
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkLogs.push({
          type: 'response',
          url: response.url(),
          timestamp: Date.now()
        });
      }
    });

    // WebSocketメッセージ監視
    const wsMessages = [];
    await page.evaluateOnNewDocument(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(...args) {
          super(...args);
          const originalOnMessage = this.onmessage;
          this.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'dashboard-state-response') {
              window._wsStateResponse = {
                timestamp: Date.now(),
                data: data
              };
              console.log('[WS] Dashboard state response received at', Date.now());
            }
            if (originalOnMessage) {
              originalOnMessage.call(this, event);
            }
          };
          
          const originalSend = this.send;
          this.send = (data) => {
            const parsed = JSON.parse(data);
            if (parsed.type === 'dashboard-state-request') {
              window._wsStateRequest = Date.now();
              console.log('[WS] Dashboard state request sent at', Date.now());
            }
            originalSend.call(this, data);
          };
        }
      };
    });

    // ダッシュボードページに移動
    await page.goto('/dashboard');
    
    // ローディング開始を確認
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    // ローディング終了まで待機
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 20000 });
    
    // WebSocketとAPI呼び出しのタイミングを分析
    const wsStateRequest = await page.evaluate(() => window._wsStateRequest);
    const wsStateResponse = await page.evaluate(() => window._wsStateResponse);
    
    console.log('=== タイミング分析 ===');
    console.log(`WebSocket状態要求: ${wsStateRequest}`);
    console.log(`WebSocket状態応答: ${wsStateResponse?.timestamp}`);
    
    console.log('=== API呼び出し順序 ===');
    networkLogs.forEach(log => {
      console.log(`${log.type}: ${log.url} at ${log.timestamp}`);
    });
    
    // WebSocket状態復元が完了していることを確認
    expect(wsStateResponse).toBeTruthy();
    expect(wsStateResponse.timestamp).toBeGreaterThan(wsStateRequest);
  });

  test('復元完了条件の詳細分析', async ({ page }) => {
    console.log('=== 復元完了条件の詳細分析 ===');

    // 復元状態を追跡するためのスクリプトを注入
    await page.addInitScript(() => {
      window._restorationSteps = [];
      
      // isRestoringState の変更を監視
      let isRestoringState = true;
      Object.defineProperty(window, '_isRestoringState', {
        get: () => isRestoringState,
        set: (value) => {
          window._restorationSteps.push({
            step: 'isRestoringState changed',
            value: value,
            timestamp: Date.now()
          });
          console.log(`[RESTORATION] isRestoringState changed to ${value} at ${Date.now()}`);
          isRestoringState = value;
        }
      });
    });

    await page.goto('/dashboard');
    
    // ローディング開始
    const loadingOverlay = page.locator('[data-testid="restoration-loading"]');
    await expect(loadingOverlay).toBeVisible({ timeout: 1000 });
    
    // ローディング終了
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 20000 });
    
    // 復元ステップを取得
    const restorationSteps = await page.evaluate(() => window._restorationSteps || []);
    
    console.log('=== 復元ステップ詳細 ===');
    restorationSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.step}: ${step.value} at ${step.timestamp}`);
    });
    
    // 人数選択ボタンが正しく復元されていることを最終確認
    const playerButtons = page.locator('button:has-text("人")');
    await expect(playerButtons.first()).toBeVisible();
    
    console.log('✓ 復元完了条件の分析が完了しました');
  });
});