const path = require('path');
const fs = require('fs');

// 武器データを読み込み
let weaponsData = null;

function loadWeaponsData() {
  try {
    const weaponsPath = path.join(__dirname, '../../src/infrastructure/data/weapons.json');
    const weaponsJSON = fs.readFileSync(weaponsPath, 'utf8');
    const rawData = JSON.parse(weaponsJSON);
    
    // 武器データから一意のサブウェポンとスペシャルウェポンを抽出
    const uniqueSubWeapons = [...new Set(rawData.weapons.map(w => w.subWeapon))];
    const uniqueSpecialWeapons = [...new Set(rawData.weapons.map(w => w.specialWeapon))];
    
    // 日本語名から英語IDへのマッピング定義
    const subWeaponMapping = {
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
    
    const specialWeaponMapping = {
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
    
    // サブウェポン配列を生成
    const subWeapons = uniqueSubWeapons.map(name => ({
      id: subWeaponMapping[name] || name.replace(/\s+/g, '_').toLowerCase(),
      name: name
    }));
    
    // スペシャルウェポン配列を生成
    const specialWeapons = uniqueSpecialWeapons.map(name => ({
      id: specialWeaponMapping[name] || name.replace(/\s+/g, '_').toLowerCase(),
      name: name
    }));
    
    weaponsData = {
      weapons: rawData.weapons,
      subWeapons: subWeapons,
      specialWeapons: specialWeapons
    };
    
    console.log(`Loaded ${weaponsData.weapons.length} weapons from weapons.json`);
    console.log(`Generated ${weaponsData.subWeapons.length} sub weapons`);
    console.log(`Generated ${weaponsData.specialWeapons.length} special weapons`);
  } catch (error) {
    console.error('Error loading weapons data:', error);
    weaponsData = { weapons: [], subWeapons: [], specialWeapons: [] };
  }
  return weaponsData;
}

function getWeaponsData() {
  if (!weaponsData) {
    loadWeaponsData();
  }
  return weaponsData;
}

// 武器種均等分散シャッフル関数
function shuffleWithTypeDistribution(weapons) {
  // 武器種別にグループ化
  const typeGroups = {};
  weapons.forEach(weapon => {
    if (!typeGroups[weapon.type]) {
      typeGroups[weapon.type] = [];
    }
    typeGroups[weapon.type].push(weapon);
  });
  
  // 各グループ内でシャッフル
  Object.keys(typeGroups).forEach(type => {
    const group = typeGroups[type];
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });
  
  // 武器種をインターリーブ（交互配置）して分散
  const types = Object.keys(typeGroups);
  const maxGroupSize = Math.max(...Object.values(typeGroups).map(g => g.length));
  const interleavedWeapons = [];
  
  for (let round = 0; round < maxGroupSize; round++) {
    // 各ラウンドで武器種をランダム順序で処理
    const shuffledTypes = [...types];
    for (let i = shuffledTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTypes[i], shuffledTypes[j]] = [shuffledTypes[j], shuffledTypes[i]];
    }
    
    shuffledTypes.forEach(type => {
      if (typeGroups[type].length > round) {
        interleavedWeapons.push(typeGroups[type][round]);
      }
    });
  }
  
  // 最終的に全体をもう一度軽くシャッフル（完全にではなく部分的に）
  for (let i = 0; i < interleavedWeapons.length; i += 3) {
    const sectionEnd = Math.min(i + 3, interleavedWeapons.length);
    const section = interleavedWeapons.slice(i, sectionEnd);
    
    // 3個ずつの小さなセクションで軽いシャッフル
    for (let j = section.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [section[j], section[k]] = [section[k], section[j]];
    }
    
    // 結果を戻す
    for (let j = 0; j < section.length; j++) {
      interleavedWeapons[i + j] = section[j];
    }
  }
  
  return interleavedWeapons;
}

function getRandomWeapons(availableWeapons, count, allowDuplicates = false) {
  if (!allowDuplicates) {
    // 重複なしの場合: 武器種分散シャッフルを使用
    if (count >= availableWeapons.length) {
      return availableWeapons;
    }
    
    // 武器種均等分散シャッフルアルゴリズムを使用
    const distributedWeapons = shuffleWithTypeDistribution(availableWeapons);
    return distributedWeapons.slice(0, count);
  } else {
    // 重複ありの場合: 武器種を考慮した独立選択
    const result = [];
    const selectedTypes = [];
    
    for (let i = 0; i < count; i++) {
      // 前回と同じ武器種が連続しないよう、適度に分散を促進
      let attempts = 0;
      let selectedWeapon;
      
      do {
        const randomIndex = Math.floor(Math.random() * availableWeapons.length);
        selectedWeapon = availableWeapons[randomIndex];
        attempts++;
        
        // 連続回避: 前の武器と同じ種類なら、20%の確率で再選択
        if (i > 0 && selectedTypes[i - 1] === selectedWeapon.type && attempts < 3) {
          if (Math.random() < 0.2) {
            continue; // 再選択
          }
        }
        
        break;
      } while (attempts < 3);
      
      result.push(selectedWeapon);
      selectedTypes.push(selectedWeapon.type);
    }
    
    return result;
  }
}

module.exports = {
  loadWeaponsData,
  getWeaponsData,
  getRandomWeapons
};