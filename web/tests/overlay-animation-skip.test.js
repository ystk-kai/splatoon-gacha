const { test } = require('node:test');
const assert = require('node:assert');

// オーバーレイ演出スキップ機能の単体テスト

test.describe('オーバーレイ演出スキップテスト', () => {
  
  test('skipAnimation設定でインクエフェクトがスキップされる', async () => {
    let inkEffectsShown = false;
    let gachaCompleted = false;
    let isGachaRunning = false;
    let currentGachaTimeout = null;
    let overlayConfig = { skipAnimation: true };
    
    // WebSocketとガチャデータのモック
    const mockGachaData = {
      gachaId: 'test-123',
      result: {
        weapons: [
          { id: 'weapon1', name: 'テスト武器1' }
        ]
      },
      playerNames: ['プレイヤー1']
    };
    
    const mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: (data) => {
        const message = JSON.parse(data);
        if (message.type === 'overlay-animation-completed') {
          gachaCompleted = true;
        }
      }
    };
    
    // DOMのモック
    const mockOverlayContainer = {
      classList: {
        add: () => {},
        remove: () => {}
      }
    };
    
    global.document = {
      getElementById: (id) => {
        if (id === 'overlay-container') {
          return mockOverlayContainer;
        }
        return null;
      }
    };
    
    // インクエフェクト表示関数のモック
    const showInkEffects = (callback) => {
      inkEffectsShown = true;
      if (callback) callback();
    };
    
    // ガチャ結果表示関数のモック実装
    const showGachaResultMock = (data) => {
      console.log('=== DEBUGGING GACHA RESULT ===');
      console.log('Received data:', data);
      
      if (isGachaRunning) {
        console.log('Gacha is already running, skipping...');
        return;
      }
      
      isGachaRunning = true;
      
      // 演出省略設定に基づいてインクエフェクトを表示するか決定
      if (overlayConfig.skipAnimation) {
        console.log('Animation skipped due to skipAnimation setting');
        // 演出をスキップして即座に完了 - インクエフェクトなしで終了
        currentGachaTimeout = setTimeout(() => {
          const container = global.document.getElementById('overlay-container');
          if (container) {
            container.classList.remove('show');
          }
          isGachaRunning = false;
          
          // overlay演出完了をWebSocketで通知
          if (mockWebSocket && mockWebSocket.readyState === 1 && data && data.gachaId) {
            console.log('Sending overlay animation completed notification (skipped):', data.gachaId);
            mockWebSocket.send(JSON.stringify({
              type: 'overlay-animation-completed',
              data: { gachaId: data.gachaId }
            }));
          }
        }, 100); // テスト用に短縮
      } else {
        // インクエフェクトを表示
        showInkEffects(() => {
          console.log('Ink effects completed');
        });
      }
    };
    
    // テスト実行：演出省略有効でガチャ実行
    showGachaResultMock(mockGachaData);
    
    // 初期状態の確認
    assert.strictEqual(isGachaRunning, true);
    assert.strictEqual(inkEffectsShown, false); // インクエフェクトは表示されない
    assert.strictEqual(gachaCompleted, false); // まだ完了していない
    
    // タイムアウト完了まで待機
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 演出省略後の状態確認
    assert.strictEqual(isGachaRunning, false);
    assert.strictEqual(inkEffectsShown, false); // インクエフェクトは表示されなかった
    assert.strictEqual(gachaCompleted, true); // ガチャは完了した
    
    if (currentGachaTimeout) {
      clearTimeout(currentGachaTimeout);
    }
  });

  test('skipAnimation無効時はインクエフェクトが正常に表示される', async () => {
    let inkEffectsShown = false;
    let isGachaRunning = false;
    let overlayConfig = { skipAnimation: false };
    
    // インクエフェクト表示関数のモック
    const showInkEffects = (callback) => {
      inkEffectsShown = true;
      // エフェクト完了を短時間でシミュレート
      setTimeout(() => {
        if (callback) callback();
      }, 50);
    };
    
    // ガチャ結果表示関数のモック実装（演出あり）
    const showGachaResultMock = (data) => {
      if (isGachaRunning) {
        return;
      }
      
      isGachaRunning = true;
      
      // 演出省略設定に基づいてインクエフェクトを表示するか決定
      if (overlayConfig.skipAnimation) {
        console.log('Animation skipped due to skipAnimation setting');
      } else {
        // インクエフェクトを表示
        showInkEffects(() => {
          console.log('Ink effects completed');
          isGachaRunning = false;
        });
      }
    };
    
    const mockGachaData = {
      gachaId: 'test-456',
      result: {
        weapons: [
          { id: 'weapon2', name: 'テスト武器2' }
        ]
      },
      playerNames: ['プレイヤー2']
    };
    
    // テスト実行：演出省略無効でガチャ実行
    showGachaResultMock(mockGachaData);
    
    // 初期状態の確認
    assert.strictEqual(isGachaRunning, true);
    assert.strictEqual(inkEffectsShown, true); // インクエフェクトが表示された
    
    // エフェクト完了まで待機
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 演出完了後の状態確認
    assert.strictEqual(isGachaRunning, false);
    assert.strictEqual(inkEffectsShown, true); // インクエフェクトが表示された
  });

  test('オーバーレイリロード時の状態リセット', async () => {
    let isGachaRunning = true; // ガチャ実行中の状態から開始
    let currentGachaTimeout = setTimeout(() => {}, 5000); // アクティブなタイマー
    let effectsCleared = false;
    
    // clearGachaDisplay関数のモック
    const clearGachaDisplay = () => {
      effectsCleared = true;
      if (currentGachaTimeout) {
        clearTimeout(currentGachaTimeout);
        currentGachaTimeout = null;
      }
      
      isGachaRunning = false;
    };
    
    // DOMContentLoadedイベントハンドラのモック実装
    const onDOMContentLoaded = () => {
      console.log('Overlay page loaded, connecting to WebSocket...');
      
      // ページリロード時にガチャ実行状態をリセット
      isGachaRunning = false;
      if (currentGachaTimeout) {
        clearTimeout(currentGachaTimeout);
        currentGachaTimeout = null;
      }
      
      // 既存のエフェクトをクリア
      clearGachaDisplay();
    };
    
    // リロード前の状態確認
    assert.strictEqual(isGachaRunning, true);
    assert.strictEqual(currentGachaTimeout !== null, true);
    assert.strictEqual(effectsCleared, false);
    
    // DOMContentLoadedイベントを実行（リロードをシミュレート）
    onDOMContentLoaded();
    
    // リロード後の状態確認
    assert.strictEqual(isGachaRunning, false);
    assert.strictEqual(currentGachaTimeout, null);
    assert.strictEqual(effectsCleared, true);
  });

  test('設定変更がオーバーレイに正しく反映される', async () => {
    let overlayConfig = { skipAnimation: false };
    
    // WebSocketメッセージ処理のモック
    const handleWebSocketMessage = (message) => {
      if (message.type === 'overlay-config-changed' && message.data) {
        console.log('Overlay config changed:', message.data);
        overlayConfig = { ...overlayConfig, ...message.data };
      }
    };
    
    // 初期状態の確認
    assert.strictEqual(overlayConfig.skipAnimation, false);
    
    // 設定変更メッセージを送信
    const configChangeMessage = {
      type: 'overlay-config-changed',
      data: { skipAnimation: true }
    };
    
    handleWebSocketMessage(configChangeMessage);
    
    // 設定が変更されたことを確認
    assert.strictEqual(overlayConfig.skipAnimation, true);
    
    // 再度設定を変更
    const configChangeMessage2 = {
      type: 'overlay-config-changed',
      data: { skipAnimation: false }
    };
    
    handleWebSocketMessage(configChangeMessage2);
    
    // 設定が再変更されたことを確認
    assert.strictEqual(overlayConfig.skipAnimation, false);
  });

  test('演出スキップ中のリロードでも正常動作', async () => {
    let isGachaRunning = false;
    let overlayConfig = { skipAnimation: true };
    let currentGachaTimeout = null;
    let gachaCompleted = false;
    
    const mockWebSocket = {
      readyState: 1, // WebSocket.OPEN
      send: (data) => {
        const message = JSON.parse(data);
        if (message.type === 'overlay-animation-completed') {
          gachaCompleted = true;
        }
      }
    };
    
    // DOMのモック
    const mockOverlayContainer = {
      classList: {
        add: () => {},
        remove: () => {}
      }
    };
    
    global.document = {
      getElementById: (id) => {
        if (id === 'overlay-container') {
          return mockOverlayContainer;
        }
        return null;
      }
    };
    
    // ガチャ結果表示関数（演出スキップ版）
    const showGachaResultWithSkip = (data) => {
      if (isGachaRunning) {
        return;
      }
      
      isGachaRunning = true;
      
      // 演出をスキップして即座に完了
      currentGachaTimeout = setTimeout(() => {
        const container = global.document.getElementById('overlay-container');
        if (container) {
          container.classList.remove('show');
        }
        isGachaRunning = false;
        
        // overlay演出完了をWebSocketで通知
        if (mockWebSocket && mockWebSocket.readyState === 1 && data && data.gachaId) {
          mockWebSocket.send(JSON.stringify({
            type: 'overlay-animation-completed',
            data: { gachaId: data.gachaId }
          }));
        }
      }, 100);
    };
    
    // リロード処理（状態リセット）
    const performReload = () => {
      isGachaRunning = false;
      if (currentGachaTimeout) {
        clearTimeout(currentGachaTimeout);
        currentGachaTimeout = null;
      }
      gachaCompleted = false;
    };
    
    // ガチャ実行
    const mockGachaData = {
      gachaId: 'test-reload-789',
      result: { weapons: [{ id: 'weapon3', name: 'テスト武器3' }] }
    };
    
    showGachaResultWithSkip(mockGachaData);
    
    // ガチャ開始直後にリロード
    performReload();
    
    // リロード後の状態確認
    assert.strictEqual(isGachaRunning, false);
    assert.strictEqual(currentGachaTimeout, null);
    assert.strictEqual(gachaCompleted, false);
    
    // 再度ガチャ実行が可能であることを確認
    showGachaResultWithSkip(mockGachaData);
    assert.strictEqual(isGachaRunning, true);
    
    // 完了まで待機
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 正常完了の確認
    assert.strictEqual(isGachaRunning, false);
    assert.strictEqual(gachaCompleted, true);
    
    if (currentGachaTimeout) {
      clearTimeout(currentGachaTimeout);
    }
  });

});