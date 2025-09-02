const test = require('node:test');
const assert = require('node:assert');
const websocketService = require('../services/websocket');

test('タイミング制御機能テスト', async (t) => {
  await t.test('WebSocketサービス基本機能', async () => {
    // getCurrentGachaState関数が存在することを確認
    assert.strictEqual(typeof websocketService.getCurrentGachaState, 'function');
    assert.strictEqual(typeof websocketService.resetGachaState, 'function');
    assert.strictEqual(typeof websocketService.broadcastToClients, 'function');
  });

  await t.test('ガチャ状態の初期化と取得', async () => {
    websocketService.resetGachaState();
    const state = websocketService.getCurrentGachaState();
    
    assert.strictEqual(state.lastResult, null);
    assert.strictEqual(Array.isArray(state.playerNames), true);
    assert.strictEqual(state.playerNames.length, 4);
    assert.strictEqual(state.playerCount, 1);
    assert.strictEqual(state.lastGachaId, null);
    assert.strictEqual(state.isOverlayCompleted, false);
  });

  await t.test('ガチャ状態のリセット', async () => {
    const state = websocketService.getCurrentGachaState();
    
    // 状態を変更
    state.lastResult = { test: 'data' };
    state.lastGachaId = 'test-123';
    state.isOverlayCompleted = true;
    
    // リセット実行
    websocketService.resetGachaState();
    
    // リセット後の状態確認
    const resetState = websocketService.getCurrentGachaState();
    assert.strictEqual(resetState.lastResult, null);
    assert.strictEqual(resetState.lastGachaId, null);
    assert.strictEqual(resetState.isOverlayCompleted, false);
  });

  await t.test('プレイヤー情報の管理', async () => {
    websocketService.resetGachaState();
    const state = websocketService.getCurrentGachaState();
    
    assert.strictEqual(state.playerNames[0], 'Player 1');
    assert.strictEqual(state.playerNames[1], 'Player 2');
    assert.strictEqual(state.playerNames[2], 'Player 3');
    assert.strictEqual(state.playerNames[3], 'Player 4');
    assert.strictEqual(state.playerCount, 1);
  });

  console.log('🎯 タイミング制御機能のテストが完了しました');
});