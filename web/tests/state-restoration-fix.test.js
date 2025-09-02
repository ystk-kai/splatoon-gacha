const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

// 修正後の状態復元機能テスト

class MockWebSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 1; // WebSocket.OPEN
    this.messages = [];
    setTimeout(() => this.emit('open'), 0);
  }

  send(data) {
    this.messages.push(JSON.parse(data));
    // サーバーからの応答をシミュレート
    MockWebSocket.simulateServerResponse(JSON.parse(data), this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }

  static serverState = {
    lastResult: null,
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    playerCount: 1,
    isSpinning: false,
    playerSelection: [],
    viewerConfig: {
      viewerEnabled: false,
      allowedGachaModes: []
    },
    widgetConfig: {
      widgetEnabled: true
    }
  };

  static simulateServerResponse(message, socket) {
    setTimeout(() => {
      if (message.type === 'dashboard-state-request') {
        socket.emit('message', {
          data: JSON.stringify({
            type: 'dashboard-state-response',
            data: {
              currentWeapon: MockWebSocket.serverState.lastResult,
              playerNames: MockWebSocket.serverState.playerNames,
              playerCount: MockWebSocket.serverState.playerCount,
              isSpinning: MockWebSocket.serverState.isSpinning,
              playerSelection: MockWebSocket.serverState.playerSelection,
              viewerConfig: MockWebSocket.serverState.viewerConfig,
              widgetConfig: MockWebSocket.serverState.widgetConfig,
              timestamp: Date.now()
            }
          })
        });
      } else if (message.type === 'viewer-state-request') {
        socket.emit('message', {
          data: JSON.stringify({
            type: 'viewer-state-response',
            data: {
              currentWeapon: MockWebSocket.serverState.lastResult,
              playerNames: MockWebSocket.serverState.playerNames.slice(0, MockWebSocket.serverState.playerCount),
              playerCount: MockWebSocket.serverState.playerCount,
              isSpinning: MockWebSocket.serverState.isSpinning,
              playerSelection: MockWebSocket.serverState.playerSelection,
              timestamp: Date.now()
            }
          })
        });
      }
    }, 10);
  }

  static updateServerState(updates) {
    Object.assign(MockWebSocket.serverState, updates);
  }

  static reset() {
    MockWebSocket.serverState = {
      lastResult: null,
      playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
      playerCount: 1,
      isSpinning: false,
      playerSelection: [],
      viewerConfig: {
        viewerEnabled: false,
        allowedGachaModes: []
      },
      widgetConfig: {
        widgetEnabled: true
      }
    };
  }
}

// Mock Dashboard（状態復元機能付き）
class MockDashboard {
  constructor() {
    this.currentWeapon = null;
    this.isSpinning = false;
    this.playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    this.playerCount = 1;
    this.playerSelection = [];
    this.viewerEnabled = false;
    this.allowedGachaModes = [];
    this.widgetEnabled = true;
    
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
    
    // 接続時に状態復元要求を送信
    this.ws.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: { timestamp: Date.now() }
    }));
  }

  handleWebSocketMessage(data) {
    if (data.type === 'dashboard-state-response' && data.data) {
      console.log('Dashboard: Restoring state from server');
      
      if (data.data.currentWeapon) {
        this.currentWeapon = data.data.currentWeapon;
      }
      if (data.data.playerNames) {
        this.playerNames = data.data.playerNames;
      }
      if (data.data.playerCount !== undefined) {
        this.playerCount = data.data.playerCount;
      }
      if (data.data.isSpinning !== undefined) {
        this.isSpinning = data.data.isSpinning;
      }
      if (data.data.playerSelection) {
        this.playerSelection = data.data.playerSelection;
      }
      if (data.data.viewerConfig) {
        if (data.data.viewerConfig.viewerEnabled !== undefined) {
          this.viewerEnabled = data.data.viewerConfig.viewerEnabled;
        }
        if (data.data.viewerConfig.allowedGachaModes) {
          this.allowedGachaModes = data.data.viewerConfig.allowedGachaModes;
        }
      }
      if (data.data.widgetConfig) {
        if (data.data.widgetConfig.widgetEnabled !== undefined) {
          this.widgetEnabled = data.data.widgetConfig.widgetEnabled;
        }
      }
    }
  }
}

// Mock Viewer（状態復元機能付き）
class MockViewer {
  constructor() {
    this.currentWeapon = null;
    this.isSpinning = false;
    this.playerNames = ['視聴者'];
    this.playerCount = 1;
    this.playerSelection = [];
    
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
    
    // 接続時に状態復元要求を送信
    this.ws.send(JSON.stringify({
      type: 'viewer-state-request',
      data: { timestamp: Date.now() }
    }));
  }

  handleWebSocketMessage(data) {
    if (data.type === 'viewer-state-response' && data.data) {
      console.log('Viewer: Restoring state from server');
      
      if (data.data.currentWeapon) {
        this.currentWeapon = data.data.currentWeapon;
      }
      if (data.data.playerNames) {
        this.playerNames = data.data.playerNames;
      }
      if (data.data.playerCount !== undefined) {
        this.playerCount = data.data.playerCount;
      }
      if (data.data.isSpinning !== undefined) {
        this.isSpinning = data.data.isSpinning;
      }
      if (data.data.playerSelection) {
        this.playerSelection = data.data.playerSelection;
      }
    }
  }
}

test('ダッシュボード状態復元テスト', async () => {
  MockWebSocket.reset();
  
  // サーバー状態を設定
  MockWebSocket.updateServerState({
    lastResult: { weapons: [{ id: 'test_weapon', name: 'テスト武器' }], count: 1 },
    playerCount: 2,
    playerNames: ['プレイヤー1', 'プレイヤー2'],
    isSpinning: true,
    playerSelection: [0],
    viewerConfig: {
      viewerEnabled: true,
      allowedGachaModes: ['weapon', 'sub']
    },
    widgetConfig: {
      widgetEnabled: false
    }
  });
  
  const dashboard = new MockDashboard();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 復元された状態を確認
  assert.ok(dashboard.currentWeapon, 'Current weapon restored');
  assert.strictEqual(dashboard.playerCount, 2, 'Player count restored');
  assert.deepStrictEqual(dashboard.playerNames, ['プレイヤー1', 'プレイヤー2'], 'Player names restored');
  assert.strictEqual(dashboard.isSpinning, true, 'Loading state restored');
  assert.deepStrictEqual(dashboard.playerSelection, [0], 'Player selection restored');
  assert.strictEqual(dashboard.viewerEnabled, true, 'Viewer enabled restored');
  assert.deepStrictEqual(dashboard.allowedGachaModes, ['weapon', 'sub'], 'Allowed gacha modes restored');
  assert.strictEqual(dashboard.widgetEnabled, false, 'Widget enabled restored');
});

test('視聴者画面状態復元テスト', async () => {
  MockWebSocket.reset();
  
  // サーバー状態を設定
  MockWebSocket.updateServerState({
    lastResult: { weapons: [{ id: 'viewer_weapon', name: '視聴者武器' }], count: 1 },
    playerCount: 1,
    playerNames: ['視聴者1'],
    isSpinning: false,
    playerSelection: []
  });
  
  const viewer = new MockViewer();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 復元された状態を確認
  assert.ok(viewer.currentWeapon, 'Current weapon restored');
  assert.strictEqual(viewer.playerCount, 1, 'Player count restored');
  assert.deepStrictEqual(viewer.playerNames, ['視聴者1'], 'Player names restored');
  assert.strictEqual(viewer.isSpinning, false, 'Loading state restored');
  assert.deepStrictEqual(viewer.playerSelection, [], 'Player selection restored');
});

test('ガチャ実行中リロード復元テスト', async () => {
  MockWebSocket.reset();
  
  // ガチャ実行中の状態をサーバーに設定
  MockWebSocket.updateServerState({
    lastResult: null, // まだ結果がない状態
    playerCount: 4,
    playerNames: ['P1', 'P2', 'P3', 'P4'],
    isSpinning: true, // ガチャ実行中
    playerSelection: []
  });
  
  const dashboard = new MockDashboard();
  const viewer = new MockViewer();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // ガチャ実行中の状態が正しく復元されているか確認
  assert.strictEqual(dashboard.isSpinning, true, 'Dashboard loading state restored correctly');
  assert.strictEqual(viewer.isSpinning, true, 'Viewer loading state restored correctly');
  assert.strictEqual(dashboard.currentWeapon, null, 'Dashboard weapon result is null during gacha');
  assert.strictEqual(viewer.currentWeapon, null, 'Viewer weapon result is null during gacha');
});

console.log('🔄 修正後の状態復元テストが完了しました');