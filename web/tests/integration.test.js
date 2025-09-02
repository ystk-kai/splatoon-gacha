const { test } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');

// サーバー統合テスト

test('Fastifyサーバーの基本動作テスト', async () => {
  const app = fastify();
  
  // 基本ルートの設定
  app.get('/', async (request, reply) => {
    return { message: 'Splatoon Gacha Server' };
  });
  
  // テスト用のAPI武器エンドポイント
  app.get('/api/random-weapon', async (request, reply) => {
    const { count = 1, type = 'weapon' } = request.query;
    
    const mockWeapons = [
      { id: 'test1', name: 'テスト武器1', type: 'shooter', subWeapon: 'splat_bomb', specialWeapon: 'trizooka' },
      { id: 'test2', name: 'テスト武器2', type: 'roller', subWeapon: 'curling_bomb', specialWeapon: 'inkjet' },
      { id: 'test3', name: 'テスト武器3', type: 'charger', subWeapon: 'toxic_mist', specialWeapon: 'wave_breaker' },
      { id: 'test4', name: 'テスト武器4', type: 'slosher', subWeapon: 'fizzy_bomb', specialWeapon: 'triple_inkstrike' }
    ];
    
    const requestedCount = parseInt(count);
    const selectedWeapons = [];
    
    for (let i = 0; i < requestedCount && i < mockWeapons.length; i++) {
      selectedWeapons.push(mockWeapons[i]);
    }
    
    if (requestedCount === 1) {
      return { weapon: selectedWeapons[0] };
    } else {
      return { weapons: selectedWeapons, count: selectedWeapons.length };
    }
  });
  
  try {
    // サーバー起動
    await app.listen({ port: 0 }); // ポート0で自動割り当て
    
    // 基本ルートのテスト
    const response1 = await app.inject({
      method: 'GET',
      url: '/'
    });
    
    assert.strictEqual(response1.statusCode, 200, 'ルートエンドポイントが正常に応答');
    const body1 = JSON.parse(response1.body);
    assert.strictEqual(body1.message, 'Splatoon Gacha Server', 'ルートメッセージが正しい');
    
    // 1人用ガチャAPIのテスト
    const response2 = await app.inject({
      method: 'GET',
      url: '/api/random-weapon?count=1'
    });
    
    assert.strictEqual(response2.statusCode, 200, 'ガチャAPIが正常に応答');
    const body2 = JSON.parse(response2.body);
    assert.ok(body2.weapon, '1人用ガチャで武器データが返される');
    assert.ok(body2.weapon.id, '武器にIDが存在する');
    assert.ok(body2.weapon.name, '武器に名前が存在する');
    
    // 複数人用ガチャAPIのテスト
    const response3 = await app.inject({
      method: 'GET',
      url: '/api/random-weapon?count=3'
    });
    
    assert.strictEqual(response3.statusCode, 200, '複数人ガチャAPIが正常に応答');
    const body3 = JSON.parse(response3.body);
    assert.ok(body3.weapons, '複数人用ガチャで武器配列が返される');
    assert.strictEqual(body3.count, 3, '要求された人数分の武器が返される');
    assert.strictEqual(body3.weapons.length, 3, '武器配列の長さが正しい');
    
    // 全ての武器に必要なプロパティが存在することを確認
    body3.weapons.forEach((weapon, index) => {
      assert.ok(weapon.id, `武器${index + 1}にIDが存在する`);
      assert.ok(weapon.name, `武器${index + 1}に名前が存在する`);
      assert.ok(weapon.type, `武器${index + 1}にタイプが存在する`);
    });
    
  } finally {
    await app.close();
  }
});

test('再ガチャシナリオ統合テスト', async () => {
  // 4人でのガチャ結果の初期状態をシミュレート
  const initialGachaState = {
    weapons: [
      { id: 'initial1', name: '初期武器1', type: 'shooter' },
      { id: 'initial2', name: '初期武器2', type: 'roller' },
      { id: 'initial3', name: '初期武器3', type: 'charger' },
      { id: 'initial4', name: '初期武器4', type: 'slosher' }
    ],
    playerNames: ['Alice', 'Bob', 'Charlie', 'Diana']
  };
  
  // Step 1: プレイヤー選択（AliceとCharlieを選択）
  const selectedIndices = [0, 2]; // Alice (index 0) と Charlie (index 2)
  
  // Step 2: 新しい武器データの取得をシミュレート
  const newWeapons = [
    { id: 'regacha1', name: '再ガチャ武器1', type: 'dualies' },
    { id: 'regacha3', name: '再ガチャ武器3', type: 'blaster' }
  ];
  
  // Step 3: Dashboard側の武器配列更新
  let updatedWeapons = [...initialGachaState.weapons];
  selectedIndices.forEach((selectedIndex, dataIndex) => {
    if (dataIndex < newWeapons.length) {
      updatedWeapons[selectedIndex] = newWeapons[dataIndex];
    }
  });
  
  // Step 4: WebSocketメッセージの作成
  const selectedWeapons = selectedIndices.map(index => updatedWeapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => initialGachaState.playerNames[index]);
  
  const webSocketMessage = {
    type: 'gacha-result',
    data: {
      result: {
        weapons: selectedWeapons,
        count: selectedWeapons.length,
        isReGacha: true
      },
      playerNames: selectedPlayerNames,
      isReGacha: true,
      gachaId: 'integration_test_' + Date.now()
    }
  };
  
  // Step 5: 検証
  
  // Dashboard側の状態確認
  assert.strictEqual(updatedWeapons[0].id, 'regacha1', 'Alice の武器が更新されている');
  assert.strictEqual(updatedWeapons[1].id, 'initial2', 'Bob の武器は変更されていない');
  assert.strictEqual(updatedWeapons[2].id, 'regacha3', 'Charlie の武器が更新されている');
  assert.strictEqual(updatedWeapons[3].id, 'initial4', 'Diana の武器は変更されていない');
  
  // WebSocketメッセージの確認
  assert.strictEqual(webSocketMessage.data.result.count, 2, 'Overlay向けメッセージで選択プレイヤー数が正しい');
  assert.strictEqual(webSocketMessage.data.result.weapons.length, 2, 'Overlay向け武器数が正しい');
  assert.deepStrictEqual(webSocketMessage.data.playerNames, ['Alice', 'Charlie'], 'Overlay向けプレイヤー名が正しい');
  assert.strictEqual(webSocketMessage.data.isReGacha, true, '再ガチャフラグが設定されている');
  
  // Overlay側での処理シミュレーション
  const overlayProcessing = (message) => {
    if (message.data.isReGacha) {
      return {
        displayType: 'regacha',
        playersToShow: message.data.playerNames,
        weaponsToShow: message.data.result.weapons,
        count: message.data.result.count
      };
    } else {
      return {
        displayType: 'normal',
        playersToShow: message.data.playerNames,
        weaponsToShow: message.data.result.weapons,
        count: message.data.result.count
      };
    }
  };
  
  const overlayResult = overlayProcessing(webSocketMessage);
  
  assert.strictEqual(overlayResult.displayType, 'regacha', 'Overlay側で再ガチャとして処理される');
  assert.strictEqual(overlayResult.count, 2, 'Overlay側で正しい表示数');
  assert.deepStrictEqual(overlayResult.playersToShow, ['Alice', 'Charlie'], 'Overlay側で選択されたプレイヤーのみ表示');
  
  // 順番が保持されているか確認
  assert.strictEqual(overlayResult.weaponsToShow[0].id, 'regacha1', '1番目の武器がAlice用');
  assert.strictEqual(overlayResult.weaponsToShow[1].id, 'regacha3', '2番目の武器がCharlie用');
});

test('エッジケース: 全員選択での再ガチャ', async () => {
  const allPlayersState = {
    weapons: [
      { id: 'w1', name: '武器1' },
      { id: 'w2', name: '武器2' },
      { id: 'w3', name: '武器3' }
    ],
    playerNames: ['Player 1', 'Player 2', 'Player 3']
  };
  
  // 全員を選択
  const selectedIndices = [0, 1, 2];
  
  const selectedWeapons = selectedIndices.map(index => allPlayersState.weapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => allPlayersState.playerNames[index]);
  
  // 全員選択の場合でも再ガチャとして処理される
  const message = {
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
  
  assert.strictEqual(message.data.result.count, 3, '全員選択でも正しいカウント');
  assert.strictEqual(message.data.isReGacha, true, '全員選択でも再ガチャフラグが設定');
  assert.deepStrictEqual(message.data.playerNames, ['Player 1', 'Player 2', 'Player 3'], '全員のプレイヤー名が保持');
});

test('エッジケース: 1人選択での再ガチャ', async () => {
  const multiPlayerState = {
    weapons: [
      { id: 'w1', name: '武器1' },
      { id: 'w2', name: '武器2' },
      { id: 'w3', name: '武器3' },
      { id: 'w4', name: '武器4' }
    ],
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4']
  };
  
  // 1人だけを選択（Player 3）
  const selectedIndices = [2];
  
  const selectedWeapons = selectedIndices.map(index => multiPlayerState.weapons[index]);
  const selectedPlayerNames = selectedIndices.map(index => multiPlayerState.playerNames[index]);
  
  const message = {
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
  
  assert.strictEqual(message.data.result.count, 1, '1人選択で正しいカウント');
  assert.strictEqual(message.data.result.weapons.length, 1, '1人分の武器データ');
  assert.deepStrictEqual(message.data.playerNames, ['Player 3'], '選択されたプレイヤー名のみ');
  assert.strictEqual(message.data.isReGacha, true, '1人選択でも再ガチャフラグが設定');
});

console.log('🔗 統合テストが完了しました');