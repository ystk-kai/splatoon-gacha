import React, { useState, useCallback, useEffect } from 'react';
import { Weapon } from '@domain/entities/Weapon';
import { Player } from '@domain/entities/Player';
import { WeaponFilter } from '@domain/value-objects/WeaponFilter';
import { GachaResult } from '@domain/value-objects/GachaResult';
import { WeaponRepository } from '@infrastructure/repositories/WeaponRepository';
import { ExecuteWeaponGacha } from '@application/use-cases/ExecuteWeaponGacha';
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';
import WeaponSelectionModal from '../shared/WeaponSelectionModal';

interface WeaponGachaPanelProps {
  onWeaponSelected: (weapon: Weapon) => void;
  onMultiplePlayersSelected?: (players: Player[]) => void;
  onSettingsUpdate?: (settings: { isCustomMode: boolean; selectedTypes: string[]; selectedWeapons: string[]; allowDuplicates: boolean }) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
}

export const WeaponGachaPanel: React.FC<WeaponGachaPanelProps> = ({
  onWeaponSelected,
  onMultiplePlayersSelected,
  onSettingsUpdate,
  isSpinning,
  setIsSpinning,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [playerCount, setPlayerCount] = useState(1);
  const [selectedWeapons, setSelectedWeapons] = useState<string[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [availableWeapons, setAvailableWeapons] = useState<Weapon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 武器データを初期化
  useEffect(() => {
    const repository = new WeaponRepository();
    repository.findAll().then(weapons => {
      setAvailableWeapons(weapons);
      // 初期状態では全武器を選択状態にする
      setSelectedWeapons(weapons.map(w => w.id));
    });
  }, []);

  // 設定変更時に親に通知
  useEffect(() => {
    if (onSettingsUpdate) {
      onSettingsUpdate({ isCustomMode, selectedTypes, selectedWeapons, allowDuplicates });
    }
  }, [isCustomMode, selectedTypes, selectedWeapons, allowDuplicates, onSettingsUpdate]);

  const handleGacha = useCallback(async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);

    // アニメーション用の遅延
    setTimeout(async () => {
      try {
        const repository = new WeaponRepository();
        const useCase = new ExecuteWeaponGacha(repository);
        const webSocketService = WebSocketService.getInstance();

        // 全プレイヤー数に対して統一した処理
        const players: Player[] = [];
        
        for (let i = 0; i < playerCount; i++) {
          let result;
          if (isCustomMode) {
            result = await useCase.executeRandomMainSub();
          } else {
            // 選択された武器リストから抽選
            const targetWeapons = availableWeapons.filter(weapon => {
              // 武器種フィルター
              if (selectedTypes.length > 0 && !selectedTypes.includes(weapon.type)) {
                return false;
              }
              // 個別武器選択フィルター
              if (selectedWeapons.length > 0 && !selectedWeapons.includes(weapon.id)) {
                return false;
              }
              return true;
            });
            
            result = await useCase.executeFromWeapons({
              weapons: targetWeapons,
              allowDuplicates,
              existingWeapons: allowDuplicates ? [] : players.map(p => p.weapon!)
            });
          }

          if (result.weapons.length > 0) {
            const player = Player.create({
              id: `player${i + 1}`,
              name: `Player ${i + 1}`,
              weapon: result.weapons[0],
              isSelected: true  // デフォルトで選択状態
            });
            players.push(player);
          }
        }

        if (players.length > 0) {
          // 複数プレイヤーの結果を通知（1人でも同じ形式で処理）
          if (onMultiplePlayersSelected) {
            onMultiplePlayersSelected(players);
          }
          
          // 互換性のために最初のプレイヤーの武器をonWeaponSelectedでも通知
          if (players[0].weapon) {
            onWeaponSelected(players[0].weapon);
          }
          
          // WebSocketで結果を送信（常にmultiplayerタイプで統一）
          if (players.length > 0) {
            // 1人でも複数人でも常にmultiplayerタイプのGachaResultを送信
            const gachaResult = GachaResult.multiplayer(players, {
              totalPlayers: players.length,
              isCustomMode: isCustomMode,
              isSinglePlayer: players.length === 1,
            });
            
            const sent = await webSocketService.sendGachaResult(gachaResult);
            if (!sent) {
              console.warn('オーバーレイサーバーへの送信に失敗しました');
            }
            
            console.log(`${players.length}人のガチャ結果:`, players);
          }
        }
      } catch (error) {
        console.error('ガチャエラー:', error);
      } finally {
        setIsSpinning(false);
      }
    }, 2000);
  }, [isSpinning, selectedTypes, isCustomMode, playerCount, selectedWeapons, allowDuplicates, availableWeapons, onWeaponSelected, onMultiplePlayersSelected, setIsSpinning]);

  const weaponTypes = [
    { id: 'shooter', label: 'シューター' },
    { id: 'blaster', label: 'ブラスター' },
    { id: 'roller', label: 'ローラー' },
    { id: 'charger', label: 'チャージャー' },
    { id: 'slosher', label: 'スロッシャー' },
    { id: 'splatling', label: 'スピナー' },
    { id: 'dualies', label: 'マニューバー' },
    { id: 'brella', label: 'シェルター' },
    { id: 'brush', label: 'フデ' },
    { id: 'stringer', label: 'ストリンガー' },
    { id: 'splatana', label: 'ワイパー' },
  ];

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-white">武器ガチャ</h2>

      <div className="space-y-6">
        {/* プレイヤー数設定 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-300">
            プレイヤー数
          </h3>
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map(count => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className={`player-count-button ${
                  playerCount === count
                    ? 'player-count-button-selected'
                    : 'player-count-button-unselected'
                }`}
              >
                {count}人
              </button>
            ))}
          </div>
        </div>

        {/* カスタムモード切り替え */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="custom-mode"
            checked={isCustomMode}
            onChange={(e) => setIsCustomMode(e.target.checked)}
            className="w-5 h-5 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange"
          />
          <label htmlFor="custom-mode" className="text-white">
            カスタムモード（メイン・サブ・スペシャルをランダム組み合わせ）
          </label>
        </div>

        {/* 武器タイプフィルター */}
        {!isCustomMode && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-300">
              武器タイプフィルター
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {weaponTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedTypes.includes(type.id)
                      ? 'bg-splatoon-orange text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                ※未選択の場合、全武器から選択されます
              </p>
            )}

            {/* 対象武器一覧ボタン */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                対象武器一覧 ({selectedWeapons.length}/{availableWeapons.length})
              </button>
            </div>

            {/* 同じ武器をガチャ対象に含めるチェックボックス */}
            <div className="flex items-center space-x-3 mt-4">
              <input
                type="checkbox"
                id="allow-duplicates"
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                className="w-5 h-5 text-splatoon-orange bg-gray-700 border-gray-600 rounded focus:ring-splatoon-orange"
              />
              <label htmlFor="allow-duplicates" className="text-white">
                同じ武器をガチャ対象に含める
              </label>
            </div>
          </div>
        )}

        {/* ガチャボタン */}
        <button
          onClick={handleGacha}
          disabled={isSpinning}
          className={`w-full py-4 px-6 rounded-lg font-bold text-xl transition-all transform ${
            isSpinning
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed animate-pulse'
              : 'gacha-button hover:scale-105 active:scale-95'
          }`}
        >
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
              抽選中...
            </span>
          ) : (
            '武器ガチャを回す！'
          )}
        </button>
      </div>

      {/* 武器選択モーダル */}
      <WeaponSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        weapons={availableWeapons}
        selectedWeapons={selectedWeapons}
        onWeaponsChange={setSelectedWeapons}
        selectedTypes={selectedTypes}
      />
    </div>
  );
};