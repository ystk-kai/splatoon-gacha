// WebSocket管理サービス
const clients = new Set();
const { getWidgetConfig, getViewerConfig, getOverlayConfig, getDashboardPlayerCount } = require('./config');

// ガチャ状態管理
let currentGachaState = {
  lastResult: null,
  playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  playerCount: 1,
  lastGachaId: null,
  isOverlayCompleted: false,
  isSpinning: false,
  isLoadingGacha: false, // ウィジェットローディング状態
  playerSelection: [], // 再ガチャ用のプレイヤー選択状態
  gachaTimeoutId: null, // ガチャタイムアウト用のタイマーID
  gachaStartedAt: null, // ガチャ開始時刻
  viewerConfig: {
    viewerEnabled: false,
    allowedGachaModes: []
  },
  widgetConfig: {
    widgetEnabled: true
  }
};

// サーバー起動時の初期化関数
function initializeGachaState() {
  try {
    console.log('🔍 [INIT DEBUG] Initializing gacha state with default values...');
    
    // サーバー起動時はデフォルト値で初期化（localStorageはクライアント側でのみ利用可能）
    // 実際の設定はクライアント接続時に同期される
    currentGachaState.playerCount = 1;
    currentGachaState.viewerConfig = {
      viewerEnabled: false,
      allowedGachaModes: []
    };
    currentGachaState.widgetConfig = {
      widgetEnabled: true
    };
    
    console.log('🔍 [INIT DEBUG] Gacha state initialized with defaults:', {
      playerCount: currentGachaState.playerCount,
      viewerEnabled: currentGachaState.viewerConfig.viewerEnabled,
      allowedGachaModes: currentGachaState.viewerConfig.allowedGachaModes,
      widgetEnabled: currentGachaState.widgetConfig.widgetEnabled
    });
  } catch (error) {
    console.error('🔍 [INIT DEBUG] Error initializing gacha state:', error);
  }
}

// WebSocketクライアントの管理
function addClient(socket) {
  clients.add(socket);
  console.log('Client connected, total clients:', clients.size);
  
  // クライアント接続時の初期化フラグを設定
  socket.isNewConnection = true;
  socket.stateRestored = false;
  socket.resetTimer = null;
  socket.connectionTimestamp = Date.now();
  socket.clientType = 'unknown'; // クライアントタイプを初期化
  
  console.log('🔍 [CLIENT DEBUG] New client connected with flags:', {
    isNewConnection: socket.isNewConnection,
    stateRestored: socket.stateRestored,
    connectionTimestamp: socket.connectionTimestamp
  });
  
  // 接続確認メッセージを送信
  socket.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: Date.now(),
  }));
  
  // ローディング中であればローディング状態を送信
  if (currentGachaState.isLoadingGacha) {
    socket.send(JSON.stringify({
      type: 'gacha-started',
      data: {
        source: 'server-restore',
        timestamp: Date.now()
      }
    }));
  }
  // 保存されたガチャ状態があればクライアントに送信（リロード時の復元）
  else if (currentGachaState.lastResult && currentGachaState.isOverlayCompleted) {
    socket.send(JSON.stringify({
      type: 'widget-update',
      data: {
        result: currentGachaState.lastResult,
        playerNames: currentGachaState.playerNames.slice(0, currentGachaState.playerCount),
        gachaId: currentGachaState.lastGachaId
      }
    }));
  }
  
  // プレイヤー名と人数の状態も送信
  socket.send(JSON.stringify({
    type: 'player-names-changed',
    data: {
      playerNames: currentGachaState.playerNames.slice(0, currentGachaState.playerCount),
      playerCount: currentGachaState.playerCount
    }
  }));

  // ウィジェット設定も送信
  const widgetConfig = getWidgetConfig();
  socket.send(JSON.stringify({
    type: 'widget-config-changed',
    data: widgetConfig
  }));
}

function removeClient(socket) {
  // タイマーのクリーンアップ
  if (socket.resetTimer) {
    console.log('🔍 [CLIENT DEBUG] Cleaning up reset timer on disconnect');
    clearTimeout(socket.resetTimer);
    socket.resetTimer = null;
  }
  
  // オーバーレイクライアントが切断された場合のガチャ失敗処理
  if (socket.clientType === 'overlay' && currentGachaState.isSpinning) {
    console.log('🚨 [GACHA FAILURE] Overlay disconnected during gacha, triggering failure process');
    handleGachaFailure('overlay-disconnected');
  }
  
  clients.delete(socket);
  console.log('Client disconnected, remaining clients:', clients.size, {
    clientType: socket.clientType,
    hadResetTimer: !!socket.resetTimer,
    stateRestored: socket.stateRestored,
    isNewConnection: socket.isNewConnection,
    wasGachaSpinning: currentGachaState.isSpinning
  });
}

// ガチャ失敗処理
function handleGachaFailure(reason) {
  console.log(`🚨 [GACHA FAILURE] Processing gacha failure: ${reason}`);
  
  // ガチャタイムアウトをクリア
  if (currentGachaState.gachaTimeoutId) {
    clearTimeout(currentGachaState.gachaTimeoutId);
    currentGachaState.gachaTimeoutId = null;
  }
  
  // ガチャ状態をリセット
  currentGachaState.isSpinning = false;
  currentGachaState.isLoadingGacha = false;
  currentGachaState.gachaStartedAt = null;
  
  // 全クライアントにガチャ失敗を通知
  broadcastToClients({
    type: 'gacha-failed',
    data: {
      reason: reason,
      message: reason === 'overlay-disconnected' ? 
        'オーバーレイが切断されました。もう一度ガチャをお試しください。' :
        reason === 'timeout' ?
        'ガチャの処理がタイムアウトしました。もう一度ガチャをお試しください。' :
        'ガチャの処理に失敗しました。もう一度ガチャをお試しください。',
      timestamp: Date.now()
    }
  });
  
  // ウィジェットと視聴者画面の状態もリセット
  broadcastToClients({
    type: 'gacha-state-reset',
    data: {
      reason: 'gacha-failure',
      timestamp: Date.now()
    }
  });
}

// 全クライアントへメッセージをブロードキャスト
function broadcastToClients(message) {
  const messageString = typeof message === 'string' ? message : JSON.stringify(message);
  
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(messageString);
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  });
}

// WebSocket設定
function setupWebSocket(fastify) {
  fastify.register(require('@fastify/websocket'));
  
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, request) => {
      const socket = connection.socket;
      addClient(socket);

      socket.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', data);
          
          // クライアントタイプ識別処理
          if (data.type === 'client-type') {
            const clientType = data.data?.clientType;
            if (['dashboard', 'overlay', 'viewer', 'widget'].includes(clientType)) {
              socket.clientType = clientType;
              console.log(`🔍 [CLIENT TYPE] Client identified as: ${clientType}`);
              
              // クライアントタイプ確認メッセージを送信
              socket.send(JSON.stringify({
                type: 'client-type-confirmed',
                data: { clientType: clientType },
                timestamp: Date.now()
              }));
            } else {
              console.warn(`🔍 [CLIENT TYPE] Invalid client type: ${clientType}`);
            }
            return; // ブロードキャストはしない
          }
          
          // Dashboardリロード検知
          if (data.type === 'dashboard-reload') {
            console.log('🔍 [RELOAD DEBUG] Dashboard reload detected', {
              source: data.data?.source || 'unknown',
              timestamp: data.data?.timestamp,
              socketFlags: {
                isNewConnection: connection.socket.isNewConnection,
                stateRestored: socket.stateRestored,
                hasResetTimer: !!socket.resetTimer
              },
              currentState: {
                playerCount: currentGachaState.playerCount,
                playerNames: currentGachaState.playerNames,
                hasLastResult: !!currentGachaState.lastResult,
                isSpinning: currentGachaState.isSpinning
              },
              totalClients: clients.size
            });
            
            // 新規接続の場合のみリセット処理を実行
            if (socket.isNewConnection && !socket.stateRestored) {
              console.log('🔍 [RELOAD DEBUG] New connection detected, starting reset timer');
              
              // 既存のタイマーがある場合はキャンセル
              if (socket.resetTimer) {
                clearTimeout(socket.resetTimer);
                console.log('🔍 [RELOAD DEBUG] Cleared existing reset timer');
              }
              
              // dashboard-state-requestが来るまでリセットを遅延
              socket.resetTimer = setTimeout(() => {
                // 5秒以内に状態復元要求がなかった場合のみリセット
                console.log('🔍 [RELOAD DEBUG] Reset timer expired, checking state restoration');
                console.log('🔍 [RELOAD DEBUG] Socket state:', {
                  stateRestored: socket.stateRestored,
                  isNewConnection: socket.isNewConnection
                });
                
                if (!socket.stateRestored) {
                  console.log('🔍 [RELOAD DEBUG] No state restoration occurred, resetting gacha state');
                  console.log('🔍 [RELOAD DEBUG] State before reset:', {
                    playerCount: currentGachaState.playerCount,
                    playerNames: currentGachaState.playerNames,
                    hasLastResult: !!currentGachaState.lastResult
                  });
                  
                  resetGachaState();
                  
                  console.log('🔍 [RELOAD DEBUG] State after reset:', {
                    playerCount: currentGachaState.playerCount,
                    playerNames: currentGachaState.playerNames,
                    hasLastResult: !!currentGachaState.lastResult
                  });
                  
                  broadcastToClients({
                    type: 'gacha-state-reset',
                    data: { timestamp: Date.now() }
                  });
                } else {
                  console.log('🔍 [RELOAD DEBUG] State was restored, skipping reset');
                }
                // タイマーをクリア
                socket.resetTimer = null;
              }, 5000);
            } else {
              console.log('Dashboard reload: Ignoring reload from restored connection or state already restored');
            }
            
            return; // メッセージの他の処理はスキップ
          }
          
          // Dashboard状態復元要求の個別処理
          if (data.type === 'dashboard-state-request') {
            console.log('🔍 [STATE DEBUG] Dashboard state request received', {
              socketFlags: {
                isNewConnection: connection.socket.isNewConnection,
                stateRestored: socket.stateRestored,
                hasResetTimer: !!socket.resetTimer
              },
              stateBeingRestored: {
                playerCount: currentGachaState.playerCount,
                playerNames: currentGachaState.playerNames,
                hasLastResult: !!currentGachaState.lastResult,
                isSpinning: currentGachaState.isSpinning,
                viewerEnabled: currentGachaState.viewerConfig.viewerEnabled,
                widgetEnabled: currentGachaState.widgetConfig.widgetEnabled
              },
              clientStateReceived: !!data.data?.clientState
            });
            
            // クライアント状態がある場合はサーバー状態を更新
            if (data.data?.clientState) {
              const clientState = data.data.clientState;
              console.log('🔍 [STATE DEBUG] Applying client state:', clientState);
              
              // localStorage値でサーバー状態を更新
              if (clientState.playerCount !== undefined) {
                currentGachaState.playerCount = clientState.playerCount;
              }
              if (clientState.playerNames) {
                currentGachaState.playerNames = [...clientState.playerNames];
              }
              if (clientState.viewerEnabled !== undefined) {
                currentGachaState.viewerConfig.viewerEnabled = clientState.viewerEnabled;
              }
              if (clientState.widgetEnabled !== undefined) {
                currentGachaState.widgetConfig.widgetEnabled = clientState.widgetEnabled;
              }
              if (clientState.allowedGachaModes) {
                currentGachaState.viewerConfig.allowedGachaModes = [...clientState.allowedGachaModes];
              }
              
              console.log('🔍 [STATE DEBUG] Server state updated with client state:', {
                playerCount: currentGachaState.playerCount,
                playerNames: currentGachaState.playerNames,
                viewerEnabled: currentGachaState.viewerConfig.viewerEnabled,
                widgetEnabled: currentGachaState.widgetConfig.widgetEnabled,
                allowedGachaModes: currentGachaState.viewerConfig.allowedGachaModes
              });
            }
            
            // 状態復元フラグを設定
            socket.stateRestored = true;
            socket.isNewConnection = false;
            socket.stateRestoredTimestamp = Date.now();
            
            console.log('🔍 [STATE DEBUG] State restoration completed:', {
              stateRestored: socket.stateRestored,
              isNewConnection: socket.isNewConnection,
              restorationTime: socket.stateRestoredTimestamp - socket.connectionTimestamp,
              hasResetTimer: !!socket.resetTimer
            });
            
            // リセットタイマーをキャンセル
            if (socket.resetTimer) {
              console.log('🔍 [STATE DEBUG] Canceling reset timer');
              clearTimeout(socket.resetTimer);
              socket.resetTimer = null;
            } else {
              console.log('🔍 [STATE DEBUG] No reset timer to cancel');
            }
            
            socket.send(JSON.stringify({
              type: 'dashboard-state-response',
              data: {
                currentWeapon: currentGachaState.lastResult,
                playerNames: currentGachaState.playerNames,
                playerCount: currentGachaState.playerCount,
                isSpinning: currentGachaState.isSpinning,
                playerSelection: currentGachaState.playerSelection,
                viewerConfig: currentGachaState.viewerConfig,
                widgetConfig: currentGachaState.widgetConfig,
                timestamp: Date.now()
              }
            }));
            return; // ブロードキャストはしない
          }
          
          // Viewer状態復元要求の個別処理
          if (data.type === 'viewer-state-request') {
            console.log('Sending viewer state response');
            socket.send(JSON.stringify({
              type: 'viewer-state-response',
              data: {
                currentWeapon: currentGachaState.lastResult,
                playerNames: currentGachaState.playerNames.slice(0, currentGachaState.playerCount),
                playerCount: currentGachaState.playerCount,
                isSpinning: currentGachaState.isSpinning,
                playerSelection: currentGachaState.playerSelection,
                timestamp: Date.now()
              }
            }));
            return; // ブロードキャストはしない
          }
          
          // メッセージタイプに応じて状態管理
          handleMessage(data);
          
          // 全クライアントにブロードキャスト
          broadcastToClients(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      socket.on('close', () => {
        // ソケット終了時にタイマーをクリア
        if (socket.resetTimer) {
          clearTimeout(socket.resetTimer);
          socket.resetTimer = null;
        }
        removeClient(socket);
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        // エラー時にもタイマーをクリア
        if (socket.resetTimer) {
          clearTimeout(socket.resetTimer);
          socket.resetTimer = null;
        }
        removeClient(socket);
      });
    });
  });
}

function getConnectedClientsCount() {
  return clients.size;
}

// メッセージ処理関数
function handleMessage(data) {
  switch (data.type) {
    case 'gacha-result':
      // ガチャ結果を保存（overlay演出開始時）
      if (data.data && data.data.result) {
        // 再ガチャの場合の処理
        if (data.data.isReGacha) {
          console.log('Re-gacha detected, preserving current state');
          // 再ガチャ用の一時状態を保存
          currentGachaState.reGachaResult = data.data.result;
          currentGachaState.reGachaPlayerNames = data.data.playerNames;
          currentGachaState.lastGachaId = data.data.gachaId;
          
          // 全体状態も保存（再ガチャ後の全プレイヤー状態）
          if (data.data.fullState) {
            currentGachaState.lastResult = data.data.fullState;
            currentGachaState.playerNames = [...data.data.fullState.playerNames];
            currentGachaState.playerCount = data.data.fullState.count;
            console.log('Full state saved:', data.data.fullState);
          }
        } else {
          // 通常のガチャ処理
          currentGachaState.lastResult = data.data.result;
          currentGachaState.lastGachaId = data.data.gachaId;
          if (data.data.playerNames) {
            currentGachaState.playerNames = [...data.data.playerNames];
            currentGachaState.playerCount = data.data.playerNames.length;
          }
        }
        currentGachaState.isOverlayCompleted = false; // overlay演出中
        console.log('Gacha state saved:', currentGachaState);
      }
      break;
      
    case 'overlay-animation-completed':
      // overlay演出完了時の処理
      if (data.data && data.data.gachaId === currentGachaState.lastGachaId) {
        currentGachaState.isOverlayCompleted = true;
        // overlay演出完了時はローディング状態も終了
        currentGachaState.isSpinning = false;
        currentGachaState.isLoadingGacha = false;
        
        // ガチャタイムアウトをクリア
        if (currentGachaState.gachaTimeoutId) {
          clearTimeout(currentGachaState.gachaTimeoutId);
          currentGachaState.gachaTimeoutId = null;
          console.log('🕰️ [GACHA TIMEOUT] Timeout cleared - gacha completed successfully');
        }
        
        console.log('Overlay animation completed, isSpinning and isLoadingGacha set to false, triggering widget update');
        
        // 再ガチャの場合の処理
        if (currentGachaState.reGachaResult) {
          console.log('Processing re-gacha completion');
          
          // Dashboard側から受信したプレイヤー名を使用
          const allPlayerNames = currentGachaState.playerNames.slice(0, currentGachaState.playerCount);
          const allWeapons = currentGachaState.lastResult ? 
            [...currentGachaState.lastResult.weapons] : 
            new Array(currentGachaState.playerCount).fill(null);
          
          console.log('Re-gacha state before update:');
          console.log('- All player names:', allPlayerNames);
          console.log('- Current weapons:', allWeapons);
          console.log('- Re-gacha player names:', currentGachaState.reGachaPlayerNames);
          console.log('- Re-gacha weapons:', currentGachaState.reGachaResult.weapons);
          
          // Dashboard側から全プレイヤーの最新状態を受信することを期待
          // 再ガチャ後はDashboard側で全プレイヤーの状態を送信するため、
          // サーバー側では受信したデータをそのまま使用
          
          // 再ガチャ用の一時データをクリア
          currentGachaState.reGachaResult = null;
          currentGachaState.reGachaPlayerNames = null;
        }
        
        // widgetに更新指示を送信（通常ガチャまたは再ガチャ後の全体状態）
        if (currentGachaState.lastResult) {
          broadcastToClients({
            type: 'widget-update',
            data: {
              result: currentGachaState.lastResult,
              playerNames: currentGachaState.playerNames.slice(0, currentGachaState.playerCount),
              gachaId: currentGachaState.lastGachaId
            }
          });
        }
      } else {
        // gachaIdが一致しない場合でも、ローディング状態は終了させる
        currentGachaState.isSpinning = false;
        currentGachaState.isLoadingGacha = false;
        console.log('Overlay animation completed (gachaId mismatch), isSpinning and isLoadingGacha set to false');
      }
      break;
      
    case 'player-names-changed':
      // プレイヤー名変更
      if (data.data) {
        if (data.data.playerNames) {
          currentGachaState.playerNames = [...data.data.playerNames];
        }
        if (data.data.playerCount) {
          currentGachaState.playerCount = data.data.playerCount;
        }
        console.log('Player names updated:', currentGachaState.playerNames);
      }
      break;
      
    case 'player-count-changed':
      // プレイヤー数変更
      if (data.data) {
        if (data.data.playerCount) {
          currentGachaState.playerCount = data.data.playerCount;
        }
        if (data.data.playerNames) {
          currentGachaState.playerNames = [...data.data.playerNames];
        }
        console.log('Player count updated:', currentGachaState.playerCount);
      }
      break;
      
    case 'player-selection-changed':
      // プレイヤー選択状態の変更
      if (data.data) {
        if (data.data.playerSelection) {
          currentGachaState.playerSelection = [...data.data.playerSelection];
        }
        console.log('Player selection updated:', currentGachaState.playerSelection);
      }
      break;
      
    case 'gacha-started':
      // ガチャ開始状態を記録
      if (data.data) {
        currentGachaState.isSpinning = true;
        currentGachaState.isLoadingGacha = true;
        currentGachaState.gachaStartedAt = Date.now();
        
        // 既存のタイムアウトをクリア
        if (currentGachaState.gachaTimeoutId) {
          clearTimeout(currentGachaState.gachaTimeoutId);
        }
        
        // 20秒後にタイムアウト処理
        currentGachaState.gachaTimeoutId = setTimeout(() => {
          if (currentGachaState.isSpinning) {
            console.log('🚨 [GACHA TIMEOUT] Gacha timeout after 20 seconds');
            handleGachaFailure('timeout');
          }
        }, 20000);
        
        console.log('Gacha started, isSpinning and isLoadingGacha set to true, timeout set for 20s');
      }
      break;
      
    case 'dashboard-state-request':
      // この処理は個別のソケット処理で行われるため、ここでは何もしない
      break;
      
    case 'viewer-state-request':
      // Viewer状態復元要求への応答（要求元のソケットのみに送信）
      console.log('Viewer state request received');
      // この処理は個別のソケットに送信する必要があるため、ここでは処理しない
      // handleMessage関数の呼び出し元で処理する
      break;
      
    case 'viewer-config-update':
      // 視聴者画面制御設定の更新
      if (data.data) {
        if (data.data.viewerEnabled !== undefined) {
          currentGachaState.viewerConfig.viewerEnabled = data.data.viewerEnabled;
        }
        if (data.data.allowedGachaModes) {
          currentGachaState.viewerConfig.allowedGachaModes = [...data.data.allowedGachaModes];
        }
        console.log('Viewer config updated:', currentGachaState.viewerConfig);
      }
      break;
      
    case 'widget-config-update':
      // ウィジェット制御設定の更新
      if (data.data) {
        if (data.data.widgetEnabled !== undefined) {
          currentGachaState.widgetConfig.widgetEnabled = data.data.widgetEnabled;
        }
        console.log('Widget config updated:', currentGachaState.widgetConfig);
      }
      break;
  }
}

// 現在の状態を取得する関数（API用）
function getCurrentGachaState() {
  return { ...currentGachaState };
}

// 状態をリセットする関数（一時的な状態のみリセット、設定と基本情報は保持）
function resetGachaState() {
  console.log('🔍 [RESET DEBUG] Resetting temporary gacha state only');
  console.log('🔍 [RESET DEBUG] Preserving:', {
    playerCount: currentGachaState.playerCount,
    playerNames: currentGachaState.playerNames,
    viewerConfig: currentGachaState.viewerConfig,
    widgetConfig: currentGachaState.widgetConfig
  });
  
  // 一時的な状態のみリセット（設定と基本情報は保持）
  currentGachaState.lastResult = null;
  currentGachaState.lastGachaId = null;
  currentGachaState.isOverlayCompleted = false;
  currentGachaState.isSpinning = false;
  currentGachaState.isLoadingGacha = false;
  currentGachaState.playerSelection = [];
  
  console.log('🔍 [RESET DEBUG] Reset completed, current state:', {
    playerCount: currentGachaState.playerCount,
    playerNames: currentGachaState.playerNames,
    hasLastResult: !!currentGachaState.lastResult,
    viewerEnabled: currentGachaState.viewerConfig.viewerEnabled,
    widgetEnabled: currentGachaState.widgetConfig.widgetEnabled
  });
}

// 完全リセット関数（初期化時のみ使用）
function resetGachaStateCompletely() {
  console.log('🔍 [RESET DEBUG] Performing complete state reset');
  currentGachaState = {
    lastResult: null,
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    playerCount: 1,
    lastGachaId: null,
    isOverlayCompleted: false,
    isSpinning: false,
    isLoadingGacha: false,
    playerSelection: [],
    viewerConfig: {
      viewerEnabled: false,
      allowedGachaModes: []
    },
    widgetConfig: {
      widgetEnabled: true
    }
  };
}

module.exports = {
  setupWebSocket,
  broadcastToClients,
  getConnectedClientsCount,
  getCurrentGachaState,
  resetGachaState,
  resetGachaStateCompletely,
  initializeGachaState
};