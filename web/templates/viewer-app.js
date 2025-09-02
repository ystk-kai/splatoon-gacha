const { useState, useEffect } = React;

// ID生成ユーティリティを読み込み
const script = document.createElement('script');
script.src = '/utils/id-generator.js';
script.async = false;
document.head.appendChild(script);

const ViewerApp = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [ws, setWs] = useState(null);
  const [selectedGachaMode, setSelectedGachaMode] = useState('weapon');
  
  // サブ武器・スペシャル武器・武器種別の選択状態
  const [selectedSubWeapon, setSelectedSubWeapon] = useState('splat_bomb');
  const [selectedSpecialWeapon, setSelectedSpecialWeapon] = useState('trizooka');
  const [selectedWeaponType, setSelectedWeaponType] = useState('shooter');
  
  // 武器結果表示とプレイヤー選択用の state
  const [currentWeapon, setCurrentWeapon] = useState(null);
  const [playerSelection, setPlayerSelection] = useState([]);
  const [playerNames, setPlayerNames] = useState(['視聴者']);
  const [playerCount, setPlayerCount] = useState(1);
  
  // 状態復元中のローディング表示
  const [isRestoringState, setIsRestoringState] = useState(true);
  
  // 対象武器選択機能の状態
  const [selectedWeapons, setSelectedWeapons] = useState([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [showWeaponList, setShowWeaponList] = useState(false);
  const [weaponsData, setWeaponsData] = useState(null);

  // ガチャ実行用のフィルタリング関数
  const getFilteredWeapons = (weapons) => {
    if (!weapons) return [];
    
    switch (selectedGachaMode) {
      case 'sub':
        if (selectedSubWeapon && weaponsData?.subWeapons) {
          const subWeapon = weaponsData.subWeapons.find(w => w.id === selectedSubWeapon);
          const targetSubName = subWeapon ? subWeapon.name : selectedSubWeapon;
          return weapons.filter(weapon => weapon.subWeapon === targetSubName);
        }
        return weapons;
      case 'special':
        if (selectedSpecialWeapon && weaponsData?.specialWeapons) {
          const specialWeapon = weaponsData.specialWeapons.find(w => w.id === selectedSpecialWeapon);
          const targetSpecialName = specialWeapon ? specialWeapon.name : selectedSpecialWeapon;
          return weapons.filter(weapon => weapon.specialWeapon === targetSpecialName);
        }
        return weapons;
      case 'weapon-type':
        return selectedWeaponType ? weapons.filter(weapon => weapon.type === selectedWeaponType) : weapons;
      case 'weapon':
        if (selectedWeapons.length > 0) {
          return weapons.filter(weapon => selectedWeapons.includes(weapon.id));
        }
        return weapons;
      default:
        return weapons;
    }
  };

  // モーダル表示用のフィルタリング関数
  const getFilteredWeaponsForModal = (weapons) => {
    if (!weapons) return [];
    
    switch (selectedGachaMode) {
      case 'sub':
        if (selectedSubWeapon && weaponsData?.subWeapons) {
          const subWeapon = weaponsData.subWeapons.find(w => w.id === selectedSubWeapon);
          const targetSubName = subWeapon ? subWeapon.name : selectedSubWeapon;
          return weapons.filter(weapon => weapon.subWeapon === targetSubName);
        }
        return weapons;
      case 'special':
        if (selectedSpecialWeapon && weaponsData?.specialWeapons) {
          const specialWeapon = weaponsData.specialWeapons.find(w => w.id === selectedSpecialWeapon);
          const targetSpecialName = specialWeapon ? specialWeapon.name : selectedSpecialWeapon;
          return weapons.filter(weapon => weapon.specialWeapon === targetSpecialName);
        }
        return weapons;
      case 'weapon-type':
        return selectedWeaponType ? weapons.filter(weapon => weapon.type === selectedWeaponType) : weapons;
      case 'weapon':
        // 武器一覧モーダルでは選択状態に関係なく全武器を表示
        return weapons;
      default:
        return weapons;
    }
  };

  // 現在のガチャモードでの有効武器数を計算
  const getEffectiveWeaponCount = () => {
    if (!weaponsData?.weapons) return 0;
    
    if (selectedGachaMode === 'weapon') {
      return selectedWeapons.length;
    } else {
      // サブ・スペシャル・武器種別モードでは、フィルタリングされた武器数を使用
      const filteredWeapons = getFilteredWeaponsForModal(weaponsData.weapons);
      return filteredWeapons.length;
    }
  };

  // 実際に選択されている武器数を計算（モード別）
  const getSelectedWeaponCount = () => {
    if (!weaponsData?.weapons) return 0;
    
    if (selectedGachaMode === 'weapon') {
      return selectedWeapons.length;
    } else {
      // サブ・スペシャル・武器種別モードの場合：
      // 1. まずモードによるフィルタリングを適用
      const filteredWeapons = getFilteredWeapons(weaponsData.weapons);
      // 2. 選択された武器が存在する場合、さらにそれでフィルタリング
      if (selectedWeapons.length > 0) {
        const count = filteredWeapons.filter(weapon => selectedWeapons.includes(weapon.id)).length;
        return count;
      } else {
        // 選択武器がない場合は0を返す（武器不足として扱う）
        return 0;
      }
    }
  };;
  
  // 武器数不足の制御ロジック  
  const effectiveWeaponCount = getEffectiveWeaponCount();
  const selectedWeaponCount = getSelectedWeaponCount();
  // 自動重複許可は全ガチャモードに適用（手動で1種類選択した場合のみ）
  const shouldAutoAllowDuplicates = selectedWeaponCount === 1 && playerCount === 2;;
  const shouldDisableDuplicateCheckbox = shouldAutoAllowDuplicates;
  
  // 自動重複許可の効果を反映
  const effectiveAllowDuplicates = shouldAutoAllowDuplicates ? true : allowDuplicates;
  
  // ガチャボタン無効化条件
  const isGachaButtonDisabled = isSpinning || 
                                selectedWeaponCount === 0 || // 選択武器0件は必ず無効
                                (selectedWeaponCount < playerCount && !effectiveAllowDuplicates) || // 武器不足かつ重複無効
                                config?.allowedGachaModes?.length === 0 || 
                                !config?.allowedGachaModes?.includes(selectedGachaMode);

  // localStorageから保存された設定を読み込み
  const loadSavedConfig = () => {
    try {
      const savedSelectedWeapons = localStorage.getItem('selectedWeapons');
      const savedAllowDuplicates = localStorage.getItem('allowDuplicates');
      
      return {
        selectedWeapons: savedSelectedWeapons ? JSON.parse(savedSelectedWeapons) : [],
        allowDuplicates: savedAllowDuplicates ? JSON.parse(savedAllowDuplicates) : false
      };
    } catch (error) {
      console.error('Error loading saved config:', error);
      return {
        selectedWeapons: [],
        allowDuplicates: false
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
          selectedGachaMode,
          timestamp: Date.now()
        }
      }));
    }
  }, [selectedWeapons, effectiveAllowDuplicates, selectedGachaMode, ws]);

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

  useEffect(() => {
    // 設定を取得
    fetchConfig();

    // WebSocket接続（動的にホストを決定）
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Viewer connecting to WebSocket:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      
      // クライアントタイプを識別するメッセージを送信
      websocket.send(JSON.stringify({
        type: 'client-type',
        data: {
          clientType: 'viewer',
          timestamp: Date.now()
        }
      }));
      
      // 接続時に現在の状態を要求
      websocket.send(JSON.stringify({
        type: 'viewer-state-request',
        data: {
          timestamp: Date.now()
        }
      }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'viewer-config-changed') {
        setConfig(data.data);
      } else if (data.type === 'gacha-result') {
        // ガチャ結果受信時は演出開始のため、isSpinningはfalseにしない
        // overlay演出完了後に結果が更新される
      } else if (data.type === 'player-names-changed') {
        // ダッシュボードからプレイヤー名の変更を受信
        setPlayerNames(data.data.playerNames || ['視聴者']);
        setPlayerCount(data.data.playerCount || 1);
      } else if (data.type === 'player-count-changed') {
        // ダッシュボードからプレイヤー数の変更を受信
        setPlayerNames(data.data.playerNames || ['視聴者']);
        setPlayerCount(data.data.playerCount || 1);
      } else if (data.type === 'overlay-animation-completed') {
        // overlay演出完了通知を受信したら武器結果を更新
        setIsSpinning(false);
        if (data.data && data.data.fullState) {
          // 全体状態から武器結果を更新
          const fullStateResult = {
            weapons: data.data.fullState.weapons,
            count: data.data.fullState.count
          };
          setCurrentWeapon(fullStateResult);
          setPlayerSelection([]); // 選択をクリア
          // プレイヤー名も更新
          if (data.data.fullState.playerNames) {
            setPlayerNames(data.data.fullState.playerNames);
            setPlayerCount(data.data.fullState.count);
          }
        }
      } else if (data.type === 'widget-update') {
        // ウィジェット更新通知（現在の武器状態の同期）
        if (data.data && data.data.result) {
          setCurrentWeapon(data.data.result);
          if (data.data.playerNames) {
            setPlayerNames(data.data.playerNames);
          }
        }
      } else if (data.type === 'gacha-failed') {
        // ガチャ失敗通知を受信
        console.log('Viewer: Gacha failure received, resetting spinning state');
        setIsSpinning(false);
      } else if (data.type === 'gacha-state-reset') {
        // ガチャ状態リセット通知を受信
        console.log('Viewer: Gacha state reset received');
        setIsSpinning(false);
      } else if (data.type === 'viewer-state-response') {
        // 状態復元レスポンス
        console.log('Viewer: Restoring state from server');
        if (data.data) {
          // 現在の武器状態を復元
          if (data.data.currentWeapon) {
            setCurrentWeapon(data.data.currentWeapon);
            console.log('Viewer: Current weapon restored');
          }
          // プレイヤー情報を復元
          if (data.data.playerNames) {
            setPlayerNames(data.data.playerNames);
            console.log('Viewer: Player names restored');
          }
          if (data.data.playerCount !== undefined) {
            setPlayerCount(data.data.playerCount);
            console.log('Viewer: Player count restored:', data.data.playerCount);
          }
          // ガチャ中フラグを復元
          if (data.data.isSpinning !== undefined) {
            setIsSpinning(data.data.isSpinning);
            console.log('Viewer: Loading state restored:', data.data.isSpinning);
          }
          // プレイヤー選択状態を復元（再ガチャ用）
          if (data.data.playerSelection) {
            setPlayerSelection(data.data.playerSelection);
            console.log('Viewer: Player selection restored:', data.data.playerSelection);
          }
          
          // 状態復元完了 - ローディングオーバーレイを解除
          setIsRestoringState(false);
          console.log('Viewer: State restoration completed');
        }
      } else if (data.type === 'gacha-started' && data.data && data.data.source !== 'viewer') {
        // ガチャ開始通知を受信（他の画面からの通知）
        console.log('Gacha started from:', data.data.source);
        setIsSpinning(true);
      } else if (data.type === 'gacha-state-reset') {
        // ガチャ状態リセット通知
        console.log('Gacha state reset notification received');
        setCurrentWeapon(null);
        setPlayerSelection([]);
        setIsSpinning(false);
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket closed');
      setIsRestoringState(false); // 接続エラー時はローディングを解除
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsRestoringState(false); // 接続エラー時はローディングを解除
    };
    
    setWs(websocket);
    
    // 5秒後に状態復元がなければローディングを解除（タイムアウト処理）
    const restorationTimeout = setTimeout(() => {
      if (isRestoringState) {
        console.log('Viewer: State restoration timeout, hiding loading overlay');
        setIsRestoringState(false);
      }
    }, 5000);
    
    return () => {
      clearTimeout(restorationTimeout);
      websocket.close();
    };
  }, []);

  // 設定変更時に現在選択されているモードが無効化されている場合、有効なモードに切り替え
  useEffect(() => {
    if (config && config.allowedGachaModes) {
      if (!config.allowedGachaModes.includes(selectedGachaMode)) {
        // 現在のモードが無効化された場合、最初の有効なモードに切り替え
        if (config.allowedGachaModes.length > 0) {
          setSelectedGachaMode(config.allowedGachaModes[0]);
        }
      }
    }
  }, [config, selectedGachaMode]);

  // ガチャモード変更時に最初の選択肢を自動選択
  useEffect(() => {
    if (selectedGachaMode === 'sub') {
      setSelectedSubWeapon('splat_bomb');
    } else if (selectedGachaMode === 'special') {
      setSelectedSpecialWeapon('trizooka');
    } else if (selectedGachaMode === 'weapon-type') {
      setSelectedWeaponType('shooter');
    }
  }, [selectedGachaMode]);

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

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/viewer-config');
      const configData = await response.json();
      setConfig(configData);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  // 再ガチャ実行
  const handleReGacha = async () => {
    if (isSpinning || playerSelection.length === 0 || !currentWeapon || !config.enabled || !config.allowedGachaModes.includes(selectedGachaMode)) return;
    
    setIsSpinning(true);
    
    // 再ガチャ開始をWebSocketで通知
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'gacha-started',
        data: {
          source: 'viewer',
          isReGacha: true,
          selectedPlayers: playerSelection.length,
          timestamp: Date.now()
        }
      }));
    }
    
    try {
      // APIエンドポイントのクエリパラメータを構築
      let url = '/api/random-weapon';
      const params = new URLSearchParams();
      
      // 視聴者フラグを追加
      params.append('viewer', 'true');
      // 人数パラメータを追加（選択されたプレイヤー数）
      params.append('count', playerSelection.length);
      
      if (selectedGachaMode === 'sub') {
        params.append('type', 'sub');
        params.append('filter', selectedSubWeapon);
      } else if (selectedGachaMode === 'special') {
        params.append('type', 'special');
        params.append('filter', selectedSpecialWeapon);
      } else if (selectedGachaMode === 'weapon-type') {
        params.append('type', 'weapon-type');
        params.append('filter', selectedWeaponType);
      }
      
      // すべてのモードで選択された武器のフィルタリングを適用
      if (selectedWeapons.length > 0) {
        params.append('selectedWeapons', selectedWeapons.join(','));
      }
      
      // 重複許可パラメータを追加
      params.append('allowDuplicates', allowDuplicates.toString());
      
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
      
      // ガチャIDを生成
      const gachaId = window.IdGenerator ? window.IdGenerator.generateGachaId() : `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
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
        
        // WebSocketでガチャ結果を送信（overlay演出開始）
        if (ws && ws.readyState === WebSocket.OPEN) {
          // 選択をクリアする前に選択情報を保存
          const selectedIndices = [...playerSelection];
          const allPlayerNames = playerNames.slice(0, updatedWeapons.length);
          
          // 再ガチャ用に選択されたプレイヤーの武器とプレイヤー名のみを抽出
          const selectedWeapons = selectedIndices.map(index => updatedWeapons[index]);
          const selectedPlayerNames = selectedIndices.map(index => allPlayerNames[index]);
          
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
              // 再ガチャ後の全体状態も送信
              fullState: {
                weapons: updatedWeapons,
                playerNames: allPlayerNames,
                count: updatedWeapons.length
              }
            }
          };
          
          ws.send(JSON.stringify(messageData));
          
          // overlay演出完了後にsetIsSpinning(false)とsetCurrentWeaponが実行される
          // ここでは結果をセットしない（overlay演出完了後に行う）
        } else {
          // WebSocketが利用できない場合のフォールバック
          setCurrentWeapon(updatedResult);
          setIsSpinning(false);
          setPlayerSelection([]);
        }
      }, 2000);
    } catch (error) {
      console.error('Error fetching random weapon:', error);
      setIsSpinning(false);
    }
  };

  const handleGacha = async () => {
    if (isSpinning || !config.enabled || config.allowedGachaModes.length === 0 || !config.allowedGachaModes.includes(selectedGachaMode)) return;
    
    setIsSpinning(true);
    
    // ガチャ開始をWebSocketで通知
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'gacha-started',
        data: {
          source: 'viewer',
          isReGacha: false,
          timestamp: Date.now()
        }
      }));
    }

    try {
      // アニメーション用の遅延
      setTimeout(async () => {
        let url = '/api/random-weapon';
        const params = new URLSearchParams();
        
        // 視聴者フラグを追加
        params.append('viewer', 'true');
        params.append('count', config.playerCount || 1);
        
        // ガチャモードに基づいて追加パラメータを設定
        if (selectedGachaMode !== 'weapon') {
          params.append('type', selectedGachaMode);
          
          // 各モードに応じてフィルターを追加
          if (selectedGachaMode === 'sub') {
            params.append('filter', selectedSubWeapon);
          } else if (selectedGachaMode === 'special') {
            params.append('filter', selectedSpecialWeapon);
          } else if (selectedGachaMode === 'weapon-type') {
            params.append('filter', selectedWeaponType);
          }
        }
        
        // すべてのモードで選択された武器のフィルタリングを適用
        if (selectedWeapons.length > 0) {
          params.append('selectedWeapons', selectedWeapons.join(','));
        }
        
        // 重複許可パラメータを追加（自動制御を含む）
        params.append('allowDuplicates', effectiveAllowDuplicates.toString());
        
        if (params.toString()) {
          url += '?' + params.toString();
        }

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error('Gacha error:', data.error);
          setIsSpinning(false);
          return;
        }
        
        // WebSocketでoverlayとwidgetに結果を送信
        if (ws && ws.readyState === WebSocket.OPEN) {
          // ガチャIDを生成
          const gachaId = window.IdGenerator ? window.IdGenerator.generateGachaId() : `gacha_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          
          const weaponResult = {
            weapons: data.weapons || [data.weapon],
            count: data.weapons ? data.weapons.length : 1
          };
          
          ws.send(JSON.stringify({
            type: 'gacha-result',
            data: { 
              result: weaponResult, 
              playerNames: playerNames.slice(0, playerCount),
              gachaId: gachaId
            }
          }));
          
          // overlay演出完了後にsetIsSpinning(false)とsetCurrentWeaponが実行される
          // ここでは結果をセットしない（overlay演出完了後に行う）
        } else {
          // WebSocketが利用できない場合のフォールバック
          const weaponResult = {
            weapons: data.weapons || [data.weapon],
            count: data.weapons ? data.weapons.length : 1
          };
          setCurrentWeapon(weaponResult);
          setPlayerSelection([]);
          setIsSpinning(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Gacha error:', error);
      setIsSpinning(false);
    }
  };

  // ラベル取得関数
  const getWeaponTypeLabel = (type) => {
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

  // フィルタリング説明文を取得する関数
  const getFilterDescription = () => {
    switch (selectedGachaMode) {
      case 'sub':
        return `サブ『${getSubWeaponLabel(selectedSubWeapon)}』を持つ武器`;
      case 'special':
        return `スペシャル『${getSpecialWeaponLabel(selectedSpecialWeapon)}』を持つ武器`;
      case 'weapon-type':
        return `武器種別『${getWeaponTypeLabel(selectedWeaponType)}』の武器`;
      case 'weapon':
        return selectedWeapons.length > 0 ? '手動選択した武器' : 'すべての武器';
      default:
        return 'すべての武器';
    }
  };

  const getSubWeaponLabel = (sub) => {
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

  const getSpecialWeaponLabel = (special) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!config || !config.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center splatoon-font">
        <div className="text-center">
          <img 
            src={getLogoImageUrl()} 
            alt="Splatoon Gacha" 
            className="mx-auto mb-8"
            style={{ height: '150px', width: 'auto' }}
          />
          <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md mx-auto">
            <div className="text-red-400 text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-4">視聴者画面は無効です</h2>
            <p className="text-gray-400 text-lg">
              管理者によって無効化されています。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 splatoon-font">
      {/* 状態復元中のローディングオーバーレイ */}
      {isRestoringState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            src={getLogoImageUrl()} 
            alt="Splatoon Gacha" 
            className="mx-auto mb-4"
            style={{ height: '150px', width: 'auto' }}
          />
          <p className="text-gray-400 mt-2">視聴者用ガチャ画面</p>
        </header>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-splatoon-orange splatoon-font">ガチャモード選択</h2>

            <div className="mb-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedGachaMode('weapon')}
                  disabled={!config.allowedGachaModes.includes('weapon')}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    !config.allowedGachaModes.includes('weapon')
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : selectedGachaMode === 'weapon'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  すべての武器
                </button>
                <button
                  onClick={() => setSelectedGachaMode('sub')}
                  disabled={!config.allowedGachaModes.includes('sub')}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    !config.allowedGachaModes.includes('sub')
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : selectedGachaMode === 'sub'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  サブ
                </button>
                <button
                  onClick={() => setSelectedGachaMode('special')}
                  disabled={!config.allowedGachaModes.includes('special')}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    !config.allowedGachaModes.includes('special')
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : selectedGachaMode === 'special'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  スペシャル
                </button>
                <button
                  onClick={() => setSelectedGachaMode('weapon-type')}
                  disabled={!config.allowedGachaModes.includes('weapon-type')}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                    !config.allowedGachaModes.includes('weapon-type')
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : selectedGachaMode === 'weapon-type'
                      ? 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  武器種別
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※無効化されているモードは管理者により制限されています
              </p>
            </div>

            {/* フィルター選択（サブ・スペシャル・武器種別の場合） */}
            {selectedGachaMode === 'sub' && config.allowedGachaModes.includes('sub') && (
              <SubWeaponSelector 
                selectedSubWeapon={selectedSubWeapon}
                setSelectedSubWeapon={setSelectedSubWeapon}
                weaponsData={weaponsData}
                getSubWeaponLabel={getSubWeaponLabel}
              />
            )}

            {selectedGachaMode === 'special' && config.allowedGachaModes.includes('special') && (
              <SpecialWeaponSelector 
                selectedSpecialWeapon={selectedSpecialWeapon}
                setSelectedSpecialWeapon={setSelectedSpecialWeapon}
                weaponsData={weaponsData}
                getSpecialWeaponLabel={getSpecialWeaponLabel}
              />
            )}

            {selectedGachaMode === 'weapon-type' && config.allowedGachaModes.includes('weapon-type') && (
              <WeaponTypeSelector 
                selectedWeaponType={selectedWeaponType}
                setSelectedWeaponType={setSelectedWeaponType}
                getWeaponTypeLabel={getWeaponTypeLabel}
                withNavigation={true}
                weaponsData={weaponsData}
                compact={false}
              />
            )}
            
            {/* 対象武器フィルタリング設定 */}
            <div className="mt-6 space-y-4 border-t border-gray-600 pt-4">
              <h3 className="text-lg font-semibold text-white">フィルタリング設定</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowWeaponList(true)}
                  className={`px-4 py-2 text-white rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    selectedWeapons.length === 1 && playerCount > 1
                      ? 'bg-yellow-600 hover:bg-yellow-500'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  <img src={getCapsulesImageUrl()} alt="weapons" className="w-5 h-5" />
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
                
                <label className={`flex items-center gap-2 text-white ${shouldDisableDuplicateCheckbox ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={effectiveAllowDuplicates}
                    onChange={(e) => setAllowDuplicates(e.target.checked)}
                    disabled={shouldDisableDuplicateCheckbox}
                    className="w-4 h-4 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange focus:ring-2 disabled:opacity-50"
                  />
                  <span className="text-sm">
                    同じ武器をガチャ対象に含める
                    {shouldAutoAllowDuplicates && (
                      <span className="text-xs text-splatoon-orange ml-2">(自動有効)</span>
                    )}
                  </span>
                </label>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  {config?.allowedGachaModes?.length === 0
                    ? '許可されたガチャモードがありません。管理者に確認してください。'
                    : '選択されたガチャモードに応じて対象武器がフィルタリングされます'
                  }
                </p>
                {selectedWeapons.length === 1 && playerCount > 1 && (
                  <p className="text-yellow-400 font-medium">
                    ⚠️ 武器1種で{playerCount}人のガチャをする場合、重複許可が自動で有効になります
                  </p>
                )}
              </div>
            </div>


            {/* ガチャボタン */}
            <button
              onClick={handleGacha}
              disabled={isGachaButtonDisabled}
              className={`w-full py-4 px-8 rounded-lg font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                isGachaButtonDisabled
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-splatoon-orange to-splatoon-purple text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              {!isGachaButtonDisabled && (
                <img src={getCapsulesImageUrl()} 
                     alt="capsules" className="w-8 h-8" />
              )}
              {isSpinning ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
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
                  ガチャ中...
                </span>
              ) : config?.allowedGachaModes?.length === 0 ? (
                'ガチャ使用不可（管理者により無効化）'
              ) : !config?.allowedGachaModes?.includes(selectedGachaMode) ? (
                '選択されたモードは使用不可'
              ) : (selectedWeapons.length === 1 && !allowDuplicates && playerCount > 1) ? (
                '武器1種で複数人のガチャは重複許可が必要です'
              ) : (
                'ガチャを回す！'
              )}
            </button>
          </div>

          {/* 武器結果表示エリア */}
          {(currentWeapon || isSpinning) && (
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
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
                  /* 1人の場合 */
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
                          src={getWeaponImageUrl(currentWeapon.weapons[0].id)} 
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
                          <span className="text-white">{getWeaponTypeLabel(currentWeapon.weapons[0].type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">サブ:</span>
                          <span className="text-white">{getSubWeaponLabel(currentWeapon.weapons[0].subWeapon)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">スペシャル:</span>
                          <span className="text-white">{getSpecialWeaponLabel(currentWeapon.weapons[0].specialWeapon)}</span>
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
                  /* 2人以上の場合 */
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
                              src={getWeaponImageUrl(weapon.id)} 
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
                            <span className="text-white">{getWeaponTypeLabel(weapon.type)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">サブ:</span>
                            <span className="text-white">{getSubWeaponLabel(weapon.subWeapon)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">スペシャル:</span>
                            <span className="text-white">{getSpecialWeaponLabel(weapon.specialWeapon)}</span>
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
                ) : null
              )}
            </div>
          )}
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
          getWeaponTypeLabel={getWeaponTypeLabel}
          getSubWeaponLabel={getSubWeaponLabel}
          getSpecialWeaponLabel={getSpecialWeaponLabel}
          enableScrollAnimation={true}
        />

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>視聴者用画面 - 管理者設定により制御されています</p>
        </footer>
      </div>
    </div>
  );
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewerApp;
} else {
  window.ViewerApp = ViewerApp;
}