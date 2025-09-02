const fs = require('fs');
const path = require('path');

function setupWidgetRoute(fastify) {
  fastify.get('/widget', async (request, reply) => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Splatoon Gacha Widget</title>
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
      padding: 0;
      margin: 0;
    }
    
    #widget-container {
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
    }
    
    #widget-container.hidden {
      display: none;
    }
    
    .weapon-grid {
      display: grid;
      gap: 15px;
      padding: 0;
    }
    
    .weapon-grid.grid-1 {
      grid-template-columns: 1fr;
    }
    
    .weapon-grid.grid-2 {
      grid-template-columns: 1fr 1fr;
    }
    
    .weapon-grid.grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .weapon-grid.grid-4 {
      grid-template-columns: repeat(4, 1fr);
    }
    
    .weapon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 15px;
      padding: 20px;
      border: 2px solid rgba(255, 102, 0, 0.3);
      min-width: 150px;
    }
    
    .weapon-icon {
      width: 80px;
      height: 80px;
      margin-bottom: 10px;
    }
    
    .weapon-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 0 8px rgba(255, 102, 0, 0.4));
    }
    
    .player-name {
      font-size: 1.2rem;
      font-weight: bold;
      text-align: center;
      font-family: 'Splatoon', 'SplatoonKana', 'RowdyStd', Arial, sans-serif;
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
      white-space: nowrap;
    }
    
    .empty-slot {
      background: rgba(50, 50, 50, 0.5);
      border: 2px dashed rgba(255, 102, 0, 0.3);
    }
    
    .empty-slot .weapon-icon img {
      opacity: 0;
    }
    
    .empty-slot .player-name {
      color: #666;
    }
    
    /* ローディング表示のスタイル */
    .weapon-item.loading {
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid rgba(255, 102, 0, 0.3);
    }
    
    .loading-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      margin-bottom: 10px;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 102, 0, 0.3);
      border-top: 4px solid #ff6600;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.05);
        opacity: 1;
      }
    }
    
  </style>
</head>
<body>
  <div id="widget-container">
    <div class="weapon-grid grid-1" id="weaponGrid">
      <!-- 武器データがここに動的に生成されます -->
    </div>
  </div>

  <script>
    let ws = null;
    let reconnectTimeout = null;
    let currentWeapons = [];
    let playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    let currentPlayerCount = 1;
    let widgetVisible = true; // ウィジェットの表示状態
    let isLoadingGacha = false; // ガチャローディング状態
    let loadingPlayerIndices = []; // 再ガチャでローディング中のプレイヤーインデックス
    
    function connect() {
      // WebSocket接続（動的にホストを決定）
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = \`\${protocol}//\${host}/ws\`;
      
      console.log('Widget connecting to WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        
        // クライアントタイプを識別するメッセージを送信
        ws.send(JSON.stringify({
          type: 'client-type',
          data: {
            clientType: 'widget',
            timestamp: Date.now()
          }
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received message:', message);
          
          // ガチャ開始通知を受信してローディング状態を開始
          if (message.type === 'gacha-started' && message.data) {
            console.log('Gacha started notification received:', message.data);
            isLoadingGacha = true;
            
            // 再ガチャの場合は選択されたプレイヤーのインデックスを記録
            if (message.data.isReGacha && message.data.selectedPlayerIndices) {
              loadingPlayerIndices = message.data.selectedPlayerIndices;
              console.log('Re-gacha loading players:', loadingPlayerIndices);
            } else {
              // 通常ガチャの場合は全プレイヤー
              loadingPlayerIndices = [];
            }
            
            displaySlots();
          } else if (message.type === 'gacha-result' && message.data) {
            console.log('Gacha result received, waiting for overlay animation completion...');
          } else if (message.type === 'widget-update' && message.data) {
            console.log('Widget update received:', message.data);
            updateWeaponWidget(message.data);
          } else if (message.type === 'gacha-state-reset') {
            // ガチャ状態リセット通知を受信（Dashboardリロード時や失敗時）
            console.log('Gacha state reset received, clearing widget');
            isLoadingGacha = false;
            loadingPlayerIndices = [];
            currentWeapons = [];
            playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
            currentPlayerCount = 1;
            displaySlots();
          } else if (message.type === 'gacha-failed' && message.data) {
            // ガチャ失敗通知を受信
            console.log('Gacha failed notification received:', message.data);
            isLoadingGacha = false;
            loadingPlayerIndices = [];
            displaySlots();
          } else if (message.type === 'player-names-changed' && message.data) {
            // 名前とプレイヤー数の変更を受信
            if (message.data.playerNames) {
              playerNames = message.data.playerNames.map((name, index) => {
                return name && name.trim() ? name.trim() : \`Player \${index + 1}\`;
              });
            }
            if (message.data.playerCount) {
              currentPlayerCount = message.data.playerCount;
            }
            displaySlots();
          } else if (message.type === 'player-count-changed' && message.data) {
            // プレイヤー数の変更を受信
            if (message.data.playerCount) {
              currentPlayerCount = message.data.playerCount;
            }
            if (message.data.playerNames) {
              playerNames = message.data.playerNames.map((name, index) => {
                return name && name.trim() ? name.trim() : \`Player \${index + 1}\`;
              });
            }
            // 武器データをクリア（新しい人数での空スロット表示）
            isLoadingGacha = false;
            currentWeapons = [];
            displaySlots();
          } else if (message.type === 'widget-config-changed' && message.data) {
            // ウィジェット設定変更を受信
            if (typeof message.data.enabled === 'boolean') {
              widgetVisible = message.data.enabled;
              updateWidgetVisibility();
            }
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
    
    // ウィジェット表示状態を更新
    function updateWidgetVisibility() {
      const widgetContainer = document.getElementById('widget-container');
      if (widgetVisible) {
        widgetContainer.classList.remove('hidden');
      } else {
        widgetContainer.classList.add('hidden');
      }
    }
    
    function updateWeaponWidget(data) {
      const result = data.result;
      
      if (!result) return;
      
      // ローディング状態を終了
      isLoadingGacha = false;
      loadingPlayerIndices = [];
      
      // プレイヤー名も同時に受信した場合
      if (data.playerNames) {
        playerNames = data.playerNames.map((name, index) => {
          return name && name.trim() ? name.trim() : \`Player \${index + 1}\`;
        });
      }
      
      // 人数情報を更新
      if (result.weapons && result.weapons.length > 0) {
        currentWeapons = result.weapons;
        currentPlayerCount = result.weapons.length;
      } else if (result.weapon) {
        currentWeapons = [result.weapon];
        currentPlayerCount = 1;
      } else if (result.playerCount) {
        // playerCountが指定されている場合
        currentPlayerCount = result.playerCount;
      }
      
      displaySlots();
    }
    
    function displaySlots() {
      const weaponGrid = document.getElementById('weaponGrid');
      
      // グリッドクラスを設定
      weaponGrid.className = \`weapon-grid grid-\${currentPlayerCount}\`;
      weaponGrid.innerHTML = '';
      
      // 現在の人数分のスロットを作成
      for (let i = 0; i < currentPlayerCount; i++) {
        const weaponItem = document.createElement('div');
        const playerName = playerNames[i] || \`Player \${i + 1}\`;
        const weapon = currentWeapons[i];
        
        if (isLoadingGacha && (loadingPlayerIndices.length === 0 || loadingPlayerIndices.includes(i))) {
          // ローディング中の場合（通常ガチャは全員、再ガチャは選択されたプレイヤーのみ）
          weaponItem.className = 'weapon-item loading';
          weaponItem.innerHTML = \`
            <div class="loading-icon">
              <div class="spinner"></div>
            </div>
            <div class="player-name">\${playerName}</div>
          \`;
        } else if (weapon) {
          // 武器データがある場合（再ガチャ時の非選択プレイヤーも含む）
          weaponItem.className = 'weapon-item';
          weaponItem.innerHTML = \`
            <div class="weapon-icon">
              <img src="/images/weapons/\${weapon.id}.png" alt="\${weapon.name}" />
            </div>
            <div class="player-name">\${playerName}</div>
          \`;
        } else {
          // 空のスロット
          weaponItem.className = 'weapon-item empty-slot';
          weaponItem.innerHTML = \`
            <div class="weapon-icon">
              <img src="/images/weapons/wakaba_shooter.png" alt="empty" />
            </div>
            <div class="player-name">\${playerName}</div>
          \`;
        }
        
        weaponGrid.appendChild(weaponItem);
      }
    }
    
    // 初期設定を取得
    async function loadInitialConfig() {
      try {
        const response = await fetch('/api/widget-config');
        const config = await response.json();
        widgetVisible = config.enabled;
        updateWidgetVisibility();
        
        // サーバーからの状態復元を待つため少し遅延
        setTimeout(() => {
          console.log('Initial config loaded, widget visibility:', widgetVisible);
        }, 100);
      } catch (error) {
        console.error('Failed to load widget config:', error);
      }
    }
    
    // ページ読み込み時に初期設定とWebSocket接続を開始
    loadInitialConfig();
    connect();
    
    // 初期表示
    displaySlots();
  </script>
</body>
</html>`;
    
    reply.type('text/html').send(html);
  });
}

module.exports = setupWidgetRoute;