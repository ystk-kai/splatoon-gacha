/**
 * スペシャル武器選択コンポーネント
 * ダッシュボードと視聴者画面で共通利用
 */
const SpecialWeaponSelector = ({ 
  selectedSpecialWeapon, 
  setSelectedSpecialWeapon,
  weaponsData,
  getSpecialWeaponLabel
}) => {
  // 視聴者画面向けの固定リスト（IDベース）
  const specialWeaponIds = ['trizooka', 'big_bubbler', 'zipcaster', 'tenta_missiles', 'ink_storm', 'booyah_bomb', 'wave_breaker', 'ink_vac', 'killer_wail_5_1', 'inkjet', 'ultra_stamp', 'crab_tank', 'reefslider', 'triple_inkstrike', 'tacticooler', 'splattercolor_screen', 'triple_splashdown', 'super_chump', 'kraken_royale'];
  
  // ダッシュボード向けのデータベース連携（名前ベース）
  const specialWeaponsList = weaponsData?.specialWeapons || specialWeaponIds.map(id => ({ id, name: getSpecialWeaponLabel(id) }));

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-lg font-semibold text-white">スペシャル武器を選択：</h3>
      <div className="grid grid-cols-4 gap-2">
        {specialWeaponsList.map(special => (
          <button
            key={special.id}
            onClick={() => setSelectedSpecialWeapon(special.id)}
            className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
              selectedSpecialWeapon === special.id
                ? 'bg-splatoon-orange text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <img src={`/images/special/${special.id}.png`} 
                 alt={special.id} className="w-8 h-8" />
            <span className="text-xs">{special.name || getSpecialWeaponLabel(special.id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpecialWeaponSelector;
} else {
  window.SpecialWeaponSelector = SpecialWeaponSelector;
}