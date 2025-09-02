const fs = require('fs');
const path = require('path');

function setupOverlayRoute(fastify) {
  fastify.get('/overlay', async (request, reply) => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Splatoon Gacha Overlay</title>
  <style>
    @font-face {
      font-family: 'Splatoon';
      src: url('/fonts/Splatoon1.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      unicode-range: U+0000-303F, U+3100-4DFF;
    }
    
    @font-face {
      font-family: 'SplatoonKana';
      src: url('/fonts/Splatoon2.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      unicode-range: U+3040-309F, U+30A0-30FF;
    }
    
    @font-face {
      font-family: 'RowdyStd';
      src: url('/fonts/RowdyStd-EB.ttf') format('truetype');
      font-weight: bold;
      font-style: normal;
      unicode-range: U+4E00-9FAF, U+3400-4DBF;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: transparent;
      font-family: 'Splatoon', 'SplatoonKana', 'RowdyStd', Arial, sans-serif;
      color: white;
      overflow: hidden;
    }
    
    #overlay-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      width: min(90vw, 600px);
      max-width: 90vw;
      background: rgba(0, 0, 0, 0.8);
      border-radius: min(2vw, 15px);
      padding: min(3vw, 20px);
      transition: transform 0.5s ease-out;
      opacity: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    #overlay-container.show {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    
    .multi-weapon-grid {
      display: grid;
      gap: min(2vw, 20px);
      width: 100%;
      max-width: 90vw;
    }
    
    .multi-weapon-grid.grid-1 {
      grid-template-columns: 1fr;
    }
    
    .multi-weapon-grid.grid-2 {
      grid-template-columns: 1fr 1fr;
    }
    
    .multi-weapon-grid.grid-3,
    .multi-weapon-grid.grid-4 {
      grid-template-columns: 1fr 1fr;
    }
    
    .weapon-card {
      background: rgba(0, 0, 0, 0.8);
      border-radius: min(1.5vw, 15px);
      padding: min(3vw, 20px); /* 全体的にパディングを大きく */
      text-align: center;
      border: 2px solid rgba(255, 102, 0, 0.3);
      opacity: 0;
      transform: scale(0.8) translateY(20px);
      transition: all 0.5s ease-out;
    }
    
    .weapon-card.animate-in {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    
    .weapon-card .player-label {
      font-size: 1.1rem; /* 少し大きく */
      color: #ff6600;
      font-weight: bold;
      margin-bottom: min(1.2vw, 10px);
      font-family: 'Splatoon', 'SplatoonKana', 'RowdyStd', Arial, sans-serif;
    }
    
    .weapon-card .weapon-icon img {
      width: min(18vw, 120px); /* アイコンを少し大きく */
      height: min(18vw, 120px);
      object-fit: contain;
      filter: drop-shadow(0 0 8px rgba(255, 102, 0, 0.4));
      margin: 0 auto min(1.2vw, 12px) auto;
    }
    
    .weapon-card .weapon-name {
      font-size: 1.5rem; /* 武器名を少し大きく */
      font-family: 'Splatoon', 'SplatoonKana', 'RowdyStd', Arial, sans-serif;
      margin: 0;
      padding: 0;
      white-space: normal;
      line-height: 1.2;
      word-break: break-word;
      color: white;
      text-shadow: 
        2px 0 0 #222222, 
        -2px 0 0 #222222, 
        0 2px 0 #222222, 
        0 -2px 0 #222222,
        2px 2px 0 #222222, 
        -2px -2px 0 #222222, 
        2px -2px 0 #222222, 
        -2px 2px 0 #222222;
    }
    
    .ink-splash {
      position: absolute;
      width: 20vmin;
      height: 20vmin;
      display: none;
      transform: scale3d(0, 0, 1) rotate(0deg);
      opacity: 0;
      transition: filter 0.3s ease;
      pointer-events: none;
      will-change: transform, opacity;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    .ink-splash img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    /* 異なる速度用のアニメーション */
    .ink-splash.active-slow {
      animation: inkSplashSlow 0.8s ease-out;
    }
    
    .ink-splash.active-medium {
      animation: inkSplashMedium 0.6s ease-out;
    }
    
    .ink-splash.active-fast {
      animation: inkSplashFast 0.4s ease-out;
    }
    
    .ink-splash.active-ultra {
      animation: inkSplashUltra 0.3s ease-out;
    }
    
    @keyframes inkSplashSlow {
      0% {
        transform: scale3d(0, 0, 1);
        opacity: 0;
      }
      20% {
        transform: scale3d(1, 1, 1);
        opacity: 1;
      }
      100% {
        transform: scale3d(2.5, 2.5, 1);
        opacity: 0;
      }
    }
    
    @keyframes inkSplashMedium {
      0% {
        transform: scale3d(0.3, 0.3, 1);
        opacity: 0;
      }
      30% {
        transform: scale3d(1.2, 1.2, 1);
        opacity: 1;
      }
      100% {
        transform: scale3d(2.3, 2.3, 1);
        opacity: 0;
      }
    }
    
    @keyframes inkSplashFast {
      0% {
        transform: scale3d(0.5, 0.5, 1);
        opacity: 0;
      }
      40% {
        transform: scale3d(1.3, 1.3, 1);
        opacity: 1;
      }
      100% {
        transform: scale3d(2.2, 2.2, 1);
        opacity: 0;
      }
    }
    
    @keyframes inkSplashUltra {
      0% {
        transform: scale3d(0.7, 0.7, 1);
        opacity: 0;
      }
      50% {
        transform: scale3d(1.4, 1.4, 1);
        opacity: 1;
      }
      100% {
        transform: scale3d(2, 2, 1);
        opacity: 0;
      }
    }
    
    .ink-splash-final {
      position: absolute;
      width: 100vw;
      height: 100vh;
      display: none;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      pointer-events: none;
      z-index: 100;
      will-change: transform, opacity;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform-style: preserve-3d;
    }
    
    .ink-splash-final img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      will-change: transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    .ink-splash-final.active {
      animation: finalSplash 1.5s ease-out;
    }
    
    @keyframes finalSplash {
      0% {
        transform: translate(-50%, -50%) scale3d(0.2, 0.2, 1);
        opacity: 0;
      }
      20% {
        transform: translate(-50%, -50%) scale3d(1, 1, 1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale3d(3, 3, 1);
        opacity: 0;
      }
    }
    
  </style>
</head>
<body>
  <div class="ink-splash" id="inkSplash1"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash2"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash3"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash4"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash5"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash6"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash7"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash8"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash9"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash10"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash11"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash12"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash13"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash14"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash15"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash16"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash17"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash18"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash19"><img src="" alt="ink splash"></div>
  <div class="ink-splash" id="inkSplash20"><img src="" alt="ink splash"></div>
  <div class="ink-splash-final" id="inkSplashFinal"><img src="" alt="final ink splash"></div>
  
  <div id="overlay-container">
    <div id="multi-weapon-display" style="display: none;">
      <div class="multi-weapon-grid" id="multiWeaponGrid">
        <!-- 武器がここに動的に生成されます -->
      </div>
    </div>
  </div>

  <script>
    let ws = null;
    let reconnectTimeout = null;
    let currentGachaData = null;
    
    // overlay演出完了通知を送信
    function sendAnimationCompleted() {
      if (ws && ws.readyState === WebSocket.OPEN && currentGachaData) {
        ws.send(JSON.stringify({
          type: 'overlay-animation-completed',
          data: currentGachaData
        }));
        console.log('Animation completed notification sent');
      }
    }
    
    function connect() {
      // WebSocket接続（動的にホストを決定）
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = \`\${protocol}//\${host}/ws\`;
      
      console.log('Overlay connecting to WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          if (message.type === 'gacha-result' && message.data) {
            currentGachaData = message.data;
            showGachaResult(message.data);
          }
          // widget-updateメッセージは無視（overlayでは演出しない）
          else if (message.type === 'widget-update') {
            console.log('Widget update message ignored by overlay');
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
    let overlayConfig = { skipAnimation: false }; // デフォルト設定

    function showGachaResult(data) {
      const result = data.result;
      
      if (!result) return;
      
      // オーバーレイ設定を適用
      if (data.overlayConfig) {
        overlayConfig = { ...overlayConfig, ...data.overlayConfig };
        console.log('Overlay config updated:', overlayConfig);
      }
      
      // 既存のガチャ表示をクリア
      if (isGachaRunning) {
        clearGachaDisplay();
      }
      
      isGachaRunning = true;
      
      // 演出省略設定に基づいて処理を分岐
      if (overlayConfig.skipAnimation) {
        console.log('Animation skipped due to skipAnimation setting');
        // 演出をスキップ - インクエフェクトは一切表示せず、武器表示のみ行う
        if (result.weapons && result.weapons.length > 0) {
          showMultipleWeapons(result, data.playerNames);
        } else {
          showSingleWeaponResult(result);
        }
        
        // 完了通知を送信するタイマーを設定（短縮された時間）
        currentGachaTimeout = setTimeout(() => {
          const container = document.getElementById('overlay-container');
          container.classList.remove('show');
          isGachaRunning = false;
          sendAnimationCompleted();
        }, 2000); // 演出省略時は短縮（2秒）
      } else {
        // 通常の演出モード - まずインクエフェクトを表示してから武器表示
        showInkEffects(() => {
          // 複数武器または単一武器の判定
          if (result.weapons && result.weapons.length > 0) {
            // 1人でも複数人でも同じ表示形式を使用
            showMultiWeaponResult(data);
          } else {
            showSingleWeaponResult(result);
          }
        });
      }
    }
    
    // showMultipleWeapons関数を追加（showMultiWeaponResultのエイリアス）
    function showMultipleWeapons(result, playerNames) {
      const weapons = result.weapons;
      const count = weapons.length;
      
      // 武器表示を表示
      document.getElementById('multi-weapon-display').style.display = 'flex';
      
      // グリッドを生成
      const multiWeaponGrid = document.getElementById('multiWeaponGrid');
      multiWeaponGrid.className = \`multi-weapon-grid grid-\${count}\`;
      multiWeaponGrid.innerHTML = '';
      
      weapons.forEach((weapon, index) => {
        const weaponCard = document.createElement('div');
        weaponCard.className = 'weapon-card';
        
        const playerName = playerNames[index] || ('Player ' + (index + 1));
        weaponCard.innerHTML = \`
          <div class="player-label">\${playerName}</div>
          <div class="weapon-icon">
            <img src="/images/weapons/\${weapon.id}.png" alt="\${weapon.name}" />
          </div>
          <div class="weapon-name">\${weapon.name}</div>
        \`;
        
        multiWeaponGrid.appendChild(weaponCard);
      });
      
      // オーバーレイを表示
      const container = document.getElementById('overlay-container');
      container.classList.add('show');
      
      // 武器カードを順次アニメーション表示
      const weaponCards = multiWeaponGrid.querySelectorAll('.weapon-card');
      weaponCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('animate-in');
        }, index * 200); // 200ms間隔で順次表示
      });
    }


    function showMultiWeaponResult(data) {
      const result = data.result;
      const playerNames = data.playerNames || [];
      const weapons = result.weapons;
      const count = weapons.length;
      
      // 武器表示を表示
      document.getElementById('multi-weapon-display').style.display = 'flex';
      
      // グリッドを生成
      const multiWeaponGrid = document.getElementById('multiWeaponGrid');
      multiWeaponGrid.className = \`multi-weapon-grid grid-\${count}\`;
      multiWeaponGrid.innerHTML = '';
      
      weapons.forEach((weapon, index) => {
        const weaponCard = document.createElement('div');
        weaponCard.className = 'weapon-card';
        
        const playerName = playerNames[index] || ('Player ' + (index + 1));
        weaponCard.innerHTML = \`
          <div class="player-label">\${playerName}</div>
          <div class="weapon-icon">
            <img src="/images/weapons/\${weapon.id}.png" alt="\${weapon.name}" />
          </div>
          <div class="weapon-name">\${weapon.name}</div>
        \`;
        
        multiWeaponGrid.appendChild(weaponCard);
      });
      
      // オーバーレイを表示
      const container = document.getElementById('overlay-container');
      container.classList.add('show');
      
      // 武器カードを順次アニメーション表示
      const weaponCards = multiWeaponGrid.querySelectorAll('.weapon-card');
      weaponCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('animate-in');
        }, index * 200); // 200ms間隔で順次表示
      });
      
      // 基本時間 + アニメーション時間 + 追加表示時間後に自動的に隠す
      const displayTime = 3000 + (weaponCards.length * 200) + 1000;
      currentGachaTimeout = setTimeout(() => {
        container.classList.remove('show');
        isGachaRunning = false;
        
        // 演出完了通知を送信
        sendAnimationCompleted();
      }, displayTime);
    }

    function getSubWeaponLabel(sub) {
      const subLabels = {
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
      return subLabels[sub] || sub;
    }

    function getSpecialWeaponLabel(special) {
      const specialLabels = {
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
      return specialLabels[special] || special;
    }

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
      const inkNumber = Math.floor(Math.random() * 12) + 1;
      return '/images/ink_' + inkNumber.toString().padStart(3, '0') + '.svg';
    }

    function applySplatoonColorFilter(element, color) {
      const filter = \`hue-rotate(\${color.hue}deg) saturate(\${color.saturation}%)\`;
      element.style.filter = filter;
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
        
        let inkSize;
        if (currentIndex <= 5) {
          // 最初の5個（15vmin〜18vmin相当）
          inkSize = baseUnit * (15 + currentIndex * 0.6);
        } else if (currentIndex <= 10) {
          // 6〜10個目（19vmin〜25vmin相当）
          inkSize = baseUnit * (18 + (currentIndex - 5) * 1.4);
        } else if (currentIndex <= 15) {
          // 11〜15個目（26vmin〜32vmin相当）
          inkSize = baseUnit * (25 + (currentIndex - 10) * 1.4);
        } else {
          // 16〜20個目（33vmin〜38vmin相当）
          inkSize = baseUnit * (32 + (currentIndex - 15) * 1.2);
        }
        
        // 最大サイズを制限
        inkSize = Math.min(inkSize, window.innerWidth * 0.4, window.innerHeight * 0.4);
        
        inkEl.style.width = inkSize + 'px';
        inkEl.style.height = inkSize + 'px';
        
        // 画面中央付近にランダム配置（中央の60%エリア内）
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const rangeX = window.innerWidth * 0.4; // 中央から40%の範囲
        const rangeY = window.innerHeight * 0.4; // 中央から40%の範囲
        
        const randomX = centerX - rangeX / 2 + Math.random() * rangeX - inkSize / 2;
        const randomY = centerY - rangeY / 2 + Math.random() * rangeY - inkSize / 2;
        
        inkEl.style.left = randomX + 'px';
        inkEl.style.top = randomY + 'px';
        
        // 速度に応じたアニメーションクラスを適用
        let animationClass;
        let delay;
        
        if (currentIndex <= 5) {
          // 最初の5個はゆっくり（600ms〜500ms）
          animationClass = 'active-slow';
          delay = 600 - (currentIndex - 1) * 20;
        } else if (currentIndex <= 10) {
          // 6〜10個目は中速（400ms〜250ms）
          animationClass = 'active-medium';
          delay = 500 - (currentIndex - 5) * 50;
        } else if (currentIndex <= 15) {
          // 11〜15個目は速い（200ms〜100ms）
          animationClass = 'active-fast';
          delay = 250 - (currentIndex - 10) * 30;
        } else {
          // 16〜20個目は超速（80ms〜50ms）
          animationClass = 'active-ultra';
          delay = 100 - (currentIndex - 15) * 10;
        }
        
        // インクを表示してアニメーション開始
        inkEl.style.display = 'block';
        inkEl.classList.add(animationClass);
        
        // アニメーション完了後にクリーンアップ
        const animationDuration = animationClass === 'active-slow' ? 800 :
                                 animationClass === 'active-medium' ? 600 :
                                 animationClass === 'active-fast' ? 400 : 300;
        
        setTimeout(() => {
          inkEl.style.display = 'none';
          inkEl.classList.remove(animationClass);
        }, animationDuration);
        
        currentIndex++;
        
        // 次のインクを表示
        setTimeout(showNextInk, delay);
      }
      
      // 最初のインクエフェクトを開始
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

    // ページ読み込み時にWebSocket接続を開始
    connect();
  </script>
</body>
</html>`;
    
    reply.type('text/html').send(html);
  });
}

module.exports = setupOverlayRoute;