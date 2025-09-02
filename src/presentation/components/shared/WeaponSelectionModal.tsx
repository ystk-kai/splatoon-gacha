import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Weapon } from '../../../domain/entities/Weapon';

interface WeaponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  weapons: Weapon[];
  selectedWeapons: string[];
  onWeaponsChange: (weaponIds: string[]) => void;
  selectedTypes: string[];
  currentGachaMode?: string;
  subWeaponFilter?: string;
  specialWeaponFilter?: string;
  weaponTypeFilter?: string;
}

const WeaponSelectionModal: React.FC<WeaponSelectionModalProps> = ({
  isOpen,
  onClose,
  weapons,
  selectedWeapons,
  onWeaponsChange,
  selectedTypes,
  currentGachaMode,
  subWeaponFilter,
  specialWeaponFilter,
  weaponTypeFilter,
}) => {
  const [localSelectedWeapons, setLocalSelectedWeapons] = useState<string[]>(selectedWeapons);

  useEffect(() => {
    setLocalSelectedWeapons(selectedWeapons);
  }, [selectedWeapons]);

  const filteredWeapons = useMemo(() => {
    let filtered = weapons;

    // ガチャモード別のフィルタリング
    if (currentGachaMode === 'sub' && subWeaponFilter) {
      filtered = filtered.filter(weapon => weapon.subWeapon === subWeaponFilter);
    } else if (currentGachaMode === 'special' && specialWeaponFilter) {
      filtered = filtered.filter(weapon => weapon.specialWeapon === specialWeaponFilter);
    } else if (currentGachaMode === 'weapon-type' && weaponTypeFilter) {
      filtered = filtered.filter(weapon => weapon.type === weaponTypeFilter);
    } else if (currentGachaMode === 'weapon' || !currentGachaMode) {
      // 武器モードまたはモード未指定の場合、武器種フィルターを適用
      if (selectedTypes.length > 0) {
        filtered = filtered.filter(weapon => selectedTypes.includes(weapon.type));
      }
    }

    return filtered;
  }, [weapons, selectedTypes, currentGachaMode, subWeaponFilter, specialWeaponFilter, weaponTypeFilter]);

  const weaponsByType = useMemo(() => {
    const grouped: Record<string, Weapon[]> = {};
    filteredWeapons.forEach(weapon => {
      if (!grouped[weapon.type]) {
        grouped[weapon.type] = [];
      }
      grouped[weapon.type].push(weapon);
    });
    return grouped;
  }, [filteredWeapons]);

  const weaponTypeLabels: Record<string, string> = {
    shooter: 'シューター',
    blaster: 'ブラスター',
    roller: 'ローラー',
    charger: 'チャージャー',
    slosher: 'スロッシャー',
    splatling: 'スピナー',
    dualies: 'マニューバー',
    brella: 'シェルター',
    brush: 'フデ',
    stringer: 'ストリンガー',
    splatana: 'ワイパー',
  };

  const weaponTypeIcons: Record<string, string> = {
    shooter: '/web/images/weapon-types/shooter.png',
    blaster: '/web/images/weapon-types/blaster.png',
    roller: '/web/images/weapon-types/roller.png',
    charger: '/web/images/weapon-types/charger.png',
    slosher: '/web/images/weapon-types/slosher.png',
    splatling: '/web/images/weapon-types/splatling.png',
    dualies: '/web/images/weapon-types/dualies.png',
    brella: '/web/images/weapon-types/brella.png',
    brush: '/web/images/weapon-types/brush.png',
    stringer: '/web/images/weapon-types/stringer.png',
    splatana: '/web/images/weapon-types/splatana.png',
  };

  const toggleWeapon = (weaponId: string) => {
    const newSelection = localSelectedWeapons.includes(weaponId)
      ? localSelectedWeapons.filter(id => id !== weaponId)
      : [...localSelectedWeapons, weaponId];
    setLocalSelectedWeapons(newSelection);
  };

  const toggleAllInType = (type: string) => {
    const typeWeapons = weaponsByType[type] || [];
    const typeWeaponIds = typeWeapons.map(w => w.id);
    const allSelected = typeWeaponIds.every(id => localSelectedWeapons.includes(id));
    
    let newSelection: string[];
    if (allSelected) {
      newSelection = localSelectedWeapons.filter(id => !typeWeaponIds.includes(id));
    } else {
      newSelection = [...new Set([...localSelectedWeapons, ...typeWeaponIds])];
    }
    setLocalSelectedWeapons(newSelection);
  };

  const handleSave = () => {
    onWeaponsChange(localSelectedWeapons);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedWeapons(selectedWeapons);
    onClose();
  };

  const selectAll = () => {
    const allWeaponIds = filteredWeapons.map(weapon => weapon.id);
    setLocalSelectedWeapons(allWeaponIds);
  };

  const clearSelection = () => {
    setLocalSelectedWeapons([]);
  };

  const weaponTypeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToWeaponType = (type: string) => {
    const element = weaponTypeRefs.current[type];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">対象武器一覧</h2>
            {(currentGachaMode && currentGachaMode !== 'weapon') && (
              <p className="text-sm text-gray-400 mt-1">
                {currentGachaMode === 'sub' && subWeaponFilter && `サブ「${subWeaponFilter}」を持つ武器`}
                {currentGachaMode === 'special' && specialWeaponFilter && `スペシャル「${specialWeaponFilter}」を持つ武器`}
                {currentGachaMode === 'weapon-type' && weaponTypeFilter && `武器種「${weaponTypeFilter}」の武器`}
              </p>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 全選択・選択中表示・武器種アイコンナビゲーション */}
        <div className="mb-4 space-y-3">
          {/* 全選択・選択中表示 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-splatoon-orange text-white rounded-lg hover:bg-opacity-80 transition-colors text-sm font-medium"
              >
                全選択
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm font-medium"
              >
                選択解除
              </button>
            </div>
            <div className="text-sm text-gray-300">
              {localSelectedWeapons.length}個選択中
            </div>
          </div>

          {/* 武器種アイコンナビゲーション */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(weaponTypeLabels).map(type => {
              const hasWeapons = weaponsByType[type] && weaponsByType[type].length > 0;
              return (
                <button
                  key={type}
                  onClick={() => hasWeapons && scrollToWeaponType(type)}
                  disabled={!hasWeapons}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasWeapons
                      ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                  }`}
                  title={hasWeapons ? `${weaponTypeLabels[type]}にジャンプ` : `${weaponTypeLabels[type]}は対象外です`}
                >
                  <img
                    src={weaponTypeIcons[type]}
                    alt={weaponTypeLabels[type]}
                    className={`w-6 h-6 object-contain ${!hasWeapons ? 'opacity-50' : ''}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span>{weaponTypeLabels[type]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {Object.entries(weaponsByType).map(([type, typeWeapons]) => {
            const allSelected = typeWeapons.every(w => localSelectedWeapons.includes(w.id));
            const someSelected = typeWeapons.some(w => localSelectedWeapons.includes(w.id));

            return (
              <div 
                key={type} 
                className="mb-6"
                ref={(el) => weaponTypeRefs.current[type] = el}
              >
                <div className="flex items-center mb-3">
                  <button
                    onClick={() => toggleAllInType(type)}
                    className="flex items-center space-x-2 text-lg font-semibold text-gray-300 hover:text-white"
                  >
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      allSelected 
                        ? 'bg-splatoon-orange border-splatoon-orange' 
                        : someSelected 
                        ? 'bg-splatoon-orange border-splatoon-orange opacity-50'
                        : 'border-gray-400'
                    }`}>
                      {allSelected && <span className="text-white text-sm">✓</span>}
                      {!allSelected && someSelected && <span className="text-white text-sm">−</span>}
                    </div>
                    <span>{weaponTypeLabels[type] || type}</span>
                    <span className="text-sm text-gray-500">({typeWeapons.length})</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ml-7">
                  {typeWeapons.map(weapon => {
                    const isSelected = localSelectedWeapons.includes(weapon.id);
                    return (
                      <div
                        key={weapon.id}
                        onClick={() => toggleWeapon(weapon.id)}
                        className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-splatoon-orange bg-splatoon-orange bg-opacity-20'
                            : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                            isSelected 
                              ? 'bg-splatoon-orange border-splatoon-orange' 
                              : 'border-gray-400'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <img
                            src={weapon.iconUrl || `/images/weapons/${weapon.id}.png`}
                            alt={weapon.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/weapons/splattershot.png';
                            }}
                          />
                        </div>
                        <div className="text-white text-sm font-medium mb-1">{weapon.name}</div>
                        <div className="flex items-center space-x-1 text-xs text-gray-300">
                          <img
                            src={`/images/sub/${weapon.subWeapon.replace(/\s+/g, '_').toLowerCase()}.png`}
                            alt={weapon.subWeapon}
                            className="w-4 h-4"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/sub/splat_bomb.png';
                            }}
                          />
                          <img
                            src={`/images/special/${weapon.specialWeapon.replace(/\s+/g, '_').toLowerCase()}.png`}
                            alt={weapon.specialWeapon}
                            className="w-4 h-4"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/special/trizooka.png';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-splatoon-orange text-white rounded-lg hover:bg-opacity-80 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeaponSelectionModal;