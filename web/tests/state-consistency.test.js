const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

// 状態整合性確認テスト

class MockConsistencyWebSocket extends EventEmitter {
  constructor(url, clientId) {
    super();
    this.url = url;
    this.clientId = clientId;
    this.readyState = 1; // WebSocket.OPEN
    this.messages = [];
    this.isConnected = true;
    setTimeout(() => this.emit('open'), 0);
  }

  send(data) {
    if (!this.isConnected) return;
    
    const message = JSON.parse(data);
    this.messages.push(message);
    
    // サーバー側の状態管理と整合性チェック
    MockConsistencyWebSocket.handleServerMessage(message, this);
    
    // 他のクライアントに配信
    MockConsistencyWebSocket.broadcast(message, this);
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.isConnected = false;
    MockConsistencyWebSocket.removeClient(this);
    this.emit('close');
  }

  static clients = [];
  static serverState = {
    currentWeapon: null,
    playerNames: ['Player 1', 'Player 2'],
    playerCount: 2,
    isSpinning: false,
    lastGachaId: null,
    gachaHistory: [], // ガチャ履歴
    stateVersion: 0   // 状態バージョン
  };
  
  static handleServerMessage(message, sender) {
    if (message.type === 'gacha-started') {
      MockConsistencyWebSocket.serverState.isSpinning = true;
      MockConsistencyWebSocket.serverState.stateVersion++;
      
      // ガチャ履歴に記録
      MockConsistencyWebSocket.serverState.gachaHistory.push({
        type: 'started',
        source: message.data.source,
        isReGacha: message.data.isReGacha,
        timestamp: message.data.timestamp,
        gachaId: message.data.gachaId || ('pending_' + Date.now()),
        stateVersion: MockConsistencyWebSocket.serverState.stateVersion
      });
      
    } else if (message.type === 'overlay-animation-completed') {
      MockConsistencyWebSocket.serverState.isSpinning = false;
      MockConsistencyWebSocket.serverState.stateVersion++;
      
      if (message.data && message.data.fullState) {
        MockConsistencyWebSocket.serverState.currentWeapon = message.data.fullState;
      }
      if (message.data && message.data.gachaId) {
        MockConsistencyWebSocket.serverState.lastGachaId = message.data.gachaId;
        
        // ガチャ履歴を更新
        const historyItem = MockConsistencyWebSocket.serverState.gachaHistory.find(
          h => h.gachaId.startsWith('pending_') && h.type === 'started'
        );
        if (historyItem) {
          historyItem.gachaId = message.data.gachaId;
          historyItem.completedAt = Date.now();
          historyItem.result = message.data.fullState;
          historyItem.stateVersion = MockConsistencyWebSocket.serverState.stateVersion;
        }
      }
      
    } else if (message.type === 'dashboard-state-request' || message.type === 'viewer-state-request') {
      // 状態要求に対するレスポンス（整合性チェック付き）
      setTimeout(() => {
        const responseType = message.type === 'dashboard-state-request' 
          ? 'dashboard-state-response' 
          : 'viewer-state-response';
          
        const responseData = {
          ...MockConsistencyWebSocket.serverState,
          requestTimestamp: message.data.timestamp,
          responseTimestamp: Date.now(),
          clientId: sender.clientId
        };
          
        sender.emit('message', {
          data: JSON.stringify({
            type: responseType,
            data: responseData
          })
        });
      }, 10);
    }
  }
  
  static broadcast(message, sender) {
    MockConsistencyWebSocket.clients.forEach(client => {
      if (client !== sender && client.isConnected) {
        setTimeout(() => client.emit('message', { data: JSON.stringify(message) }), 0);
      }
    });
  }

  static addClient(client) {
    MockConsistencyWebSocket.clients.push(client);
  }

  static removeClient(client) {
    const index = MockConsistencyWebSocket.clients.indexOf(client);
    if (index > -1) {
      MockConsistencyWebSocket.clients.splice(index, 1);
    }
  }

  static reset() {
    MockConsistencyWebSocket.clients = [];
    MockConsistencyWebSocket.serverState = {
      currentWeapon: null,
      playerNames: ['Player 1', 'Player 2'],
      playerCount: 2,
      isSpinning: false,
      lastGachaId: null,
      gachaHistory: [],
      stateVersion: 0
    };
  }

  static getStateConsistency() {
    // 全クライアントの状態整合性をチェック
    const clientStates = MockConsistencyWebSocket.clients.map(client => ({
      clientId: client.clientId,
      isSpinning: client.mockState ? client.mockState.isSpinning : null,
      currentWeapon: client.mockState ? client.mockState.currentWeapon : null,
      lastGachaId: client.mockState ? client.mockState.lastGachaId : null
    }));

    return {
      serverState: MockConsistencyWebSocket.serverState,
      clientStates,
      isConsistent: clientStates.every(state => 
        state.isSpinning === MockConsistencyWebSocket.serverState.isSpinning &&
        (state.lastGachaId === MockConsistencyWebSocket.serverState.lastGachaId || 
         (!state.lastGachaId && !MockConsistencyWebSocket.serverState.lastGachaId))
      )
    };
  }
}

// 整合性チェック対応クライアント
class MockClientWithConsistency {
  constructor(clientId, clientType = 'dashboard') {
    this.clientId = clientId;
    this.clientType = clientType;
    this.isSpinning = false;
    this.currentWeapon = null;
    this.playerSelection = [];
    this.playerNames = ['Player 1', 'Player 2'];
    this.playerCount = 2;
    this.lastGachaId = null;
    this.stateVersion = 0;
    
    this.ws = new MockConsistencyWebSocket('ws://localhost:3000/ws', clientId);
    this.ws.mockState = this; // 整合性チェック用
    MockConsistencyWebSocket.addClient(this.ws);
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });

    this.ws.on('open', () => {
      const requestType = clientType === 'dashboard' ? 'dashboard-state-request' : 'viewer-state-request';
      this.ws.send(JSON.stringify({
        type: requestType,
        data: { timestamp: Date.now(), clientId: this.clientId }
      }));
    });
  }

  handleWebSocketMessage(data) {
    if (data.type === 'gacha-started' && data.data && data.data.source !== this.clientType) {
      this.isSpinning = true;
    } else if (data.type === 'overlay-animation-completed') {
      this.isSpinning = false;
      if (data.data && data.data.fullState) {
        this.currentWeapon = data.data.fullState;
      }
      if (data.data && data.data.gachaId) {
        this.lastGachaId = data.data.gachaId;
      }
    } else if (data.type === 'dashboard-state-response' || data.type === 'viewer-state-response') {
      // 状態復元
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
        if (data.data.lastGachaId) {
          this.lastGachaId = data.data.lastGachaId;
        }
        if (data.data.stateVersion) {
          this.stateVersion = data.data.stateVersion;
        }
      }
    }
  }

  handleGacha() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    const gachaId = 'gacha_' + this.clientId + '_' + Date.now();
    
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: this.clientType,
        isReGacha: false,
        timestamp: Date.now(),
        gachaId: gachaId
      }
    }));

    setTimeout(() => {
      const weaponResult = {
        weapons: [
          { id: `weapon_${this.clientId}_${Date.now()}`, name: `武器_${this.clientId}`, type: 'shooter' }
        ],
        count: 1
      };
      
      this.currentWeapon = weaponResult;
      this.lastGachaId = gachaId;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: gachaId
        }
      }));
    }, 50);
  }

  getState() {
    return {
      clientId: this.clientId,
      isSpinning: this.isSpinning,
      currentWeapon: this.currentWeapon,
      lastGachaId: this.lastGachaId,
      stateVersion: this.stateVersion,
      playerCount: this.playerCount
    };
  }
}

test('同一ガチャIDでの結果整合性テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const client1 = new MockClientWithConsistency('client1', 'dashboard');
  const client2 = new MockClientWithConsistency('client2', 'dashboard');
  const client3 = new MockClientWithConsistency('client3', 'viewer');
  
  // ガチャ実行
  client1.handleGacha();
  
  // 演出完了を待つ
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 全クライアントで同じガチャIDになっていることを確認
  assert.strictEqual(client1.lastGachaId, client2.lastGachaId, 'client1-2 ガチャID一致');
  assert.strictEqual(client1.lastGachaId, client3.lastGachaId, 'client1-3 ガチャID一致');
  
  // 武器結果も同一であることを確認
  assert.strictEqual(client1.currentWeapon.weapons[0].id, client2.currentWeapon.weapons[0].id, 'client1-2 武器ID一致');
  assert.strictEqual(client1.currentWeapon.weapons[0].id, client3.currentWeapon.weapons[0].id, 'client1-3 武器ID一致');
  
  // サーバー状態との整合性確認
  const consistency = MockConsistencyWebSocket.getStateConsistency();
  assert.strictEqual(consistency.isConsistent, true, '全体状態整合性確認');
});

test('ローディング状態の同期確認テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const clients = [
    new MockClientWithConsistency('dashboard1', 'dashboard'),
    new MockClientWithConsistency('dashboard2', 'dashboard'),
    new MockClientWithConsistency('viewer1', 'viewer'),
    new MockClientWithConsistency('viewer2', 'viewer')
  ];
  
  // 初期状態確認
  await new Promise(resolve => setTimeout(resolve, 20));
  clients.forEach(client => {
    assert.strictEqual(client.isSpinning, false, `${client.clientId} 初期ローディング状態`);
  });
  
  // ガチャ開始
  clients[0].handleGacha();
  
  // ローディング開始の同期確認
  await new Promise(resolve => setTimeout(resolve, 20));
  clients.forEach(client => {
    assert.strictEqual(client.isSpinning, true, `${client.clientId} ローディング開始同期`);
  });
  
  // 演出完了の同期確認
  await new Promise(resolve => setTimeout(resolve, 100));
  clients.forEach(client => {
    assert.strictEqual(client.isSpinning, false, `${client.clientId} ローディング終了同期`);
  });
  
  // 状態整合性の最終確認
  const consistency = MockConsistencyWebSocket.getStateConsistency();
  assert.strictEqual(consistency.isConsistent, true, 'ローディング状態整合性確認');
});

test('連続ガチャ時の状態整合性テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const client1 = new MockClientWithConsistency('client1', 'dashboard');
  const client2 = new MockClientWithConsistency('client2', 'viewer');
  
  // 1回目のガチャ
  client1.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const firstGachaId = client1.lastGachaId;
  assert.ok(firstGachaId, '1回目ガチャID存在');
  assert.strictEqual(client2.lastGachaId, firstGachaId, '1回目ガチャID同期');
  
  // 2回目のガチャ（異なるクライアントから）
  client2.handleGacha = function() {
    if (this.isSpinning) return;
    
    this.isSpinning = true;
    const gachaId = 'gacha_' + this.clientId + '_' + Date.now();
    
    this.ws.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: this.clientType,
        isReGacha: false,
        timestamp: Date.now(),
        gachaId: gachaId
      }
    }));

    setTimeout(() => {
      const weaponResult = {
        weapons: [
          { id: `weapon2_${this.clientId}_${Date.now()}`, name: `武器2_${this.clientId}`, type: 'roller' }
        ],
        count: 1
      };
      
      this.currentWeapon = weaponResult;
      this.lastGachaId = gachaId;
      
      this.ws.send(JSON.stringify({
        type: 'overlay-animation-completed',
        data: {
          fullState: weaponResult,
          gachaId: gachaId
        }
      }));
    }, 50);
  };
  
  client2.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const secondGachaId = client2.lastGachaId;
  assert.ok(secondGachaId, '2回目ガチャID存在');
  assert.notStrictEqual(secondGachaId, firstGachaId, '2回目ガチャIDは異なる');
  assert.strictEqual(client1.lastGachaId, secondGachaId, '2回目ガチャID同期');
  
  // 武器結果も更新されていることを確認
  assert.strictEqual(client1.currentWeapon.weapons[0].type, 'roller', 'client1武器タイプ更新');
  assert.strictEqual(client2.currentWeapon.weapons[0].type, 'roller', 'client2武器タイプ更新');
});

test('エラー状態の伝播テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const client1 = new MockClientWithConsistency('client1', 'dashboard');
  const client2 = new MockClientWithConsistency('client2', 'viewer');
  
  // ガチャ開始
  client1.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // ローディング中にエラーが発生したシミュレーション
  client1.ws.send(JSON.stringify({
    type: 'gacha-error',
    data: {
      error: 'API_ERROR',
      message: 'Failed to fetch weapon data',
      gachaId: client1.lastGachaId,
      timestamp: Date.now()
    }
  }));
  
  // エラー処理のシミュレーション
  MockConsistencyWebSocket.serverState.isSpinning = false;
  MockConsistencyWebSocket.serverState.lastError = {
    type: 'API_ERROR',
    timestamp: Date.now()
  };
  
  // エラー状態をブロードキャスト
  MockConsistencyWebSocket.broadcast({
    type: 'gacha-error',
    data: MockConsistencyWebSocket.serverState.lastError
  }, client1.ws);
  
  await new Promise(resolve => setTimeout(resolve, 20));
  
  // 両クライアントでローディングが終了することを確認
  assert.strictEqual(client1.isSpinning, false, 'client1ローディング終了（エラー時）');
  assert.strictEqual(client2.isSpinning, false, 'client2ローディング終了（エラー時）');
});

test('状態復元時の整合性確認テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  // 事前状態設定
  MockConsistencyWebSocket.serverState = {
    currentWeapon: {
      weapons: [{ id: 'consistent_weapon', name: '整合性武器', type: 'charger' }],
      count: 1
    },
    playerNames: ['整合性テスト1', '整合性テスト2'],
    playerCount: 2,
    isSpinning: false,
    lastGachaId: 'consistency_gacha_123',
    stateVersion: 42
  };
  
  // 複数クライアントで同時接続
  const clients = [
    new MockClientWithConsistency('restore1', 'dashboard'),
    new MockClientWithConsistency('restore2', 'dashboard'),
    new MockClientWithConsistency('restore3', 'viewer')
  ];
  
  // 状態復元を待つ
  await new Promise(resolve => setTimeout(resolve, 30));
  
  // 全クライアントで同じ状態が復元されることを確認
  clients.forEach((client, index) => {
    assert.ok(client.currentWeapon, `client${index + 1} 武器結果復元`);
    assert.strictEqual(client.currentWeapon.weapons[0].id, 'consistent_weapon', `client${index + 1} 武器ID一致`);
    assert.strictEqual(client.lastGachaId, 'consistency_gacha_123', `client${index + 1} ガチャID一致`);
    assert.deepStrictEqual(client.playerNames, ['整合性テスト1', '整合性テスト2'], `client${index + 1} プレイヤー名一致`);
    assert.strictEqual(client.playerCount, 2, `client${index + 1} プレイヤー数一致`);
    assert.strictEqual(client.isSpinning, false, `client${index + 1} ローディング状態一致`);
  });
  
  // サーバー状態との完全一致確認
  const consistency = MockConsistencyWebSocket.getStateConsistency();
  assert.strictEqual(consistency.isConsistent, true, '状態復元後の整合性確認');
});

test('同時操作時の競合状態テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const client1 = new MockClientWithConsistency('concurrent1', 'dashboard');
  const client2 = new MockClientWithConsistency('concurrent2', 'viewer');
  
  // 同時にガチャを実行（競合状態をシミュレート）
  const promise1 = new Promise(resolve => {
    client1.handleGacha();
    setTimeout(resolve, 100);
  });
  
  const promise2 = new Promise(resolve => {
    setTimeout(() => {
      client2.handleGacha();
      setTimeout(resolve, 100);
    }, 10); // わずかに遅らせて実行
  });
  
  await Promise.all([promise1, promise2]);
  
  // 最終的に一つのガチャIDで統一されていることを確認
  assert.strictEqual(client1.lastGachaId, client2.lastGachaId, '同時操作後のガチャID統一');
  
  // 両方のクライアントでローディングが終了していることを確認
  assert.strictEqual(client1.isSpinning, false, 'client1 ローディング終了');
  assert.strictEqual(client2.isSpinning, false, 'client2 ローディング終了');
  
  // 武器結果が同じになっていることを確認
  if (client1.currentWeapon && client2.currentWeapon) {
    assert.strictEqual(
      client1.currentWeapon.weapons[0].id, 
      client2.currentWeapon.weapons[0].id, 
      '同時操作後の武器結果統一'
    );
  }
});

test('ガチャ履歴の整合性テスト', async () => {
  MockConsistencyWebSocket.reset();
  
  const client = new MockClientWithConsistency('history1', 'dashboard');
  
  // 複数回ガチャを実行
  client.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  client.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  client.handleGacha();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // ガチャ履歴の確認
  const history = MockConsistencyWebSocket.serverState.gachaHistory;
  assert.strictEqual(history.length, 3, 'ガチャ履歴数正しい');
  
  // 履歴の順序確認
  for (let i = 1; i < history.length; i++) {
    assert.ok(history[i].timestamp > history[i-1].timestamp, `履歴${i}のタイムスタンプ順序正しい`);
    assert.ok(history[i].stateVersion > history[i-1].stateVersion, `履歴${i}の状態バージョン順序正しい`);
  }
  
  // 最後のガチャIDがサーバー状態と一致することを確認
  const lastHistoryItem = history[history.length - 1];
  assert.strictEqual(lastHistoryItem.gachaId, MockConsistencyWebSocket.serverState.lastGachaId, '最後のガチャID一致');
});

console.log('🔄 状態整合性確認テストが完了しました');