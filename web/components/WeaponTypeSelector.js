/**
 * 武器種別選択コンポーネント
 * ダッシュボードと視聴者画面で共通利用
 */
const WeaponTypeSelector = ({ 
  selectedWeaponType, 
  setSelectedWeaponType,
  getWeaponTypeLabel,
  withNavigation = false,
  weaponsData = null,
  compact = false
}) => {
  const weaponTypes = ['shooter', 'blaster', 'roller', 'charger', 'slosher', 'splatling', 'dualies', 'brella', 'brush', 'stringer', 'splatana'];

  // ナビゲーション機能付きの場合、武器データから利用可能な武器種を計算
  const getAvailableTypes = () => {
    if (!withNavigation || !weaponsData || !weaponsData.weapons) {
      return weaponTypes;
    }

    const typeStats = weaponsData.weapons.reduce((acc, weapon) => {
      if (!acc[weapon.type]) {
        acc[weapon.type] = 0;
      }
      acc[weapon.type]++;
      return acc;
    }, {});

    return weaponTypes.filter(type => typeStats[type] > 0);
  };

  const handleTypeClick = (type) => {
    if (setSelectedWeaponType) {
      setSelectedWeaponType(type);
    }
    
    // ナビゲーション機能が有効な場合、該当する武器種にスクロール
    if (withNavigation) {
      const targetElement = document.querySelector(`[data-weapon-type="${type}"]`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const availableTypes = getAvailableTypes();

  // コンパクトモード用のスタイル
  const getIconSize = () => compact ? 'w-6 h-6' : 'w-8 h-8';
  const getTextSize = () => compact ? 'text-xs' : 'text-xs';
  const getPadding = () => compact ? 'p-2' : 'p-3';
  const getGridCols = () => compact ? 'grid-cols-6' : 'grid-cols-4';

  return (
    <div className="mt-4">
      <div className={`grid ${getGridCols()} gap-3`}>
        {availableTypes.map(type => (
          <button
            key={type}
            onClick={() => handleTypeClick(type)}
            className={`${getPadding()} rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
              selectedWeaponType === type
                ? 'bg-splatoon-orange text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={withNavigation ? `${getWeaponTypeLabel(type)}の武器にスクロール` : getWeaponTypeLabel(type)}
          >
            <img src={`/images/weapon-types/${type}.png`} 
                 alt={type} className={getIconSize()} />
            <span className={getTextSize()}>{getWeaponTypeLabel(type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeaponTypeSelector;
} else {
  window.WeaponTypeSelector = WeaponTypeSelector;
}