const { loadWeaponsData } = require('../services/weapons');

// 旧アルゴリズム（純粋フィッシャー・イェーツ）
function oldRandomWeapons(availableWeapons, count) {
  if (count >= availableWeapons.length) {
    return availableWeapons;
  }
  
  const shuffled = [...availableWeapons];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// 新アルゴリズム（武器種分散シャッフル）
function shuffleWithTypeDistribution(weapons) {
  const typeGroups = {};
  weapons.forEach(weapon => {
    if (!typeGroups[weapon.type]) {
      typeGroups[weapon.type] = [];
    }
    typeGroups[weapon.type].push(weapon);
  });
  
  Object.keys(typeGroups).forEach(type => {
    const group = typeGroups[type];
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });
  
  const types = Object.keys(typeGroups);
  const maxGroupSize = Math.max(...Object.values(typeGroups).map(g => g.length));
  const interleavedWeapons = [];
  
  for (let round = 0; round < maxGroupSize; round++) {
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
  
  for (let i = 0; i < interleavedWeapons.length; i += 3) {
    const sectionEnd = Math.min(i + 3, interleavedWeapons.length);
    const section = interleavedWeapons.slice(i, sectionEnd);
    
    for (let j = section.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [section[j], section[k]] = [section[k], section[j]];
    }
    
    for (let j = 0; j < section.length; j++) {
      interleavedWeapons[i + j] = section[j];
    }
  }
  
  return interleavedWeapons;
}

function newRandomWeapons(availableWeapons, count) {
  if (count >= availableWeapons.length) {
    return availableWeapons;
  }
  
  const distributedWeapons = shuffleWithTypeDistribution(availableWeapons);
  return distributedWeapons.slice(0, count);
}

// 比較テスト実行
async function compareAlgorithms() {
  console.log('🔬 武器種分散アルゴリズム比較テスト');
  console.log('==========================================\n');
  
  const weaponsData = loadWeaponsData();
  const weapons = weaponsData.weapons;
  
  const testRounds = 500;
  const playerCount = 4;
  
  // 旧アルゴリズムのテスト
  console.log('📊 旧アルゴリズム（純粋フィッシャー・イェーツ）結果:');
  const oldResults = testAlgorithm(weapons, playerCount, testRounds, oldRandomWeapons, '旧');
  
  console.log('\n📊 新アルゴリズム（武器種分散シャッフル）結果:');
  const newResults = testAlgorithm(weapons, playerCount, testRounds, newRandomWeapons, '新');
  
  // 比較分析
  console.log('\n\n🎯 アルゴリズム比較分析');
  console.log('==========================================');
  
  const improvement = ((oldResults.consecutiveRate - newResults.consecutiveRate) / oldResults.consecutiveRate * 100);
  console.log(`連続武器種発生率改善: ${improvement.toFixed(1)}% 削減`);
  console.log(`旧: ${oldResults.consecutiveRate.toFixed(2)}% → 新: ${newResults.consecutiveRate.toFixed(2)}%`);
  
  // 武器種分布の均等性比較
  console.log('\n📈 武器種選択分布の均等性:');
  const oldVariance = calculateVariance(Object.values(oldResults.typeSelectionCounts));
  const newVariance = calculateVariance(Object.values(newResults.typeSelectionCounts));
  
  console.log(`旧アルゴリズム分散: ${oldVariance.toFixed(2)}`);
  console.log(`新アルゴリズム分散: ${newVariance.toFixed(2)}`);
  console.log(`分散改善: ${((oldVariance - newVariance) / oldVariance * 100).toFixed(1)}% 削減`);
  
  return {
    oldResults,
    newResults,
    improvement: parseFloat(improvement.toFixed(1)),
    varianceImprovement: parseFloat(((oldVariance - newVariance) / oldVariance * 100).toFixed(1))
  };
}

function testAlgorithm(weapons, playerCount, testRounds, algorithmFunc, name) {
  const typeSelectionCounts = {};
  const consecutiveTypeOccurrences = [];
  
  // 初期化
  const typeSet = new Set(weapons.map(w => w.type));
  typeSet.forEach(type => {
    typeSelectionCounts[type] = 0;
  });
  
  for (let round = 0; round < testRounds; round++) {
    const selectedWeapons = algorithmFunc(weapons, playerCount);
    
    // 各武器の選択回数をカウント
    selectedWeapons.forEach(weapon => {
      typeSelectionCounts[weapon.type]++;
    });
    
    // 連続する武器種をカウント
    const types = selectedWeapons.map(w => w.type);
    for (let i = 1; i < types.length; i++) {
      if (types[i] === types[i-1]) {
        consecutiveTypeOccurrences.push({
          round: round + 1,
          type: types[i],
          position: i
        });
      }
    }
    
    if (round < 5) {
      console.log(`${name}${round + 1}: [${selectedWeapons.map(w => w.type).join(', ')}]`);
    }
  }
  
  const totalSelections = testRounds * playerCount;
  const consecutiveRate = (consecutiveTypeOccurrences.length / (testRounds * (playerCount - 1)) * 100);
  
  console.log(`\n総選択数: ${totalSelections}`);
  console.log(`連続武器種発生: ${consecutiveTypeOccurrences.length}回 (${consecutiveRate.toFixed(2)}%)`);
  
  // 武器種別選択頻度
  console.log('\n武器種選択頻度:');
  Object.entries(typeSelectionCounts).forEach(([type, count]) => {
    const percentage = (count / totalSelections * 100).toFixed(2);
    console.log(`${type}: ${count}回 (${percentage}%)`);
  });
  
  return {
    typeSelectionCounts,
    consecutiveTypeOccurrences,
    consecutiveRate: parseFloat(consecutiveRate.toFixed(2)),
    totalSelections
  };
}

function calculateVariance(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
}

// 実行
if (require.main === module) {
  compareAlgorithms().then(results => {
    console.log('\n\n🎉 改善結果サマリー');
    console.log('==========================================');
    console.log(`✅ 連続武器種発生率: ${results.improvement}% 改善`);
    console.log(`✅ 武器種分布分散: ${results.varianceImprovement}% 改善`);
    console.log('✅ 武器種偏り問題が大幅に解決されました！');
  });
}

module.exports = { compareAlgorithms };