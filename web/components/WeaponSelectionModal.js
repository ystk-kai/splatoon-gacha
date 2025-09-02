/**
 * 武器選択モーダルコンポーネント
 * ダッシュボードと視聴者画面で共通利用
 */
const WeaponSelectionModal = ({ 
  showWeaponList, 
  setShowWeaponList, 
  weaponsData, 
  selectedWeapons, 
  setSelectedWeapons, 
  getFilteredWeaponsForModal,
  getFilterDescription,
  getWeaponTypeLabel,
  getSubWeaponLabel,
  getSpecialWeaponLabel,
  enableScrollAnimation = true // スクロールアニメーション有効/無効
}) => {
  
  if (!showWeaponList || !weaponsData) {
    return null;
  }

  const filteredWeapons = getFilteredWeaponsForModal(weaponsData.weapons);
  const weaponTypeOrder = ['shooter', 'blaster', 'roller', 'brush', 'charger', 'slosher', 'splatling', 'dualies', 'brella', 'stringer', 'splatana'];

  // ナビゲーション用の武器種別選択状態
  const [selectedWeaponType, setSelectedWeaponType] = React.useState(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-6xl max-h-[90vh] w-full flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">対象武器一覧</h3>
            <button
              onClick={() => setShowWeaponList(false)}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* フィルタリング説明 */}
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">
              現在のフィルタリング:
            </div>
            <div className="text-sm text-splatoon-orange font-semibold">
              {getFilterDescription()}
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                const filteredSelectedCount = filteredWeapons.filter(weapon => selectedWeapons.includes(weapon.id)).length;
                if (filteredSelectedCount === filteredWeapons.length) {
                  // 現在フィルタリングされた武器の選択を解除
                  const filteredWeaponIds = filteredWeapons.map(w => w.id);
                  setSelectedWeapons(prev => prev.filter(id => !filteredWeaponIds.includes(id)));
                } else {
                  // 現在フィルタリングされた武器を選択状態に追加
                  const filteredWeaponIds = filteredWeapons.map(w => w.id);
                  setSelectedWeapons(prev => [...new Set([...prev, ...filteredWeaponIds])]);
                }
              }}
              className="px-4 py-2 bg-splatoon-orange hover:bg-orange-600 text-white rounded-lg text-sm"
            >
              {filteredWeapons.filter(weapon => selectedWeapons.includes(weapon.id)).length === filteredWeapons.length ? '全選択解除' : '全選択'}
            </button>
            <div className="text-sm text-gray-300 flex items-center">
              選択中: {filteredWeapons.filter(weapon => selectedWeapons.includes(weapon.id)).length} / {filteredWeapons.length}種
            </div>
          </div>
          
          {/* 武器種アイコンナビゲーション */}
          <div className="mt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {weaponTypeOrder.map(weaponType => {
                const weaponsOfType = filteredWeapons.filter(weapon => weapon.type === weaponType);
                if (weaponsOfType.length === 0) return null;
                
                return (
                  <button
                    key={weaponType}
                    onClick={() => {
                      if (enableScrollAnimation) {
                        // 以前のアニメーションを全て停止
                        const previousHighlighted = document.querySelector('[data-weapon-highlight="true"]');
                        if (previousHighlighted) {
                          previousHighlighted.removeAttribute('data-weapon-highlight');
                          previousHighlighted.style.transition = '';
                          previousHighlighted.style.boxShadow = '';
                          previousHighlighted.style.backgroundColor = '';
                          previousHighlighted.style.borderRadius = '';
                          previousHighlighted.style.padding = '';
                          previousHighlighted.style.border = '';
                          previousHighlighted.style.animation = '';
                        }
                        
                        const targetElement = document.querySelector(`[data-weapon-type="${weaponType}"]`);
                        if (targetElement) {
                          // 現在のアニメーション対象としてマーク
                          targetElement.setAttribute('data-weapon-highlight', 'true');
                          
                          // スクロール実行
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          
                          // ハイライトアニメーション
                          targetElement.style.transition = 'all 0.3s ease-in-out';
                          targetElement.style.boxShadow = '0 0 20px rgba(255, 102, 0, 0.8), 0 0 40px rgba(255, 102, 0, 0.4)';
                          targetElement.style.backgroundColor = 'rgba(255, 102, 0, 0.1)';
                          targetElement.style.borderRadius = '8px';
                          targetElement.style.padding = '8px';
                          targetElement.style.border = '2px solid rgba(255, 102, 0, 0.6)';
                          
                          // パルス（点滅）エフェクト
                          targetElement.style.animation = 'pulse-highlight 1s ease-in-out 3';
                          
                          // CSS keyframes を動的に追加（まだ存在しない場合）
                          if (!document.querySelector('#pulse-highlight-keyframes')) {
                            const style = document.createElement('style');
                            style.id = 'pulse-highlight-keyframes';
                            style.textContent = '@keyframes pulse-highlight {' +
                              '0% { box-shadow: 0 0 20px rgba(255, 102, 0, 0.8), 0 0 40px rgba(255, 102, 0, 0.4); }' +
                              '50% { box-shadow: 0 0 30px rgba(255, 102, 0, 1), 0 0 60px rgba(255, 102, 0, 0.6); }' +
                              '100% { box-shadow: 0 0 20px rgba(255, 102, 0, 0.8), 0 0 40px rgba(255, 102, 0, 0.4); }' +
                              '}';
                            document.head.appendChild(style);
                          }
                          
                          // 3秒後にエフェクトを削除（パルスアニメーション完了後）
                          setTimeout(() => {
                            // マークが残っている場合のみエフェクトを削除
                            if (targetElement.getAttribute('data-weapon-highlight') === 'true') {
                              targetElement.removeAttribute('data-weapon-highlight');
                              targetElement.style.boxShadow = '';
                              targetElement.style.backgroundColor = '';
                              targetElement.style.border = '';
                              targetElement.style.animation = '';
                              
                              // さらに0.5秒後に transition も削除
                              setTimeout(() => {
                                targetElement.style.transition = '';
                                targetElement.style.borderRadius = '';
                                targetElement.style.padding = '';
                              }, 500);
                            }
                          }, 3000);
                        }
                      } else {
                        // シンプルなスクロール
                        const targetElement = document.querySelector(`[data-weapon-type="${weaponType}"]`);
                        if (targetElement) {
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className={`flex-shrink-0 p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                      selectedWeaponType === weaponType
                        ? 'bg-splatoon-orange text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title={`${getWeaponTypeLabel(weaponType)}の武器にスクロール`}
                  >
                    <img src={`/images/weapon-types/${weaponType}.png`} 
                         alt={weaponType} className="w-8 h-8" />
                    <span className="text-xs">{getWeaponTypeLabel(weaponType)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {weaponTypeOrder.map(weaponType => {
            const weaponsOfType = filteredWeapons.filter(weapon => weapon.type === weaponType);
            if (weaponsOfType.length === 0) return null;
            
            return (
              <div key={weaponType} className="mb-8" data-weapon-type={weaponType}>
                <div className="flex items-center gap-3 mb-4">
                  <h4 className="text-lg font-semibold text-splatoon-orange">
                    {getWeaponTypeLabel(weaponType)}
                  </h4>
                  <button
                    onClick={() => {
                      const typeWeaponIds = weaponsOfType.map(w => w.id);
                      const allSelected = typeWeaponIds.every(id => selectedWeapons.includes(id));
                      
                      if (allSelected) {
                        setSelectedWeapons(prev => prev.filter(id => !typeWeaponIds.includes(id)));
                      } else {
                        setSelectedWeapons(prev => [...new Set([...prev, ...typeWeaponIds])]);
                      }
                    }}
                    className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
                  >
                    {weaponsOfType.every(w => selectedWeapons.includes(w.id)) ? '全解除' : '全選択'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weaponsOfType.map(weapon => (
                    <div
                      key={weapon.id}
                      onClick={() => {
                        if (selectedWeapons.includes(weapon.id)) {
                          setSelectedWeapons(prev => prev.filter(id => id !== weapon.id));
                        } else {
                          setSelectedWeapons(prev => [...prev, weapon.id]);
                        }
                      }}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                        selectedWeapons.includes(weapon.id)
                          ? 'bg-splatoon-orange bg-opacity-20 border-splatoon-orange'
                          : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`/images/weapons/${weapon.id}.png`}
                          alt={weapon.name}
                          className="w-12 h-12 object-contain"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white text-sm">
                            {weapon.name}
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>サブ: {getSubWeaponLabel(weapon.subWeapon)}</div>
                            <div>スペシャル: {getSpecialWeaponLabel(weapon.specialWeapon)}</div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedWeapons.includes(weapon.id)}
                            onChange={() => {}}
                            className="w-4 h-4 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={() => setShowWeaponList(false)}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeaponSelectionModal;
} else {
  window.WeaponSelectionModal = WeaponSelectionModal;
}