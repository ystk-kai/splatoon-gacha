// 簡易リロードテスト - 修正動作確認用
const WebSocket = require('ws');

async function testReloadBehavior() {
  console.log('🧪 連続リロード動作テスト開始');
  
  let client1, client2, client3;
  
  try {
    // 1. 初回接続とガチャ結果設定
    console.log('\n📡 1. 初回接続してガチャ結果を設定');
    client1 = new WebSocket('ws://localhost:3000/ws');
    
    await new Promise((resolve) => {
      client1.on('open', () => {
        console.log('✓ 初回接続成功');
        
        // ガチャ結果を送信
        client1.send(JSON.stringify({
          type: 'gacha-result',
          data: {
            result: {
              weapons: [{ id: 'test_weapon', name: '修正テスト武器', type: 'shooter' }],
              count: 1
            },
            playerNames: ['修正テストプレイヤー'],
            gachaId: 'test-fix-gacha'
          }
        }));
        
        // 演出完了を送信
        setTimeout(() => {
          client1.send(JSON.stringify({
            type: 'overlay-animation-completed',
            data: { gachaId: 'test-fix-gacha' }
          }));
          resolve();
        }, 100);
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 2. 1回目のリロード
    console.log('\n🔄 2. 1回目のリロード実行');
    client2 = new WebSocket('ws://localhost:3000/ws');
    
    const firstReloadResult = await new Promise((resolve, reject) => {
      let receivedStateResponse = false;
      
      client2.on('open', () => {
        console.log('✓ 1回目リロード接続成功');
        
        // dashboard-reload を送信
        client2.send(JSON.stringify({
          type: 'dashboard-reload',
          data: {
            source: 'dashboard-init',
            timestamp: Date.now()
          }
        }));
        
        // 状態復元要求を送信
        client2.send(JSON.stringify({
          type: 'dashboard-state-request',
          data: { timestamp: Date.now() }
        }));
      });
      
      client2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'dashboard-state-response') {
          receivedStateResponse = true;
          resolve(message.data);
        }
      });
      
      client2.on('error', reject);
      setTimeout(() => reject(new Error('1回目リロードタイムアウト')), 8000);
    });
    
    if (firstReloadResult.currentWeapon) {
      console.log(`✓ 1回目リロード状態復元成功: ${firstReloadResult.currentWeapon.weapons[0].name}`);
    } else {
      console.log('✗ 1回目リロード状態復元失敗');
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 2回目の連続リロード（問題の核心）
    console.log('\n🔄 3. 2回目の連続リロード実行（問題検証）');
    client3 = new WebSocket('ws://localhost:3000/ws');
    
    const secondReloadResult = await new Promise((resolve, reject) => {
      let receivedStateResponse = false;
      
      client3.on('open', () => {
        console.log('✓ 2回目リロード接続成功');
        
        // dashboard-reload を送信
        client3.send(JSON.stringify({
          type: 'dashboard-reload',
          data: {
            source: 'dashboard-reload',
            timestamp: Date.now()
          }
        }));
        
        // 状態復元要求を送信
        client3.send(JSON.stringify({
          type: 'dashboard-state-request',
          data: { timestamp: Date.now() }
        }));
      });
      
      client3.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'dashboard-state-response') {
          receivedStateResponse = true;
          resolve(message.data);
        }
      });
      
      client3.on('error', reject);
      setTimeout(() => reject(new Error('2回目リロードタイムアウト')), 8000);
    });
    
    // 4. 結果検証
    console.log('\n📊 結果検証');
    if (secondReloadResult.currentWeapon) {
      console.log(`✓ 2回目リロード状態復元成功: ${secondReloadResult.currentWeapon.weapons[0].name}`);
      console.log(`✓ プレイヤー名: ${secondReloadResult.playerNames[0]}`);
      
      // 状態が同じかどうか検証
      if (firstReloadResult.currentWeapon.weapons[0].name === secondReloadResult.currentWeapon.weapons[0].name) {
        console.log('🎉 修正成功: 連続リロードで状態が保持されている');
        return true;
      } else {
        console.log('❌ 修正失敗: 1回目と2回目で状態が異なる');
        return false;
      }
    } else {
      console.log('❌ 修正失敗: 2回目リロードで状態が失われた');
      return false;
    }
    
  } catch (error) {
    console.error('テストエラー:', error.message);
    return false;
  } finally {
    // クリーンアップ
    [client1, client2, client3].forEach(client => {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  }
}

// 連続リロード耐性テスト
async function testMultipleReloads() {
  console.log('\n🔥 連続リロード耐性テスト (5回)');
  
  const clients = [];
  
  try {
    // 初期状態設定
    const initClient = new WebSocket('ws://localhost:3000/ws');
    clients.push(initClient);
    
    await new Promise((resolve) => {
      initClient.on('open', () => {
        initClient.send(JSON.stringify({
          type: 'gacha-result',
          data: {
            result: {
              weapons: [{ id: 'endurance_weapon', name: '耐久テスト武器', type: 'roller' }],
              count: 1
            },
            playerNames: ['耐久テストプレイヤー'],
            gachaId: 'endurance-test-gacha'
          }
        }));
        
        setTimeout(() => {
          initClient.send(JSON.stringify({
            type: 'overlay-animation-completed',
            data: { gachaId: 'endurance-test-gacha' }
          }));
          resolve();
        }, 100);
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 5回連続リロード
    for (let i = 1; i <= 5; i++) {
      console.log(`\n🔄 ${i}回目のリロード`);
      
      const client = new WebSocket('ws://localhost:3000/ws');
      clients.push(client);
      
      const result = await new Promise((resolve, reject) => {
        client.on('open', () => {
          client.send(JSON.stringify({
            type: 'dashboard-reload',
            data: {
              source: `endurance-test-${i}`,
              timestamp: Date.now()
            }
          }));
          
          client.send(JSON.stringify({
            type: 'dashboard-state-request',
            data: { timestamp: Date.now() }
          }));
        });
        
        client.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'dashboard-state-response') {
            resolve(message.data);
          }
        });
        
        client.on('error', reject);
        setTimeout(() => reject(new Error(`${i}回目リロードタイムアウト`)), 5000);
      });
      
      if (result.currentWeapon && result.currentWeapon.weapons[0].name === '耐久テスト武器') {
        console.log(`✓ ${i}回目成功: 状態保持`);
      } else {
        console.log(`❌ ${i}回目失敗: 状態消失`);
        return false;
      }
      
      // 短い間隔で次のリロード
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('🎉 耐久テスト完了: 5回連続リロードで状態が保持された');
    return true;
    
  } catch (error) {
    console.error('耐久テストエラー:', error.message);
    return false;
  } finally {
    clients.forEach(client => {
      if (client && client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  }
}

// メイン実行
async function main() {
  console.log('サーバーが localhost:3000 で動作していることを確認してください');
  
  // 基本的な連続リロードテスト
  const basicTestResult = await testReloadBehavior();
  
  if (basicTestResult) {
    // 耐久テスト
    const enduranceTestResult = await testMultipleReloads();
    
    if (enduranceTestResult) {
      console.log('\n🎊 全てのテストが成功しました！修正は有効です。');
    } else {
      console.log('\n⚠️ 基本テストは成功しましたが、耐久テストで問題が発見されました。');
    }
  } else {
    console.log('\n❌ 基本テストが失敗しました。修正に問題があります。');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testReloadBehavior,
  testMultipleReloads
};