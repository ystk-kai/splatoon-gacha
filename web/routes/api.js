const configService = require('../services/config');
const weaponsService = require('../services/weapons');
const { broadcastToClients, getConnectedClientsCount, getCurrentGachaState, resetGachaState } = require('../services/websocket');
const tunnelManager = require('../services/tunnel-manager');

function setupApiRoutes(fastify) {
  // 武器データAPIエンドポイント
  fastify.get('/api/weapons', async (request, reply) => {
    return weaponsService.getWeaponsData();
  });

  // 視聴者設定取得APIエンドポイント
  fastify.get('/api/viewer-config', async (request, reply) => {
    return configService.getViewerConfig();
  });

  // 視聴者設定更新APIエンドポイント
  fastify.post('/api/viewer-config', async (request, reply) => {
    try {
      const config = configService.updateViewerConfig(request.body);
      
      console.log('Viewer config updated:', config);
      
      // WebSocket で設定変更をブロードキャスト
      broadcastToClients({
        type: 'viewer-config-changed',
        data: config,
        timestamp: Date.now(),
      });
      
      return { success: true, config: config };
    } catch (error) {
      console.error('Error updating viewer config:', error);
      return { success: false, error: error.message };
    }
  });

  // ウィジェット設定取得APIエンドポイント
  fastify.get('/api/widget-config', async (request, reply) => {
    return configService.getWidgetConfig();
  });

  // ウィジェット設定更新APIエンドポイント
  fastify.post('/api/widget-config', async (request, reply) => {
    try {
      const config = configService.updateWidgetConfig(request.body);
      
      console.log('Widget config updated:', config);
      
      // WebSocket で設定変更をブロードキャスト
      broadcastToClients({
        type: 'widget-config-changed',
        data: config,
        timestamp: Date.now(),
      });
      
      return { success: true, config: config };
    } catch (error) {
      console.error('Error updating widget config:', error);
      return { success: false, error: error.message };
    }
  });

  // オーバーレイ設定取得APIエンドポイント
  fastify.get('/api/overlay-config', async (request, reply) => {
    return configService.getOverlayConfig();
  });

  // オーバーレイ設定更新APIエンドポイント
  fastify.post('/api/overlay-config', async (request, reply) => {
    try {
      const config = configService.updateOverlayConfig(request.body);
      
      console.log('Overlay config updated:', config);
      
      // WebSocket で設定変更をブロードキャスト
      broadcastToClients({
        type: 'overlay-config-changed',
        data: config,
        timestamp: Date.now(),
      });
      
      return { success: true, config: config };
    } catch (error) {
      console.error('Error updating overlay config:', error);
      return { success: false, error: error.message };
    }
  });

  // ダッシュボード人数設定更新APIエンドポイント
  fastify.post('/api/dashboard-player-count', async (request, reply) => {
    try {
      const { playerCount } = request.body;
      const count = configService.updateDashboardPlayerCount(playerCount);
      
      console.log('Dashboard player count updated:', count);
      
      // WebSocket で人数変更をブロードキャスト
      broadcastToClients({
        type: 'dashboard-player-count-changed',
        data: { playerCount: count },
        timestamp: Date.now(),
      });
      
      return { success: true, playerCount: count };
    } catch (error) {
      console.error('Error updating dashboard player count:', error);
      return { success: false, error: error.message };
    }
  });

  // ランダム武器選択APIエンドポイント
  fastify.get('/api/random-weapon', async (request, reply) => {
    const weaponsData = weaponsService.getWeaponsData();
    
    if (!weaponsData || weaponsData.weapons.length === 0) {
      return { error: 'No weapons data available' };
    }
    
    const { type, filter, count, viewer = false, allowDuplicates = false } = request.query;
    let playerCount = Math.min(Math.max(parseInt(count) || 1, 1), 4); // 1-4に制限
    const allowDuplicatesFlag = allowDuplicates === 'true' || allowDuplicates === true;
    
    let availableWeapons;
    
    // 視聴者からのリクエストの場合、ガチャモード制御に基づいてチェック
    if (viewer) {
      const viewerConfig = configService.getViewerConfig();
      
      if (!viewerConfig.enabled) {
        return { error: 'Viewer access is disabled' };
      }
      
      // 視聴者の場合はダッシュボードの人数設定を使用
      const dashboardPlayerCount = configService.getDashboardPlayerCount();
      playerCount = Math.min(Math.max(dashboardPlayerCount || 1, 1), 4);
      
      // リクエストされたガチャモードが許可されているかチェック
      const requestedMode = type || 'weapon';
      if (!viewerConfig.allowedGachaModes.includes(requestedMode)) {
        return { error: `Gacha mode '${requestedMode}' is not allowed for viewers` };
      }
      
      // 許可されたモードの場合は通常のガチャロジックを適用
      availableWeapons = weaponsData.weapons;
      
      // ガチャモードに応じてフィルタリング（通常のロジックと同じ）
      if (requestedMode === 'sub') {
        if (filter && filter !== 'random') {
          // フィルター値を日本語ラベルに変換
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
          const targetSubWeapon = subLabels[filter] || filter;
          availableWeapons = availableWeapons.filter(w => w.subWeapon === targetSubWeapon);
        } else {
          const subWeapons = [...new Set(weaponsData.weapons.map(w => w.subWeapon))];
          const randomSub = subWeapons[Math.floor(Math.random() * subWeapons.length)];
          availableWeapons = availableWeapons.filter(w => w.subWeapon === randomSub);
        }
      } else if (requestedMode === 'special') {
        if (filter && filter !== 'random') {
          // フィルター値を日本語ラベルに変換
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
            kraken_royale: 'テイオウイカ',
          };
          const targetSpecialWeapon = specialLabels[filter] || filter;
          availableWeapons = availableWeapons.filter(w => w.specialWeapon === targetSpecialWeapon);
        } else {
          const specialWeapons = [...new Set(weaponsData.weapons.map(w => w.specialWeapon))];
          const randomSpecial = specialWeapons[Math.floor(Math.random() * specialWeapons.length)];
          availableWeapons = availableWeapons.filter(w => w.specialWeapon === randomSpecial);
        }
      } else if (requestedMode === 'weapon-type') {
        if (filter) {
          // 武器種別は英語で保存されているので直接使用
          availableWeapons = availableWeapons.filter(w => w.type === filter);
        } else {
          // フィルターがない場合はランダムな武器タイプを選択
          const weaponTypes = [...new Set(weaponsData.weapons.map(w => w.type))];
          const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
          availableWeapons = availableWeapons.filter(w => w.type === randomType);
        }
      }
      // 'weapon'モードの場合はすべての武器から選択（フィルタリングなし）
      
      if (availableWeapons.length === 0) {
        return { error: 'No weapons available for the selected mode' };
      }
      
      const selectedWeapons = weaponsService.getRandomWeapons(availableWeapons, playerCount, allowDuplicatesFlag);
      
      return {
        weapons: selectedWeapons,
        mode: 'viewer',
        requestedMode: requestedMode,
        playerCount: playerCount
      };
    }
    
    // カスタムモード: ランダムに組み合わせ
    if (type === 'custom') {
      const mainWeapons = weaponsService.getRandomWeapons(weaponsData.weapons, playerCount, allowDuplicatesFlag);
      const subWeapons = [...new Set(weaponsData.weapons.map(w => w.subWeapon))];
      const specialWeapons = [...new Set(weaponsData.weapons.map(w => w.specialWeapon))];
      
      const customWeapons = mainWeapons.map((weapon, index) => ({
        ...weapon,
        name: `カスタム武器 ${index + 1}`,
        subWeapon: subWeapons[Math.floor(Math.random() * subWeapons.length)],
        specialWeapon: specialWeapons[Math.floor(Math.random() * specialWeapons.length)],
        specialPoints: 180 + Math.floor(Math.random() * 40) - 20, // 160-200
        isCustom: true
      }));
      
      return {
        weapons: customWeapons,
        mode: 'custom',
        playerCount: playerCount
      };
    }
    
    // サブウェポンによるフィルタリング
    if (type === 'sub') {
      if (filter && filter !== 'random') {
        // フィルター値を日本語ラベルに変換（viewerと同じ処理）
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
        const targetSubWeapon = subLabels[filter] || filter;
        availableWeapons = weaponsData.weapons.filter(w => w.subWeapon === targetSubWeapon);
        if (availableWeapons.length === 0) {
          return { error: 'No weapons found with the specified sub weapon' };
        }
      } else {
        const subWeapons = [...new Set(weaponsData.weapons.map(w => w.subWeapon))];
        const randomSub = subWeapons[Math.floor(Math.random() * subWeapons.length)];
        availableWeapons = weaponsData.weapons.filter(w => w.subWeapon === randomSub);
      }
    }
    // スペシャルウェポンによるフィルタリング
    else if (type === 'special') {
      if (filter && filter !== 'random') {
        // フィルター値を日本語ラベルに変換（viewerと同じ処理）
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
          kraken_royale: 'テイオウイカ',
        };
        const targetSpecialWeapon = specialLabels[filter] || filter;
        availableWeapons = weaponsData.weapons.filter(w => w.specialWeapon === targetSpecialWeapon);
        if (availableWeapons.length === 0) {
          return { error: 'No weapons found with the specified special weapon' };
        }
      } else {
        const specialWeapons = [...new Set(weaponsData.weapons.map(w => w.specialWeapon))];
        const randomSpecial = specialWeapons[Math.floor(Math.random() * specialWeapons.length)];
        availableWeapons = weaponsData.weapons.filter(w => w.specialWeapon === randomSpecial);
      }
    }
    // 武器タイプによるフィルタリング
    else if (type === 'weapon-type' && filter) {
      availableWeapons = weaponsData.weapons.filter(w => w.type === filter);
      if (availableWeapons.length === 0) {
        return { error: 'No weapons found for the specified type' };
      }
    }
    // 複数の武器タイプによるフィルタリング
    else if (type === 'weapon-types' && filter) {
      const types = filter.split(',');
      availableWeapons = weaponsData.weapons.filter(w => types.includes(w.type));
      if (availableWeapons.length === 0) {
        return { error: 'No weapons found for the specified types' };
      }
    }
    // デフォルト: 全武器から選択
    else {
      availableWeapons = weaponsData.weapons;
    }
    
    // selectedWeapons パラメータによる追加フィルタリング
    const selectedWeaponsParam = request.query.selectedWeapons;
    if (selectedWeaponsParam) {
      const selectedWeaponIds = selectedWeaponsParam.split(',').map(id => id.trim());
      availableWeapons = availableWeapons.filter(weapon => selectedWeaponIds.includes(weapon.id));
      
      if (availableWeapons.length === 0) {
        return { error: 'No weapons found matching the selected weapons' };
      }
    }
    
    const selectedWeapons = weaponsService.getRandomWeapons(availableWeapons, playerCount, allowDuplicatesFlag);
    
    return {
      weapons: selectedWeapons,
      mode: type || 'default',
      filter: filter || null,
      playerCount: playerCount
    };
  });

  // ガチャ結果を受信するHTTPエンドポイント（Tauri アプリから呼び出される）
  fastify.post('/gacha-result', async (request, reply) => {
    try {
      const gachaResult = request.body;
      console.log('Received gacha result:', gachaResult);

      // WebSocket クライアントにブロードキャスト
      broadcastToClients({
        type: 'gacha-result',
        data: gachaResult,
        timestamp: Date.now(),
      });

      return { success: true, message: 'Result broadcasted' };
    } catch (error) {
      console.error('Error processing gacha result:', error);
      return { success: false, error: error.message };
    }
  });

  // 現在のガチャ状態を取得
  fastify.get('/api/gacha-state', async (request, reply) => {
    return {
      success: true,
      state: getCurrentGachaState(),
      timestamp: Date.now(),
    };
  });
  
  // ガチャ状態をリセット
  fastify.post('/api/gacha-state/reset', async (request, reply) => {
    try {
      resetGachaState();
      
      // 全クライアントに状態リセットを通知
      broadcastToClients({
        type: 'gacha-state-reset',
        timestamp: Date.now(),
      });
      
      return { success: true, message: 'Gacha state reset' };
    } catch (error) {
      console.error('Error resetting gacha state:', error);
      return { success: false, error: error.message };
    }
  });

  // サーバーヘルスチェック
  fastify.get('/health', async (request, reply) => {
    const weaponsData = weaponsService.getWeaponsData();
    return {
      status: 'ok',
      connectedClients: getConnectedClientsCount(),
      weaponsCount: weaponsData ? weaponsData.weapons.length : 0,
      timestamp: Date.now(),
    };
  });

  // トンネルステータス取得APIエンドポイント
  fastify.get('/api/tunnel/status', async (request, reply) => {
    return tunnelManager.getStatus();
  });

  // 利用可能なトンネルサービス一覧取得
  fastify.get('/api/tunnel/services', async (request, reply) => {
    return {
      services: tunnelManager.getAvailableServices(),
      current: tunnelManager.serviceType
    };
  });

  // トンネルサービス設定
  fastify.post('/api/tunnel/service', async (request, reply) => {
    try {
      const { serviceType } = request.body || {};
      if (!serviceType) {
        return { success: false, error: 'serviceType is required' };
      }
      
      tunnelManager.setServiceType(serviceType);
      return { success: true, serviceType: tunnelManager.serviceType };
    } catch (error) {
      console.error('Error setting tunnel service:', error);
      return { success: false, error: error.message };
    }
  });

  // トンネル開始APIエンドポイント
  fastify.post('/api/tunnel/start', async (request, reply) => {
    try {
      const { port = 3000 } = request.body || {};
      const result = await tunnelManager.start(port);
      
      // WebSocket で接続状態をブロードキャスト
      broadcastToClients({
        type: 'tunnel-connected',
        data: { 
          url: result.url, 
          authInfo: result.authInfo,
          serviceType: result.serviceType,
          status: 'connected' 
        },
        timestamp: Date.now(),
      });
      
      return { 
        success: true, 
        url: result.url, 
        authInfo: result.authInfo,
        serviceType: result.serviceType,
        status: 'connected' 
      };
    } catch (error) {
      console.error('Error starting tunnel:', error);
      return { success: false, error: error.message, status: 'error' };
    }
  });

  // トンネル停止APIエンドポイント
  fastify.post('/api/tunnel/stop', async (request, reply) => {
    try {
      await tunnelManager.stop();
      
      // WebSocket で切断状態をブロードキャスト
      broadcastToClients({
        type: 'tunnel-disconnected',
        data: { status: 'disconnected' },
        timestamp: Date.now(),
      });
      
      return { success: true, status: 'disconnected' };
    } catch (error) {
      console.error('Error stopping tunnel:', error);
      return { success: false, error: error.message };
    }
  });

  // トンネル再接続APIエンドポイント
  fastify.post('/api/tunnel/restart', async (request, reply) => {
    try {
      const { port = 3000 } = request.body || {};
      const result = await tunnelManager.restart(port);
      
      // WebSocket で再接続状態をブロードキャスト
      broadcastToClients({
        type: 'tunnel-reconnected',
        data: { 
          url: result.url, 
          authInfo: result.authInfo,
          serviceType: result.serviceType,
          status: 'connected' 
        },
        timestamp: Date.now(),
      });
      
      return { 
        success: true, 
        url: result.url, 
        authInfo: result.authInfo,
        serviceType: result.serviceType,
        status: 'connected' 
      };
    } catch (error) {
      console.error('Error restarting tunnel:', error);
      return { success: false, error: error.message, status: 'error' };
    }
  });

  // クライアント側の設定をサーバー側に同期するAPIエンドポイント
  fastify.post('/api/sync-config', async (request, reply) => {
    try {
      const { 
        viewerEnabled, 
        allowedGachaModes, 
        widgetEnabled, 
        skipGachaAnimation,
        playerCount 
      } = request.body;
      
      console.log('Syncing client config to server:', request.body);
      
      // 各設定をサーバー側に反映
      if (typeof viewerEnabled === 'boolean' || Array.isArray(allowedGachaModes)) {
        configService.updateViewerConfig({
          enabled: viewerEnabled,
          allowedGachaModes: allowedGachaModes
        });
      }
      
      if (typeof widgetEnabled === 'boolean') {
        configService.updateWidgetConfig({
          enabled: widgetEnabled
        });
      }
      
      if (typeof skipGachaAnimation === 'boolean') {
        configService.updateOverlayConfig({
          skipAnimation: skipGachaAnimation
        });
      }
      
      if (typeof playerCount === 'number') {
        configService.updateDashboardPlayerCount(playerCount);
      }
      
      return { success: true, message: 'Config synchronized' };
    } catch (error) {
      console.error('Error syncing config:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = setupApiRoutes;