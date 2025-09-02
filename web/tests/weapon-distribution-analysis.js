const fs = require('fs');
const path = require('path');
const { loadWeaponsData, getRandomWeapons } = require('../services/weapons');

// 武器データ分析ツール
function analyzeWeaponDistribution() {
  console.log('🔍 武器データ分布分析開始');
  console.log('==========================================');
  
  const weaponsData = loadWeaponsData();
  if (!weaponsData || !weaponsData.weapons) {
    console.error('❌ 武器データの読み込みに失敗');
    return;
  }

  const weapons = weaponsData.weapons;
  console.log(`📊 総武器数: ${weapons.length}種類`);

  // 武器種別の分布を分析
  const typeDistribution = {};
  const typeOrder = [];

  weapons.forEach((weapon, index) => {
    if (!typeDistribution[weapon.type]) {
      typeDistribution[weapon.type] = {
        count: 0,
        weapons: [],
        firstIndex: index,
        indices: []
      };
      typeOrder.push(weapon.type);
    }
    typeDistribution[weapon.type].count++;
    typeDistribution[weapon.type].weapons.push(weapon);
    typeDistribution[weapon.type].indices.push(index);
  });

  console.log('\n📈 武器種別分布:');
  Object.entries(typeDistribution).forEach(([type, data]) => {
    const percentage = (data.count / weapons.length * 100).toFixed(1);
    console.log(`${type}: ${data.count}種 (${percentage}%) - 最初の武器: ${data.firstIndex}番目`);
  });

  // 武器の順序分析（連続する武器種を確認）
  console.log('\n🔍 武器配列の順序分析:');
  let consecutiveGroups = [];
  let currentGroup = { type: weapons[0].type, start: 0, count: 1 };

  for (let i = 1; i < weapons.length; i++) {
    if (weapons[i].type === currentGroup.type) {
      currentGroup.count++;
    } else {
      if (currentGroup.count > 1) {
        consecutiveGroups.push({...currentGroup, end: i - 1});
      }
      currentGroup = { type: weapons[i].type, start: i, count: 1 };
    }
  }

  if (currentGroup.count > 1) {
    consecutiveGroups.push({...currentGroup, end: weapons.length - 1});
  }

  console.log(`連続する武器種グループ数: ${consecutiveGroups.length}`);
  consecutiveGroups.forEach(group => {
    console.log(`${group.type}: ${group.start}-${group.end} (${group.count}個連続)`);
    // 連続する武器の例を表示
    const examples = weapons.slice(group.start, Math.min(group.start + 3, group.end + 1))
                           .map(w => w.name).join(', ');
    console.log(`  例: ${examples}...`);
  });

  return {
    totalWeapons: weapons.length,
    typeDistribution,
    consecutiveGroups,
    weapons
  };
}

// ランダム選択の偏り分析
async function analyzeRandomSelectionBias() {
  console.log('\n\n🎲 ランダム選択偏り分析開始');
  console.log('==========================================');
  
  const weaponsData = loadWeaponsData();
  const weapons = weaponsData.weapons;
  
  // 4人用ガチャを多数回実行
  const testRounds = 200;
  const playerCount = 4;
  
  const typeSelectionCounts = {};
  const consecutiveTypeOccurrences = [];
  const weaponSelectionCounts = {};

  // 初期化
  const typeSet = new Set(weapons.map(w => w.type));
  typeSet.forEach(type => {
    typeSelectionCounts[type] = 0;
  });
  
  weapons.forEach(weapon => {
    weaponSelectionCounts[weapon.id] = 0;
  });

  console.log(`🔄 ${testRounds}回のガチャテスト実行中...`);
  
  for (let round = 0; round < testRounds; round++) {
    const selectedWeapons = getRandomWeapons(weapons, playerCount, false);
    
    // 各武器の選択回数をカウント
    selectedWeapons.forEach(weapon => {
      typeSelectionCounts[weapon.type]++;
      weaponSelectionCounts[weapon.id]++;
    });
    
    // 連続する武器種をカウント
    const types = selectedWeapons.map(w => w.type);
    for (let i = 1; i < types.length; i++) {
      if (types[i] === types[i-1]) {
        consecutiveTypeOccurrences.push({
          round: round + 1,
          type: types[i],
          position: i,
          weapons: selectedWeapons.slice(i-1, i+1).map(w => w.name)
        });
      }
    }
    
    if (round < 10) {
      console.log(`Round ${round + 1}: [${selectedWeapons.map(w => `${w.type}:${w.name.substring(0,8)}`).join(', ')}]`);
    }
  }

  console.log('\n📊 武器種選択頻度分析:');
  const totalSelections = testRounds * playerCount;
  
  Object.entries(typeSelectionCounts).forEach(([type, count]) => {
    const percentage = (count / totalSelections * 100).toFixed(2);
    const expectedCount = totalSelections * (Object.values({}).length || 1) / typeSet.size;
    console.log(`${type}: ${count}回 (${percentage}%)`);
  });

  console.log(`\n⚠️ 連続武器種発生: ${consecutiveTypeOccurrences.length}回`);
  const consecutiveRate = (consecutiveTypeOccurrences.length / (testRounds * (playerCount - 1)) * 100).toFixed(2);
  console.log(`連続発生率: ${consecutiveRate}%`);
  
  // 連続発生の内訳
  const consecutiveByType = {};
  consecutiveTypeOccurrences.forEach(occurrence => {
    if (!consecutiveByType[occurrence.type]) {
      consecutiveByType[occurrence.type] = 0;
    }
    consecutiveByType[occurrence.type]++;
  });

  console.log('\n📈 武器種別連続発生回数:');
  Object.entries(consecutiveByType).forEach(([type, count]) => {
    const rate = (count / consecutiveTypeOccurrences.length * 100).toFixed(1);
    console.log(`${type}: ${count}回 (${rate}%)`);
  });

  // 最も偏った選択例を表示
  console.log('\n🔍 連続発生例:');
  consecutiveTypeOccurrences.slice(0, 5).forEach(occurrence => {
    console.log(`Round ${occurrence.round}: ${occurrence.type} - [${occurrence.weapons.join(' → ')}]`);
  });

  return {
    totalRounds: testRounds,
    totalSelections,
    typeSelectionCounts,
    consecutiveTypeOccurrences,
    consecutiveRate: parseFloat(consecutiveRate)
  };
}

// 理論的な期待値計算
function calculateExpectedBias() {
  console.log('\n\n📐 理論値計算');
  console.log('==========================================');
  
  const weaponsData = loadWeaponsData();
  const weapons = weaponsData.weapons;
  
  // 武器種分布
  const typeDistribution = {};
  weapons.forEach(weapon => {
    typeDistribution[weapon.type] = (typeDistribution[weapon.type] || 0) + 1;
  });
  
  const types = Object.keys(typeDistribution);
  const totalWeapons = weapons.length;
  
  console.log('理論上の武器種選択確率:');
  types.forEach(type => {
    const probability = (typeDistribution[type] / totalWeapons * 100).toFixed(2);
    console.log(`${type}: ${probability}% (${typeDistribution[type]}/${totalWeapons})`);
  });
  
  // 4人ガチャで同一武器種が連続で選ばれる理論確率
  console.log('\n🎯 4人ガチャでの連続武器種選択理論確率:');
  types.forEach(type => {
    const typeWeaponCount = typeDistribution[type];
    // 最初に選んだ後、2つ目も同じ武器種が選ばれる確率
    const consecutiveProbability = ((typeWeaponCount - 1) / (totalWeapons - 1) * 100).toFixed(2);
    console.log(`${type}: ${consecutiveProbability}% (${typeWeaponCount-1}/${totalWeapons-1})`);
  });
  
  return typeDistribution;
}

// メイン実行
async function main() {
  try {
    const distributionData = analyzeWeaponDistribution();
    const biasData = await analyzeRandomSelectionBias();
    const expectedData = calculateExpectedBias();
    
    console.log('\n\n🎯 分析結果サマリー');
    console.log('==========================================');
    console.log(`✅ 武器データ構造分析完了: ${distributionData.totalWeapons}種類`);
    console.log(`✅ 連続武器種グループ: ${distributionData.consecutiveGroups.length}個`);
    console.log(`✅ ランダム選択テスト: ${biasData.totalRounds}回実行`);
    console.log(`⚠️  連続武器種発生率: ${biasData.consecutiveRate}%`);
    
    // 問題の判定
    if (biasData.consecutiveRate > 15) {
      console.log('\n🚨 警告: 連続武器種発生率が高すぎます');
      console.log('   原因の可能性:');
      console.log('   1. 武器データの配列順序に偏りがある');
      console.log('   2. 特定武器種の武器数が多すぎる');
      console.log('   3. シャッフルアルゴリズムに問題がある');
    } else {
      console.log('\n✅ 連続武器種発生率は許容範囲内です');
    }
    
  } catch (error) {
    console.error('❌ 分析中にエラーが発生:', error);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = {
  analyzeWeaponDistribution,
  analyzeRandomSelectionBias,
  calculateExpectedBias
};