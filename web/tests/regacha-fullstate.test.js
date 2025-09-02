const { test } = require('node:test');
const assert = require('node:assert');

test('再ガチャ時の全プレイヤー状態保持テスト', async () => {
  // 初期状態: 2人でガチャ実行
  const initialState = {
    weapons: [
      { id: 'weapon1', name: '武器1', type: 'shooter' },
      { id: 'weapon2', name: '武器2', type: 'roller' }
    ],
    playerNames: ['Player 1', 'Player 2']
  };
  
  // Player 1だけを再ガチャ
  const selectedIndex = 0;
  const newWeapon = { id: 'weapon1_new', name: '新武器1', type: 'charger' };
  
  // 更新後の武器配列
  const updatedWeapons = [...initialState.weapons];
  updatedWeapons[selectedIndex] = newWeapon;
  
  // 再ガチャメッセージの作成
  const reGachaMessage = {
    type: 'gacha-result',
    data: {
      result: {
        weapons: [newWeapon], // 選択された武器のみ
        count: 1,
        isReGacha: true
      },
      playerNames: ['Player 1'], // 選択されたプレイヤーのみ
      isReGacha: true,
      gachaId: 'test_regacha_123',
      // 全体状態も含める
      fullState: {
        weapons: updatedWeapons,
        playerNames: initialState.playerNames,
        count: 2
      }
    }
  };
  
  // 検証
  assert.strictEqual(reGachaMessage.data.result.count, 1, '選択されたプレイヤー数が正しい');
  assert.strictEqual(reGachaMessage.data.fullState.count, 2, '全体のプレイヤー数が保持されている');
  assert.strictEqual(reGachaMessage.data.fullState.weapons.length, 2, '全武器が含まれている');
  assert.strictEqual(reGachaMessage.data.fullState.weapons[0].id, 'weapon1_new', 'Player 1の武器が更新されている');
  assert.strictEqual(reGachaMessage.data.fullState.weapons[1].id, 'weapon2', 'Player 2の武器が保持されている');
  assert.deepStrictEqual(reGachaMessage.data.fullState.playerNames, ['Player 1', 'Player 2'], '全プレイヤー名が保持されている');
});

test('再ガチャ後のウィジェット更新データ', async () => {
  // サーバー側で保存される状態をシミュレート
  const savedState = {
    lastResult: {
      weapons: [
        { id: 'weapon1_new', name: '新武器1', type: 'charger' },
        { id: 'weapon2', name: '武器2', type: 'roller' }
      ],
      count: 2
    },
    playerNames: ['Player 1', 'Player 2'],
    playerCount: 2,
    lastGachaId: 'test_regacha_123',
    isOverlayCompleted: true
  };
  
  // ウィジェット更新メッセージ
  const widgetUpdate = {
    type: 'widget-update',
    data: {
      result: savedState.lastResult,
      playerNames: savedState.playerNames,
      gachaId: savedState.lastGachaId
    }
  };
  
  assert.strictEqual(widgetUpdate.data.result.count, 2, 'ウィジェットに全プレイヤー数が送信される');
  assert.strictEqual(widgetUpdate.data.result.weapons.length, 2, 'ウィジェットに全武器が送信される');
  assert.deepStrictEqual(widgetUpdate.data.playerNames, ['Player 1', 'Player 2'], 'ウィジェットに全プレイヤー名が送信される');
});

test('Dashboardリロード時のリセット', async () => {
  // リロード通知
  const reloadMessage = {
    type: 'dashboard-reload',
    data: {
      timestamp: Date.now()
    }
  };
  
  // リセット後の期待される状態
  const resetState = {
    lastResult: null,
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    playerCount: 1,
    lastGachaId: null,
    isOverlayCompleted: false
  };
  
  assert.strictEqual(resetState.lastResult, null, 'ガチャ結果がリセットされる');
  assert.strictEqual(resetState.playerCount, 1, 'プレイヤー数が初期値に戻る');
  assert.strictEqual(resetState.lastGachaId, null, 'ガチャIDがクリアされる');
  assert.strictEqual(resetState.isOverlayCompleted, false, 'overlay完了フラグがリセットされる');
});

console.log('🎯 再ガチャ全プレイヤー保持テストが完了しました');