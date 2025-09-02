const { test } = require('node:test');
const assert = require('node:assert');
const EventEmitter = require('events');

// 復元時のローディングオーバーレイテスト

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
    const message = JSON.parse(data);
    
    if (message.type === 'dashboard-state-request') {
      // 遅延を入れて状態復元レスポンスを送信
      setTimeout(() => {
        this.emit('message', {
          data: JSON.stringify({
            type: 'dashboard-state-response',
            data: {
              currentWeapon: { weapons: [{ id: 'test', name: 'テスト武器' }], count: 1 },
              playerNames: ['Player 1', 'Player 2'],
              playerCount: 2,
              isSpinning: false,
              timestamp: Date.now()
            }
          })
        });
      }, 100); // 100ms後に応答
    } else if (message.type === 'viewer-state-request') {
      // 遅延を入れて状態復元レスポンスを送信
      setTimeout(() => {
        this.emit('message', {
          data: JSON.stringify({
            type: 'viewer-state-response',
            data: {
              currentWeapon: { weapons: [{ id: 'test', name: 'テスト武器' }], count: 1 },
              playerNames: ['視聴者'],
              playerCount: 1,
              isSpinning: false,
              timestamp: Date.now()
            }
          })
        });
      }, 100); // 100ms後に応答
    }
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }
}

// Mock Dashboard（ローディングオーバーレイ付き）
class MockDashboard {
  constructor() {
    this.isRestoringState = true; // 初期状態でローディング表示
    this.currentWeapon = null;
    this.isSpinning = false;
    this.restorationCompleted = false;
    
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
    
    this.ws.on('close', () => {
      this.isRestoringState = false; // エラー時はローディング解除
    });
    
    this.ws.on('error', () => {
      this.isRestoringState = false; // エラー時はローディング解除
    });
    
    // 接続時に状態復元要求を送信
    this.ws.send(JSON.stringify({
      type: 'dashboard-state-request',
      data: { timestamp: Date.now() }
    }));
    
    // タイムアウト処理
    this.restorationTimeout = setTimeout(() => {
      if (this.isRestoringState) {
        console.log('Dashboard: State restoration timeout');
        this.isRestoringState = false;
      }
    }, 5000);
  }

  handleWebSocketMessage(data) {
    if (data.type === 'dashboard-state-response' && data.data) {
      console.log('Dashboard: State restoration response received');
      
      // 状態を復元
      if (data.data.currentWeapon) {
        this.currentWeapon = data.data.currentWeapon;
      }
      if (data.data.isSpinning !== undefined) {
        this.isSpinning = data.data.isSpinning;
      }
      
      // ローディングオーバーレイを解除
      this.isRestoringState = false;
      this.restorationCompleted = true;
      console.log('Dashboard: State restoration completed');
    }
  }
  
  cleanup() {
    clearTimeout(this.restorationTimeout);
    this.ws.close();
  }
}

// Mock Viewer（ローディングオーバーレイ付き）
class MockViewer {
  constructor() {
    this.isRestoringState = true; // 初期状態でローディング表示
    this.currentWeapon = null;
    this.isSpinning = false;
    this.restorationCompleted = false;
    
    this.ws = new MockWebSocket('ws://localhost:3000/ws');
    
    this.ws.on('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    });
    
    this.ws.on('close', () => {
      this.isRestoringState = false; // エラー時はローディング解除
    });
    
    this.ws.on('error', () => {
      this.isRestoringState = false; // エラー時はローディング解除
    });
    
    // 接続時に状態復元要求を送信
    this.ws.send(JSON.stringify({
      type: 'viewer-state-request',
      data: { timestamp: Date.now() }
    }));
    
    // タイムアウト処理
    this.restorationTimeout = setTimeout(() => {
      if (this.isRestoringState) {
        console.log('Viewer: State restoration timeout');
        this.isRestoringState = false;
      }
    }, 5000);
  }

  handleWebSocketMessage(data) {
    if (data.type === 'viewer-state-response' && data.data) {
      console.log('Viewer: State restoration response received');
      
      // 状態を復元
      if (data.data.currentWeapon) {
        this.currentWeapon = data.data.currentWeapon;
      }
      if (data.data.isSpinning !== undefined) {
        this.isSpinning = data.data.isSpinning;
      }
      
      // ローディングオーバーレイを解除
      this.isRestoringState = false;
      this.restorationCompleted = true;
      console.log('Viewer: State restoration completed');
    }
  }
  
  cleanup() {
    clearTimeout(this.restorationTimeout);
    this.ws.close();
  }
}

test('Dashboard - ローディングオーバーレイの表示と解除', async () => {
  const dashboard = new MockDashboard();
  
  // 初期状態でローディングオーバーレイが表示される
  assert.strictEqual(dashboard.isRestoringState, true, 'Initial loading overlay is shown');
  assert.strictEqual(dashboard.restorationCompleted, false, 'Restoration not completed yet');
  
  // 状態復元レスポンスを待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // ローディングオーバーレイが解除される
  assert.strictEqual(dashboard.isRestoringState, false, 'Loading overlay is hidden after restoration');
  assert.strictEqual(dashboard.restorationCompleted, true, 'Restoration completed');
  assert.ok(dashboard.currentWeapon, 'Weapon state restored');
  
  dashboard.cleanup();
});

test('Viewer - ローディングオーバーレイの表示と解除', async () => {
  const viewer = new MockViewer();
  
  // 初期状態でローディングオーバーレイが表示される
  assert.strictEqual(viewer.isRestoringState, true, 'Initial loading overlay is shown');
  assert.strictEqual(viewer.restorationCompleted, false, 'Restoration not completed yet');
  
  // 状態復元レスポンスを待つ
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // ローディングオーバーレイが解除される
  assert.strictEqual(viewer.isRestoringState, false, 'Loading overlay is hidden after restoration');
  assert.strictEqual(viewer.restorationCompleted, true, 'Restoration completed');
  assert.ok(viewer.currentWeapon, 'Weapon state restored');
  
  viewer.cleanup();
});

test('WebSocket接続エラー時のローディング解除', async () => {
  const dashboard = new MockDashboard();
  
  // 初期状態でローディング表示
  assert.strictEqual(dashboard.isRestoringState, true, 'Loading overlay shown initially');
  
  // WebSocket接続を強制的にクローズ
  dashboard.ws.close();
  
  // 少し待つ
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // エラー時はローディングが解除される
  assert.strictEqual(dashboard.isRestoringState, false, 'Loading overlay hidden on connection error');
  
  dashboard.cleanup();
});

test('タイムアウト時のローディング解除', async () => {
  // レスポンスを返さないMockWebSocketを作成
  class NoResponseWebSocket extends EventEmitter {
    constructor(url) {
      super();
      this.url = url;
      this.readyState = 1;
      this.messages = [];
      setTimeout(() => this.emit('open'), 0);
    }
    
    send(data) {
      this.messages.push(JSON.parse(data));
      // レスポンスを返さない
    }
    
    close() {
      this.readyState = 3;
      this.emit('close');
    }
  }
  
  // NoResponseWebSocketを使用するDashboard
  class TimeoutTestDashboard {
    constructor() {
      this.isRestoringState = true;
      this.restorationCompleted = false;
      
      this.ws = new NoResponseWebSocket('ws://localhost:3000/ws');
      
      // タイムアウト処理（テスト用に短縮）
      this.restorationTimeout = setTimeout(() => {
        if (this.isRestoringState) {
          console.log('Dashboard: State restoration timeout');
          this.isRestoringState = false;
        }
      }, 500); // 500msでタイムアウト
    }
    
    cleanup() {
      clearTimeout(this.restorationTimeout);
      this.ws.close();
    }
  }
  
  const dashboard = new TimeoutTestDashboard();
  
  // 初期状態でローディング表示
  assert.strictEqual(dashboard.isRestoringState, true, 'Loading overlay shown initially');
  
  // タイムアウトを待つ
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // タイムアウト後はローディングが解除される
  assert.strictEqual(dashboard.isRestoringState, false, 'Loading overlay hidden after timeout');
  assert.strictEqual(dashboard.restorationCompleted, false, 'Restoration not completed (timeout)');
  
  dashboard.cleanup();
});

test('連続リロード時のローディング表示', async () => {
  // 1回目のロード
  const dashboard1 = new MockDashboard();
  assert.strictEqual(dashboard1.isRestoringState, true, 'First load: Loading shown');
  
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.strictEqual(dashboard1.isRestoringState, false, 'First load: Loading hidden');
  assert.strictEqual(dashboard1.restorationCompleted, true, 'First load: Restoration completed');
  
  dashboard1.cleanup();
  
  // 2回目のロード（連続リロード）
  const dashboard2 = new MockDashboard();
  assert.strictEqual(dashboard2.isRestoringState, true, 'Second load: Loading shown');
  
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.strictEqual(dashboard2.isRestoringState, false, 'Second load: Loading hidden');
  assert.strictEqual(dashboard2.restorationCompleted, true, 'Second load: Restoration completed');
  
  dashboard2.cleanup();
});

console.log('🔄 復元時ローディングオーバーレイテストが完了しました');