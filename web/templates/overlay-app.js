// ユーティリティを読み込み
const weaponUtilsScript = document.createElement('script');
weaponUtilsScript.src = '/utils/weapon-utils.js';
weaponUtilsScript.async = false;
document.head.appendChild(weaponUtilsScript);

// WeaponUtilsが利用可能になるまで待機
const ensureWeaponUtils = () => {
  return new Promise((resolve) => {
    if (window.WeaponUtils) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (window.WeaponUtils) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
    }
  });
};

let ws = null;
let reconnectTimeout = null;
let overlayConfig = {
  skipAnimation: false
};

// テスト用にwindow.overlayConfigを初期化
window.overlayConfig = overlayConfig;

function connect() {
  // WebSocket接続（動的にホストを決定）
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;
  
  console.log('Overlay connecting to WebSocket:', wsUrl);
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('Connected to WebSocket server');
    
    // クライアントタイプを識別するメッセージを送信
    ws.send(JSON.stringify({
      type: 'client-type',
      data: {
        clientType: 'overlay',
        timestamp: Date.now()
      }
    }));
    
    // 接続時に現在の設定を取得
    fetchOverlayConfig();
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      
      if (message.type === 'gacha-result' && message.data) {
        showGachaResult(message.data);
      } else if (message.type === 'overlay-config-changed' && message.data) {
        console.log('Overlay config changed:', message.data);
        overlayConfig = { ...overlayConfig, ...message.data };
        
        // テスト用にwindow.overlayConfigも更新
        window.overlayConfig = overlayConfig;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
    reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

let isGachaRunning = false;
let currentGachaTimeout = null;

let currentGachaData = null; // 現在のガチャデータを保存

function showGachaResult(data) {
  console.log('=== DEBUGGING GACHA RESULT ===');
  console.log('Received data:', data);
  
  // 現在のガチャデータを保存
  currentGachaData = data;
  
  // ガチャ結果に含まれるオーバーレイ設定を適用
  if (data.overlayConfig) {
    overlayConfig = { ...overlayConfig, ...data.overlayConfig };
    console.log('Overlay config updated from gacha result:', overlayConfig);
  }
  
  // すでに実行中の場合は早期リターン
  if (isGachaRunning) {
    console.log('Gacha is already running, skipping...');
    return;
  }
  
  isGachaRunning = true;
  
  clearGachaDisplay();
  
  // データ構造を調整 - 新しいAPIレスポンス形式に対応
  let result = data.result || data;
  console.log('Parsed result:', result);
  console.log('selectedPlayerIndices:', data.selectedPlayerIndices);
  console.log('playerNames:', data.playerNames);
  
  // 演出省略設定に基づいて処理を分岐
  if (overlayConfig.skipAnimation) {
    console.log('Animation skipped due to skipAnimation setting');
    // 演出をスキップ - インクエフェクトは一切表示せず、武器表示のみ行う
    
    // Tauriアプリからのデータ構造の場合
    if (result.weapons && Array.isArray(result.weapons)) {
      console.log('Weapons array:', result.weapons);
      console.log('Is re-gacha?', data.isReGacha);
      
      // 修正された方式: isReGachaフラグで判定し、Dashboardで既に絞り込み済みのデータを使用
      if (data.isReGacha) {
        console.log('=== RE-GACHA MODE (SKIP ANIMATION) ===');
        console.log('Re-gacha weapons (pre-filtered by dashboard):', result.weapons);
        console.log('Re-gacha player names (pre-filtered by dashboard):', data.playerNames);
        
        // Dashboard側で既にフィルタリング済みなので、そのまま表示
        showMultipleWeapons(result, data.playerNames);
      } else {
        console.log('=== NORMAL GACHA MODE (SKIP ANIMATION) ===');
        // 通常のガチャの場合は全プレイヤーを表示
        showMultipleWeapons(result, data.playerNames);
      }
    } else {
      console.log('Unknown data structure:', result);
      isGachaRunning = false;
      return;
    }
    
    // 完了通知を送信するタイマーを設定（短縮された時間）
    currentGachaTimeout = setTimeout(() => {
      const container = document.getElementById('overlay-container');
      container.classList.remove('show');
      isGachaRunning = false;
      
      // overlay演出完了をWebSocketで通知
      if (ws && ws.readyState === WebSocket.OPEN && currentGachaData && currentGachaData.gachaId) {
        console.log('Sending overlay animation completed notification (skipped):', currentGachaData.gachaId);
        ws.send(JSON.stringify({
          type: 'overlay-animation-completed',
          data: { gachaId: currentGachaData.gachaId }
        }));
      }
    }, 2000); // 演出省略時は短縮（2秒）
    
  } else {
    // 通常の演出モード - まずインクエフェクトを表示してから武器表示
    console.log('=== NORMAL ANIMATION MODE ===');
    
    // インクエフェクトを表示
    showInkEffects(() => {
      console.log('Ink effects completed, now showing weapons');
      
      // インクエフェクト完了後に武器表示
      if (result.weapons && Array.isArray(result.weapons)) {
        console.log('Weapons array:', result.weapons);
        console.log('Is re-gacha?', data.isReGacha);
        
        // 修正された方式: isReGachaフラグで判定し、Dashboardで既に絞り込み済みのデータを使用
        if (data.isReGacha) {
          console.log('=== RE-GACHA MODE (WITH ANIMATION) ===');
          console.log('Re-gacha weapons (pre-filtered by dashboard):', result.weapons);
          console.log('Re-gacha player names (pre-filtered by dashboard):', data.playerNames);
          
          // Dashboard側で既にフィルタリング済みなので、そのまま表示
          showMultipleWeapons(result, data.playerNames);
        } else {
          console.log('=== NORMAL GACHA MODE (WITH ANIMATION) ===');
          // 通常のガチャの場合は全プレイヤーを表示
          showMultipleWeapons(result, data.playerNames);
        }
      } else {
        console.log('Unknown data structure:', result);
        isGachaRunning = false;
        return;
      }
      
      // インクエフェクト完了後に武器を隠すタイマーを設定
      currentGachaTimeout = setTimeout(() => {
        const container = document.getElementById('overlay-container');
        container.classList.remove('show');
        isGachaRunning = false;
        
        // overlay演出完了をWebSocketで通知
        if (ws && ws.readyState === WebSocket.OPEN && currentGachaData && currentGachaData.gachaId) {
          console.log('Sending overlay animation completed notification:', currentGachaData.gachaId);
          ws.send(JSON.stringify({
            type: 'overlay-animation-completed',
            data: { gachaId: currentGachaData.gachaId }
          }));
        }
      }, 4000); // 通常の表示時間
    });
  }
}


function showMultipleWeapons(result, playerNames = []) {
  // 武器表示を有効化
  const multiDisplay = document.getElementById('multi-weapon-display');
  multiDisplay.style.display = 'block';
  
  // グリッドコンテナを取得
  const grid = document.getElementById('multiWeaponGrid');
  grid.innerHTML = ''; // 既存の内容をクリア
  
  // 武器数に応じてグリッドクラスを設定
  grid.className = 'multi-weapon-grid';
  if (result.weapons.length === 1) {
    grid.classList.add('grid-1'); // 1人用のクラス追加
  } else if (result.weapons.length === 2) {
    grid.classList.add('grid-2');
  } else if (result.weapons.length === 3) {
    grid.classList.add('grid-3');
  } else if (result.weapons.length === 4) {
    grid.classList.add('grid-4');
  }
  
  // 各武器のカードを生成
  result.weapons.forEach((weapon, index) => {
    const weaponCard = document.createElement('div');
    weaponCard.className = 'weapon-card';
    
    let displayName = weapon.name || 'Unknown';
    
    // プレイヤー名を使用（提供されていない場合はデフォルト）
    const playerName = playerNames[index] || `Player ${index + 1}`;
    
    // アイコン表示の判定
    const showIcon = weapon.id ? true : false;
    
    weaponCard.innerHTML = `
      <div class="player-label">${playerName}</div>
      ${showIcon ? `<div class="weapon-icon-multi"><img src="/images/weapons/${weapon.id}.png" alt="${weapon.name}"></div>` : ''}
      <div class="weapon-name-multi">${displayName}</div>
    `;
    
    // 文字サイズを調整
    grid.appendChild(weaponCard);
    const nameEl = weaponCard.querySelector('.weapon-name-multi');
    adjustTextSize(nameEl);
  });
  
  // オーバーレイを表示
  const container = document.getElementById('overlay-container');
  container.classList.add('show');
  
  // タイマーはshowGachaResult関数で管理されるので、ここでは設定しない
}

// WeaponUtilsから関数を使用

function adjustTextSize(element) {
  const maxWidth = element.parentElement.offsetWidth - 40; // パディング分を引く
  let fontSize = 32; // 2remのピクセル値から開始
  element.style.fontSize = fontSize + 'px';
  
  // テキストが収まるまでフォントサイズを小さくする
  while (element.scrollWidth > maxWidth && fontSize > 16) {
    fontSize -= 1;
    element.style.fontSize = fontSize + 'px';
  }
}

function clearGachaDisplay() {
  // 既存のタイムアウトをクリア
  if (currentGachaTimeout) {
    clearTimeout(currentGachaTimeout);
    currentGachaTimeout = null;
  }
  
  // 表示中のオーバーレイを即座に隠す
  const container = document.getElementById('overlay-container');
  container.classList.remove('show');
  
  // 武器表示を隠す
  document.getElementById('multi-weapon-display').style.display = 'none';
  
  // 実行中のインクエフェクトを停止
  const inkElements = [];
  for (let i = 1; i <= 20; i++) {
    inkElements.push('inkSplash' + i);
  }
  inkElements.forEach(id => {
    const inkEl = document.getElementById(id);
    if (inkEl) {
      inkEl.style.display = 'none';
      inkEl.classList.remove('active-slow', 'active-medium', 'active-fast', 'active-ultra');
    }
  });
  
  // フィナーレエフェクトも停止
  const finalInk = document.getElementById('inkSplashFinal');
  finalInk.style.display = 'none';
  finalInk.classList.remove('active');
  
  isGachaRunning = false;
}

// Splatoon 3公式カラーパレット
const splatoonColors = [
  { name: 'Yellow', hue: 50, saturation: 150 },      // S3シグネチャー
  { name: 'Blue', hue: 210, saturation: 120 },       // S3シグネチャー
  { name: 'Orange', hue: 25, saturation: 140 },      // 伝統的Splatoonカラー
  { name: 'Purple', hue: 280, saturation: 130 },     // マジェンタ
  { name: 'Green', hue: 120, saturation: 110 },      // グリーン
  { name: 'Pink', hue: 320, saturation: 125 },       // ピンク
  { name: 'Cyan', hue: 180, saturation: 115 },       // シアン
  { name: 'LimeGreen', hue: 90, saturation: 135 },   // ライムグリーン
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

function applySplatoonColorFilter(element, color) {
  element.style.filter = 'hue-rotate(' + color.hue + 'deg) saturate(' + color.saturation + '%) brightness(110%)';
}

function showInkEffects(callback) {
  const inkElements = [];
  for (let i = 1; i <= 20; i++) {
    inkElements.push('inkSplash' + i);
  }
  let currentIndex = 0;
  
  function showNextInk() {
    if (currentIndex >= inkElements.length) {
      // 全てのインクエフェクトが完了したらフィナーレエフェクト
      showFinalInkEffect(() => {
        callback();
      });
      return;
    }
    
    const inkEl = document.getElementById(inkElements[currentIndex]);
    const imgEl = inkEl.querySelector('img');
    
    // ランダムなSVGと色を選択
    const randomSVG = getRandomInkSVG();
    const randomColor = getRandomSplatoonColor();
    
    // SVGファイルと色を設定
    imgEl.src = randomSVG;
    applySplatoonColorFilter(imgEl, randomColor);
    
    // インクのサイズを画面サイズに比例して徐々に大きくする
    // ベースサイズを画面幅の基準値として計算
    const vw = window.innerWidth / 100;
    const vh = window.innerHeight / 100;
    const baseUnit = Math.min(vw, vh); // 小さい方を基準にする
    
    // インデックスに応じてサイズを増加
    const sizeMultiplier = 1 + (currentIndex * 0.4); // 徐々にサイズアップ
    const size = Math.min(baseUnit * 12 * sizeMultiplier, Math.min(vw * 30, vh * 30)); // 上限設定
    
    inkEl.style.width = size + 'px';
    inkEl.style.height = size + 'px';
    
    // ランダムな位置に配置
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    
    inkEl.style.left = x + 'px';
    inkEl.style.top = y + 'px';
    
    // will-changeを設定してパフォーマンスを向上
    inkEl.style.willChange = 'transform, opacity';
    
    // インクを表示してアニメーション開始
    inkEl.style.display = 'block';
    
    // アニメーションの種類をランダムに決定
    const animationTypes = ['active-slow', 'active-medium', 'active-fast', 'active-ultra'];
    const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
    inkEl.classList.add(randomAnimation);
    
    // アニメーション完了後にクリーンアップ
    const animationDuration = randomAnimation === 'active-ultra' ? 800 : 
                             randomAnimation === 'active-fast' ? 1000 :
                             randomAnimation === 'active-medium' ? 1200 : 1500;
    
    setTimeout(() => {
      inkEl.style.display = 'none';
      inkEl.classList.remove(randomAnimation);
      // will-changeをクリア
      inkEl.style.willChange = 'auto';
    }, animationDuration);
    
    currentIndex++;
    
    // 次のインクを表示（タイミングを調整）
    const nextDelay = Math.random() * 150 + 50; // 50-200msのランダムディレイ
    setTimeout(showNextInk, nextDelay);
  }
  
  // 最初のインクを表示
  showNextInk();
}

function showFinalInkEffect(callback) {
  const finalInk = document.getElementById('inkSplashFinal');
  const imgEl = finalInk.querySelector('img');
  
  // ランダムなSVGと色を選択
  const randomSVG = getRandomInkSVG();
  const randomColor = getRandomSplatoonColor();
  
  // SVGファイルと色を設定
  imgEl.src = randomSVG;
  applySplatoonColorFilter(imgEl, randomColor);
  
  // 中央に配置して表示
  finalInk.style.display = 'block';
  finalInk.classList.add('active');
  
  // アニメーション完了後にコールバック実行
  setTimeout(() => {
    finalInk.style.display = 'none';
    finalInk.classList.remove('active');
    // will-changeをクリア
    finalInk.style.willChange = 'auto';
    callback();
  }, 1500);
}

// オーバーレイ設定を取得する関数
async function fetchOverlayConfig() {
  try {
    const response = await fetch('/api/overlay-config');
    const config = await response.json();
    overlayConfig = { ...overlayConfig, ...config };
    
    // テスト用にwindow.overlayConfigも更新
    window.overlayConfig = overlayConfig;
    
    console.log('Overlay config loaded:', overlayConfig);
  } catch (error) {
    console.error('Failed to fetch overlay config:', error);
  }
}

// 接続開始
connect();

// ページ終了時にクリーンアップ
window.addEventListener('beforeunload', () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  if (ws) {
    ws.close();
  }
});

// モジュールとしてエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    connect,
    showGachaResult,
    getSubWeaponLabel: window.WeaponUtils?.getSubWeaponLabel,
    getSpecialWeaponLabel: window.WeaponUtils?.getSpecialWeaponLabel,
    adjustTextSize,
    clearGachaDisplay,
    showInkEffects,
    getRandomSplatoonColor,
    getRandomInkSVG,
    applySplatoonColorFilter
  };
}

// テスト用にグローバルオブジェクトに公開
if (typeof window !== 'undefined') {
  window.isGachaRunning = () => isGachaRunning;
  window.overlayConfig = overlayConfig;
  window.clearGachaDisplay = clearGachaDisplay;
}

// ページ読み込み時にWebSocket接続を開始
document.addEventListener('DOMContentLoaded', function() {
  console.log('Overlay page loaded, connecting to WebSocket...');
  
  // ページリロード時にガチャ実行状態をリセット
  isGachaRunning = false;
  if (currentGachaTimeout) {
    clearTimeout(currentGachaTimeout);
    currentGachaTimeout = null;
  }
  
  // 既存のエフェクトをクリア
  clearGachaDisplay();
  
  connect();
});