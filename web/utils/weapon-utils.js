// スプラトゥーン3武器関連のユーティリティ関数

// サブ武器のIDを取得する関数
function getSubWeaponId(subWeaponName) {
  const idMap = {
    'スプラッシュボム': 'splat_bomb',
    'キューバンボム': 'suction_bomb', 
    'クイックボム': 'burst_bomb',
    'カーリングボム': 'curling_bomb',
    'ロボットボム': 'autobomb',
    'トラップ': 'ink_mine',
    'ポイズンミスト': 'toxic_mist',
    'ポイントセンサー': 'point_sensor',
    'スプラッシュシールド': 'splash_wall',
    'スプリンクラー': 'sprinkler',
    'ジャンプビーコン': 'squid_beakon',
    'タンサンボム': 'fizzy_bomb',
    'トーピード': 'torpedo',
    'ラインマーカー': 'angle_shooter'
  };
  return idMap[subWeaponName] || subWeaponName.toLowerCase().replace(/\s+/g, '_');
}

// スペシャル武器のIDを取得する関数
function getSpecialWeaponId(specialWeaponName) {
  const idMap = {
    'ウルトラショット': 'trizooka',
    'グレートバリア': 'big_bubbler',
    'ショクワンダー': 'zipcaster',
    'マルチミサイル': 'tenta_missiles',
    'アメフラシ': 'ink_storm',
    'ナイスダマ': 'booyah_bomb',
    'ホップソナー': 'wave_breaker',
    'キューインキ': 'ink_vac',
    'メガホンレーザー5.1ch': 'killer_wail_5_1',
    'ジェットパック': 'inkjet',
    'ウルトラハンコ': 'ultra_stamp',
    'カニタンク': 'crab_tank',
    'サメライド': 'reefslider',
    'トリプルトルネード': 'triple_inkstrike',
    'エナジースタンド': 'tacticooler',
    'スミナガシート': 'splattercolor_screen',
    'ウルトラチャクチ': 'triple_splashdown',
    'デコイチラシ': 'super_chump',
    'テイオウイカ': 'kraken_royale'
  };
  return idMap[specialWeaponName] || specialWeaponName.toLowerCase().replace(/\s+/g, '_');
}

// サブ武器のラベルを取得する関数
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

// スペシャル武器のラベルを取得する関数
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
    kraken_royale: 'テイオウイカ',
  };
  return labels[special] || special;
}

// 武器種のラベルを取得する関数
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

// スプラトゥーンカラー定義
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

// ランダムなスプラトゥーンカラーを取得する関数
function getRandomSplatoonColor() {
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * splatoonColors.length);
  } while (newIndex === lastColorIndex && splatoonColors.length > 1);
  
  lastColorIndex = newIndex;
  return splatoonColors[newIndex];
}

// ランダムなインクSVGパスを取得する関数
function getRandomInkSVG() {
  const inkNumber = Math.floor(Math.random() * 11) + 1;
  return '/images/ink_' + inkNumber.toString().padStart(3, '0') + '.svg';
}

// Node.js環境（CommonJS）での場合
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSubWeaponId,
    getSpecialWeaponId,
    getSubWeaponLabel,
    getSpecialWeaponLabel,
    getWeaponTypeLabel,
    splatoonColors,
    getRandomSplatoonColor,
    getRandomInkSVG
  };
}

// ブラウザ環境での場合はグローバルオブジェクトに追加
if (typeof window !== 'undefined') {
  window.WeaponUtils = {
    getSubWeaponId,
    getSpecialWeaponId,
    getSubWeaponLabel,
    getSpecialWeaponLabel,
    getWeaponTypeLabel,
    splatoonColors,
    getRandomSplatoonColor,
    getRandomInkSVG
  };
}