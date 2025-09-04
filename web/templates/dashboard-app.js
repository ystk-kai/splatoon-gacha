const { useState, useEffect } = React;

const ControlApp = () => {
  const [currentWeapon, setCurrentWeapon] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ws, setWs] = useState(null);
  const [gachaMode, setGachaMode] = useState('weapon');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('shooter');
  const [subWeaponFilter, setSubWeaponFilter] = useState('splat_bomb');
  const [specialWeaponFilter, setSpecialWeaponFilter] = useState('trizooka');
  
  // 対象武器選択機能の状態
  const [selectedWeapons, setSelectedWeapons] = useState([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [showWeaponList, setShowWeaponList] = useState(false);
  const [weaponsData, setWeaponsData] = useState(null);
  
  // トンネル管理機能の状態
  const [tunnelStatus, setTunnelStatus] = useState('disconnected');
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [tunnelAuthInfo, setTunnelAuthInfo] = useState(null);
  const [tunnelServiceType, setTunnelServiceType] = useState('localtunnel');
  const [availableServices, setAvailableServices] = useState([]);
  const [isConnectingTunnel, setIsConnectingTunnel] = useState(false);

  // 現在のガチャモードでの有効武器数を計算
  const getEffectiveWeaponCountForValidation = () => {
    if (!weaponsData?.weapons) return 0;
    
    if (gachaMode === 'weapon') {
      return selectedWeapons.length;
    } else {
      // サブ・スペシャル・武器種別モードでは、フィルタリングされた武器数を使用
      switch (gachaMode) {
        case 'sub':
          if (!subWeaponFilter) return weaponsData.weapons.length;
          const subWeaponLabels = {
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
            angle_shooter: 'ラインマーカー'
          };
          const subLabel = subWeaponLabels[subWeaponFilter] || subWeaponFilter;
          return weaponsData.weapons.filter(weapon => weapon.subWeapon === subLabel).length;
        case 'special':
          if (!specialWeaponFilter) return weaponsData.weapons.length;
          const specialWeaponLabels = {
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
            kraken_royale: 'テイオウイカ'
          };
          const specialLabel = specialWeaponLabels[specialWeaponFilter] || specialWeaponFilter;
          return weaponsData.weapons.filter(weapon => weapon.specialWeapon === specialLabel).length;
        case 'weapon-type':
          return weaponTypeFilter ? weaponsData.weapons.filter(weapon => weapon.type === weaponTypeFilter).length : weaponsData.weapons.length;
        default:
          return weaponsData.weapons.length;
      }
    }
  };

  // Helper functions with fallback for WeaponUtils
  const getLocalSpecialWeaponLabel = (special) => {
    const labels = {
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
    return labels[special] || special;
  };

  const getLocalSubWeaponLabel = (sub) => {
    const labels = {
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
    return labels[sub] || sub;
  };

  const getLocalWeaponTypeLabel = (type) => {
    const labels = {
      shooter: 'シューター',
      roller: 'ローラー',
      charger: 'チャージャー',
      slosher: 'スロッシャー',
      splatling: 'スピナー',
      dualies: 'マニューバー',
      brella: 'シェルター',
      blaster: 'ブラスター',
      brush: 'フデ',
      stringer: 'ストリンガー',
      splatana: 'ワイパー',
    };
    return labels[type] || type;
  };

  // Safe wrapper functions that use WeaponUtils if available, otherwise fallback
  const safeGetSpecialWeaponLabel = (special) => {
    return window.WeaponUtils?.getSpecialWeaponLabel ? 
      safeGetSpecialWeaponLabel(special) : 
      getLocalSpecialWeaponLabel(special);
  };

  const safeGetSubWeaponLabel = (sub) => {
    return window.WeaponUtils?.getSubWeaponLabel ? 
      safeGetSubWeaponLabel(sub) : 
      getLocalSubWeaponLabel(sub);
  };

  const safeGetWeaponTypeLabel = (type) => {
    return window.WeaponUtils?.getWeaponTypeLabel ? 
      window.WeaponUtils.getWeaponTypeLabel(type) : 
      getLocalWeaponTypeLabel(type);
  };

  // ガチャモードに応じた武器フィルタリング関数
  const getFilteredWeapons = (weapons) => {
    if (!weapons) return [];
    
    switch (gachaMode) {
      case 'sub':
        return weapons.filter(weapon => weapon.subWeapon === safeGetSubWeaponLabel(subWeaponFilter));
      case 'special':
        return weapons.filter(weapon => weapon.specialWeapon === safeGetSpecialWeaponLabel(specialWeaponFilter));
      case 'weapon-type':
        return weapons.filter(weapon => weapon.type === weaponTypeFilter);
      case 'weapon':
        if (selectedWeapons.length > 0) {
          return weapons.filter(weapon => selectedWeapons.includes(weapon.id));
        }
        return weapons;
      default:
        return weapons;
    }
  };

  // 武器一覧モーダル専用のフィルタリング関数（選択状態に関係なくすべての武器を表示）
  const getFilteredWeaponsForModal = (weapons) => {
    if (!weapons) return [];
    
    switch (gachaMode) {
      case 'sub':
        return weapons.filter(weapon => weapon.subWeapon === safeGetSubWeaponLabel(subWeaponFilter));
      case 'special':
        return weapons.filter(weapon => weapon.specialWeapon === safeGetSpecialWeaponLabel(specialWeaponFilter));
      case 'weapon-type':
        return weapons.filter(weapon => weapon.type === weaponTypeFilter);
      case 'weapon':
        return weapons; // 武器モードでは全ての武器を表示
      default:
        return weapons;
    }
  };

  // サブウェポンID変換関数（名前 -> ID）
  const getSubWeaponId = (sub) => {
    if (!weaponsData?.subWeapons) return sub;
    const weapon = weaponsData.subWeapons.find(w => w.name === sub);
    return weapon ? weapon.id : sub.replace(/\s+/g, '_').toLowerCase();
  };

  // スペシャルウェポンID変換関数（名前 -> ID）
  const getSpecialWeaponId = (special) => {
    if (!weaponsData?.specialWeapons) return special;
    const weapon = weaponsData.specialWeapons.find(w => w.name === special);
    return weapon ? weapon.id : special.replace(/\s+/g, '_').toLowerCase();
  };

  // 実際に選択されている武器数を計算（モード別）
  const getSelectedWeaponCount = () => {
    if (!weaponsData?.weapons) return 0;
    
    if (gachaMode === 'weapon') {
      return selectedWeapons.length;
    } else {
      // サブ・スペシャル・武器種別モードの場合：
      // 1. まずモードによるフィルタリングを適用
      const filteredWeapons = getFilteredWeapons(weaponsData.weapons);
      // 2. 選択された武器が存在する場合、さらにそれでフィルタリング
      if (selectedWeapons.length > 0) {
        const count = filteredWeapons.filter(weapon => selectedWeapons.includes(weapon.id)).length;
        console.log(`Selected weapon count - Mode: ${gachaMode}, Selected: ${selectedWeapons.length}, Filtered: ${filteredWeapons.length}, Result: ${count}`);
        return count;
      } else {
        // 選択武器がない場合は0を返す（武器不足として扱う）
        console.log(`Selected weapon count - Mode: ${gachaMode}, No selection, returning 0`);
        return 0;
      }
    }
  };;
  
  // localStorageから保存された設定を読み込み
  const loadSavedConfig = () => {
    try {
      const savedNames = localStorage.getItem('playerNames');
      const savedPlayerCount = localStorage.getItem('playerCount');
      const savedViewerEnabled = localStorage.getItem('viewerEnabled');
      const savedWidgetEnabled = localStorage.getItem('widgetEnabled');
      const savedAllowedGachaModes = localStorage.getItem('allowedGachaModes');
      const savedSelectedWeapons = localStorage.getItem('selectedWeapons');
      const savedAllowDuplicates = localStorage.getItem('allowDuplicates');
      const savedSkipGachaAnimation = localStorage.getItem('skipGachaAnimation');
      
      return {
        playerNames: savedNames ? JSON.parse(savedNames) : ['', '', '', ''],
        playerCount: savedPlayerCount ? parseInt(savedPlayerCount) : 1,
        viewerEnabled: savedViewerEnabled ? JSON.parse(savedViewerEnabled) : false,
        widgetEnabled: savedWidgetEnabled ? JSON.parse(savedWidgetEnabled) : true,
        allowedGachaModes: savedAllowedGachaModes ? JSON.parse(savedAllowedGachaModes) : [],
        selectedWeapons: savedSelectedWeapons ? JSON.parse(savedSelectedWeapons) : [],
        allowDuplicates: savedAllowDuplicates ? JSON.parse(savedAllowDuplicates) : false,
        skipGachaAnimation: savedSkipGachaAnimation ? JSON.parse(savedSkipGachaAnimation) : false
      };
    } catch (error) {
      console.error('Error loading saved config:', error);
      return {
        playerNames: ['', '', '', ''],
        playerCount: 1,
        viewerEnabled: false,
        widgetEnabled: true,
        allowedGachaModes: [],
        selectedWeapons: [],
        allowDuplicates: false,
        skipGachaAnimation: false
      };
    }
  };
  
  // localStorageへの設定保存関数
  const saveConfigToLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`Saved to localStorage - ${key}:`, value);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  // サーバー側に設定を同期する関数
  const syncConfigToServer = async (config) => {
    try {
      console.log('🔄 Dashboard: Syncing config to server...', config);
      
      const response = await fetch('/api/sync-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          viewerEnabled: config.viewerEnabled,
          allowedGachaModes: config.allowedGachaModes,
          widgetEnabled: config.widgetEnabled,
          skipGachaAnimation: config.skipGachaAnimation,
          playerCount: config.playerCount
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Dashboard: Config synchronized to server successfully');
        return { success: true };
      } else {
        console.error('❌ Dashboard: Failed to sync config to server:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Dashboard: Error syncing config to server:', error);
      return { success: false, error: error.message };
    }
  };;
  
  // localStorageからのフォールバック復元関数
  const restoreFromLocalStorage = () => {
    console.log('Dashboard: Performing localStorage fallback restoration');
    const config = loadSavedConfig();
    
    // localStorageからの復元を実行
    setPlayerCount(config.playerCount);
    setPlayerNames(config.playerNames);
    setViewerEnabled(config.viewerEnabled);
    setWidgetEnabled(config.widgetEnabled);
    setAllowedGachaModes(config.allowedGachaModes);
    
    // 武器選択と重複許可設定も復元
    if (config.selectedWeapons.length > 0) {
      setSelectedWeapons(config.selectedWeapons);
    }
    setAllowDuplicates(config.allowDuplicates);
    
    console.log('Dashboard: localStorage fallback restoration completed:', config);
  };

  // すべての初期化処理を完了する関数
  const completeInitialization = async () => {
    try {
      console.log('Dashboard: Starting complete initialization...');
      
      // localStorageから設定を取得
      const config = loadSavedConfig();
      console.log('🔄 Dashboard: Loaded config from localStorage:', config);
      
      // サーバー側に設定を同期（重要：API設定取得前に実行）
      const syncResult = await syncConfigToServer(config);
      if (syncResult.success) {
        console.log('✅ Dashboard: Config sync completed successfully');
      } else {
        console.warn('⚠️ Dashboard: Config sync failed, but continuing initialization:', syncResult.error);
      }
      
      // 短い遅延を入れてサーバー側設定が更新されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // すべてのAPI設定を並行取得
      await Promise.all([
        fetchViewerConfig(),
        fetchWidgetConfig(),
        fetchOverlayConfig(),
        fetchTunnelStatus(),
        fetchAvailableServices()
      ]);
      
      console.log('✅ Dashboard: All API configs loaded successfully');
      
      // すべての初期化処理が完了したらローディング解除
      setIsRestoringState(false);
      console.log('✅ Dashboard: Complete initialization finished');
      
    } catch (error) {
      console.error('❌ Dashboard: Error during complete initialization:', error);
      // エラーが発生してもローディング解除
      setIsRestoringState(false);
    }
  };;
  
  // 保存された設定を読み込み
  const savedConfig = loadSavedConfig();
  const [playerCount, setPlayerCount] = useState(savedConfig.playerCount);
  const [playerNames, setPlayerNames] = useState(savedConfig.playerNames);

  // プレイヤー選択状態（再ガチャ用）
  const [playerSelection, setPlayerSelection] = useState([]);
  
  // オーバーレイ設定
  const [skipGachaAnimation, setSkipGachaAnimation] = useState(false);
  
  // ガチャ失敗メッセージ
  const [gachaFailureMessage, setGachaFailureMessage] = useState('');
  
  // 状態復元中のローディング表示
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  // プレイヤー選択の切り替え
  const togglePlayerSelection = (index) => {
    setPlayerSelection(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  // 全選択/全解除
  const toggleAllSelection = () => {
    const availablePlayerCount = currentWeapon?.weapons ? currentWeapon.weapons.length : 0;
    if (playerSelection.length === availablePlayerCount) {
      setPlayerSelection([]);
    } else {
      setPlayerSelection(Array.from({ length: availablePlayerCount }, (_, i) => i));
    }
  };
  
  // 再ガチャ実行
  const handleReGacha = async () => {
    if (isSpinning || playerSelection.length === 0 || !currentWeapon) return;
    
    setIsSpinning(true);
    setGachaFailureMessage(''); // Clear any previous failure messages
    
    // 再ガチャ開始をWebSocketで通知
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'gacha-started',
        data: {
          source: 'dashboard',
          isReGacha: true,
          selectedPlayers: playerSelection.length,
          selectedPlayerIndices: [...playerSelection], // 選択されたプレイヤーのインデックス配列を追加
          timestamp: Date.now()
        }
      }));
    }
    
    try {
      // APIエンドポイントのクエリパラメータを構築
      let url = '/api/random-weapon';
      const params = new URLSearchParams();
      
      if (gachaMode === 'sub') {
        params.append('type', 'sub');
        params.append('filter', subWeaponFilter);
      } else if (gachaMode === 'special') {
        params.append('type', 'special');
        params.append('filter', specialWeaponFilter);
      } else if (gachaMode === 'weapon-type') {
        params.append('type', 'weapon-type');
        params.append('filter', weaponTypeFilter);
      }
      // すべてのモードで選択された武器のフィルタリングを適用
      if (selectedWeapons.length > 0) {
        params.append('selectedWeapons', selectedWeapons.join(','));
      }
      
      // 重複許可パラメータを追加（自動制御を含む）
      params.append('allowDuplicates', effectiveAllowDuplicates.toString());
      
      // 人数パラメータを追加（選択されたプレイヤー数）
      params.append('count', playerSelection.length);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      // APIから武器をランダム選択
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error getting random weapon:', data.error);
        setIsSpinning(false);
        return;
      }
      
      // 高エントロピーなガチャIDを生成
      const gachaId = window.IdGenerator ? window.IdGenerator.generateGachaId() : `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      
      setTimeout(() => {
        // 新しい結果で選択されたプレイヤーのみを更新
        const updatedWeapons = [...currentWeapon.weapons];
        const newWeapons = data.weapons || [data.weapon];
        
        playerSelection.forEach((selectedIndex, dataIndex) => {
          if (dataIndex < newWeapons.length) {
            updatedWeapons[selectedIndex] = newWeapons[dataIndex];
          }
        });
        
        const updatedResult = {
          ...currentWeapon,
          weapons: updatedWeapons
        };
        
        setCurrentWeapon(updatedResult);
        
        // WebSocketでガチャ結果を送信（overlay演出開始）
        if (ws && ws.readyState === WebSocket.OPEN) {
          // 選択をクリアする前に選択情報を保存
          const selectedIndices = [...playerSelection];
          const allPlayerNames = playerNames.slice(0, updatedWeapons.length);
          
          console.log('=== DASHBOARD RE-GACHA DEBUG ===');
          console.log('Player selection state:', playerSelection);
          console.log('Selected player indices:', selectedIndices);
          console.log('Updated weapons array:', updatedWeapons);
          console.log('Updated weapons length:', updatedWeapons.length);
          console.log('All player names:', allPlayerNames);
          
          // データ検証
          if (selectedIndices.length === 0) {
            console.error('WARNING: No players selected for re-gacha!');
          }
          
          selectedIndices.forEach(index => {
            if (index >= updatedWeapons.length) {
              console.error(`WARNING: Selected index ${index} is out of bounds (weapons length: ${updatedWeapons.length})`);
            } else {
              console.log(`Index ${index} -> Weapon:`, updatedWeapons[index]);
            }
          });
          
          // 再ガチャ用に選択されたプレイヤーの武器とプレイヤー名のみを抽出
          const selectedWeapons = selectedIndices.map(index => updatedWeapons[index]);
          const selectedPlayerNames = selectedIndices.map(index => allPlayerNames[index]);
          
          console.log('Selected weapons for re-gacha:', selectedWeapons);
          console.log('Selected player names for re-gacha:', selectedPlayerNames);
          
          const reGachaResult = {
            weapons: selectedWeapons, // 選択された武器のみ送信
            count: selectedWeapons.length,
            isReGacha: true // 再ガチャフラグを追加
          };
          
          const messageData = {
            type: 'gacha-result',
            data: { 
              result: reGachaResult, 
              playerNames: selectedPlayerNames, // 選択されたプレイヤー名のみ送信
              isReGacha: true, // 再ガチャ判定フラグ
              gachaId: gachaId,
              overlayConfig: {
                skipAnimation: skipGachaAnimation
              },
              // 再ガチャ後の全体状態も送信
              fullState: {
                weapons: updatedWeapons,
                playerNames: allPlayerNames,
                count: updatedWeapons.length
              }
            }
          };
          
          console.log('Sending WebSocket message:', messageData);
          ws.send(JSON.stringify(messageData));
          
          // overlay演出完了後にsetIsSpinning(false)が実行される
          // 選択はクリアしておく
          setPlayerSelection([]);
        } else {
          // WebSocketが利用できない場合のフォールバック
          setIsSpinning(false);
          setPlayerSelection([]);
        }
      }, 2000);
    } catch (error) {
      console.error('Error fetching random weapon:', error);
      setIsSpinning(false);
    }
  };;

  // 視聴者画面制御用のstate（localStorage初期値）
  const [viewerEnabled, setViewerEnabled] = useState(savedConfig.viewerEnabled);
  const [allowedGachaModes, setAllowedGachaModes] = useState(savedConfig.allowedGachaModes);

  // ウィジェット制御用のstate（localStorage初期値）
  const [widgetEnabled, setWidgetEnabled] = useState(savedConfig.widgetEnabled);

  useEffect(() => {
    // WebSocket接続（動的にホストを決定）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnectionStatus('connected');
      
      // クライアントタイプを識別するメッセージを送信
      websocket.send(JSON.stringify({
        type: 'client-type',
        data: {
          clientType: 'dashboard',
          timestamp: Date.now()
        }
      }));
      
      console.log('🔍 [CLIENT DEBUG] WebSocket connected, current state:', {
        playerCount,
        playerNames,
        viewerEnabled,
        widgetEnabled,
        isSpinning,
        hasCurrentWeapon: !!currentWeapon
      });
      
      // 初回リロード検知を送信（サーバー側で初期化タイミングを管理するため）
      console.log('🔍 [CLIENT DEBUG] Sending dashboard-reload message');
      websocket.send(JSON.stringify({
        type: 'dashboard-reload',
        data: {
          source: 'dashboard-init',
          timestamp: Date.now()
        }
      }));
      
      // 状態復元要求を送信（クライアント側のlocalStorage状態を含める）
      console.log('🔍 [CLIENT DEBUG] Sending dashboard-state-request message with client state');
      const clientState = {
        playerCount,
        playerNames,
        viewerEnabled,
        widgetEnabled,
        allowedGachaModes,
        skipGachaAnimation,
        timestamp: Date.now()
      };
      console.log('🔍 [CLIENT DEBUG] Client state being sent:', clientState);
      
      websocket.send(JSON.stringify({
        type: 'dashboard-state-request',
        data: {
          clientState,
          timestamp: Date.now()
        }
      }));
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        
        // overlay演出完了通知を受信したらwidgetに反映＆ローディング状態を終了
        if (message.type === 'overlay-animation-completed' && message.data) {
          const { gachaId } = message.data;
          
          // ローディング状態を終了
          setIsSpinning(false);
          
          // ウィジェットには常に全プレイヤーの現在状態を送信
          if (currentWeapon && currentWeapon.weapons) {
            // 現在のプレイヤー数に基づいて全プレイヤーを送信
            const allWeapons = currentWeapon.weapons.slice(0, playerCount);
            const allPlayerNames = playerNames.slice(0, playerCount);
            
            console.log('=== DASHBOARD OVERLAY COMPLETION DEBUG ===');
            console.log('Sending full state to widget:');
            console.log('- All weapons:', allWeapons);
            console.log('- All player names:', allPlayerNames);
            console.log('- Player count:', playerCount);
            
            websocket.send(JSON.stringify({
              type: 'widget-update',
              data: { 
                result: {
                  weapons: allWeapons,
                  count: allWeapons.length
                }, 
                playerNames: allPlayerNames,
                gachaId: gachaId
              }
            }));
          }
        }
        
        // ガチャ開始通知を受信（他の画面からの通知）
        if (message.type === 'gacha-started' && message.data && message.data.source !== 'dashboard') {
          console.log('Gacha started from:', message.data.source);
          setIsSpinning(true);
          setGachaFailureMessage(''); // 失敗メッセージをクリア
        }
        
        // ガチャ失敗通知を受信
        if (message.type === 'gacha-failed' && message.data) {
          console.log('🚨 [GACHA FAILURE] Received gacha failure notification:', message.data);
          
          // ローディング状態を解除
          setIsSpinning(false);
        }
        
        // トンネル接続状態の更新
        if (message.type === 'tunnel-connected' && message.data) {
          setTunnelStatus('connected');
          setTunnelUrl(message.data.url);
          setTunnelAuthInfo(message.data.authInfo);
          setTunnelServiceType(message.data.serviceType);
          setIsConnectingTunnel(false);
        }
        
        if (message.type === 'tunnel-disconnected') {
          setTunnelStatus('disconnected');
          setTunnelUrl(null);
          setTunnelAuthInfo(null);
          setIsConnectingTunnel(false);
        }
        
        if (message.type === 'tunnel-reconnected' && message.data) {
          setTunnelStatus('connected');
          setTunnelUrl(message.data.url);
          setTunnelAuthInfo(message.data.authInfo);
          setTunnelServiceType(message.data.serviceType);
          setIsConnectingTunnel(false);
          
          // 失敗メッセージを表示
          setGachaFailureMessage(message.data.message || 'ガチャの処理に失敗しました。もう一度お試しください。');
          
          // 5秒後にメッセージを自動でクリア
          setTimeout(() => {
            setGachaFailureMessage('');
          }, 5000);
        }
        
        // Dashboard状態復元レスポンス
        if (message.type === 'dashboard-state-response' && message.data) {
          console.log('🔍 [CLIENT DEBUG] Dashboard state restoration response received');
          console.log('🔍 [CLIENT DEBUG] Current client state before restoration:', {
            playerCount,
            playerNames,
            viewerEnabled,
            widgetEnabled,
            isSpinning,
            hasCurrentWeapon: !!currentWeapon
          });
          console.log('🔍 [CLIENT DEBUG] Server state data:', message.data);
          
          // 現在の武器状態を復元
          if (message.data.currentWeapon) {
            setCurrentWeapon(message.data.currentWeapon);
            console.log('Dashboard: Current weapon restored');
          }
          
          // プレイヤー情報を復元
          if (message.data.playerNames) {
            setPlayerNames(message.data.playerNames);
            console.log('Dashboard: Player names restored');
          }
          if (message.data.playerCount !== undefined) {
            setPlayerCount(message.data.playerCount);
            console.log('Dashboard: Player count restored:', message.data.playerCount);
          }
          
          // ローディング状態を復元
          if (message.data.isSpinning !== undefined) {
            setIsSpinning(message.data.isSpinning);
            console.log('Dashboard: Loading state restored:', message.data.isSpinning);
          }
          
          // 視聴者画面制御設定を復元
          if (message.data.viewerConfig) {
            if (message.data.viewerConfig.viewerEnabled !== undefined) {
              setViewerEnabled(message.data.viewerConfig.viewerEnabled);
              console.log('Dashboard: Viewer enabled state restored:', message.data.viewerConfig.viewerEnabled);
            }
            if (message.data.viewerConfig.allowedGachaModes) {
              setAllowedGachaModes(message.data.viewerConfig.allowedGachaModes);
              console.log('Dashboard: Allowed gacha modes restored:', message.data.viewerConfig.allowedGachaModes);
            }
          }
          
          // ウィジェット制御設定を復元
          if (message.data.widgetConfig) {
            if (message.data.widgetConfig.widgetEnabled !== undefined) {
              setWidgetEnabled(message.data.widgetConfig.widgetEnabled);
              console.log('Dashboard: Widget enabled state restored:', message.data.widgetConfig.widgetEnabled);
            }
          }
          
          // プレイヤー選択状態を復元（再ガチャ用）
          if (message.data.playerSelection) {
            setPlayerSelection(message.data.playerSelection);
            console.log('Dashboard: Player selection restored:', message.data.playerSelection);
          }
          
          // WebSocket状態復元完了後、API設定も取得してから完全にローディングを解除
          console.log('Dashboard: WebSocket state restoration completed, now fetching API configs...');
          completeInitialization();
          
          // 状態復元完了後に初期化メッセージを送信
          setTimeout(() => {
            console.log('Dashboard: Sending initialization messages after state restoration');
            
            try {
              // 状態復元後は dashboard-reload を送信しない（意図しないリセットを防ぐ）
              // 代わりにプレイヤー情報のみを送信
              
              // 現在の名前とプレイヤー数を送信
              if (websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                  type: 'player-names-changed',
                  data: {
                    playerNames: playerNames.slice(0, playerCount),
                    playerCount: playerCount
                  }
                }));
              }
            } catch (error) {
              console.error('Dashboard: Error sending initialization messages:', error);
            }
          }, 100);
        }
        
        // ガチャ状態リセット通知を受信
        if (message.type === 'gacha-state-reset') {
          console.log('Gacha state reset notification received');
          // 現在の武器状態をクリア（必要に応じて）
          // setCurrentWeapon(null);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = () => {
      setConnectionStatus('disconnected');
      // WebSocket接続失敗時はlocalStorageから復元してから完全初期化
      if (isRestoringState) {
        restoreFromLocalStorage();
        completeInitialization();
      }
    };
    
    websocket.onerror = () => {
      setConnectionStatus('error');
      // WebSocketエラー時はlocalStorageから復元してから完全初期化
      if (isRestoringState) {
        restoreFromLocalStorage();
        completeInitialization();
      }
    };
    
    setWs(websocket);
    
    // 5秒後に状態復元がなければlocalStorageからフォールバック復元（タイムアウト処理）
    const restorationTimeout = setTimeout(() => {
      if (isRestoringState) {
        console.log('Dashboard: State restoration timeout, performing localStorage fallback');
        restoreFromLocalStorage();
        completeInitialization();
      }
    }, 5000);

    // 設定の取得はcompleteInitializationで行われるため、ここでは削除
    
    return () => {
      clearTimeout(restorationTimeout);
      websocket.close();
    };
  }, []);

  // 視聴者設定取得関数
  const fetchViewerConfig = async () => {
    try {
      const response = await fetch('/api/viewer-config');
      const config = await response.json();
      setViewerEnabled(config.enabled);
      setAllowedGachaModes(config.allowedGachaModes || []);
    } catch (error) {
      console.error('Failed to fetch viewer config:', error);
    }
  };

  // 視聴者設定更新関数
  const updateViewerConfig = async (updates) => {
    try {
      const response = await fetch('/api/viewer-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      
      if (result.success) {
        // 設定の更新が成功した場合、stateを更新
        if (updates.hasOwnProperty('enabled')) {
          setViewerEnabled(updates.enabled);
          saveConfigToLocalStorage('viewerEnabled', updates.enabled);
        }
        if (updates.hasOwnProperty('allowedGachaModes')) {
          setAllowedGachaModes(updates.allowedGachaModes);
          saveConfigToLocalStorage('allowedGachaModes', updates.allowedGachaModes);
        }
        
        // WebSocketで視聴者画面制御設定の変更を通知
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'viewer-config-update',
            data: {
              viewerEnabled: updates.hasOwnProperty('enabled') ? updates.enabled : viewerEnabled,
              allowedGachaModes: updates.hasOwnProperty('allowedGachaModes') ? updates.allowedGachaModes : allowedGachaModes
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to update viewer config:', error);
    }
  };

  // ウィジェット設定取得関数
  const fetchWidgetConfig = async () => {
    try {
      const response = await fetch('/api/widget-config');
      const config = await response.json();
      setWidgetEnabled(config.enabled);
    } catch (error) {
      console.error('Failed to fetch widget config:', error);
    }
  };
  
  // トンネル状態取得関数
  const fetchTunnelStatus = async () => {
    try {
      const response = await fetch('/api/tunnel/status');
      const status = await response.json();
      setTunnelStatus(status.status);
      setTunnelUrl(status.url);
      setTunnelAuthInfo(status.authInfo);
      setTunnelServiceType(status.serviceType);
    } catch (error) {
      console.error('Failed to fetch tunnel status:', error);
    }
  };

  // 利用可能なサービス取得関数
  const fetchAvailableServices = async () => {
    try {
      const response = await fetch('/api/tunnel/services');
      const data = await response.json();
      setAvailableServices(data.services);
      setTunnelServiceType(data.current);
    } catch (error) {
      console.error('Failed to fetch available services:', error);
    }
  };
  
  // 外部公開開始関数
  const startTunnel = async () => {
    if (isConnectingTunnel) return;
    setIsConnectingTunnel(true);
    
    try {
      const response = await fetch('/api/tunnel/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port: 3000 }),
      });
      
      const result = await response.json();
      if (result.success) {
        setTunnelStatus('connected');
        setTunnelUrl(result.url);
        setTunnelAuthInfo(result.authInfo);
        setTunnelServiceType(result.serviceType);
      } else {
        console.error('Failed to start tunnel:', result.error);
        // エラーメッセージを改行で分割して表示
        const errorLines = result.error.split('\n');
        const displayError = errorLines.length > 1 
          ? errorLines.join('\n') 
          : result.error;
        alert(`トンネル接続に失敗しました:\n\n${displayError}`);
      }
    } catch (error) {
      console.error('Failed to start tunnel:', error);
      alert('トンネル接続中にエラーが発生しました');
    } finally {
      setIsConnectingTunnel(false);
    }
  };
  
  // 外部公開停止関数
  const stopTunnel = async () => {
    try {
      const response = await fetch('/api/tunnel/stop', {
        method: 'POST',
      });
      
      const result = await response.json();
      if (result.success) {
        setTunnelStatus('disconnected');
        setTunnelUrl(null);
        setTunnelAuthInfo(null);
      }
    } catch (error) {
      console.error('Failed to stop tunnel:', error);
    }
  };
  
  // 外部公開再接続関数
  const restartTunnel = async () => {
    if (isConnectingTunnel) return;
    setIsConnectingTunnel(true);
    
    try {
      const response = await fetch('/api/tunnel/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port: 3000 }),
      });
      
      const result = await response.json();
      if (result.success) {
        setTunnelStatus('connected');
        setTunnelUrl(result.url);
        setTunnelAuthInfo(result.authInfo);
        setTunnelServiceType(result.serviceType);
      } else {
        console.error('Failed to restart tunnel:', result.error);
        // エラーメッセージを改行で分割して表示
        const errorLines = result.error.split('\n');
        const displayError = errorLines.length > 1 
          ? errorLines.join('\n') 
          : result.error;
        alert(`トンネル再接続に失敗しました:\n\n${displayError}`);
      }
    } catch (error) {
      console.error('Failed to restart tunnel:', error);
      alert('トンネル再接続中にエラーが発生しました');
    } finally {
      setIsConnectingTunnel(false);
    }
  };

  // サービス切り替え関数
  const handleServiceChange = async (serviceType) => {
    if (tunnelStatus === 'connected' || tunnelStatus === 'connecting') {
      alert('サービスを変更するには、まず現在の接続を停止してください');
      return;
    }
    
    try {
      const response = await fetch('/api/tunnel/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceType }),
      });
      
      const result = await response.json();
      if (result.success) {
        setTunnelServiceType(serviceType);
        console.log('Tunnel service changed to:', serviceType);
      } else {
        console.error('Failed to change service:', result.error);
        alert(`サービス変更に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to change service:', error);
      alert('サービス変更中にエラーが発生しました');
    }
  };

  // ウィジェット設定更新関数
  const updateWidgetConfig = async (updates) => {
    try {
      const response = await fetch('/api/widget-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      
      if (result.success) {
        // 設定の更新が成功した場合、stateを更新
        if (updates.hasOwnProperty('enabled')) {
          setWidgetEnabled(updates.enabled);
          saveConfigToLocalStorage('widgetEnabled', updates.enabled);
        }
        
        // WebSocketでウィジェット制御設定の変更を通知
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'widget-config-update',
            data: {
              widgetEnabled: updates.hasOwnProperty('enabled') ? updates.enabled : widgetEnabled
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to update widget config:', error);
    }
  };

  // オーバーレイ設定取得関数
  const fetchOverlayConfig = async () => {
    try {
      const response = await fetch('/api/overlay-config');
      const config = await response.json();
      setSkipGachaAnimation(config.skipAnimation);
    } catch (error) {
      console.error('Failed to fetch overlay config:', error);
    }
  };

  // オーバーレイ設定更新関数
  const updateOverlayConfig = async (updates) => {
    try {
      const response = await fetch('/api/overlay-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      if (result.success) {
        // 設定の更新が成功した場合、サーバー側の値で確定
        setSkipGachaAnimation(result.config.skipAnimation);
        
        console.log('Overlay config updated successfully');
      } else {
        // 失敗した場合は元の値に戻す（ただし楽観的更新により既に変更済みの場合）
        console.error('Failed to update overlay config:', result.error);
        // 必要に応じて元の値に戻す処理をここに追加
      }
    } catch (error) {
      console.error('Failed to update overlay config:', error);
      // ネットワークエラー等の場合も元の値に戻す処理を追加できます
    }
  };

  // プレイヤー名更新関数
  const updatePlayerName = (index, name) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
    
    // localStorageに保存
    localStorage.setItem('playerNames', JSON.stringify(newNames));
    
    // WebSocketで名前の変更を送信
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'player-names-changed',
        data: {
          playerNames: newNames.slice(0, playerCount),
          playerCount: playerCount
        }
      }));
      
      // ウィジェットにも名前変更を即座に反映
      if (currentWeapon && currentWeapon.weapons) {
        ws.send(JSON.stringify({
          type: 'widget-update',
          data: {
            result: {
              weapons: currentWeapon.weapons.slice(0, playerCount),
              count: playerCount
            },
            playerNames: newNames.slice(0, playerCount)
          }
        }));
      }
    }
  };
  
  // プレイヤー数更新関数
  const updatePlayerCount = async (count) => {
    setPlayerCount(count);
    saveConfigToLocalStorage('playerCount', count);
    
    // ダッシュボード人数設定をサーバーに保存
    try {
      const response = await fetch('/api/dashboard-player-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerCount: count }),
      });
    } catch (error) {
      console.error('Failed to update dashboard player count:', error);
    }
    
    // WebSocketでプレイヤー数の変更を送信
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'player-count-changed',
        data: {
          playerCount: count,
          playerNames: playerNames.slice(0, count)
        }
      }));
      
      // ウィジェットにも人数変更を即座に反映
      if (currentWeapon && currentWeapon.weapons) {
        ws.send(JSON.stringify({
          type: 'widget-update',
          data: {
            result: {
              weapons: currentWeapon.weapons.slice(0, count),
              count: count
            },
            playerNames: playerNames.slice(0, count)
          }
        }));
      }
    }
  };
  
  // プレイヤー選択状態の変更をWebSocketで通知
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'player-selection-changed',
        data: {
          playerSelection: playerSelection
        }
      }));
    }
  }, [playerSelection, ws]);

  // 武器データを取得
  useEffect(() => {
    const fetchWeaponsData = async () => {
      try {
        const response = await fetch('/api/weapons');
        const data = await response.json();
        setWeaponsData(data);
        
        // 保存された武器選択設定を復元、なければ全武器を選択
        if (data && data.weapons) {
          const savedConfig = loadSavedConfig();
          if (savedConfig.selectedWeapons.length > 0) {
            // 保存された武器IDが実際に存在するかチェック
            const validWeaponIds = data.weapons.map(weapon => weapon.id);
            const validSavedWeapons = savedConfig.selectedWeapons.filter(weaponId => validWeaponIds.includes(weaponId));
            if (validSavedWeapons.length > 0) {
              setSelectedWeapons(validSavedWeapons);
            } else {
              // 保存された武器が無効な場合は全武器を選択
              setSelectedWeapons(data.weapons.map(weapon => weapon.id));
            }
          } else {
            // 保存された武器選択がない場合は全武器を選択
            setSelectedWeapons(data.weapons.map(weapon => weapon.id));
          }
          // 重複許可設定も復元
          setAllowDuplicates(savedConfig.allowDuplicates);
        }
      } catch (error) {
        console.error('武器データの取得に失敗しました:', error);
      }
    };
    
    fetchWeaponsData();
  }, []);

  // 対象武器選択やフィルター設定の変更をWebSocketで通知
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'weapon-filter-changed',
        data: {
          selectedWeapons,
          allowDuplicates: effectiveAllowDuplicates,
          weaponTypeFilter,
          gachaMode,
          timestamp: Date.now()
        }
      }));
    }
  }, [selectedWeapons, effectiveAllowDuplicates, weaponTypeFilter, gachaMode, playerCount, ws]);

  // 武器選択設定をlocalStorageに保存
  useEffect(() => {
    if (selectedWeapons.length > 0) {
      saveConfigToLocalStorage('selectedWeapons', selectedWeapons);
    }
  }, [selectedWeapons]);

  // 重複許可設定をlocalStorageに保存
  useEffect(() => {
    saveConfigToLocalStorage('allowDuplicates', allowDuplicates);
  }, [allowDuplicates]);

  // 武器数不足の制御ロジック  
  const effectiveWeaponCount = getEffectiveWeaponCountForValidation();
  const selectedWeaponCount = getSelectedWeaponCount();
  
  // シンプルな武器不足チェック（自動重複許可機能は削除）
  const effectiveAllowDuplicates = allowDuplicates;
  
  // ガチャボタン無効化条件：武器不足時は必ず無効（重複許可設定で有効化可能）
  const isGachaButtonDisabled = isSpinning || 
                                selectedWeaponCount === 0 || // 選択武器0件は必ず無効
                                (selectedWeaponCount < playerCount && !allowDuplicates); // 武器不足かつ重複無効
  
  // デバッグログ
  console.log(`Gacha button state - Spinning: ${isSpinning}, Selected: ${selectedWeaponCount}, Players: ${playerCount}, AllowDuplicates: ${allowDuplicates}, Disabled: ${isGachaButtonDisabled}`);

  const handleGacha = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setGachaFailureMessage(''); // 失敗メッセージをクリア
    
    // ガチャ開始をWebSocketで通知
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'gacha-started',
        data: {
          source: 'dashboard',
          isReGacha: false,
          timestamp: Date.now()
        }
      }));
    }
    
    try {
      // APIエンドポイントのクエリパラメータを構築
      let url = '/api/random-weapon';
      const params = new URLSearchParams();
      
      if (gachaMode === 'sub') {
        params.append('type', 'sub');
        params.append('filter', subWeaponFilter);
      } else if (gachaMode === 'special') {
        params.append('type', 'special');
        params.append('filter', specialWeaponFilter);
      } else if (gachaMode === 'weapon-type') {
        params.append('type', 'weapon-type');
        params.append('filter', weaponTypeFilter);
      }
      // すべてのモードで選択された武器のフィルタリングを適用
      if (selectedWeapons.length > 0) {
        params.append('selectedWeapons', selectedWeapons.join(','));
      }
      
      // 重複許可パラメータを追加（自動制御を含む）
      params.append('allowDuplicates', effectiveAllowDuplicates.toString());
      
      // 人数パラメータを追加
      params.append('count', playerCount);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      // APIから武器をランダム選択
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error getting random weapon:', data.error);
        setIsSpinning(false);
        return;
      }
      
      // 高エントロピーなガチャIDを生成
      const gachaId = window.IdGenerator ? window.IdGenerator.generateGachaId() : `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      
      setTimeout(() => {
        // 結果をstateに保存
        setCurrentWeapon(data);
        
        // WebSocketでガチャ結果を送信（overlay演出開始）
        if (ws && ws.readyState === WebSocket.OPEN) {
          // 1人の場合も複数人と同じ形式に統一
          const normalizedResult = {
            weapons: data.weapons || [data.weapon],
            count: data.weapons ? data.weapons.length : 1
          };
          
          ws.send(JSON.stringify({
            type: 'gacha-result',
            data: { 
              result: normalizedResult, 
              playerNames: playerNames.slice(0, playerCount),
              gachaId: gachaId,
              overlayConfig: {
                skipAnimation: skipGachaAnimation
              }
            }
          }));
          
          // overlay演出完了後にsetIsSpinning(false)が実行される
          // ここではisSpinningをfalseにしない（overlay演出完了後に行う）
        } else {
          // WebSocketが利用できない場合のフォールバック
          setIsSpinning(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error fetching random weapon:', error);
      setIsSpinning(false);
    }
  };



  // フィルタリング説明文を取得する関数
  const getFilterDescription = () => {
    switch (gachaMode) {
      case 'sub':
        return `サブ『${safeGetSubWeaponLabel(subWeaponFilter)}』を持つ武器`;
      case 'special':
        return `スペシャル『${safeGetSpecialWeaponLabel(specialWeaponFilter)}』を持つ武器`;
      case 'weapon-type':
        return `武器種別『${safeGetWeaponTypeLabel(weaponTypeFilter)}』の武器`;
      case 'weapon':
        return selectedWeapons.length > 0 ? '手動選択した武器' : 'すべての武器';
      default:
        return 'すべての武器';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 splatoon-font">
      {/* 状態復元中のローディングオーバーレイ */}
      {isRestoringState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="restoration-loading">
          <div className="bg-gray-800 rounded-xl p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400 mb-4"></div>
            <p className="text-white text-lg font-semibold">状態を復元中...</p>
            <p className="text-gray-400 text-sm mt-2">しばらくお待ちください</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <img 
            src="/images/splatoon_gacha_logo.png" 
            alt="Splatoon Gacha" 
            className="mx-auto mb-4"
            style={{ height: '150px', width: 'auto' }}
          />
          <p className="text-gray-400 mt-2">配信用ランダム武器選択ツール</p>
          <div className="mt-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' ? 'bg-green-600 text-white' :
              connectionStatus === 'error' ? 'bg-red-600 text-white' :
              'bg-gray-600 text-gray-300'
            }`} data-testid="connection-status">
              WebSocket: {connectionStatus === 'connected' ? '接続中' : '未接続'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">ガチャモード選択</h2>
              
              {/* トグルボタン */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setGachaMode('weapon')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    gachaMode === 'weapon'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  すべての武器
                </button>
                
                <button
                  onClick={() => setGachaMode('sub')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    gachaMode === 'sub'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  サブ
                </button>
                
                <button
                  onClick={() => setGachaMode('special')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    gachaMode === 'special'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  スペシャル
                </button>
                
                <button
                  onClick={() => setGachaMode('weapon-type')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    gachaMode === 'weapon-type'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  武器種別
                </button>
              </div>
              
              {/* 対象武器フィルタリング設定 */}
              <div className="mt-6 space-y-4 border-t border-gray-600 pt-4">
                <h3 className="text-lg font-semibold text-white">フィルタリング設定</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowWeaponList(true)}
                    className={`px-4 py-2 text-white rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      selectedWeapons.length === 1 ? 'bg-orange-600 hover:bg-orange-500' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    <img src="/images/multiple_capsules.png" alt="weapons" className="w-5 h-5" />
                    対象武器一覧
                    {(selectedWeaponCount === 0 || (selectedWeaponCount < playerCount && !effectiveAllowDuplicates)) && (
                      <span className="text-sm bg-red-700 px-2 py-1 rounded">
                        {selectedWeaponCount === 0 
                          ? '⚠️ 武器未選択' 
                          : `⚠️ 武器不足（${selectedWeaponCount}種 < ${playerCount}人）`}
                      </span>
                    )}
                    {!(selectedWeaponCount === 0 || (selectedWeaponCount < playerCount && !effectiveAllowDuplicates)) && (
                      <span className="text-sm bg-gray-700 px-2 py-1 rounded">
                        {getSelectedWeaponCount()}種選択中
                      </span>
                    )}
                  </button>
                  
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplicates}
                      onChange={(e) => setAllowDuplicates(e.target.checked)}
                      className="w-4 h-4 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange focus:ring-2"
                    />
                    <span className="text-sm">
                      同じ武器をガチャ対象に含める
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  選択されたガチャモードに応じて対象武器がフィルタリングされます
                </p>
              </div>
              
              {/* 武器種別選択UI */}
              {gachaMode === 'weapon-type' && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white">武器種別を選択：</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      onClick={() => setWeaponTypeFilter('shooter')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'shooter'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/shooter.png" 
                           alt="shooter" className="w-8 h-8" />
                      <span className="text-xs">シューター</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('blaster')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'blaster'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/blaster.png" 
                           alt="blaster" className="w-8 h-8" />
                      <span className="text-xs">ブラスター</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('roller')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'roller'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/roller.png" 
                           alt="roller" className="w-8 h-8" />
                      <span className="text-xs">ローラー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('charger')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'charger'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/charger.png" 
                           alt="charger" className="w-8 h-8" />
                      <span className="text-xs">チャージャー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('slosher')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'slosher'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/slosher.png" 
                           alt="slosher" className="w-8 h-8" />
                      <span className="text-xs">スロッシャー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('splatling')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'splatling'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/splatling.png" 
                           alt="splatling" className="w-8 h-8" />
                      <span className="text-xs">スピナー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('dualies')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'dualies'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/dualies.png" 
                           alt="dualies" className="w-8 h-8" />
                      <span className="text-xs">マニューバー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('brella')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'brella'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/brella.png" 
                           alt="brella" className="w-8 h-8" />
                      <span className="text-xs">シェルター</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('brush')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'brush'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/brush.png" 
                           alt="brush" className="w-8 h-8" />
                      <span className="text-xs">フデ</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('stringer')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'stringer'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/stringer.png" 
                           alt="stringer" className="w-8 h-8" />
                      <span className="text-xs">ストリンガー</span>
                    </button>
                    
                    <button
                      onClick={() => setWeaponTypeFilter('splatana')}
                      className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
                        weaponTypeFilter === 'splatana'
                          ? 'bg-splatoon-orange text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <img src="/images/weapon-types/splatana.png" 
                           alt="splatana" className="w-8 h-8" />
                      <span className="text-xs">ワイパー</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* サブ武器選択UI */}
              {gachaMode === 'sub' && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white">サブ武器を選択：</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {(weaponsData?.subWeapons || []).map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setSubWeaponFilter(sub.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                          subWeaponFilter === sub.id
                            ? 'border-splatoon-orange bg-splatoon-orange bg-opacity-20 text-white shadow-lg'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        <img src={`/images/sub/${sub.id}.png`} alt={sub.id} className="w-8 h-8" />
                        <span className="text-xs text-center">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* スペシャル武器選択UI */}
              {gachaMode === 'special' && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-lg font-semibold text-white">スペシャル武器を選択：</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {(weaponsData?.specialWeapons || []).map(special => (
                      <button
                        key={special.id}
                        onClick={() => setSpecialWeaponFilter(special.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                          specialWeaponFilter === special.id
                            ? 'border-splatoon-orange bg-splatoon-orange bg-opacity-20 text-white shadow-lg'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                        }`}
                      >
                        <img src={`/images/special/${special.id}.png`} alt={special.id} className="w-8 h-8" />
                        <span className="text-xs text-center">{special.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">人数選択</h2>
              
              {/* 人数選択トグルボタン */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => updatePlayerCount(1)}
                  disabled={isSpinning}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    isSpinning
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : playerCount === 1
                        ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  1人
                </button>
                
                <button
                  onClick={() => updatePlayerCount(2)}
                  disabled={isSpinning}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    isSpinning
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : playerCount === 2
                        ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  2人
                </button>
                
                <button
                  onClick={() => updatePlayerCount(3)}
                  disabled={isSpinning}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    isSpinning
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : playerCount === 3
                        ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  3人
                </button>
                
                <button
                  onClick={() => updatePlayerCount(4)}
                  disabled={isSpinning}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    isSpinning
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : playerCount === 4
                        ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  4人
                </button>
              </div>

              {/* プレイヤー名入力フィールド */}
              <div className="mt-4 space-y-3">
                <h3 className="text-lg font-semibold text-white">プレイヤー名</h3>
                <div className="grid gap-3" style={{gridTemplateColumns: `repeat(${Math.min(playerCount, 2)}, 1fr)`}}>
                  {Array.from({ length: playerCount }, (_, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-sm text-gray-400">Player {index + 1}</label>
                      <input
                        type="text"
                        value={playerNames[index]}
                        onChange={(e) => updatePlayerName(index, e.target.value)}
                        placeholder={`Player ${index + 1}`}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-splatoon-orange focus:ring-1 focus:ring-splatoon-orange outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  空欄の場合は自動的に「Player X」として表示されます
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">武器ガチャ</h2>
              
              <div className="text-center">
                <button
                  onClick={handleGacha}
                  disabled={isGachaButtonDisabled}
                  data-testid="random-gacha-button"
                  className={`w-full py-4 px-8 rounded-lg font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                    isGachaButtonDisabled
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {!isSpinning && (
                    <img src="/images/multiple_capsules.png" 
                         alt="capsules" className="w-8 h-8" />
                  )}
                  <span data-testid="gacha-spinner" style={{display: isSpinning ? 'inline' : 'none'}}>ガチャ中...</span>
                  <span style={{display: isSpinning ? 'none' : 'inline'}}>ガチャを回す！</span>
                </button>
                
                {/* エラーメッセージの表示 */}
                {selectedWeapons.length < playerCount && !effectiveAllowDuplicates && (
                  <div className="mt-3 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-lg">
                    <div className="text-red-300 text-sm">
                      ⚠️ 対象武器数（{selectedWeapons.length}種）がプレイヤー数（{playerCount}人）より少ないため、「同じ武器をガチャ対象に含める」を有効にするか、対象武器を追加してください
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 視聴者画面制御パネル */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-cyan splatoon-font">視聴者画面制御</h2>
              
              {/* 有効/無効切り替え */}
              <div className="flex items-center space-x-3 mb-6">
                <input
                  type="checkbox"
                  id="viewer-enabled"
                  checked={viewerEnabled}
                  onChange={(e) => updateViewerConfig({ enabled: e.target.checked })}
                  className="w-5 h-5 text-splatoon-cyan bg-gray-700 border-gray-600 rounded focus:ring-splatoon-cyan"
                />
                <label htmlFor="viewer-enabled" className="text-white font-semibold">
                  視聴者画面を有効化
                </label>
              </div>

              {viewerEnabled && (
                <>
                  {/* ガチャモード制御 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-300">
                      許可するガチャモード
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="mode-weapon"
                          checked={allowedGachaModes.includes('weapon')}
                          onChange={(e) => {
                            const newModes = e.target.checked
                              ? [...allowedGachaModes, 'weapon']
                              : allowedGachaModes.filter(m => m !== 'weapon');
                            updateViewerConfig({ allowedGachaModes: newModes });
                          }}
                          className="w-4 h-4 text-splatoon-cyan bg-gray-700 border-gray-600 rounded focus:ring-splatoon-cyan"
                        />
                        <label htmlFor="mode-weapon" className="text-white">
                          すべての武器
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="mode-sub"
                          checked={allowedGachaModes.includes('sub')}
                          onChange={(e) => {
                            const newModes = e.target.checked
                              ? [...allowedGachaModes, 'sub']
                              : allowedGachaModes.filter(m => m !== 'sub');
                            updateViewerConfig({ allowedGachaModes: newModes });
                          }}
                          className="w-4 h-4 text-splatoon-cyan bg-gray-700 border-gray-600 rounded focus:ring-splatoon-cyan"
                        />
                        <label htmlFor="mode-sub" className="text-white">
                          サブ武器
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="mode-special"
                          checked={allowedGachaModes.includes('special')}
                          onChange={(e) => {
                            const newModes = e.target.checked
                              ? [...allowedGachaModes, 'special']
                              : allowedGachaModes.filter(m => m !== 'special');
                            updateViewerConfig({ allowedGachaModes: newModes });
                          }}
                          className="w-4 h-4 text-splatoon-cyan bg-gray-700 border-gray-600 rounded focus:ring-splatoon-cyan"
                        />
                        <label htmlFor="mode-special" className="text-white">
                          スペシャル武器
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="mode-weapon-type"
                          checked={allowedGachaModes.includes('weapon-type')}
                          onChange={(e) => {
                            const newModes = e.target.checked
                              ? [...allowedGachaModes, 'weapon-type']
                              : allowedGachaModes.filter(m => m !== 'weapon-type');
                            updateViewerConfig({ allowedGachaModes: newModes });
                          }}
                          className="w-4 h-4 text-splatoon-cyan bg-gray-700 border-gray-600 rounded focus:ring-splatoon-cyan"
                        />
                        <label htmlFor="mode-weapon-type" className="text-white">
                          武器種別
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateViewerConfig({ allowedGachaModes: ['weapon', 'sub', 'special', 'weapon-type'] })}
                        className="py-2 px-4 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        全て許可
                      </button>
                      <button
                        onClick={() => updateViewerConfig({ allowedGachaModes: [] })}
                        className="py-2 px-4 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        全て無効
                      </button>
                    </div>
                    
                    {allowedGachaModes.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        ※すべて無効の場合、視聴者はガチャを使用できません
                      </p>
                    )}
                  </div>

                  <div className="mt-4 p-3 bg-gray-900 rounded-lg space-y-2">
                    <p className="text-sm text-gray-400">
                      視聴者画面URL: <span className="text-splatoon-cyan">http://localhost:3000/viewer</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      ※視聴者ガチャの人数は、上記の「プレイヤー数」設定が使用されます
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* 外部公開設定 */}
            <TunnelSettings
              tunnelStatus={tunnelStatus}
              tunnelUrl={tunnelUrl}
              tunnelAuthInfo={tunnelAuthInfo}
              tunnelServiceType={tunnelServiceType}
              availableServices={availableServices}
              isConnectingTunnel={isConnectingTunnel}
              onStartTunnel={startTunnel}
              onStopTunnel={stopTunnel}
              onRestartTunnel={restartTunnel}
              onServiceChange={handleServiceChange}
            />

            {/* オーバーレイ設定パネル */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-purple splatoon-font">オーバーレイ設定</h2>
              
              {/* ガチャ演出省略設定 */}
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="skip-gacha-animation"
                  data-testid="skip-animation-checkbox"
                  checked={skipGachaAnimation}
                  onChange={(e) => {
                    // 楽観的更新: 即座にUI状態を更新
                    const newValue = e.target.checked;
                    setSkipGachaAnimation(newValue);
                    // 非同期でサーバーに送信
                    updateOverlayConfig({ skipAnimation: newValue });
                  }}
                  className="w-5 h-5 text-splatoon-purple bg-gray-700 border-gray-600 rounded focus:ring-splatoon-purple"
                />
                <label htmlFor="skip-gacha-animation" className="text-white font-semibold">
                  インクエフェクトのガチャ演出を省略
                </label>
              </div>
              
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-400">
                  有効にすると、オーバーレイでインクエフェクトがスキップされ、ガチャ結果のみが即座に表示されます。
                </p>
              </div>
            </div>

            {/* ウィジェット制御パネル */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">ウィジェット制御</h2>
              
              {/* 有効/無効切り替え */}
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="widget-enabled"
                  checked={widgetEnabled}
                  onChange={(e) => updateWidgetConfig({ enabled: e.target.checked })}
                  className="w-5 h-5 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange"
                />
                <label htmlFor="widget-enabled" className="text-white font-semibold">
                  ウィジェット表示を有効化
                </label>
              </div>

              <div className="p-3 bg-gray-900 rounded-lg space-y-2">
                <p className="text-sm text-gray-400">
                  ウィジェットURL: <span className="text-splatoon-orange">http://localhost:3000/widget</span>
                </p>
                <p className="text-xs text-gray-500">
                  ※配信ソフト（OBS等）のブラウザソースに上記URLを追加してください
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {(currentWeapon || isSpinning) && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl" data-testid="current-weapon">
                <h3 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">
                  {isSpinning ? 'ガチャ中...' : `選択された武器 ${currentWeapon?.count && currentWeapon.count > 1 ? `(${currentWeapon.count}人分)` : ''}`}
                </h3>
                
                {/* ローディング表示 */}
                {isSpinning ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center">
                      <svg className="animate-spin h-12 w-12 text-splatoon-orange mr-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <div className="text-xl text-white">
                        武器を選択中...
                        <div className="text-sm text-gray-400 mt-2">
                          ガチャ演出が完了するまでお待ちください
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 複数武器表示対応 */
                  currentWeapon?.weapons ? (
                    currentWeapon.weapons.length === 1 ? (
                      /* 1人の場合も複数人と同じフォーマット */
                      <>
                        <div className="gap-4 grid grid-cols-1">
                          <div 
                            className={`bg-gray-900 rounded-lg p-4 cursor-pointer transition-all duration-200 relative ${
                              playerSelection.includes(0)
                                ? 'ring-2 ring-splatoon-orange bg-gray-800'
                                : 'hover:bg-gray-800'
                            }`}
                            onClick={() => togglePlayerSelection(0)}
                          >
                            {playerSelection.includes(0) && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-splatoon-orange rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            )}
                            
                            <div className="text-center mb-3">
                              <div className="text-sm text-gray-400 mb-2">{playerNames[0] || 'Player 1'}</div>
                              <img 
                                src={'/images/weapons/' + currentWeapon.weapons[0].id + '.png'} 
                                alt={currentWeapon.weapons[0].name}
                                className="w-16 h-16 mx-auto object-contain drop-shadow-lg"
                                style={{filter: 'drop-shadow(0 0 10px rgba(255, 102, 0, 0.5))'}}
                              />
                            </div>
                            
                            <div className="text-lg font-bold text-white splatoon-font text-center mb-3">
                              {currentWeapon.weapons[0].name}
                            </div>
                          
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">タイプ:</span>
                                <span className="text-white">{safeGetWeaponTypeLabel(currentWeapon.weapons[0].type)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">サブ:</span>
                                <span className="text-white">{safeGetSubWeaponLabel(currentWeapon.weapons[0].subWeapon)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">スペシャル:</span>
                                <span className="text-white">{safeGetSpecialWeaponLabel(currentWeapon.weapons[0].specialWeapon)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 1人の場合の再ガチャ機能 */}
                        <div className="mt-6 space-y-3">
                          <div className="text-sm text-gray-400">
                            プレイヤーを選択して再ガチャ
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            選択されたプレイヤー: {playerSelection.length}人 / 1人
                          </div>
                          
                          <button
                            onClick={handleReGacha}
                            disabled={isSpinning || playerSelection.length === 0}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                              isSpinning || playerSelection.length === 0
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-splatoon-purple to-splatoon-cyan text-white hover:shadow-lg hover:scale-105'
                            }`}
                          >
                            {isSpinning ? '再ガチャ中...' : `選択プレイヤーを再ガチャ (${playerSelection.length}人)`}
                          </button>
                        </div>
                      </>
                    ) : (
                      /* 2人以上の場合はPlayer表示 */
                      <>
                        <div className={`gap-4 ${
                          currentWeapon.weapons.length === 2 ? 'grid grid-cols-1 sm:grid-cols-2' :
                          currentWeapon.weapons.length === 3 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4'
                        }`}>
                          {currentWeapon.weapons.map((weapon, index) => (
                            <div 
                              key={index} 
                              className={`bg-gray-900 rounded-lg p-4 cursor-pointer transition-all duration-200 relative ${
                                playerSelection.includes(index)
                                  ? 'ring-2 ring-splatoon-orange bg-gray-800'
                                  : 'hover:bg-gray-800'
                              }`}
                              onClick={() => togglePlayerSelection(index)}
                            >
                              {playerSelection.includes(index) && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-splatoon-orange rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              )}
                              
                              <div className="text-center mb-3">
                                <div className="text-sm text-gray-400 mb-2">{playerNames[index] || `Player ${index + 1}`}</div>
                                {weapon.id && (
                                  <img 
                                    src={'/images/weapons/' + weapon.id + '.png'} 
                                    alt={weapon.name}
                                    className="w-16 h-16 mx-auto object-contain drop-shadow-lg"
                                    style={{filter: 'drop-shadow(0 0 10px rgba(255, 102, 0, 0.5))'}}
                                  />
                                )}
                              </div>
                              
                              <div className="text-lg font-bold text-white splatoon-font text-center mb-3">
                                {weapon.name}
                              </div>
                            
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">タイプ:</span>
                                  <span className="text-white">{safeGetWeaponTypeLabel(weapon.type)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">サブ:</span>
                                  <span className="text-white">{safeGetSubWeaponLabel(weapon.subWeapon)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">スペシャル:</span>
                                  <span className="text-white">{safeGetSpecialWeaponLabel(weapon.specialWeapon)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* プレイヤー選択と再ガチャ機能（2人以上の場合） */}
                        <div className="mt-6 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-400">
                              プレイヤーを選択して再ガチャ
                            </div>
                            <button
                              onClick={toggleAllSelection}
                              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                            >
                              {playerSelection.length === currentWeapon.weapons.length ? '全解除' : '全選択'}
                            </button>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            選択されたプレイヤー: {playerSelection.length}人 / {currentWeapon.weapons.length}人
                          </div>
                          
                          <button
                            onClick={handleReGacha}
                            disabled={isSpinning || playerSelection.length === 0}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                              isSpinning || playerSelection.length === 0
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-splatoon-purple to-splatoon-cyan text-white hover:shadow-lg hover:scale-105'
                            }`}
                          >
                            {isSpinning ? '再ガチャ中...' : `選択プレイヤーを再ガチャ (${playerSelection.length}人)`}
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    /* 従来の単一武器表示（後方互換性） */
                    <div className="space-y-4">
                      {currentWeapon.weapon && currentWeapon.weapon.id && (
                        <div className="text-center mb-4">
                          <img 
                            src={'/images/weapons/' + currentWeapon.weapon.id + '.png'} 
                            alt={currentWeapon.weapon.name}
                            className="w-20 h-20 mx-auto object-contain drop-shadow-lg"
                            style={{filter: 'drop-shadow(0 0 10px rgba(255, 102, 0, 0.5))'}}
                          />
                        </div>
                      )}
                      
                      <div className="text-3xl font-bold text-white splatoon-font text-center">
                        {(currentWeapon.weapon ? currentWeapon.weapon.name :
                         currentWeapon.subWeapon ? safeGetSubWeaponLabel(currentWeapon.subWeapon) :
                         currentWeapon.specialWeapon ? safeGetSpecialWeaponLabel(currentWeapon.specialWeapon) :
                         'Unknown')}
                      </div>
                      
                      {currentWeapon.weapon && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-gray-900 rounded-lg p-3">
                            <div className="text-gray-400 mb-1">タイプ</div>
                            <div className="text-white font-semibold">
                              {safeGetWeaponTypeLabel(currentWeapon.weapon.type)}
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3">
                            <div className="text-gray-400 mb-1">サブ</div>
                            <div className="text-white font-semibold">
                              {safeGetSubWeaponLabel(currentWeapon.weapon.subWeapon)}
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 col-span-2">
                            <div className="text-gray-400 mb-1">スペシャル</div>
                            <div className="text-white font-semibold">
                              {safeGetSpecialWeaponLabel(currentWeapon.weapon.specialWeapon)}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(currentWeapon.subWeapon || currentWeapon.specialWeapon) && (
                        <div className="bg-gray-900 rounded-lg p-4 text-center">
                          <div className="text-gray-400 text-sm mb-2">
                            {currentWeapon.subWeapon ? 'サブ武器' : 'スペシャル武器'}として選択
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* 武器一覧ポップアップ */}
        <WeaponSelectionModal 
          showWeaponList={showWeaponList}
          setShowWeaponList={setShowWeaponList}
          weaponsData={weaponsData}
          selectedWeapons={selectedWeapons}
          setSelectedWeapons={setSelectedWeapons}
          getFilteredWeaponsForModal={getFilteredWeaponsForModal}
          getFilterDescription={getFilterDescription}
          getWeaponTypeLabel={safeGetWeaponTypeLabel}
          getSubWeaponLabel={safeGetSubWeaponLabel}
          getSpecialWeaponLabel={safeGetSpecialWeaponLabel}
          enableScrollAnimation={true}
        />

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <div className="space-y-2">
            <p>OBS Browser Source (ガチャ演出アニメーション): <span className="text-splatoon-orange">http://localhost:3000/overlay</span></p>
            <p>OBS Browser Source (ガチャ結果ウィジェット): <span className="text-splatoon-cyan">http://localhost:3000/widget</span></p>
            <p className="text-xs">
              overlayはガチャ演出のアニメーション表示、widgetはガチャ結果のアイコン表示です
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

// コンポーネントをエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ControlApp;
} else if (typeof window !== 'undefined') {
  window.ControlApp = ControlApp;
}