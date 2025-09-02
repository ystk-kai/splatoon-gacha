const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

// リアルタイム状態復元テスト

class MockWebSocketWithReconnect extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 1; // WebSocket.OPEN
    this.messages = [];
    this.isConnected = true;
    setTimeout(() => this.emit('open'), 0);
  }

  send(data) {
    if (!this.isConnected) return;
    
    const message = JSON.parse(data);
    this.messages.push(message);
    
    // サーバー側の状態復元レスポンスをシミュレート
    if (message.type === 'viewer-state-request') {
      setTimeout(() => {
        this.emit('message', {
          data: JSON.stringify({
            type: 'viewer-state-response',
            data: MockWebSocketWithReconnect.serverState
          })
        });
      }, 10);
    }
    
    // 他のクライアントに配信をシミュレート
    MockWebSocketWithReconnect.broadcast(message, this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.isConnected = false;
    this.emit('close');
  }

  reconnect() {
    this.readyState = 1; // WebSocket.OPEN
    this.isConnected = true;
    this.emit('open');
    
    // 再接続時に状態要求を自動送信
    setTimeout(() => {
      this.send(JSON.stringify({
        type: 'viewer-state-request',
        data: { timestamp: Date.now() }
      }));
    }, 0);
  }

  static clients = [];
  static serverState = {
    currentWeapon: null,
    playerNames: ['Player 1', 'Player 2'],
    playerCount: 2,
    isSpinning: false
  };
  
  static broadcast(message, sender) {
    MockWebSocketWithReconnect.clients.forEach(client => {
      if (client !== sender && client.isConnected) {
        setTimeout(() => client.emit('message', { data: JSON.stringify(message) }), 0);
      }
    });

    // サーバー状態を更新
    if (message.type === 'gacha-started') {
      MockWebSocketWithReconnect.serverState.isSpinning = true;
    } else if (message.type === 'overlay-animation-completed') {
      MockWebSocketWithReconnect.serverState.isSpinning = false;
      if (message.data && message.data.fullState) {
        MockWebSocketWithReconnect.serverState.currentWeapon = message.data.fullState;
      }
    }
  }

  static addClient(client) {
    MockWebSocketWithReconnect.clients.push(client);
  }

  static reset() {
    MockWebSocketWithReconnect.clients = [];
    MockWebSocketWithReconnect.serverState = {
      currentWeapon: null,
      playerNames: ['Player 1', 'Player 2'],
      playerCount: 2,
      isSpinning: false
    };
  }

  static setServerState(state) {
    MockWebSocketWithReconnect.serverState = { ...MockWebSocketWithReconnect.serverState, ...state };
  }
}

// 状態復元対応Dashboard
class MockDashboardWithRestore {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.playerNames = ['Player 1', 'Player 2'];
    this.playerCount = 2;
    this.ws = new MockWebSocketWithReconnect('ws://localhost:3000/ws');
    MockWebSocketWithReconnect.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      // Dashboard初期化時は状態要求しない（独立動作）
      console.log('Dashboard WebSocket connected');
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.source !== 'dashboard') {
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
        this.playerSelection = []; // 選択をクリア
      }
    }
  }

  // ページリロード（状態初期化）をシミュレート
  reload() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.ws.close();
    this.ws = new MockWebSocketWithReconnect('ws://localhost:3000/ws');
    MockWebSocketWithReconnect.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
  }

  handleGacha() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: 'dashboard',
        isReGacha: false,
        timestamp: Date.now()
      }
    }));

    setTimeout(() => {
      const weaponResult = {
        weapons: [
          { id: 'weapon1', name: 'テスト武器1', type: 'shooter' },
          { id: 'weapon2', name: 'テスト武器2', type: 'roller' }
        ],
        count: 2
      };
      
      this.currentWeapon = weaponResult;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: 'test_gacha_' + Date.now()
        }
      }));
    }, 50);
  }
}

// 状態復元対応Viewer
class MockViewerWithRestore {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.playerNames = ['視聴者'];
    this.playerCount = 1;
    this.ws = new MockWebSocketWithReconnect('ws://localhost:3000/ws');
    MockWebSocketWithReconnect.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      // 接続時に状態要求
      this.ws.send(JSON.stringify({
        type: 'viewer-state-request',
        data: { timestamp: Date.now() }
      }));
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.source !== 'viewer') {
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
        this.playerSelection = [];
      }
    } else if (data.type === 'viewer-state-response') {
      // 状態復元処理
      if (data.data) {
        if (data.data.currentWeapon) {
          this.currentWeapon = data.data.currentWeapon;
        }
        if (data.data.playerNames) {
          this.playerNames = data.data.playerNames;
        }
        if (data.data.playerCount) {
          this.playerCount = data.data.playerCount;
        }
        if (data.data.isSpinning !== undefined) {
          this.isSpinning = data.data.isSpinning;
        }
      }
    }
  }

  // ページリロード（状態初期化）をシミュレート
  reload() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.ws.close();
    this.ws = new MockWebSocketWithReconnect('ws://localhost:3000/ws');
    MockWebSocketWithReconnect.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      // 再接続時に状態要求
      this.ws.send(JSON.stringify({
        type: 'viewer-state-request',
        data: { timestamp: Date.now() }
      }));
    });
  }
}

test('ガチャ実行中のViewer状態復元テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const dashboard = new MockDashboardWithRestore();
  const viewer = new MockViewerWithRestore();
  
  // Dashboardでガチャ開始
  dashboard.handleGacha();
  
  // ガチャ開始後、演出完了前にViewerをリロード
  await new Promise(resolve => setTimeout(resolve, 25)); // 演出の途中
  assert.strictEqual(viewer.isSpinning, true, 'Viewerローディング中');
  
  // Viewerをリロード
  viewer.reload();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // 復元後の状態確認（ローディング中であることが復元されるべき）
  assert.strictEqual(viewer.isSpinning, true, 'Viewer状態復元後もローディング継続');
  
  // 演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 演出完了後の状態確認
  assert.strictEqual(viewer.isSpinning, false, 'Viewer演出完了後ローディング終了');
  assert.ok(viewer.currentWeapon, 'Viewer武器結果復元');
});

test('武器結果表示中のViewer状態復元テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const dashboard = new MockDashboardWithRestore();
  const viewer = new MockViewerWithRestore();
  
  // Dashboardでガチャ完了まで待機
  dashboard.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 武器結果が表示されている状態
  assert.ok(dashboard.currentWeapon, 'Dashboard武器結果あり');
  assert.ok(viewer.currentWeapon, 'Viewer武器結果あり');
  
  // サーバー状態に武器結果を設定
  MockWebSocketWithReconnect.setServerState({
    currentWeapon: dashboard.currentWeapon,
    isSpinning: false
  });
  
  // Viewerをリロード
  viewer.reload();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // 復元確認
  assert.ok(viewer.currentWeapon, 'Viewer武器結果復元');
  assert.strictEqual(viewer.isSpinning, false, 'Viewerローディング状態復元');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, dashboard.currentWeapon.weapons[0].id, '武器結果内容一致');
});

test('Dashboard初期化後のViewer操作テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const dashboard = new MockDashboardWithRestore();
  const viewer = new MockViewerWithRestore();
  
  // 最初にガチャ完了
  dashboard.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const originalWeapon = dashboard.currentWeapon;
  
  // Dashboardを初期化（ページリロード）
  dashboard.reload();
  
  // Dashboard初期化確認
  assert.strictEqual(dashboard.currentWeapon, null, 'Dashboard初期化完了');
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboardローディング状態初期化');
  
  // Viewerで新しいガチャを実行
  viewer.handleGacha = function() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: 'viewer',
        isReGacha: false,
        timestamp: Date.now()
      }
    }));

    setTimeout(() => {
      const weaponResult = {
        weapons: [{ id: 'viewer_weapon', name: '視聴者武器', type: 'slosher' }],
        count: 1
      };
      
      this.currentWeapon = weaponResult;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: 'viewer_gacha_' + Date.now()
        }
      }));
    }, 50);
  };
  
  viewer.handleGacha();
  
  // WebSocketメッセージ配信を待つ
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // Dashboard側でもローディング開始確認
  assert.strictEqual(dashboard.isSpinning, true, 'Dashboard初期化後もViewer操作に同期');
  
  // 演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 新しい結果が両方に反映されることを確認
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard演出完了');
  assert.strictEqual(viewer.isSpinning, false, 'Viewer演出完了');
  assert.ok(dashboard.currentWeapon, 'Dashboard新結果取得');
  assert.ok(viewer.currentWeapon, 'Viewer新結果取得');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'viewer_weapon', 'Dashboard新結果内容正しい');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'viewer_weapon', 'Viewer新結果内容正しい');
});

test('WebSocket再接続時の状態復元テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const viewer = new MockViewerWithRestore();
  
  // 事前にサーバー状態を設定
  MockWebSocketWithReconnect.setServerState({
    currentWeapon: {
      weapons: [{ id: 'existing_weapon', name: '既存武器', type: 'shooter' }],
      count: 1
    },
    playerNames: ['Test Player'],
    playerCount: 1,
    isSpinning: false
  });
  
  // WebSocket切断をシミュレート
  viewer.ws.close();
  
  // 切断確認
  assert.strictEqual(viewer.ws.isConnected, false, 'WebSocket切断確認');
  
  // 再接続
  viewer.ws.reconnect();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // 復元確認
  assert.ok(viewer.currentWeapon, '再接続後武器結果復元');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'existing_weapon', '武器結果内容復元');
  assert.deepStrictEqual(viewer.playerNames, ['Test Player'], 'プレイヤー名復元');
  assert.strictEqual(viewer.playerCount, 1, 'プレイヤー数復元');
  assert.strictEqual(viewer.isSpinning, false, 'ローディング状態復元');
});

test('複数回リロード時の状態一貫性テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const viewer1 = new MockViewerWithRestore();
  const viewer2 = new MockViewerWithRestore();
  
  // サーバー状態設定
  MockWebSocketWithReconnect.setServerState({
    currentWeapon: {
      weapons: [
        { id: 'consistent_weapon1', name: '一貫武器1', type: 'roller' },
        { id: 'consistent_weapon2', name: '一貫武器2', type: 'charger' }
      ],
      count: 2
    },
    isSpinning: false
  });
  
  // 両方のViewerをリロード
  viewer1.reload();
  viewer2.reload();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 30));
  
  // 両方のViewerで同じ状態が復元されることを確認
  assert.ok(viewer1.currentWeapon, 'Viewer1状態復元');
  assert.ok(viewer2.currentWeapon, 'Viewer2状態復元');
  assert.strictEqual(viewer1.currentWeapon.weapons[0].id, 'consistent_weapon1', 'Viewer1武器結果一致');
  assert.strictEqual(viewer2.currentWeapon.weapons[0].id, 'consistent_weapon1', 'Viewer2武器結果一致');
  assert.strictEqual(viewer1.currentWeapon.count, viewer2.currentWeapon.count, '武器数一致');
  
  // 再度リロードして一貫性確認
  viewer1.reload();
  await new Promise(resolve => setTimeout(resolve, 20));
  
  assert.strictEqual(viewer1.currentWeapon.weapons[0].id, 'consistent_weapon1', '再リロード後も一致');
});

test('状態要求メッセージ形式確認テスト', async () => {
  MockWebSocketWithReconnect.reset();
  
  const viewer = new MockViewerWithRestore();
  
  // WebSocket接続を待つ
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // 状態要求メッセージの確認
  const stateRequestMessage = viewer.ws.messages.find(msg => msg.type === 'viewer-state-request');
  assert.ok(stateRequestMessage, '状態要求メッセージ送信');
  assert.strictEqual(stateRequestMessage.type, 'viewer-state-request', 'メッセージタイプ正しい');
  assert.ok(stateRequestMessage.data.timestamp, 'タイムスタンプ存在');
  
  // 再接続時の状態要求確認
  viewer.ws.close();
  viewer.ws.reconnect();
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const reconnectStateRequestMessages = viewer.ws.messages.filter(msg => msg.type === 'viewer-state-request');
  assert.strictEqual(reconnectStateRequestMessages.length, 2, '再接続時も状態要求送信');
});

console.log('🔄 リアルタイム状態復元テストが完了しました');