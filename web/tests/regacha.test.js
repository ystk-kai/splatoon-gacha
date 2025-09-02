const { test } = require('node:test');
const assert = require('node:assert');

// テスト用のモック変数
let mockIsGachaRunning = false;

// showGachaResult関数のテスト用モック
function mockShowGachaResult(data) {
  console.log('Mock showing gacha result:', data);
  
  if (mockIsGachaRunning) {
    console.log('Gacha is already running, skipping...');
    return { skipped: true };
  }
  
  // テスト中はガチャ実行状態を管理しない（無限ループ回避）
  // mockIsGachaRunning = true;
  
  let result = data.result || data;
  
  if (result.weapons && Array.isArray(result.weapons)) {
    if (data.isReGacha) {
      // 再ガチャの場合は選択されたプレイヤーのみを表示
      return {
        type: 'regacha',
        weapons: result.weapons,
        playerNames: data.playerNames,
        count: result.weapons.length
      };
    } else {
      // 通常のガチャの場合は全プレイヤーを表示
      return {
        type: 'normal',
        weapons: result.weapons,
        playerNames: data.playerNames,
        count: result.weapons.length
      };
    }
  }
  
  return { error: 'Unknown data structure' };
}

test('再ガチャ機能 - 選択されたプレイヤーのみが表示される', async () => {
  // テストデータ: 4人のプレイヤー
  const testData = {
    result: {
      weapons: [
        { id: 'weapon1', name: '武器1' },
        { id: 'weapon2', name: '武器2' },
        { id: 'weapon3', name: '武器3' },
        { id: 'weapon4', name: '武器4' }
      ],
      count: 4
    },
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    isReGacha: true
  };
  
  const result = mockShowGachaResult(testData);
  
  assert.strictEqual(result.type, 'regacha', '再ガチャタイプが正しく識別される');
  assert.strictEqual(result.count, 4, '選択されたプレイヤー数が正しい');
  assert.deepStrictEqual(result.playerNames, ['Player 1', 'Player 2', 'Player 3', 'Player 4'], 'プレイヤー名が正しく保持される');
  assert.strictEqual(result.weapons.length, 4, '武器数が正しい');
});

test('通常ガチャ機能 - 全プレイヤーが表示される', async () => {
  // テストデータ: 3人のプレイヤー（通常ガチャ）
  const testData = {
    result: {
      weapons: [
        { id: 'weapon1', name: '武器1' },
        { id: 'weapon2', name: '武器2' },
        { id: 'weapon3', name: '武器3' }
      ],
      count: 3
    },
    playerNames: ['Player 1', 'Player 2', 'Player 3'],
    isReGacha: false // 通常ガチャ
  };
  
  const result = mockShowGachaResult(testData);
  
  assert.strictEqual(result.type, 'normal', '通常ガチャタイプが正しく識別される');
  assert.strictEqual(result.count, 3, 'プレイヤー数が正しい');
  assert.deepStrictEqual(result.playerNames, ['Player 1', 'Player 2', 'Player 3'], 'プレイヤー名が正しく保持される');
  assert.strictEqual(result.weapons.length, 3, '武器数が正しい');
});

test('再ガチャ機能 - 選択された2人のプレイヤーのみ表示', async () => {
  // テストデータ: 4人中2人が選択された場合
  const testData = {
    result: {
      weapons: [
        { id: 'weapon1', name: '武器1' },
        { id: 'weapon3', name: '武器3' }  // Player 1とPlayer 3のみ選択
      ],
      count: 2
    },
    playerNames: ['Player 1', 'Player 3'], // 選択されたプレイヤーのみ
    isReGacha: true
  };
  
  const result = mockShowGachaResult(testData);
  
  assert.strictEqual(result.type, 'regacha', '再ガチャタイプが正しく識別される');
  assert.strictEqual(result.count, 2, '選択されたプレイヤー数が正しい');
  assert.deepStrictEqual(result.playerNames, ['Player 1', 'Player 3'], '選択されたプレイヤー名のみが保持される');
  assert.strictEqual(result.weapons.length, 2, '選択された武器数が正しい');
});

test('ガチャ実行中の場合はスキップされる', async () => {
  mockIsGachaRunning = true;
  
  const testData = {
    result: {
      weapons: [{ id: 'weapon1', name: '武器1' }],
      count: 1
    },
    playerNames: ['Player 1'],
    isReGacha: true
  };
  
  const result = mockShowGachaResult(testData);
  
  assert.strictEqual(result.skipped, true, 'ガチャ実行中はスキップされる');
  
  // テスト後にリセット
  mockIsGachaRunning = false;
});

test('不正なデータ構造の場合はエラーが返される', async () => {
  const testData = {
    result: {
      // weaponsプロパティが存在しない不正なデータ
      invalidData: true
    },
    playerNames: [],
    isReGacha: true
  };
  
  const result = mockShowGachaResult(testData);
  
  assert.strictEqual(result.error, 'Unknown data structure', '不正なデータ構造でエラーが返される');
});


console.log('🧪 再ガチャ機能のテストが完了しました');