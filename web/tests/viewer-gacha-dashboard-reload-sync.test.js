const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');
const { generateClientId } = require('../utils/id-generator');

// 視聴者画面からのガチャ実行時のダッシュボードリロード同期テスト

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
    // 全クライアントに配信をシミュレート
    MockWebSocket.broadcast(JSON.parse(data), this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }

  static clients = [];
  static serverState = {
    lastResult: null,
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    playerCount: 1,
    lastGachaId: null,
    isOverlayCompleted: false,
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
  
  static broadcast(message, sender) {
    MockWebSocket.clients.forEach(client => {
      if (client !== sender) {
        setTimeout(() => client.emit('message', { data: JSON.stringify(message) }), 0);
      }
    });

    // サーバー側の処理をシミュレート
    MockWebSocket.handleServerMessage(message, sender);
  }

  static handleServerMessage(message, sender) {
    switch (message.type) {
      case 'gacha-result':
        // ガチャ結果を保存
        if (message.data && message.data.result) {
          MockWebSocket.serverState.lastResult = message.data.result;
          MockWebSocket.serverState.lastGachaId = message.data.gachaId;
          if (message.data.playerNames) {
            MockWebSocket.serverState.playerNames = [...message.data.playerNames];
            MockWebSocket.serverState.playerCount = message.data.playerNames.length;
          }
          MockWebSocket.serverState.isOverlayCompleted = false; // overlay演出中
          console.log('Server: Gacha state saved:', MockWebSocket.serverState);
        }
        break;

      case 'overlay-animation-completed':
        // overlay演出完了時の処理（重要な修正点）
        if (message.data && message.data.gachaId === MockWebSocket.serverState.lastGachaId) {
          MockWebSocket.serverState.isOverlayCompleted = true;
          MockWebSocket.serverState.isSpinning = false; // ローディング状態終了
          console.log('Server: Overlay animation completed, isSpinning set to false');
          
          // 全クライアントにwidget-updateを配信
          if (MockWebSocket.serverState.lastResult) {
            const widgetUpdateMessage = {
              type: 'widget-update',
              data: {
                result: MockWebSocket.serverState.lastResult,
                playerNames: MockWebSocket.serverState.playerNames.slice(0, MockWebSocket.serverState.playerCount),
                gachaId: MockWebSocket.serverState.lastGachaId
              }
            };
            MockWebSocket.clients.forEach(client => {
              setTimeout(() => client.emit('message', { data: JSON.stringify(widgetUpdateMessage) }), 0);
            });
          }
        } else {
          // gachaIdが一致しない場合でも、ローディング状態は終了
          MockWebSocket.serverState.isSpinning = false;
          console.log('Server: Overlay animation completed (gachaId mismatch), isSpinning set to false');
        }
        break;

      case 'gacha-started':
        // ガチャ開始状態を記録
        if (message.data) {
          MockWebSocket.serverState.isSpinning = true;
          console.log('Server: Gacha started, isSpinning set to true');
        }
        break;

      case 'dashboard-state-request':
        // Dashboard状態復元要求への応答
        setTimeout(() => {
          sender.emit('message', {
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
        }, 10);
        break;

      case 'dashboard-reload':
        console.log('Server: Dashboard reload detected');
        // リセット処理は行わない（状態復元機能があるため）
        break;
    }
  }

  static addClient(client) {
    MockWebSocket.clients.push(client);
  }

  static removeClient(client) {
    const index = MockWebSocket.clients.indexOf(client);
    if (index > -1) {
      MockWebSocket.clients.splice(index, 1);
    }
  }

  static reset() {
    MockWebSocket.clients = [];
    MockWebSocket.serverState = {
      lastResult: null,
      playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
      playerCount: 1,
      lastGachaId: null,
      isOverlayCompleted: false,
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

// MockViewer（ガチャを実行する側）
class MockViewer {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.clientId = generateClientId('viewer');
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    MockWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.clientId !== this.clientId) {
      console.log('Viewer: Gacha started from:', data.data.source);
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      console.log('Viewer: Overlay animation completed');
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
      }
    } else if (data.type === 'widget-update') {
      if (data.data && data.data.result) {
        this.currentWeapon = data.data.result;
        console.log('Viewer: Weapon result updated via widget-update');
      }
    }
  }

  handleGacha() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    
    // ガチャ開始をWebSocketで通知
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: 'viewer',
        clientId: this.clientId,
        isReGacha: false,
        timestamp: Date.now()
      }
    }));

    // ガチャ結果をシミュレート
    const weaponResult = {
      weapons: [
        { id: 'viewer_weapon_test', name: '視聴者テスト武器', type: 'slosher' }
      ],
      count: 1
    };
    const gachaId = 'viewer_gacha_' + Date.now();
    
    // ガチャ結果を送信
    this.ws.send(JSON.stringify({
      type: 'gacha-result',
      data: {
        result: weaponResult,
        playerNames: ['視聴者'],
        gachaId: gachaId
      }
    }));

    // overlay演出をシミュレート（100ms後に完了）
    setTimeout(() => {
      this.currentWeapon = weaponResult;
      this.isSpinning = false;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: gachaId
        }
      }));
      console.log('Viewer: Gacha animation completed');
    }, 100);
  }
}

// MockDashboard（リロードされる側）
class MockDashboard {
  constructor() {
    this.currentWeapon = null;
    this.isSpinning = false;
    this.isRestoringState = true;
    this.clientId = generateClientId('dashboard');
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    MockWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    // リロード通知を送信
    this.ws.send(JSON.stringify({
      type: 'dashboard-reload',
      data: {
        source: 'dashboard-reload',
        timestamp: Date.now()
      }
    }));

    // 状態復元要求を送信
    this.ws.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: { timestamp: Date.now() }
    }));
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.clientId !== this.clientId) {
      console.log('Dashboard: Gacha started from:', data.data.source);
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      console.log('Dashboard: Overlay animation completed');
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
      }
    } else if (data.type === 'widget-update') {
      if (data.data && data.data.result) {
        this.currentWeapon = data.data.result;
        console.log('Dashboard: Weapon result updated via widget-update');
      }
    } else if (data.type === 'dashboard-state-response' && data.data) {
      console.log('Dashboard: State restoration response received');
      
      if (data.data.currentWeapon) {
        this.currentWeapon = data.data.currentWeapon;
      }
      if (data.data.isSpinning !== undefined) {
        this.isSpinning = data.data.isSpinning;
      }
      
      this.isRestoringState = false;
      console.log('Dashboard: State restoration completed');
    }
  }
}

test('視聴者画面からガチャ実行→ダッシュボードリロード同期テスト', async () => {
  MockWebSocket.reset();
  
  // 1. 視聴者画面を作成してガチャを実行
  const viewer = new MockViewer();
  console.log('=== Starting viewer gacha ===');
  viewer.handleGacha();
  
  // ガチャ演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 視聴者画面でガチャが完了していることを確認
  assert.strictEqual(viewer.isSpinning, false, 'Viewer gacha completed');
  assert.ok(viewer.currentWeapon, 'Viewer has weapon result');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'viewer_weapon_test', 'Viewer weapon result correct');
  
  // サーバー状態を確認
  console.log('Server state after viewer gacha:', MockWebSocket.serverState);
  assert.ok(MockWebSocket.serverState.lastResult, 'Server has gacha result');
  assert.strictEqual(MockWebSocket.serverState.isSpinning, false, 'Server isSpinning is false');
  assert.strictEqual(MockWebSocket.serverState.isOverlayCompleted, true, 'Server overlay completed');
  
  // 2. ダッシュボードをリロード（新しい接続として）
  console.log('=== Dashboard reload after viewer gacha ===');
  const dashboard = new MockDashboard();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // ダッシュボードで正しく状態が復元されているか確認
  assert.strictEqual(dashboard.isRestoringState, false, 'Dashboard state restoration completed');
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard isSpinning correctly restored (should be false)');
  assert.ok(dashboard.currentWeapon, 'Dashboard has weapon result after restoration');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'viewer_weapon_test', 'Dashboard weapon result matches viewer');
});

test('ガチャ実行中のダッシュボードリロード同期テスト', async () => {
  MockWebSocket.reset();
  
  // 1. 視聴者画面を作成してガチャを開始（演出完了前）
  const viewer = new MockViewer();
  
  // ガチャ開始のみ（演出完了前）
  viewer.isSpinning = true;
  viewer.ws.send(JSON.stringify({
    type: 'gacha-started',
    data: {
      source: 'viewer',
      clientId: viewer.clientId,
      isReGacha: false,
      timestamp: Date.now()
    }
  }));

  // ガチャ結果を送信（ただしoverlay演出はまだ完了していない）
  const weaponResult = {
    weapons: [{ id: 'spinning_weapon', name: 'スピニング武器', type: 'shooter' }],
    count: 1
  };
  const gachaId = 'spinning_gacha_' + Date.now();
  
  viewer.ws.send(JSON.stringify({
    type: 'gacha-result',
    data: {
      result: weaponResult,
      playerNames: ['視聴者'],
      gachaId: gachaId
    }
  }));

  await new Promise(resolve => setTimeout(resolve, 10));
  
  // サーバー状態確認（ガチャ実行中）
  assert.strictEqual(MockWebSocket.serverState.isSpinning, true, 'Server isSpinning is true during gacha');
  assert.ok(MockWebSocket.serverState.lastResult, 'Server has gacha result');
  assert.strictEqual(MockWebSocket.serverState.isOverlayCompleted, false, 'Server overlay not completed yet');
  
  // 2. ガチャ実行中にダッシュボードをリロード
  console.log('=== Dashboard reload during gacha ===');
  const dashboard = new MockDashboard();
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // ダッシュボードで正しくガチャ実行中状態が復元されているか確認
  assert.strictEqual(dashboard.isRestoringState, false, 'Dashboard state restoration completed');
  assert.strictEqual(dashboard.isSpinning, true, 'Dashboard isSpinning correctly restored (should be true during gacha)');
  
  // 3. ガチャ演出を完了させる
  console.log('=== Completing gacha animation ===');
  viewer.currentWeapon = weaponResult;
  viewer.isSpinning = false;
  
  viewer.ws.send(JSON.stringify({
    type: 'overlay-animation-completed',
    data: {
      fullState: weaponResult,
      gachaId: gachaId
    }
  }));
  
  // 演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // 両画面でガチャ完了状態になっているか確認
  assert.strictEqual(viewer.isSpinning, false, 'Viewer gacha completed');
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard gacha completed');
  assert.ok(dashboard.currentWeapon, 'Dashboard has weapon result');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'spinning_weapon', 'Dashboard weapon result correct');
});

test('複数回のリロード時の状態一貫性テスト', async () => {
  MockWebSocket.reset();
  
  // 1. 視聴者画面でガチャ完了
  const viewer = new MockViewer();
  viewer.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 2. ダッシュボード1回目リロード
  const dashboard1 = new MockDashboard();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  assert.strictEqual(dashboard1.isSpinning, false, 'Dashboard1 correct state');
  assert.ok(dashboard1.currentWeapon, 'Dashboard1 has weapon');
  
  // 3. ダッシュボード2回目リロード
  const dashboard2 = new MockDashboard();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  assert.strictEqual(dashboard2.isSpinning, false, 'Dashboard2 correct state');
  assert.ok(dashboard2.currentWeapon, 'Dashboard2 has weapon');
  assert.strictEqual(dashboard2.currentWeapon.weapons[0].id, dashboard1.currentWeapon.weapons[0].id, 'Consistent weapon results');
  
  // 4. ダッシュボード3回目リロード（連続リロード）
  const dashboard3 = new MockDashboard();
  await new Promise(resolve => setTimeout(resolve, 50));
  
  assert.strictEqual(dashboard3.isSpinning, false, 'Dashboard3 correct state');
  assert.ok(dashboard3.currentWeapon, 'Dashboard3 has weapon');
  assert.strictEqual(dashboard3.currentWeapon.weapons[0].id, dashboard1.currentWeapon.weapons[0].id, 'Consistent weapon results after multiple reloads');
});

console.log('🔄 視聴者画面ガチャ→ダッシュボードリロード同期テストが完了しました');