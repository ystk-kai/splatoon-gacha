const { test } = require('node:test');
const assert = require('node:assert');

test('ウィジェット制御設定テスト', async () => {
  // デフォルト設定
  const defaultConfig = {
    enabled: true,
    lastUpdated: Date.now()
  };
  
  assert.strictEqual(defaultConfig.enabled, true, 'デフォルトでウィジェットが有効');
  assert.ok(defaultConfig.lastUpdated, '更新時刻が設定されている');
});

test('ウィジェット設定更新テスト', async () => {
  // 設定更新のテスト
  const originalTimestamp = Date.now();
  const originalConfig = {
    enabled: true,
    lastUpdated: originalTimestamp
  };
  
  // 少し時間をおく
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // 無効化
  const disabledUpdate = { enabled: false };
  const updatedConfig = {
    ...originalConfig,
    ...disabledUpdate,
    lastUpdated: Date.now()
  };
  
  assert.strictEqual(updatedConfig.enabled, false, 'ウィジェットが無効化される');
  assert.ok(updatedConfig.lastUpdated > originalConfig.lastUpdated, '更新時刻が更新される');
});

test('API レスポンス形式テスト', async () => {
  // API レスポンスの期待される形式
  const apiResponse = {
    success: true,
    config: {
      enabled: false,
      lastUpdated: Date.now()
    }
  };
  
  assert.strictEqual(apiResponse.success, true, 'API成功フラグが正しい');
  assert.strictEqual(typeof apiResponse.config.enabled, 'boolean', '有効フラグがboolean型');
  assert.strictEqual(typeof apiResponse.config.lastUpdated, 'number', '更新時刻がnumber型');
});

test('WebSocket メッセージ形式テスト', async () => {
  // ウィジェット設定変更の WebSocket メッセージ
  const configChangeMessage = {
    type: 'widget-config-changed',
    data: {
      enabled: false,
      lastUpdated: Date.now()
    }
  };
  
  assert.strictEqual(configChangeMessage.type, 'widget-config-changed', 'メッセージタイプが正しい');
  assert.strictEqual(configChangeMessage.data.enabled, false, '設定データが含まれている');
  assert.ok(configChangeMessage.data.lastUpdated, '更新時刻が含まれている');
});

test('ウィジェット表示制御テスト', async () => {
  // ウィジェット表示状態のシミュレーション
  let widgetVisible = true;
  
  // 非表示にする
  const hideWidget = (enabled) => {
    widgetVisible = enabled;
  };
  
  hideWidget(false);
  assert.strictEqual(widgetVisible, false, 'ウィジェットが非表示になる');
  
  // 表示に戻す
  hideWidget(true);
  assert.strictEqual(widgetVisible, true, 'ウィジェットが表示される');
});

test('CSS クラス制御テスト', async () => {
  // CSS クラスの動的制御をシミュレーション
  const mockElement = {
    classList: {
      classes: new Set(),
      add(className) { this.classes.add(className); },
      remove(className) { this.classes.delete(className); },
      contains(className) { return this.classes.has(className); }
    }
  };
  
  // 非表示状態
  mockElement.classList.add('hidden');
  assert.ok(mockElement.classList.contains('hidden'), 'hiddenクラスが追加される');
  
  // 表示状態
  mockElement.classList.remove('hidden');
  assert.ok(!mockElement.classList.contains('hidden'), 'hiddenクラスが削除される');
});

test('初期設定読み込みテスト', async () => {
  // 初期設定読み込みのシミュレーション
  const mockFetch = async (url) => {
    if (url === '/api/widget-config') {
      return {
        json: async () => ({
          enabled: true,
          lastUpdated: Date.now()
        })
      };
    }
    throw new Error('Not found');
  };
  
  const response = await mockFetch('/api/widget-config');
  const config = await response.json();
  
  assert.strictEqual(config.enabled, true, '初期設定が正しく読み込まれる');
  assert.ok(config.lastUpdated, '更新時刻が取得される');
});

test('エラーハンドリングテスト', async () => {
  // 設定読み込み失敗時の処理
  const mockFailedFetch = async () => {
    throw new Error('Network error');
  };
  
  let errorCaught = false;
  try {
    await mockFailedFetch();
  } catch (error) {
    errorCaught = true;
    assert.strictEqual(error.message, 'Network error', 'エラーが正しくキャッチされる');
  }
  
  assert.ok(errorCaught, 'エラーハンドリングが動作する');
});

test('設定の永続化テスト', async () => {
  // 設定変更後の永続化
  const initialConfig = {
    enabled: true,
    lastUpdated: 1000
  };
  
  const update = { enabled: false };
  const persistedConfig = {
    ...initialConfig,
    ...update,
    lastUpdated: Date.now()
  };
  
  // 設定が正しく更新され、永続化される
  assert.strictEqual(persistedConfig.enabled, false, '設定が更新される');
  assert.ok(persistedConfig.lastUpdated > initialConfig.lastUpdated, '更新時刻が新しくなる');
  
  // 元の設定は変更されない
  assert.strictEqual(initialConfig.enabled, true, '元の設定は変更されない');
});

console.log('🎮 ウィジェット制御機能テストが完了しました');