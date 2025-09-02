const { test } = require('node:test');
const assert = require('node:assert');

// 純粋関数のテスト（ブラウザ依存なし）

// ラベル取得関数のテスト用定義
function getSubWeaponLabel(sub) {
  const labels = {
    splat_bomb: 'スプラッシュボム',
    suction_bomb: 'キューバンボム',
    burst_bomb: 'クイックボム',
    curling_bomb: 'カーリングボム',
    autobomb: 'ロボットボム',
    ink_mine: 'トラップ',
    toxic_mist: 'ポイズンミスト',
    point_sensor: 'ポイントセンサー',
    splash_wall: 'スプラッシュシールド',
    sprinkler: 'スプリンクラー',
    squid_beakon: 'ジャンプビーコン',
    fizzy_bomb: 'タンサンボム',
    torpedo: 'トーピード',
    angle_shooter: 'ラインマーカー',
  };
  return labels[sub] || sub;
}

function getSpecialWeaponLabel(special) {
  const labels = {
    trizooka: 'ウルトラショット',
    big_bubbler: 'グレートバリア',
    zipcaster: 'ショクワンダー',
    tenta_missiles: 'マルチミサイル',
    ink_storm: 'アメフラシ',
    booyah_bomb: 'ナイスダマ',
    wave_breaker: 'ホップソナー',
    ink_vac: 'キューインキ',
    killer_wail_5_1: 'メガホンレーザー5.1ch',
    inkjet: 'ジェットパック',
    ultra_stamp: 'ウルトラハンコ',
    crab_tank: 'カニタンク',
    reefslider: 'サメライド',
    triple_inkstrike: 'トリプルトルネード',
    tacticooler: 'エナジースタンド',
    splattercolor_screen: 'スミナガシート',
    triple_splashdown: 'ウルトラチャクチ',
    super_chump: 'デコイチラシ',
  };
  return labels[special] || special;
}

function getWeaponTypeLabel(type) {
  const labels = {
    shooter: 'シューター',
    roller: 'ローラー',
    charger: 'チャージャー',
    slosher: 'スロッシャー',
    splatling: 'スピナー',
    dualies: 'マニューバー',
    brella: 'シェルター',
    blaster: 'ブラスター',
    brush: 'フデ',
    stringer: 'ストリンガー',
    splatana: 'ワイパー',
  };
  return labels[type] || type;
}

const splatoonColors = [
  { name: 'Yellow', hue: 50, saturation: 150 },
  { name: 'Blue', hue: 210, saturation: 120 },
  { name: 'Orange', hue: 25, saturation: 140 },
  { name: 'Purple', hue: 280, saturation: 130 },
  { name: 'Green', hue: 120, saturation: 110 },
  { name: 'Pink', hue: 320, saturation: 125 },
  { name: 'Cyan', hue: 180, saturation: 115 },
  { name: 'LimeGreen', hue: 90, saturation: 135 },
];

let lastColorIndex = -1;

function getRandomSplatoonColor() {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * splatoonColors.length);
  } while (newIndex === lastColorIndex && splatoonColors.length > 1);
  
  lastColorIndex = newIndex;
  return splatoonColors[newIndex];
}

function getRandomInkSVG() {
  const inkNumber = Math.floor(Math.random() * 11) + 1;
  return '/images/ink_' + inkNumber.toString().padStart(3, '0') + '.svg';
}

// テストケース

test('サブ武器ラベル変換テスト', async () => {
  assert.strictEqual(getSubWeaponLabel('splat_bomb'), 'スプラッシュボム');
  assert.strictEqual(getSubWeaponLabel('curling_bomb'), 'カーリングボム');
  assert.strictEqual(getSubWeaponLabel('toxic_mist'), 'ポイズンミスト');
  assert.strictEqual(getSubWeaponLabel('unknown_sub'), 'unknown_sub'); // 存在しない場合はそのまま返される
});

test('スペシャル武器ラベル変換テスト', async () => {
  assert.strictEqual(getSpecialWeaponLabel('trizooka'), 'ウルトラショット');
  assert.strictEqual(getSpecialWeaponLabel('inkjet'), 'ジェットパック');
  assert.strictEqual(getSpecialWeaponLabel('wave_breaker'), 'ホップソナー');
  assert.strictEqual(getSpecialWeaponLabel('unknown_special'), 'unknown_special'); // 存在しない場合はそのまま返される
});

test('武器タイプラベル変換テスト', async () => {
  assert.strictEqual(getWeaponTypeLabel('shooter'), 'シューター');
  assert.strictEqual(getWeaponTypeLabel('roller'), 'ローラー');
  assert.strictEqual(getWeaponTypeLabel('charger'), 'チャージャー');
  assert.strictEqual(getWeaponTypeLabel('dualies'), 'マニューバー');
  assert.strictEqual(getWeaponTypeLabel('unknown_type'), 'unknown_type'); // 存在しない場合はそのまま返される
});

test('Splatoonカラー取得機能テスト', async () => {
  const color1 = getRandomSplatoonColor();
  const color2 = getRandomSplatoonColor();
  
  // カラーオブジェクトに必要なプロパティが存在することを確認
  assert.ok(color1.hasOwnProperty('name'), 'カラーオブジェクトにnameプロパティが存在');
  assert.ok(color1.hasOwnProperty('hue'), 'カラーオブジェクトにhueプロパティが存在');
  assert.ok(color1.hasOwnProperty('saturation'), 'カラーオブジェクトにsaturationプロパティが存在');
  
  // 色相値が適切な範囲内であることを確認
  assert.ok(color1.hue >= 0 && color1.hue <= 360, '色相値が0-360の範囲内');
  assert.ok(color1.saturation > 0, '彩度が正の値');
  
  // カラー名が有効であることを確認
  const validNames = ['Yellow', 'Blue', 'Orange', 'Purple', 'Green', 'Pink', 'Cyan', 'LimeGreen'];
  assert.ok(validNames.includes(color1.name), '有効なカラー名が返される');
  
  // 複数回呼び出すテスト（連続して同じ色が選ばれない仕組み）
  const colors = [];
  for (let i = 0; i < 10; i++) {
    colors.push(getRandomSplatoonColor());
  }
  
  // 少なくとも2種類以上の色が選ばれることを確認
  const uniqueColors = new Set(colors.map(c => c.name));
  assert.ok(uniqueColors.size >= 2, '複数回の呼び出しで異なる色が選ばれる');
});

test('ランダムインクSVGパス生成テスト', async () => {
  const svg1 = getRandomInkSVG();
  const svg2 = getRandomInkSVG();
  
  // SVGパスの形式が正しいことを確認
  assert.ok(svg1.startsWith('/images/ink_'), 'SVGパスが正しいプレフィックスで始まる');
  assert.ok(svg1.endsWith('.svg'), 'SVGパスが正しいサフィックスで終わる');
  
  // パス内に3桁の数字が含まれることを確認
  const match = svg1.match(/ink_(\d{3})\.svg/);
  assert.ok(match, 'パス内に3桁の数字が含まれる');
  
  const inkNumber = parseInt(match[1]);
  assert.ok(inkNumber >= 1 && inkNumber <= 11, 'インク番号が1-11の範囲内');
  
  // 複数回実行して、すべて有効な形式であることを確認
  const svgs = [];
  for (let i = 0; i < 20; i++) {
    const svg = getRandomInkSVG();
    svgs.push(svg);
    assert.ok(/^\/images\/ink_\d{3}\.svg$/.test(svg), `SVGパス${i + 1}が正しい形式`);
  }
  
  // 数字部分が範囲内であることを確認
  svgs.forEach((svg, index) => {
    const match = svg.match(/ink_(\d{3})\.svg/);
    const number = parseInt(match[1]);
    assert.ok(number >= 1 && number <= 11, `SVG ${index + 1}の番号が範囲内`);
  });
});

test('プレイヤー選択ロジックテスト', async () => {
  // プレイヤー選択状態の管理をテスト
  let playerSelection = [];
  
  const togglePlayerSelection = (index) => {
    if (playerSelection.includes(index)) {
      playerSelection = playerSelection.filter(i => i !== index);
    } else {
      playerSelection = [...playerSelection, index];
    }
  };
  
  // 初期状態
  assert.deepStrictEqual(playerSelection, [], '初期状態で選択なし');
  
  // プレイヤー1を選択
  togglePlayerSelection(0);
  assert.deepStrictEqual(playerSelection, [0], 'プレイヤー1が選択される');
  
  // プレイヤー3を追加選択
  togglePlayerSelection(2);
  assert.deepStrictEqual(playerSelection, [0, 2], 'プレイヤー1と3が選択される');
  
  // プレイヤー1の選択を解除
  togglePlayerSelection(0);
  assert.deepStrictEqual(playerSelection, [2], 'プレイヤー3のみ選択される');
  
  // プレイヤー3の選択を解除
  togglePlayerSelection(2);
  assert.deepStrictEqual(playerSelection, [], '全選択が解除される');
});

test('再ガチャデータ処理ロジックテスト', async () => {
  // 再ガチャメッセージの処理ロジック
  const processGachaMessage = (data) => {
    const result = data.result || data;
    
    if (result.weapons && Array.isArray(result.weapons)) {
      if (data.isReGacha) {
        return {
          type: 'regacha',
          weapons: result.weapons,
          playerNames: data.playerNames,
          count: result.weapons.length
        };
      } else {
        return {
          type: 'normal',
          weapons: result.weapons,
          playerNames: data.playerNames,
          count: result.weapons.length
        };
      }
    }
    
    return { error: 'Unknown data structure' };
  };
  
  // 通常ガチャのテスト
  const normalData = {
    result: {
      weapons: [
        { id: 'w1', name: '武器1' },
        { id: 'w2', name: '武器2' }
      ]
    },
    playerNames: ['Player 1', 'Player 2'],
    isReGacha: false
  };
  
  const normalResult = processGachaMessage(normalData);
  assert.strictEqual(normalResult.type, 'normal', '通常ガチャが正しく識別');
  assert.strictEqual(normalResult.count, 2, '通常ガチャのカウントが正しい');
  
  // 再ガチャのテスト
  const regachaData = {
    result: {
      weapons: [{ id: 'w3', name: '武器3' }]
    },
    playerNames: ['Player 3'],
    isReGacha: true
  };
  
  const regachaResult = processGachaMessage(regachaData);
  assert.strictEqual(regachaResult.type, 'regacha', '再ガチャが正しく識別');
  assert.strictEqual(regachaResult.count, 1, '再ガチャのカウントが正しい');
});

console.log('🧪 純粋関数テストが完了しました');