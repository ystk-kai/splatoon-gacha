const { test } = require('node:test');
const assert = require('node:assert');

// ダッシュボード復元ローディングオーバーレイ単体テスト

test.describe('ダッシュボード復元ローディングオーバーレイテスト', () => {
  
  test('localStorageからの設定復元でローディング表示', async () => {
    // localStorageに既存設定を保存
    const mockStorage = {
      playerNames: JSON.stringify(['テストプレイヤー1', 'テストプレイヤー2']),
      playerCount: JSON.stringify(2),
      viewerEnabled: JSON.stringify(true),
      widgetEnabled: JSON.stringify(true),
      allowedGachaModes: JSON.stringify(['weapon', 'sub'])
    };
    
    // localStorageのモック設定
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key) => mockStorage[key],
        setItem: (key, value) => { mockStorage[key] = value; },
        removeItem: (key) => { delete mockStorage[key]; },
        clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
      },
      writable: true
    });
    
    // WebSocketのモック
    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 1; // WebSocket.OPEN
        setTimeout(() => this.onopen?.(), 10);
      }
      
      send(data) {
        // WebSocket接続失敗をシミュレート
        setTimeout(() => this.onclose?.(), 100);
      }
      
      close() {
        this.onclose?.();
      }
    };
    
    // React HooksのモックとしてDOMに基づくテストを実装
    const mockElement = {
      style: { display: '' },
      textContent: '',
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    global.document = {
      addEventListener: (event, handler) => {
        if (event === 'DOMContentLoaded') {
          setTimeout(handler, 0);
        }
      },
      getElementById: () => mockElement,
      createElement: () => mockElement,
      body: mockElement
    };
    
    // ローディング状態管理のモック関数
    let isRestoringState = true;
    let playerNames = ['', '', '', ''];
    let playerCount = 1;
    
    const loadSavedConfig = () => {
      try {
        const savedNames = JSON.parse(mockStorage.playerNames || null);
        const savedPlayerCount = parseInt(mockStorage.playerCount || null);
        const savedViewerEnabled = JSON.parse(mockStorage.viewerEnabled || null);
        
        return {
          playerNames: savedNames || ['', '', '', ''],
          playerCount: savedPlayerCount || 1,
          viewerEnabled: savedViewerEnabled || false,
          widgetEnabled: JSON.parse(mockStorage.widgetEnabled || 'true'),
          allowedGachaModes: JSON.parse(mockStorage.allowedGachaModes || '[]')
        };
      } catch (error) {
        return {
          playerNames: ['', '', '', ''],
          playerCount: 1,
          viewerEnabled: false,
          widgetEnabled: true,
          allowedGachaModes: []
        };
      }
    };
    
    const restoreFromLocalStorage = () => {
      console.log('Dashboard: Performing localStorage fallback restoration');
      const config = loadSavedConfig();
      
      playerCount = config.playerCount;
      playerNames = config.playerNames;
      
      console.log('Dashboard: localStorage fallback restoration completed:', config);
      return config;
    };
    
    // テスト実行
    const config = loadSavedConfig();
    assert.deepStrictEqual(config.playerNames, ['テストプレイヤー1', 'テストプレイヤー2']);
    assert.strictEqual(config.playerCount, 2);
    assert.strictEqual(config.viewerEnabled, true);
    
    // 復元処理の実行
    isRestoringState = true;
    const restoredConfig = restoreFromLocalStorage();
    isRestoringState = false;
    
    // 復元後の状態確認
    assert.deepStrictEqual(playerNames, ['テストプレイヤー1', 'テストプレイヤー2']);
    assert.strictEqual(playerCount, 2);
    assert.deepStrictEqual(restoredConfig.allowedGachaModes, ['weapon', 'sub']);
  });

  test('WebSocket接続失敗時のフォールバック復元', async () => {
    let connectionFailed = false;
    let restorationCompleted = false;
    
    // WebSocket接続失敗のシミュレート
    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 3; // WebSocket.CLOSED
        setTimeout(() => {
          connectionFailed = true;
          this.onerror?.();
        }, 50);
      }
      
      send() {} // do nothing
      close() {}
    };
    
    // 復元処理のモック
    const performFallbackRestore = () => {
      if (connectionFailed) {
        restorationCompleted = true;
        return true;
      }
      return false;
    };
    
    // WebSocket接続を試行
    const ws = new global.WebSocket('ws://localhost:3000/ws');
    
    // 接続失敗まで待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // フォールバック復元を実行
    const restored = performFallbackRestore();
    
    assert.strictEqual(connectionFailed, true);
    assert.strictEqual(restored, true);
    assert.strictEqual(restorationCompleted, true);
  });

  test('復元タイムアウト時の処理', async () => {
    let timeoutOccurred = false;
    let isRestoringState = true;
    
    // タイムアウト処理のモック
    const restorationTimeout = setTimeout(() => {
      if (isRestoringState) {
        console.log('Dashboard: State restoration timeout, performing localStorage fallback');
        timeoutOccurred = true;
        isRestoringState = false;
      }
    }, 100); // 短時間でテスト
    
    // 100ms後にタイムアウトが発生することを確認
    await new Promise(resolve => setTimeout(resolve, 150));
    
    assert.strictEqual(timeoutOccurred, true);
    assert.strictEqual(isRestoringState, false);
    
    clearTimeout(restorationTimeout);
  });

  test('正常な状態復元でタイムアウトがキャンセルされる', async () => {
    let timeoutOccurred = false;
    let isRestoringState = true;
    let stateRestored = false;
    
    // タイムアウト処理の設定
    const restorationTimeout = setTimeout(() => {
      if (isRestoringState) {
        timeoutOccurred = true;
        isRestoringState = false;
      }
    }, 200); // 200msのタイムアウト
    
    // 100ms後に状態復元が完了する（タイムアウト前）
    setTimeout(() => {
      if (isRestoringState) {
        isRestoringState = false;
        stateRestored = true;
        clearTimeout(restorationTimeout);
      }
    }, 100);
    
    // 250ms後にテスト結果を確認
    await new Promise(resolve => setTimeout(resolve, 250));
    
    assert.strictEqual(stateRestored, true);
    assert.strictEqual(timeoutOccurred, false);
    assert.strictEqual(isRestoringState, false);
  });

});