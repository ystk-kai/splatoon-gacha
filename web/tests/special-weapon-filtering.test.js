/**
 * スペシャル武器フィルタリングのユニットテスト
 * weapons.jsonのデータとAPIのフィルタリング結果が一致することを確認
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('スペシャル武器フィルタリングテスト', () => {
  let weaponsData;
  let server;
  const baseUrl = 'http://localhost:3000'; // 既存のサーバーを使用

  beforeEach(async () => {
    // weapons.jsonを読み込む
    const weaponsJsonPath = path.join(__dirname, '../../src/infrastructure/data/weapons.json');
    weaponsData = JSON.parse(fs.readFileSync(weaponsJsonPath, 'utf-8'));
    
    // サーバーは別プロセスで起動済みと仮定
    // ローカルのサーバーに接続してテスト
  });

  afterEach(async () => {
    // クリーンアップ処理（必要に応じて）
  });

  test('weapons.jsonからテイオウイカを持つ武器を正しく抽出できること', () => {
    const krakenWeapons = weaponsData.weapons.filter(w => w.specialWeapon === 'テイオウイカ');
    
    console.log(`テイオウイカを持つ武器数: ${krakenWeapons.length}`);
    console.log('武器リスト:');
    krakenWeapons.forEach(w => {
      console.log(`  - ${w.name} (${w.id})`);
    });
    
    // テイオウイカを持つ武器が存在することを確認
    assert(krakenWeapons.length > 0, 'テイオウイカを持つ武器が見つからない');
    
    // 各武器がテイオウイカを持っていることを確認
    krakenWeapons.forEach(weapon => {
      assert.strictEqual(weapon.specialWeapon, 'テイオウイカ', 
        `${weapon.name}のスペシャル武器がテイオウイカではない: ${weapon.specialWeapon}`);
    });
  });

  test('APIがテイオウイカでフィルタリングした武器を正しく返すこと', async () => {
    const response = await fetch(`${baseUrl}/api/random-weapon?type=special&filter=kraken_royale&count=1`);
    const data = await response.json();
    
    assert(!data.error, `APIエラー: ${data.error}`);
    assert(data.weapons || data.weapon, '武器データが返されていない');
    
    const weapons = data.weapons || [data.weapon];
    weapons.forEach(weapon => {
      assert.strictEqual(weapon.specialWeapon, 'テイオウイカ',
        `返された武器のスペシャルがテイオウイカではない: ${weapon.specialWeapon}`);
    });
  });

  test('すべてのスペシャル武器でフィルタリングが正しく動作すること', async () => {
    // APIで使用されるスペシャル武器のIDマッピング
    const specialWeaponMappings = {
      'trizooka': 'ウルトラショット',
      'big_bubbler': 'グレートバリア',
      'zipcaster': 'ショクワンダー',
      'tenta_missiles': 'マルチミサイル',
      'ink_storm': 'アメフラシ',
      'booyah_bomb': 'ナイスダマ',
      'wave_breaker': 'ホップソナー',
      'ink_vac': 'キューインキ',
      'killer_wail_5_1': 'メガホンレーザー5.1ch',
      'inkjet': 'ジェットパック',
      'ultra_stamp': 'ウルトラハンコ',
      'crab_tank': 'カニタンク',
      'reefslider': 'サメライド',
      'triple_inkstrike': 'トリプルトルネード',
      'tacticooler': 'エナジースタンド',
      'splattercolor_screen': 'スミナガシート',
      'triple_splashdown': 'ウルトラチャクチ',
      'super_chump': 'デコイチラシ',
      'kraken_royale': 'テイオウイカ'
    };

    // weapons.jsonから実際のスペシャル武器一覧を取得
    const actualSpecialWeapons = [...new Set(weaponsData.weapons.map(w => w.specialWeapon))];
    console.log('\nweapons.jsonに存在するスペシャル武器:');
    actualSpecialWeapons.forEach(special => {
      console.log(`  - ${special}`);
    });

    // 各スペシャル武器でフィルタリングテスト
    for (const [specialId, specialNameJp] of Object.entries(specialWeaponMappings)) {
      // weapons.jsonから該当武器を抽出
      const expectedWeapons = weaponsData.weapons.filter(w => w.specialWeapon === specialNameJp);
      
      if (expectedWeapons.length === 0) {
        console.log(`  ⚠️  ${specialNameJp} (${specialId}) を持つ武器が見つからない`);
        continue;
      }

      // APIでフィルタリング
      const response = await fetch(`${baseUrl}/api/random-weapon?type=special&filter=${specialId}&count=1`);
      const data = await response.json();
      
      if (data.error) {
        assert.fail(`${specialNameJp} (${specialId}) のフィルタリングでエラー: ${data.error}`);
      }
      
      const weapons = data.weapons || [data.weapon];
      weapons.forEach(weapon => {
        assert.strictEqual(weapon.specialWeapon, specialNameJp,
          `${specialId}でフィルタリングしたが、返された武器のスペシャルが不正: ${weapon.specialWeapon}`);
      });
      
      console.log(`  ✓ ${specialNameJp} (${specialId}): ${expectedWeapons.length}種類の武器`);
    }
  });

  test('複数人数でテイオウイカフィルタリングが正しく動作すること', async () => {
    const playerCounts = [2, 3, 4];
    
    for (const count of playerCounts) {
      const response = await fetch(`${baseUrl}/api/random-weapon?type=special&filter=kraken_royale&count=${count}&allowDuplicates=true`);
      const data = await response.json();
      
      assert(!data.error, `${count}人でのAPIエラー: ${data.error}`);
      assert(data.weapons, `${count}人での武器データが返されていない`);
      assert.strictEqual(data.weapons.length, count, `${count}人分の武器が返されていない`);
      
      data.weapons.forEach((weapon, index) => {
        assert.strictEqual(weapon.specialWeapon, 'テイオウイカ',
          `${count}人中${index + 1}人目の武器のスペシャルがテイオウイカではない: ${weapon.specialWeapon}`);
      });
      
      console.log(`  ✓ ${count}人でのテイオウイカフィルタリング成功`);
    }
  });

  test('選択された武器リストでフィルタリングされること', async () => {
    // テイオウイカを持つ武器のIDを取得
    const krakenWeapons = weaponsData.weapons.filter(w => w.specialWeapon === 'テイオウイカ');
    const selectedWeaponIds = krakenWeapons.slice(0, 3).map(w => w.id); // 最初の3つを選択
    
    const response = await fetch(
      `${baseUrl}/api/random-weapon?type=special&filter=kraken_royale&count=1&selectedWeapons=${selectedWeaponIds.join(',')}`
    );
    const data = await response.json();
    
    assert(!data.error, `選択武器でのAPIエラー: ${data.error}`);
    
    const weapons = data.weapons || [data.weapon];
    weapons.forEach(weapon => {
      assert(selectedWeaponIds.includes(weapon.id),
        `返された武器が選択リストに含まれていない: ${weapon.id}`);
      assert.strictEqual(weapon.specialWeapon, 'テイオウイカ',
        `返された武器のスペシャルがテイオウイカではない: ${weapon.specialWeapon}`);
    });
  });

  test('weapons.jsonの全武器のスペシャル武器が正しく設定されていること', () => {
    const invalidWeapons = [];
    
    weaponsData.weapons.forEach(weapon => {
      if (!weapon.specialWeapon || weapon.specialWeapon.trim() === '') {
        invalidWeapons.push(weapon);
      }
    });
    
    if (invalidWeapons.length > 0) {
      console.log('スペシャル武器が設定されていない武器:');
      invalidWeapons.forEach(w => {
        console.log(`  - ${w.name} (${w.id})`);
      });
    }
    
    assert.strictEqual(invalidWeapons.length, 0, 
      `${invalidWeapons.length}個の武器にスペシャル武器が設定されていない`);
  });
});