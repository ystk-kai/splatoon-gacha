/**
 * ダッシュボードリロード時の状態復元テスト
 * 
 * 問題: リロード時にダッシュボードの状態復元が正しく反映しないことがある
 * 原因: WebSocket接続時のメッセージ送信順序とタイミング問題
 * 解決: 状態復元要求を優先し、復元完了後に初期化メッセージを送信
 */

const WebSocket = require('ws');
const { expect } = require('chai');

describe('Dashboard State Restoration', function() {
  let server;
  let wsUrl = 'ws://localhost:3000/ws';
  
  // テスト用のモックガチャ状態
  const mockGachaState = {
    lastResult: {
      weapons: [
        { 
          id: 'test_weapon_1', 
          name: 'Test Weapon 1', 
          type: 'shooter',
          subWeapon: 'splat_bomb',
          specialWeapon: 'trizooka'
        }
      ],
      count: 1
    },
    playerNames: ['Test Player 1'],
    playerCount: 1,
    isSpinning: false,
    playerSelection: [],
    viewerConfig: {
      viewerEnabled: true,
      allowedGachaModes: ['weapon']
    },
    widgetConfig: {
      widgetEnabled: true
    }
  };
  
  beforeEach(function(done) {
    // サーバーに事前にガチャ状態を設定
    const setupWs = new WebSocket(wsUrl);
    
    setupWs.on('open', function() {
      // テスト用ガチャ結果を送信
      setupWs.send(JSON.stringify({
        type: 'gacha-result',
        data: {
          result: mockGachaState.lastResult,
          playerNames: mockGachaState.playerNames,
          gachaId: 'test_gacha_' + Date.now()
        }
      }));
      
      // プレイヤー情報を送信
      setupWs.send(JSON.stringify({
        type: 'player-names-changed',
        data: {
          playerNames: mockGachaState.playerNames,
          playerCount: mockGachaState.playerCount
        }
      }));
      
      setTimeout(() => {
        setupWs.close();
        done();
      }, 100);
    });
  });
  
  it('should restore dashboard state correctly on reload', function(done) {
    const ws = new WebSocket(wsUrl);
    let stateRestored = false;
    let reloadProcessed = false;
    
    ws.on('open', function() {
      console.log('Test: WebSocket connected, sending state restoration request');
      
      // 状態復元要求を送信（Dashboard接続時の動作を模擬）
      ws.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: {
          timestamp: Date.now()
        }
      }));
    });
    
    ws.on('message', function(data) {
      const message = JSON.parse(data.toString());
      console.log('Test: Received message type:', message.type);
      
      if (message.type === 'dashboard-state-response') {
        console.log('Test: Dashboard state response received');
        stateRestored = true;
        
        // 状態が正しく復元されているかチェック
        expect(message.data).to.be.an('object');
        
        if (message.data.currentWeapon) {
          expect(message.data.currentWeapon.weapons).to.be.an('array');
          expect(message.data.currentWeapon.weapons.length).to.be.greaterThan(0);
          console.log('Test: Current weapon state restored successfully');
        }
        
        if (message.data.playerNames) {
          expect(message.data.playerNames).to.be.an('array');
          console.log('Test: Player names restored successfully');
        }
        
        // 状態復元後にリロードメッセージを送信
        setTimeout(() => {
          console.log('Test: Sending dashboard reload message after state restoration');
          ws.send(JSON.stringify({
            type: 'dashboard-reload',
            data: {
              timestamp: Date.now()
            }
          }));
        }, 150);
        
      } else if (message.type === 'gacha-state-reset') {
        console.log('Test: Gacha state reset received - THIS SHOULD NOT HAPPEN');
        reloadProcessed = true;
        
        // リセットが発生した場合はテスト失敗
        expect.fail('Gacha state should not be reset when state restoration occurred');
        
      } else if (message.type === 'connection') {
        console.log('Test: Connection confirmation received');
      }
    });
    
    // 3秒後にテスト結果を評価
    setTimeout(() => {
      console.log('Test: Evaluation time - stateRestored:', stateRestored, 'reloadProcessed:', reloadProcessed);
      
      // 状態が復元されていることを確認
      expect(stateRestored).to.be.true;
      
      // 不適切なリセットが発生していないことを確認
      // （リセットメッセージが送信されていないことで判断）
      
      ws.close();
      done();
    }, 3000);
  });
  
  it('should handle multiple dashboard connections correctly', function(done) {
    const ws1 = new WebSocket(wsUrl);
    const ws2 = new WebSocket(wsUrl);
    let ws1StateRestored = false;
    let ws2StateRestored = false;
    
    ws1.on('open', function() {
      console.log('Test: WebSocket 1 connected');
      ws1.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: { timestamp: Date.now() }
      }));
    });
    
    ws2.on('open', function() {
      console.log('Test: WebSocket 2 connected');
      ws2.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: { timestamp: Date.now() }
      }));
    });
    
    ws1.on('message', function(data) {
      const message = JSON.parse(data.toString());
      if (message.type === 'dashboard-state-response') {
        ws1StateRestored = true;
        console.log('Test: WS1 state restored');
      }
    });
    
    ws2.on('message', function(data) {
      const message = JSON.parse(data.toString());
      if (message.type === 'dashboard-state-response') {
        ws2StateRestored = true;
        console.log('Test: WS2 state restored');
      }
    });
    
    setTimeout(() => {
      expect(ws1StateRestored).to.be.true;
      expect(ws2StateRestored).to.be.true;
      
      ws1.close();
      ws2.close();
      done();
    }, 2000);
  });
  
  it('should reset state only when no restoration request is made', function(done) {
    const ws = new WebSocket(wsUrl);
    let resetReceived = false;
    
    ws.on('open', function() {
      console.log('Test: WebSocket connected, sending only reload message');
      
      // 状態復元要求を送信せず、リロードメッセージのみ送信
      ws.send(JSON.stringify({
        type: 'dashboard-reload',
        data: {
          timestamp: Date.now()
        }
      }));
    });
    
    ws.on('message', function(data) {
      const message = JSON.parse(data.toString());
      console.log('Test: Received message type:', message.type);
      
      if (message.type === 'gacha-state-reset') {
        resetReceived = true;
        console.log('Test: Gacha state reset received as expected');
      }
    });
    
    // 6秒後にテスト結果を評価（リセット遅延時間の5秒 + 余裕1秒）
    setTimeout(() => {
      console.log('Test: Evaluation time - resetReceived:', resetReceived);
      
      // 状態復元要求がない場合はリセットが発生すべき
      expect(resetReceived).to.be.true;
      
      ws.close();
      done();
    }, 6000);
  });
});

console.log('State Restoration Test Suite');
console.log('このテストは以下の修正が機能することを確認します:');
console.log('1. Dashboard接続時の状態復元要求が優先される');
console.log('2. 状態復元が完了した後に初期化メッセージが送信される');
console.log('3. 状態復元要求がない場合のみリセットが実行される');
console.log('4. 複数のDashboard接続でも正しく動作する');