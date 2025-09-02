const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');
const { generateClientId } = require('../utils/id-generator');

// Dashboard-Viewer同期テスト

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
    // 他のクライアントに配信をシミュレート
    MockWebSocket.broadcast(JSON.parse(data), this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }

  static clients = [];
  
  static broadcast(message, sender) {
    MockWebSocket.clients.forEach(client => {
      if (client !== sender) {
        setTimeout(() => client.emit('message', { data: JSON.stringify(message) }), 0);
      }
    });
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
  }
}

// Dashboard状態シミュレーション
class MockDashboard {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.clientId = generateClientId('dashboard');
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    MockWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.clientId !== this.clientId) {
      console.log('Dashboard: Gacha started from:', data.data.source, 'clientId:', data.data.clientId);
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      console.log('Dashboard: Overlay animation completed');
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
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
        source: 'dashboard',
        clientId: this.clientId,
        isReGacha: false,
        timestamp: Date.now()
      }
    }));

    // API呼び出しとoverlay演出をシミュレート
    setTimeout(() => {
      const weaponResult = {
        weapons: [
          { id: 'weapon1', name: 'テスト武器1', type: 'shooter' },
          { id: 'weapon2', name: 'テスト武器2', type: 'roller' }
        ],
        count: 2
      };
      
      this.currentWeapon = weaponResult;
      
      // overlay演出完了をシミュレート（自分の状態は直接更新）
      this.isSpinning = false;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: 'test_gacha_' + Date.now()
        }
      }));
    }, 100);
  }

  handleReGacha() {
    if (this.isSpinning || this.playerSelection.length === 0 || !this.currentWeapon) return;
    
    this.isSpinning = true;
    
    // 再ガチャ開始をWebSocketで通知
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: 'dashboard',
        clientId: this.clientId,
        isReGacha: true,
        selectedPlayers: this.playerSelection.length,
        timestamp: Date.now()
      }
    }));

    setTimeout(() => {
      // 再ガチャ結果をシミュレート
      const newWeapons = [
        { id: 'weapon_new1', name: '新武器1', type: 'charger' }
      ];
      
      const updatedWeapons = [...this.currentWeapon.weapons];
      this.playerSelection.forEach((selectedIndex, dataIndex) => {
        if (dataIndex < newWeapons.length) {
          updatedWeapons[selectedIndex] = newWeapons[dataIndex];
        }
      });

      this.currentWeapon = { ...this.currentWeapon, weapons: updatedWeapons };
      
      // 再ガチャ演出完了をシミュレート（自分の状態は直接更新）
      this.isSpinning = false;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: {
            weapons: updatedWeapons,
            count: updatedWeapons.length
          },
          gachaId: 'regacha_test_' + Date.now()
        }
      }));
    }, 100);
  }

  togglePlayerSelection(index) {
    if (this.playerSelection.includes(index)) {
      this.playerSelection = this.playerSelection.filter(i => i !== index);
    } else {
      this.playerSelection = [...this.playerSelection, index];
    }
  }
}

// Viewer状態シミュレーション
class MockViewer {
  constructor() {
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
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
      console.log('Viewer: Gacha started from:', data.data.source, 'clientId:', data.data.clientId);
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      console.log('Viewer: Overlay animation completed');
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
        this.playerSelection = []; // 選択をクリア
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

    setTimeout(() => {
      const weaponResult = {
        weapons: [
          { id: 'viewer_weapon1', name: '視聴者武器1', type: 'slosher' }
        ],
        count: 1
      };
      
      this.currentWeapon = weaponResult;
      
      // overlay演出完了をシミュレート（自分の状態は直接更新）
      this.isSpinning = false;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: 'viewer_gacha_' + Date.now()
        }
      }));
    }, 100);
  }
}

test('Dashboard→Viewerガチャ開始同期テスト', async () => {
  MockWebSocket.reset();
  
  const dashboard = new MockDashboard();
  const viewer = new MockViewer();
  
  // 初期状態確認
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard初期状態でローディングなし');
  assert.strictEqual(viewer.isSpinning, false, 'Viewer初期状態でローディングなし');
  
  // Dashboardでガチャ実行
  dashboard.handleGacha();
  
  // Dashboardは即座にローディング開始
  assert.strictEqual(dashboard.isSpinning, true, 'Dashboard即座にローディング開始');
  
  // WebSocketメッセージ配信を待つ
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Viewerもローディング開始を確認
  assert.strictEqual(viewer.isSpinning, true, 'ViewerもWebSocket経由でローディング開始');
  
  // overlay演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 両画面でローディング終了と結果設定を確認
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard演出完了後ローディング終了');
  assert.strictEqual(viewer.isSpinning, false, 'Viewer演出完了後ローディング終了');
  assert.ok(dashboard.currentWeapon, 'Dashboardに武器結果設定');
  assert.ok(viewer.currentWeapon, 'Viewerに武器結果設定');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'weapon1', 'Dashboard武器結果正しい');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'weapon1', 'Viewer武器結果正しい');
});

test('Viewer→Dashboardガチャ開始同期テスト', async () => {
  MockWebSocket.reset();
  
  const dashboard = new MockDashboard();
  const viewer = new MockViewer();
  
  // Viewerでガチャ実行
  viewer.handleGacha();
  
  // Viewerは即座にローディング開始
  assert.strictEqual(viewer.isSpinning, true, 'Viewer即座にローディング開始');
  
  // WebSocketメッセージ配信を待つ
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Dashboardもローディング開始を確認
  assert.strictEqual(dashboard.isSpinning, true, 'DashboardもWebSocket経由でローディング開始');
  
  // overlay演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 両画面でローディング終了と結果設定を確認
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard演出完了後ローディング終了');
  assert.strictEqual(viewer.isSpinning, false, 'Viewer演出完了後ローディング終了');
  assert.ok(dashboard.currentWeapon, 'Dashboardに武器結果設定');
  assert.ok(viewer.currentWeapon, 'Viewerに武器結果設定');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'viewer_weapon1', 'Dashboard武器結果正しい');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'viewer_weapon1', 'Viewer武器結果正しい');
});

test('再ガチャ同期テスト', async () => {
  MockWebSocket.reset();
  
  const dashboard = new MockDashboard();
  const viewer = new MockViewer();
  
  // 最初に通常ガチャを実行
  dashboard.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // プレイヤー選択状態を設定
  dashboard.togglePlayerSelection(0);
  assert.strictEqual(dashboard.playerSelection.length, 1, 'プレイヤー選択状態設定');
  
  // 再ガチャ実行
  dashboard.handleReGacha();
  
  // 再ガチャメッセージ送信確認
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(viewer.isSpinning, true, 'Viewer再ガチャローディング開始');
  
  // 再ガチャ演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 再ガチャ結果確認
  assert.strictEqual(dashboard.isSpinning, false, 'Dashboard再ガチャ完了');
  assert.strictEqual(viewer.isSpinning, false, 'Viewer再ガチャ完了');
  assert.strictEqual(dashboard.currentWeapon.weapons[0].id, 'weapon_new1', 'Dashboard再ガチャ結果正しい');
  assert.strictEqual(viewer.currentWeapon.weapons[0].id, 'weapon_new1', 'Viewer再ガチャ結果正しい');
});

test('複数クライアント同期テスト', async () => {
  MockWebSocket.reset();
  
  const dashboard1 = new MockDashboard();
  const dashboard2 = new MockDashboard();
  const viewer1 = new MockViewer();
  const viewer2 = new MockViewer();
  
  // Dashboard1でガチャ実行
  dashboard1.handleGacha();
  
  // WebSocketメッセージ配信を待つ
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // すべてのクライアントでローディング開始確認
  assert.strictEqual(dashboard1.isSpinning, true, 'Dashboard1ローディング開始');
  assert.strictEqual(dashboard2.isSpinning, true, 'Dashboard2ローディング開始');
  assert.strictEqual(viewer1.isSpinning, true, 'Viewer1ローディング開始');
  assert.strictEqual(viewer2.isSpinning, true, 'Viewer2ローディング開始');
  
  // overlay演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // すべてのクライアントで結果同期確認
  const expectedWeaponId = dashboard1.currentWeapon.weapons[0].id;
  assert.strictEqual(dashboard2.currentWeapon.weapons[0].id, expectedWeaponId, 'Dashboard2結果同期');
  assert.strictEqual(viewer1.currentWeapon.weapons[0].id, expectedWeaponId, 'Viewer1結果同期');
  assert.strictEqual(viewer2.currentWeapon.weapons[0].id, expectedWeaponId, 'Viewer2結果同期');
});

test('WebSocketメッセージ形式確認テスト', async () => {
  MockWebSocket.reset();
  
  const dashboard = new MockDashboard();
  
  // ガチャ開始メッセージ確認
  dashboard.handleGacha();
  
  const startMessage = dashboard.ws.messages[0];
  assert.strictEqual(startMessage.type, 'gacha-started', 'ガチャ開始メッセージタイプ正しい');
  assert.strictEqual(startMessage.data.source, 'dashboard', 'ソース情報正しい');
  assert.strictEqual(startMessage.data.isReGacha, false, '通常ガチャフラグ正しい');
  assert.ok(startMessage.data.timestamp, 'タイムスタンプ存在');
  
  // 再ガチャ開始メッセージ確認
  await new Promise(resolve => setTimeout(resolve, 150));
  dashboard.togglePlayerSelection(0);
  dashboard.handleReGacha();
  
  const reGachaStartMessage = dashboard.ws.messages.find(msg => 
    msg.type === 'gacha-started' && msg.data.isReGacha === true
  );
  assert.ok(reGachaStartMessage, '再ガチャ開始メッセージ存在');
  assert.strictEqual(reGachaStartMessage.data.selectedPlayers, 1, '選択プレイヤー数正しい');
});

console.log('🔄 Dashboard-Viewer同期テストが完了しました');