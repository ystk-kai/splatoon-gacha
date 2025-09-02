// 設定のローカルストレージキー
const CONFIG_KEYS = {
  VIEWER_ENABLED: 'viewerEnabled',
  ALLOWED_GACHA_MODES: 'allowedGachaModes',
  WIDGET_ENABLED: 'widgetEnabled',
  OVERLAY_SKIP_ANIMATION: 'skipGachaAnimation',
  DASHBOARD_PLAYER_COUNT: 'playerCount'
};

// デフォルト設定値
const DEFAULT_CONFIG = {
  viewerEnabled: false,
  allowedGachaModes: [],
  widgetEnabled: true,
  skipAnimation: false,
  dashboardPlayerCount: 1
};

// localStorageから設定を復元する関数（ブラウザクライアント向け）
function loadConfigFromLocalStorage() {
  // サーバー環境では何もしない
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_CONFIG;
  }
  
  try {
    const viewerEnabled = localStorage.getItem(CONFIG_KEYS.VIEWER_ENABLED);
    const allowedGachaModes = localStorage.getItem(CONFIG_KEYS.ALLOWED_GACHA_MODES);
    const widgetEnabled = localStorage.getItem(CONFIG_KEYS.WIDGET_ENABLED);
    const skipAnimation = localStorage.getItem(CONFIG_KEYS.OVERLAY_SKIP_ANIMATION);
    const playerCount = localStorage.getItem(CONFIG_KEYS.DASHBOARD_PLAYER_COUNT);
    
    return {
      viewerEnabled: viewerEnabled ? JSON.parse(viewerEnabled) : DEFAULT_CONFIG.viewerEnabled,
      allowedGachaModes: allowedGachaModes ? JSON.parse(allowedGachaModes) : DEFAULT_CONFIG.allowedGachaModes,
      widgetEnabled: widgetEnabled ? JSON.parse(widgetEnabled) : DEFAULT_CONFIG.widgetEnabled,
      skipAnimation: skipAnimation ? JSON.parse(skipAnimation) : DEFAULT_CONFIG.skipAnimation,
      dashboardPlayerCount: playerCount ? JSON.parse(playerCount) : DEFAULT_CONFIG.dashboardPlayerCount
    };
  } catch (error) {
    console.warn('設定の復元に失敗しました:', error);
    return DEFAULT_CONFIG;
  }
}

// localStorageに設定を保存する関数
function saveConfigToLocalStorage(key, value) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('設定の保存に失敗しました:', error);
  }
}

// 初期化時に復元された設定またはデフォルト設定を使用
const restoredConfig = loadConfigFromLocalStorage();

// 視聴者画面設定を管理
let viewerConfig = {
  enabled: restoredConfig.viewerEnabled,
  allowedGachaModes: restoredConfig.allowedGachaModes,
  lastUpdated: Date.now()
};

// ウィジェット設定を管理
let widgetConfig = {
  enabled: restoredConfig.widgetEnabled,
  lastUpdated: Date.now()
};

// オーバーレイ設定を管理
let overlayConfig = {
  skipAnimation: restoredConfig.skipAnimation,
  lastUpdated: Date.now()
};

// ダッシュボード側の人数設定を管理
let dashboardPlayerCount = restoredConfig.dashboardPlayerCount;

// 利用可能なガチャモードの定義
const allGachaModes = [
  'weapon', 'sub', 'special', 'weapon-type'
];

// 設定を取得
function getViewerConfig() {
  return {
    ...viewerConfig,
    playerCount: dashboardPlayerCount,
    allGachaModes: allGachaModes
  };
}

// ウィジェット設定を取得
function getWidgetConfig() {
  return {
    ...widgetConfig
  };
}

// オーバーレイ設定を取得
function getOverlayConfig() {
  return {
    ...overlayConfig
  };
}

// 設定を更新
function updateViewerConfig(updates) {
  if (typeof updates.enabled === 'boolean') {
    viewerConfig.enabled = updates.enabled;
    saveConfigToLocalStorage(CONFIG_KEYS.VIEWER_ENABLED, updates.enabled);
  }
  
  if (Array.isArray(updates.allowedGachaModes)) {
    // 有効なガチャモードのみフィルター
    const validModes = updates.allowedGachaModes.filter(mode => allGachaModes.includes(mode));
    viewerConfig.allowedGachaModes = validModes;
    saveConfigToLocalStorage(CONFIG_KEYS.ALLOWED_GACHA_MODES, validModes);
  }
  
  viewerConfig.lastUpdated = Date.now();
  
  return viewerConfig;
}

// ウィジェット設定を更新
function updateWidgetConfig(updates) {
  if (typeof updates.enabled === 'boolean') {
    widgetConfig.enabled = updates.enabled;
    saveConfigToLocalStorage(CONFIG_KEYS.WIDGET_ENABLED, updates.enabled);
  }
  
  widgetConfig.lastUpdated = Date.now();
  
  return widgetConfig;
}

// オーバーレイ設定を更新
function updateOverlayConfig(updates) {
  if (typeof updates.skipAnimation === 'boolean') {
    overlayConfig.skipAnimation = updates.skipAnimation;
    saveConfigToLocalStorage(CONFIG_KEYS.OVERLAY_SKIP_ANIMATION, updates.skipAnimation);
  }
  
  overlayConfig.lastUpdated = Date.now();
  
  return overlayConfig;
}

// ダッシュボードの人数設定を更新
function updateDashboardPlayerCount(count) {
  if (typeof count === 'number' && count >= 1 && count <= 4) {
    dashboardPlayerCount = count;
    saveConfigToLocalStorage(CONFIG_KEYS.DASHBOARD_PLAYER_COUNT, count);
  }
  return dashboardPlayerCount;
}

// ダッシュボードの人数設定を取得
function getDashboardPlayerCount() {
  return dashboardPlayerCount;
}

module.exports = {
  getViewerConfig,
  updateViewerConfig,
  getWidgetConfig,
  updateWidgetConfig,
  getOverlayConfig,
  updateOverlayConfig,
  updateDashboardPlayerCount,
  getDashboardPlayerCount,
  allGachaModes
};