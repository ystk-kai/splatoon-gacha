/**
 * サブ武器選択コンポーネント
 * ダッシュボードと視聴者画面で共通利用
 */
const SubWeaponSelector = ({ 
  selectedSubWeapon, 
  setSelectedSubWeapon,
  weaponsData,
  getSubWeaponLabel
}) => {
  // 視聴者画面向けの固定リスト（IDベース）
  const subWeaponIds = ['splat_bomb', 'suction_bomb', 'burst_bomb', 'curling_bomb', 'autobomb', 'ink_mine', 'toxic_mist', 'point_sensor', 'splash_wall', 'sprinkler', 'squid_beakon', 'fizzy_bomb', 'torpedo', 'angle_shooter'];
  
  // ダッシュボード向けのデータベース連携（名前ベース）
  const subWeaponsList = weaponsData?.subWeapons || subWeaponIds.map(id => ({ id, name: getSubWeaponLabel(id) }));

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-lg font-semibold text-white">サブ武器を選択：</h3>
      <div className="grid grid-cols-4 gap-2">
        {subWeaponsList.map(sub => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubWeapon(sub.id)}
            className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-2 ${
              selectedSubWeapon === sub.id
                ? 'bg-splatoon-orange text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <img src={`/images/sub/${sub.id}.png`} 
                 alt={sub.id} className="w-8 h-8" />
            <span className="text-xs">{sub.name || getSubWeaponLabel(sub.id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// モジュールとしてエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubWeaponSelector;
} else {
  window.SubWeaponSelector = SubWeaponSelector;
}