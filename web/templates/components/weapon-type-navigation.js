// 武器種ナビゲーションコンポーネント
function WeaponTypeNavigation({ weaponsData, onTypeSelect, selectedTypes = [] }) {
  if (!weaponsData || !weaponsData.weapons) {
    return '';
  }

  // 武器種の統計を計算
  const typeStats = weaponsData.weapons.reduce((acc, weapon) => {
    if (!acc[weapon.type]) {
      acc[weapon.type] = 0;
    }
    acc[weapon.type]++;
    return acc;
  }, {});

  // 武器種の順序を定義（Splatoon 3の一般的な順序）
  const typeOrder = ['shooter', 'blaster', 'roller', 'brush', 'charger', 'splatling', 'dualies', 'brella', 'slosher', 'stringer', 'splatana'];

  // 武器種の日本語ラベル
  const typeLabels = {
    shooter: 'シューター',
    blaster: 'ブラスター', 
    roller: 'ローラー',
    brush: 'フデ',
    charger: 'チャージャー',
    splatling: 'スピナー',
    dualies: 'マニューバー',
    brella: 'シェルター',
    slosher: 'スロッシャー',
    stringer: 'ストリンガー',
    splatana: 'ワイパー'
  };

  // 武器種のアイコンクラス
  const typeIcons = {
    shooter: '🔫',
    blaster: '💥',
    roller: '🎨',
    brush: '🖌️',
    charger: '🎯',
    splatling: '🌀',
    dualies: '🔄',
    brella: '☂️',
    slosher: '🪣',
    stringer: '🏹',
    splatana: '⚔️'
  };

  // 利用可能な武器種のみをフィルター（統計に基づく）
  const availableTypes = typeOrder.filter(type => typeStats[type] > 0);

  const handleTypeClick = (type) => {
    if (onTypeSelect) {
      onTypeSelect(type);
    }
    
    // 武器種にスクロール（該当する要素がある場合）
    const targetElement = document.querySelector(`[data-weapon-type="${type}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return `
    <div class="weapon-type-navigation mb-6">
      <h3 class="text-lg font-semibold mb-3 text-splatoon-blue">武器種別</h3>
      <div class="flex flex-wrap gap-2">
        ${availableTypes.map(type => {
          const isSelected = selectedTypes.includes(type);
          const count = typeStats[type];
          return `
            <button
              class="weapon-type-btn flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isSelected 
                  ? 'bg-splatoon-orange text-white border-splatoon-orange' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
              }"
              data-type="${type}"
              onclick="handleWeaponTypeClick('${type}')"
              title="${typeLabels[type]} (${count}件)"
            >
              <span class="text-lg">${typeIcons[type]}</span>
              <span class="text-sm font-medium">${typeLabels[type]}</span>
              <span class="text-xs opacity-75">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// グローバル関数として武器種クリックハンドラを定義
window.handleWeaponTypeClick = function(type) {
  // カスタムイベントを発火して、親コンポーネントに通知
  const event = new CustomEvent('weaponTypeSelected', { 
    detail: { type: type }
  });
  document.dispatchEvent(event);
  
  // 直接スクロール処理も実行
  const targetElement = document.querySelector(`[data-weapon-type="${type}"]`);
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// 複数選択モード用のハンドラ
window.handleWeaponTypeToggle = function(type) {
  const event = new CustomEvent('weaponTypeToggled', { 
    detail: { type: type }
  });
  document.dispatchEvent(event);
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WeaponTypeNavigation };
}