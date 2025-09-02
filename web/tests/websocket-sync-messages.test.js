const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

// WebSocket同期メッセージング拡張テスト

class MockSyncWebSocket extends EventEmitter {
  constructor(url, clientType = 'unknown') {
    super();
    this.url = url;
    this.clientType = clientType;
    this.readyState = 1; // WebSocket.OPEN
    this.messages = [];
    this.isConnected = true;
    setTimeout(() => this.emit('open'), 0);
  }

  send(data) {
    if (!this.isConnected) return;
    
    const message = JSON.parse(data);
    this.messages.push(message);
    
    // サーバー側の状態管理をシミュレート
    MockSyncWebSocket.handleServerMessage(message, this);
    
    // 他のクライアントに配信をシミュレート
    MockSyncWebSocket.broadcast(message, this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.isConnected = false;
    MockSyncWebSocket.removeClient(this);
    this.emit('close');
  }

  static clients = [];
  static serverState = {
    currentWeapon: null,
    playerNames: ['Player 1', 'Player 2'],
    playerCount: 2,
    isSpinning: false,
    lastGachaId: null
  };
  
  static handleServerMessage(message, sender) {
    if (message.type === 'gacha-started') {
      MockSyncWebSocket.serverState.isSpinning = true;
    } else if (message.type === 'overlay-animation-completed') {
      MockSyncWebSocket.serverState.isSpinning = false;
      if (message.data && message.data.fullState) {
        MockSyncWebSocket.serverState.currentWeapon = message.data.fullState;
      }
      if (message.data && message.data.gachaId) {
        MockSyncWebSocket.serverState.lastGachaId = message.data.gachaId;
      }
    } else if (message.type === 'dashboard-state-request' || message.type === 'viewer-state-request') {
      // 状態要求に対するレスポンス
      setTimeout(() => {
        const responseType = message.type === 'dashboard-state-request' 
          ? 'dashboard-state-response' 
          : 'viewer-state-response';
          
        sender.emit('message', {
          data: JSON.stringify({
            type: responseType,
            data: MockSyncWebSocket.serverState
          })
        });
      }, 10);
    } else if (message.type === 'player-names-changed') {
      MockSyncWebSocket.serverState.playerNames = message.data.playerNames;
      MockSyncWebSocket.serverState.playerCount = message.data.playerCount;
    }
  }
  
  static broadcast(message, sender) {
    MockSyncWebSocket.clients.forEach(client => {
      if (client !== sender && client.isConnected) {
        setTimeout(() => client.emit('message', { data: JSON.stringify(message) }), 0);
      }
    });
  }

  static addClient(client) {
    MockSyncWebSocket.clients.push(client);
  }

  static removeClient(client) {
    const index = MockSyncWebSocket.clients.indexOf(client);
    if (index > -1) {
      MockSyncWebSocket.clients.splice(index, 1);
    }
  }

  static reset() {
    MockSyncWebSocket.clients = [];
    MockSyncWebSocket.serverState = {
      currentWeapon: null,
      playerNames: ['Player 1', 'Player 2'],
      playerCount: 2,
      isSpinning: false,
      lastGachaId: null
    };
  }
}

// 状態復元対応Dashboard（改良版）
class MockDashboardWithSync {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.playerNames = ['Player 1', 'Player 2'];
    this.playerCount = 2;
    this.ws = new MockSyncWebSocket('ws://localhost:3000/ws', 'dashboard');
    MockSyncWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      // Dashboard接続時も状態を要求（状態復元）
      this.ws.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: { timestamp: Date.now() }
      }));
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.source !== 'dashboard') {
      console.log('Dashboard: Gacha started from:', data.data.source);
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      console.log('Dashboard: Overlay animation completed');
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
        this.playerSelection = []; // 選択をクリア
      }
    } else if (data.type === 'dashboard-state-response') {
      // Dashboard状態復元処理
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
        console.log('Dashboard: State restored from server');
      }
    } else if (data.type === 'player-names-changed') {
      this.playerNames = data.data.playerNames;
      this.playerCount = data.data.playerCount;
    }
  }

  // プレイヤー名変更（他の画面に同期）
  updatePlayerNames(playerNames) {
    this.playerNames = playerNames;
    this.playerCount = playerNames.length;
    
    this.ws.send(JSON.stringify({
      type: 'player-names-changed',
      data: {
        playerNames: this.playerNames,
        playerCount: this.playerCount
      }
    }));
  }

  reload() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.ws.close();
    this.ws = new MockSyncWebSocket('ws://localhost:3000/ws', 'dashboard');
    MockSyncWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      // リロード時に状態復元を要求
      this.ws.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: { timestamp: Date.now() }
      }));
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

// 状態復元対応Viewer（改良版）
class MockViewerWithSync {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.playerNames = ['視聴者'];
    this.playerCount = 1;
    this.ws = new MockSyncWebSocket('ws://localhost:3000/ws', 'viewer');
    MockSyncWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
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
    } else if (data.type === 'player-names-changed') {
      this.playerNames = data.data.playerNames;
      this.playerCount = data.data.playerCount;
    }
  }

  reload() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.ws.close();
    this.ws = new MockSyncWebSocket('ws://localhost:3000/ws', 'viewer');
    MockSyncWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({
        type: 'viewer-state-request',
        data: { timestamp: Date.now() }
      }));
    });
  }
}

test('Dashboard状態要求・復元メッセージテスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard = new MockDashboardWithSync();
  
  // 接続時の状態要求メッセージ確認
  await new Promise(resolve => setTimeout(resolve, 20));
  
  const stateRequestMessage = dashboard.ws.messages.find(msg => msg.type === 'dashboard-state-request');
  assert.ok(stateRequestMessage, 'Dashboard状態要求メッセージ送信');
  assert.strictEqual(stateRequestMessage.type, 'dashboard-state-request', 'メッセージタイプ正しい');
  assert.ok(stateRequestMessage.data.timestamp, 'タイムスタンプ存在');
});

test('gacha-started メッセージ拡張フィールドテスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard = new MockDashboardWithSync();
  
  // 通常ガチャ開始メッセージ
  dashboard.handleGacha();
  
  const normalGachaMessage = dashboard.ws.messages.find(msg => msg.type === 'gacha-started');
  assert.ok(normalGachaMessage, 'ガチャ開始メッセージ送信');
  assert.strictEqual(normalGachaMessage.data.source, 'dashboard', 'ソース正しい');
  assert.strictEqual(normalGachaMessage.data.isReGacha, false, '通常ガチャフラグ正しい');
  assert.ok(normalGachaMessage.data.timestamp, 'タイムスタンプ存在');
  assert.strictEqual(normalGachaMessage.data.selectedPlayers, undefined, '選択プレイヤー数未設定');
});

test('overlay-animation-completed メッセージ拡張フィールドテスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard = new MockDashboardWithSync();
  
  dashboard.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const completedMessage = dashboard.ws.messages.find(msg => msg.type === 'overlay-animation-completed');
  assert.ok(completedMessage, '演出完了メッセージ送信');
  assert.ok(completedMessage.data.fullState, 'fullState存在');
  assert.ok(completedMessage.data.gachaId, 'gachaId存在');
  assert.ok(completedMessage.data.fullState.weapons, '武器データ存在');
  assert.strictEqual(completedMessage.data.fullState.count, 2, 'カウント正しい');
});

test('Dashboardリロード時の状態復元テスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard1 = new MockDashboardWithSync();
  const viewer = new MockViewerWithSync();
  
  // 最初にガチャを実行して状態を作る
  dashboard1.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const originalWeapon = dashboard1.currentWeapon;
  assert.ok(originalWeapon, '元の武器結果存在');
  
  // Dashboardをリロード（新しいインスタンスで状態復元をシミュレート）
  dashboard1.reload();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 30));
  
  // Dashboard状態復元確認
  assert.ok(dashboard1.currentWeapon, 'Dashboard武器結果復元');
  assert.strictEqual(dashboard1.currentWeapon.weapons[0].id, originalWeapon.weapons[0].id, 'Dashboard武器結果内容一致');
  assert.strictEqual(dashboard1.isSpinning, false, 'Dashboardローディング状態復元');
  
  // 復元後もViewerと同期していることを確認
  assert.strictEqual(dashboard1.currentWeapon.weapons[0].id, viewer.currentWeapon.weapons[0].id, 'Dashboard-Viewer結果同期');
});

test('プレイヤー名変更同期テスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard = new MockDashboardWithSync();
  const viewer = new MockViewerWithSync();
  
  // 初期状態確認
  await new Promise(resolve => setTimeout(resolve, 20));
  
  const initialPlayerNames = ['Player 1', 'Player 2'];
  assert.deepStrictEqual(dashboard.playerNames, initialPlayerNames, 'Dashboard初期プレイヤー名');
  
  // Dashboardでプレイヤー名変更
  const newPlayerNames = ['Alice', 'Bob', 'Charlie'];
  dashboard.updatePlayerNames(newPlayerNames);
  
  // WebSocket配信を待つ
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // Viewer側でプレイヤー名同期確認
  assert.deepStrictEqual(viewer.playerNames, newPlayerNames, 'Viewerプレイヤー名同期');
  assert.strictEqual(viewer.playerCount, newPlayerNames.length, 'Viewerプレイヤー数同期');
  
  // プレイヤー名変更メッセージ確認
  const playerChangeMessage = dashboard.ws.messages.find(msg => msg.type === 'player-names-changed');
  assert.ok(playerChangeMessage, 'プレイヤー名変更メッセージ送信');
  assert.deepStrictEqual(playerChangeMessage.data.playerNames, newPlayerNames, 'メッセージ内容正しい');
  assert.strictEqual(playerChangeMessage.data.playerCount, newPlayerNames.length, 'メッセージプレイヤー数正しい');
});

test('複数Dashboard間の状態同期テスト', async () => {
  MockSyncWebSocket.reset();
  
  const dashboard1 = new MockDashboardWithSync();
  const dashboard2 = new MockDashboardWithSync();
  const viewer = new MockViewerWithSync();
  
  // Dashboard1でガチャ実行
  dashboard1.handleGacha();
  
  // ローディング同期確認
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.strictEqual(dashboard1.isSpinning, true, 'Dashboard1ローディング');
  assert.strictEqual(dashboard2.isSpinning, true, 'Dashboard2ローディング同期');
  assert.strictEqual(viewer.isSpinning, true, 'Viewerローディング同期');
  
  // 演出完了待ち
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 結果同期確認
  const expectedWeaponId = dashboard1.currentWeapon.weapons[0].id;
  assert.strictEqual(dashboard2.currentWeapon.weapons[0].id, expectedWeaponId, 'Dashboard2結果同期');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, expectedWeaponId, 'Viewer結果同期');
  
  // Dashboard2でプレイヤー名変更
  dashboard2.updatePlayerNames(['新プレイヤー1', '新プレイヤー2']);
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // プレイヤー名同期確認
  assert.deepStrictEqual(dashboard1.playerNames, ['新プレイヤー1', '新プレイヤー2'], 'Dashboard1プレイヤー名同期');
  assert.deepStrictEqual(viewer.playerNames, ['新プレイヤー1', '新プレイヤー2'], 'Viewerプレイヤー名同期');
});

test('状態復元メッセージレスポンス形式テスト', async () => {
  MockSyncWebSocket.reset();
  
  // 事前にサーバー状態を設定
  MockSyncWebSocket.serverState = {
    currentWeapon: {
      weapons: [{ id: 'test_weapon', name: 'テスト武器', type: 'shooter' }],
      count: 1
    },
    playerNames: ['Test Player'],
    playerCount: 1,
    isSpinning: false,
    lastGachaId: 'test_gacha_123'
  };
  
  const dashboard = new MockDashboardWithSync();
  
  // 状態復元レスポンスを待つ
  await new Promise(resolve => setTimeout(resolve, 30));
  
  // 復元された状態を確認
  assert.ok(dashboard.currentWeapon, '武器結果復元');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'test_weapon', '武器ID復元');
  assert.deepStrictEqual(dashboard.playerNames, ['Test Player'], 'プレイヤー名復元');
  assert.strictEqual(dashboard.playerCount, 1, 'プレイヤー数復元');
  assert.strictEqual(dashboard.isSpinning, false, 'ローディング状態復元');
});

test('同時リロード時の状態一貫性テスト', async () => {
  MockSyncWebSocket.reset();
  
  // 複数のクライアントが同時に状態復元を要求
  const dashboard1 = new MockDashboardWithSync();
  const dashboard2 = new MockDashboardWithSync();
  const viewer = new MockViewerWithSync();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 30));
  
  // すべてのクライアントで同じ初期状態が復元されることを確認
  assert.deepStrictEqual(dashboard1.playerNames, dashboard2.playerNames, 'Dashboard間プレイヤー名一致');
  assert.deepStrictEqual(dashboard1.playerNames, viewer.playerNames, 'Dashboard-Viewerプレイヤー名一致');
  assert.strictEqual(dashboard1.playerCount, dashboard2.playerCount, 'Dashboard間プレイヤー数一致');
  assert.strictEqual(dashboard1.isSpinning, dashboard2.isSpinning, 'Dashboard間ローディング状態一致');
  
  // 一つのクライアントで変更を行い、他のクライアントに同期されることを確認
  dashboard1.updatePlayerNames(['同期テスト1', '同期テスト2']);
  await new Promise(resolve => setTimeout(resolve, 20));
  
  assert.deepStrictEqual(dashboard2.playerNames, ['同期テスト1', '同期テスト2'], 'Dashboard2同期');
  assert.deepStrictEqual(viewer.playerNames, ['同期テスト1', '同期テスト2'], 'Viewer同期');
});

console.log('🔄 WebSocket同期メッセージングテストが完了しました');