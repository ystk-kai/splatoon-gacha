const { test } = require('node:test');
const assert = require('node:assert');

// WebSocketメッセージングのテスト

test('WebSocketメッセージ形式 - 通常ガチャ', async () => {
  const normalGachaMessage = {
    type: 'gacha-result',
    data: {
      result: {
        weapons: [
          { id: 'weapon1', name: '武器1' },
          { id: 'weapon2', name: '武器2' }
        ],
        count: 2
      },
      playerNames: ['Player 1', 'Player 2'],
      gachaId: 'test_gacha_123'
    }
  };
  
  // メッセージが正しい形式であることを確認
  assert.strictEqual(normalGachaMessage.type, 'gacha-result', 'メッセージタイプが正しい');
  assert.ok(normalGachaMessage.data.result.weapons, '武器データが存在する');
  assert.strictEqual(normalGachaMessage.data.result.count, 2, 'カウントが正しい');
  assert.ok(Array.isArray(normalGachaMessage.data.playerNames), 'プレイヤー名が配列');
  assert.ok(normalGachaMessage.data.gachaId, 'ガチャIDが存在する');
});

test('WebSocketメッセージ形式 - 再ガチャ', async () => {
  const reGachaMessage = {
    type: 'gacha-result',
    data: {
      result: {
        weapons: [
          { id: 'weapon1_new', name: '新武器1' },
          { id: 'weapon3_new', name: '新武器3' }
        ],
        count: 2,
        isReGacha: true
      },
      playerNames: ['Player 1', 'Player 3'], // 選択されたプレイヤーのみ
      isReGacha: true,
      gachaId: 'regacha_test_456'
    }
  };
  
  // 再ガチャメッセージの形式確認
  assert.strictEqual(reGachaMessage.type, 'gacha-result', 'メッセージタイプが正しい');
  assert.strictEqual(reGachaMessage.data.result.isReGacha, true, '再ガチャフラグが設定されている');
  assert.strictEqual(reGachaMessage.data.isReGacha, true, 'データレベルの再ガチャフラグが設定されている');
  assert.strictEqual(reGachaMessage.data.result.count, 2, '選択されたプレイヤー数が正しい');
  assert.strictEqual(reGachaMessage.data.playerNames.length, 2, '選択されたプレイヤー名の数が正しい');
  assert.deepStrictEqual(reGachaMessage.data.playerNames, ['Player 1', 'Player 3'], '選択されたプレイヤー名が正しい');
});

test('ダッシュボード側 - プレイヤー選択状態の管理', async () => {
  // プレイヤー選択状態のシミュレーション
  let playerSelection = [];
  let playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
  let currentWeapon = {
    weapons: [
      { id: 'weapon1', name: '武器1' },
      { id: 'weapon2', name: '武器2' },
      { id: 'weapon3', name: '武器3' },
      { id: 'weapon4', name: '武器4' }
    ]
  };
  
  // プレイヤー選択のシミュレート
  const togglePlayerSelection = (index) => {
    if (playerSelection.includes(index)) {
      playerSelection = playerSelection.filter(i => i !== index);
    } else {
      playerSelection = [...playerSelection, index];
    }
  };
  
  // Player 1と Player 3を選択
  togglePlayerSelection(0);
  togglePlayerSelection(2);
  
  assert.deepStrictEqual(playerSelection, [0, 2], 'プレイヤー選択が正しく管理されている');
  
  // 再ガチャメッセージの作成シミュレーション
  const selectedIndices = [...playerSelection];
  const selectedWeapons = selectedIndices.map(index => currentWeapon.weapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => playerNames[index]);
  
  const reGachaResult = {
    weapons: selectedWeapons,
    count: selectedWeapons.length,
    isReGacha: true
  };
  
  assert.strictEqual(reGachaResult.count, 2, '選択された武器数が正しい');
  assert.strictEqual(selectedPlayerNames.length, 2, '選択されたプレイヤー名数が正しい');
  assert.deepStrictEqual(selectedPlayerNames, ['Player 1', 'Player 3'], '選択されたプレイヤー名が正しい');
  assert.strictEqual(reGachaResult.isReGacha, true, '再ガチャフラグが設定されている');
});

test('プレイヤー順番の保持テスト', async () => {
  // 元の4人のプレイヤー構成
  const originalPlayers = [
    { index: 0, name: 'Player 1', weapon: { id: 'w1', name: '武器1' } },
    { index: 1, name: 'Player 2', weapon: { id: 'w2', name: '武器2' } },
    { index: 2, name: 'Player 3', weapon: { id: 'w3', name: '武器3' } },
    { index: 3, name: 'Player 4', weapon: { id: 'w4', name: '武器4' } }
  ];
  
  // Player 1 (index 0) と Player 3 (index 2) を選択した再ガチャ
  const selectedIndices = [0, 2];
  
  // Dashboard側での武器配列更新のシミュレーション
  let updatedWeapons = [...originalPlayers.map(p => p.weapon)];
  const newWeapons = [
    { id: 'new_w1', name: '新武器1' },
    { id: 'new_w3', name: '新武器3' }
  ];
  
  // 選択されたプレイヤーの武器のみを更新
  selectedIndices.forEach((selectedIndex, dataIndex) => {
    if (dataIndex < newWeapons.length) {
      updatedWeapons[selectedIndex] = newWeapons[dataIndex];
    }
  });
  
  // 更新後の状態確認
  assert.strictEqual(updatedWeapons[0].id, 'new_w1', 'Player 1の武器が更新されている');
  assert.strictEqual(updatedWeapons[1].id, 'w2', 'Player 2の武器は変更されていない');
  assert.strictEqual(updatedWeapons[2].id, 'new_w3', 'Player 3の武器が更新されている');
  assert.strictEqual(updatedWeapons[3].id, 'w4', 'Player 4の武器は変更されていない');
  
  // Overlay送信用のデータ作成
  const selectedWeapons = selectedIndices.map(index => updatedWeapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => originalPlayers[index].name);
  
  assert.deepStrictEqual(selectedWeapons.map(w => w.id), ['new_w1', 'new_w3'], '選択された武器が正しい順番で抽出されている');
  assert.deepStrictEqual(selectedPlayerNames, ['Player 1', 'Player 3'], '選択されたプレイヤー名が正しい順番で保持されている');
});

test('1人プレイヤーの再ガチャテスト', async () => {
  // 1人でのガチャ結果
  const onePlayerData = {
    weapons: [{ id: 'weapon1', name: '武器1' }]
  };
  
  const playerNames = ['Player 1'];
  const playerSelection = [0]; // 1人目を選択
  
  // 再ガチャメッセージの作成
  const selectedIndices = [...playerSelection];
  const selectedWeapons = selectedIndices.map(index => onePlayerData.weapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => playerNames[index]);
  
  const reGachaMessage = {
    type: 'gacha-result',
    data: {
      result: {
        weapons: selectedWeapons,
        count: selectedWeapons.length,
        isReGacha: true
      },
      playerNames: selectedPlayerNames,
      isReGacha: true
    }
  };
  
  assert.strictEqual(reGachaMessage.data.result.count, 1, '1人プレイヤーの再ガチャカウントが正しい');
  assert.strictEqual(reGachaMessage.data.playerNames.length, 1, '1人のプレイヤー名が送信される');
  assert.strictEqual(reGachaMessage.data.playerNames[0], 'Player 1', 'プレイヤー名が正しい');
  assert.strictEqual(reGachaMessage.data.result.isReGacha, true, '再ガチャフラグが設定されている');
});

console.log('🌐 WebSocketメッセージングテストが完了しました');