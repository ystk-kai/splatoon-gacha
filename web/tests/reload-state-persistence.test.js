// 連続リロード時の状態復元テスト
// 問題：リロード後、1回目は同期されるが、そのままもう一度リロードすると元に戻ってしまう

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { getCurrentGachaState, resetGachaState } = require('../services/websocket');
let wsServer;
let testClients = [];
const WS_PORT = 3001; // テスト用ポート

before(async () => {
    // テスト用WebSocketサーバーをセットアップ
    const { setupWebSocket } = require('../services/websocket');
    const fastify = require('fastify')({ logger: false });
    await setupWebSocket(fastify);
    await fastify.listen({ port: WS_PORT });
    wsServer = fastify;
    
    console.log(`Test WebSocket server started on port ${WS_PORT}`);
  });

after(async () => {
    // 全てのクライアントを閉じる
    testClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    
    if (wsServer) {
      await wsServer.close();
    }
  });

  beforeEach(() => {
    // 各テスト前に状態をリセット
    resetGachaState();
    testClients = [];
  });

  afterEach(() => {
    // 各テスト後にクライアントをクリーンアップ
    testClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    testClients = [];
  });

  /**
   * テスト用WebSocketクライアントを作成
   */
  function createTestClient() {
    const client = new WebSocket(`ws://localhost:${WS_PORT}/ws`);
    testClients.push(client);
    return client;
  }

  /**
   * メッセージの送受信を待つヘルパー関数
   */
  function waitForMessage(client, expectedType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${expectedType}`));
      }, timeout);

      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === expectedType) {
            clearTimeout(timer);
            client.removeListener('message', messageHandler);
            resolve(message);
          }
        } catch (error) {
          // JSON解析エラーは無視して次のメッセージを待つ
        }
      };

      client.on('message', messageHandler);
    });
  }

  /**
   * クライアント接続を待つヘルパー関数
   */
  function waitForConnection(client, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (client.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      client.onopen = () => {
        clearTimeout(timer);
        resolve();
      };

      client.onerror = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  }

  test('1回目のリロード: 状態復元が正しく動作する', async () => {
    console.log('\n=== 1回目のリロードテスト開始 ===');

    // 1. 初期状態を設定（ガチャ結果をシミュレート）
    const initialGachaResult = {
      weapons: [{ id: 'test_weapon', name: 'テスト武器', type: 'shooter' }],
      count: 1
    };
    
    const client1 = createTestClient();
    await waitForConnection(client1);
    
    // ガチャ結果を送信してサーバー状態を設定
    client1.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: initialGachaResult,
        playerNames: ['TestPlayer1'],
        gachaId: 'test-gacha-1'
      }
    }));

    // オーバーレイ演出完了を送信
    client1.send(JSON.stringify({
      type: 'overlay-animation-completed',
      data: {
        gachaId: 'test-gacha-1'
      }
    }));

    // 状態が設定されるまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 1回目のリロードをシミュレート
    console.log('1回目のリロード開始');
    const client2 = createTestClient();
    await waitForConnection(client2);
    
    // dashboard-reload を送信
    client2.send(JSON.stringify({
      type: 'dashboard-reload',
      data: {
        source: 'dashboard-init',
        timestamp: Date.now()
      }
    }));

    // 状態復元要求を送信
    client2.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: {
        timestamp: Date.now()
      }
    }));

    // 状態復元レスポンスを待機
    const stateResponse = await waitForMessage(client2, 'dashboard-state-response');
    
    // 3. 状態が正しく復元されていることを確認
    assert.ok(stateResponse.data.currentWeapon, 'currentWeapon should be defined');
    assert.strictEqual(stateResponse.data.currentWeapon.weapons.length, 1, 'should have 1 weapon');
    assert.strictEqual(stateResponse.data.currentWeapon.weapons[0].name, 'テスト武器', 'weapon name should match');
    assert.deepStrictEqual(stateResponse.data.playerNames, ['TestPlayer1', 'Player 2', 'Player 3', 'Player 4'], 'player names should match');
    
    console.log('1回目のリロード: 状態復元成功 ✓');
    
    // 少し待ってリセットが発生しないことを確認
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // リセットが発生していないことを確認
    const currentState = getCurrentGachaState();
    expect(currentState.lastResult).toBeDefined();
    expect(currentState.lastResult.weapons[0].name).toBe('テスト武器');
    
    console.log('1回目のリロード: リセット回避成功 ✓');
  }, 15000);

  test('2回目の連続リロード: 状態が保持される', async () => {
    console.log('\n=== 2回目の連続リロードテスト開始 ===');

    // 1. 初期状態を設定
    const initialGachaResult = {
      weapons: [{ id: 'test_weapon_2', name: 'テスト武器2', type: 'roller' }],
      count: 1
    };
    
    const client1 = createTestClient();
    await waitForConnection(client1);
    
    client1.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: initialGachaResult,
        playerNames: ['TestPlayer2'],
        gachaId: 'test-gacha-2'
      }
    }));

    client1.send(JSON.stringify({
      type: 'overlay-animation-completed',
      data: {
        gachaId: 'test-gacha-2'
      }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 1回目のリロード
    console.log('1回目のリロード開始');
    const client2 = createTestClient();
    await waitForConnection(client2);
    
    client2.send(JSON.stringify({
      type: 'dashboard-reload',
      data: {
        source: 'dashboard-init',
        timestamp: Date.now()
      }
    }));

    client2.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: { timestamp: Date.now() }
    }));

    const stateResponse1 = await waitForMessage(client2, 'dashboard-state-response');
    expect(stateResponse1.data.currentWeapon.weapons[0].name).toBe('テスト武器2');
    console.log('1回目のリロード成功 ✓');

    // 3. 2回目の連続リロード（問題の核心）
    console.log('2回目の連続リロード開始');
    const client3 = createTestClient();
    await waitForConnection(client3);
    
    client3.send(JSON.stringify({
      type: 'dashboard-reload',
      data: {
        source: 'dashboard-reload',
        timestamp: Date.now()
      }
    }));

    client3.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: { timestamp: Date.now() }
    }));

    const stateResponse2 = await waitForMessage(client3, 'dashboard-state-response');
    
    // 4. 2回目でも状態が保持されていることを確認
    expect(stateResponse2.data.currentWeapon).toBeDefined();
    expect(stateResponse2.data.currentWeapon.weapons[0].name).toBe('テスト武器2');
    expect(stateResponse2.data.playerNames[0]).toBe('TestPlayer2');
    
    console.log('2回目のリロード: 状態保持成功 ✓');
    
    // 少し待ってリセットが発生しないことを確認
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const finalState = getCurrentGachaState();
    expect(finalState.lastResult.weapons[0].name).toBe('テスト武器2');
    
    console.log('2回目のリロード: リセット回避成功 ✓');
  }, 20000);

  test('3回以上の連続リロード: 状態が一貫して保持される', async () => {
    console.log('\n=== 3回以上の連続リロードテスト開始 ===');

    // 1. 初期状態を設定
    const initialGachaResult = {
      weapons: [
        { id: 'weapon_1', name: 'マルチ武器1', type: 'charger' },
        { id: 'weapon_2', name: 'マルチ武器2', type: 'slosher' }
      ],
      count: 2
    };
    
    const client1 = createTestClient();
    await waitForConnection(client1);
    
    client1.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: initialGachaResult,
        playerNames: ['Player1', 'Player2'],
        gachaId: 'test-gacha-multi'
      }
    }));

    client1.send(JSON.stringify({
      type: 'overlay-animation-completed',
      data: {
        gachaId: 'test-gacha-multi'
      }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 複数回のリロードを実行
    const reloadCount = 5;
    for (let i = 1; i <= reloadCount; i++) {
      console.log(`${i}回目のリロード開始`);
      
      const client = createTestClient();
      await waitForConnection(client);
      
      client.send(JSON.stringify({
        type: 'dashboard-reload',
        data: {
          source: `dashboard-reload-${i}`,
          timestamp: Date.now()
        }
      }));

      client.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: { timestamp: Date.now() }
      }));

      const stateResponse = await waitForMessage(client, 'dashboard-state-response');
      
      // 状態が一貫して保持されていることを確認
      expect(stateResponse.data.currentWeapon).toBeDefined();
      expect(stateResponse.data.currentWeapon.weapons).toHaveLength(2);
      expect(stateResponse.data.currentWeapon.weapons[0].name).toBe('マルチ武器1');
      expect(stateResponse.data.currentWeapon.weapons[1].name).toBe('マルチ武器2');
      expect(stateResponse.data.playerNames.slice(0, 2)).toEqual(['Player1', 'Player2']);
      
      console.log(`${i}回目のリロード: 状態保持成功 ✓`);
      
      // 短い間隔で次のリロードを実行
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('全ての連続リロードテスト完了 ✓');
  }, 30000);

  test('リロード間隔が短い場合の状態管理', async () => {
    console.log('\n=== 短間隔リロードテスト開始 ===');

    // 初期状態設定
    const client1 = createTestClient();
    await waitForConnection(client1);
    
    client1.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: {
          weapons: [{ id: 'rapid_test', name: '高速テスト武器', type: 'dualies' }],
          count: 1
        },
        playerNames: ['RapidPlayer'],
        gachaId: 'rapid-test'
      }
    }));

    client1.send(JSON.stringify({
      type: 'overlay-animation-completed',
      data: { gachaId: 'rapid-test' }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    // 非常に短い間隔でリロードを実行
    const rapidReloads = [];
    for (let i = 0; i < 3; i++) {
      rapidReloads.push((async () => {
        const client = createTestClient();
        await waitForConnection(client);
        
        client.send(JSON.stringify({
          type: 'dashboard-reload',
          data: {
            source: `rapid-${i}`,
            timestamp: Date.now()
          }
        }));

        client.send(JSON.stringify({
          type: 'dashboard-state-request',
          data: { timestamp: Date.now() }
        }));

        return await waitForMessage(client, 'dashboard-state-response');
      })());
      
      // 100msの短い間隔
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const responses = await Promise.all(rapidReloads);
    
    // 全てのレスポンスで状態が一貫していることを確認
    responses.forEach((response, index) => {
      expect(response.data.currentWeapon.weapons[0].name).toBe('高速テスト武器');
      console.log(`高速リロード ${index + 1}: 状態一貫性確認 ✓`);
    });
  }, 15000);

  test('状態復元要求なしでのリロード: 適切なリセット動作', async () => {
    console.log('\n=== 状態復元要求なしリロードテスト開始 ===');

    // 初期状態設定
    const client1 = createTestClient();
    await waitForConnection(client1);
    
    client1.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: {
          weapons: [{ id: 'reset_test', name: 'リセットテスト武器', type: 'blaster' }],
          count: 1
        },
        playerNames: ['ResetPlayer'],
        gachaId: 'reset-test'
      }
    }));

    client1.send(JSON.stringify({
      type: 'overlay-animation-completed',
      data: { gachaId: 'reset-test' }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    // dashboard-reloadのみ送信（dashboard-state-requestは送信しない）
    const client2 = createTestClient();
    await waitForConnection(client2);
    
    client2.send(JSON.stringify({
      type: 'dashboard-reload',
      data: {
        source: 'no-state-request',
        timestamp: Date.now()
      }
    }));

    // 5秒待って状態がリセットされることを確認
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const currentState = getCurrentGachaState();
    expect(currentState.lastResult).toBeNull();
    expect(currentState.playerNames).toEqual(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
    
    console.log('状態復元要求なしリロード: 適切なリセット確認 ✓');
  }, 10000);
});