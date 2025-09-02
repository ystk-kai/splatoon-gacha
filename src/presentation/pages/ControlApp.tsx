import React, { useState, useCallback } from 'react';
import { WeaponGachaPanel } from '../components/control/WeaponGachaPanel';
import { ConnectionStatus } from '../components/shared/ConnectionStatus';
import { Weapon } from '@domain/entities/Weapon';
import { Player } from '@domain/entities/Player';
import { WeaponFilter } from '@domain/value-objects/WeaponFilter';
import { WeaponRepository } from '@infrastructure/repositories/WeaponRepository';
import { ExecuteWeaponGacha } from '@application/use-cases/ExecuteWeaponGacha';
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';

export const ControlApp: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastGachaSettings, setLastGachaSettings] = useState<{
    isCustomMode: boolean;
    selectedTypes: string[];
  }>({ isCustomMode: false, selectedTypes: [] });

  // プレイヤーの選択状態を切り替える
  const togglePlayerSelection = useCallback((playerId: string) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id === playerId 
          ? player.withSelection(!player.isSelected)
          : player
      )
    );
  }, []);

  // 単一武器選択時の処理（1人でも複数プレイヤー形式で処理）
  const handleSingleWeaponSelected = useCallback((weapon: Weapon) => {
    // 1人の場合でもPlayerオブジェクトを作成してplayers配列に設定
    const singlePlayer = Player.create({
      id: 'player1',
      name: 'Player 1',
      weapon: weapon,
      isSelected: true  // デフォルトで選択状態
    });
    setPlayers([singlePlayer]);
  }, []);

  // プレイヤーのガチャ結果処理（1人でも複数人でも統一）
  const handleMultiplePlayersSelected = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
  }, []);

  // ガチャ設定を保存するコールバック
  const handleGachaSettingsUpdate = useCallback((settings: {
    isCustomMode: boolean;
    selectedTypes: string[];
  }) => {
    setLastGachaSettings(settings);
  }, []);

  // 再ガチャの処理
  const handleRegacha = useCallback(async () => {
    const selectedPlayers = players.filter(p => p.isSelected);
    if (selectedPlayers.length === 0 || isSpinning) return;

    console.log('再ガチャ前のプレイヤー:', players);
    console.log('選択されたプレイヤー:', selectedPlayers);
    
    setIsSpinning(true);
    
    setTimeout(async () => {
      try {
        const repository = new WeaponRepository();
        const useCase = new ExecuteWeaponGacha(repository);
        const webSocketService = WebSocketService.getInstance();

        const selectedPlayerIds = selectedPlayers.map(p => p.id);
        
        const filter = lastGachaSettings.selectedTypes.length > 0
          ? WeaponFilter.byTypes(lastGachaSettings.selectedTypes as any)
          : WeaponFilter.all();

        const result = await useCase.executeForMultiplePlayers({
          players,
          filter,
          isCustomMode: lastGachaSettings.isCustomMode,
          selectedPlayerIds,
        });

        if (result.players.length > 0) {
          console.log('再ガチャ結果:', result.players);
          
          // 再ガチャ後も選択状態を維持するため、元の選択状態を復元
          const updatedPlayers = result.players.map(newPlayer => {
            const originalPlayer = players.find(p => p.id === newPlayer.id);
            return originalPlayer ? newPlayer.withSelection(originalPlayer.isSelected) : newPlayer;
          });
          
          setPlayers(updatedPlayers);
          

          // WebSocketでオーバーレイに結果を送信
          const sent = await webSocketService.sendGachaResult(result.result);
          if (!sent) {
            console.warn('オーバーレイサーバーへの送信に失敗しました');
          }
        }
      } catch (error) {
        console.error('再ガチャエラー:', error);
      } finally {
        setIsSpinning(false);
      }
    }, 2000);
  }, [players, isSpinning]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-splatoon-orange to-splatoon-purple">
            Splatoon Gacha
          </h1>
          <p className="text-gray-400 mt-2">配信用ランダム武器選択ツール</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-8">
            <WeaponGachaPanel
              onWeaponSelected={handleSingleWeaponSelected}
              onMultiplePlayersSelected={handleMultiplePlayersSelected}
              onSettingsUpdate={handleGachaSettingsUpdate}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
            />
            <ConnectionStatus />
          </div>

          <div className="space-y-8">
            {players.length > 0 && (
              <div className="weapon-card bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-splatoon-orange">
                    選択された武器
                  </h3>
                  {players.length > 1 && (
                    <div className="text-sm text-gray-300">
                      {players.filter(p => p.isSelected).length}人選択中
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => togglePlayerSelection(player.id)}
                      className={`player-card ${
                        player.isSelected ? 'player-card-selected' : 'player-card-unselected'
                      }`}
                    >
                      {player.isSelected && (
                        <div className="selection-indicator">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      <div className="mb-2">
                        <div className="text-lg font-bold text-white">
                          {player.name}
                        </div>
                        {player.weapon && (
                          <>
                            <div className="text-2xl font-bold text-splatoon-orange mt-2">
                              {player.weapon.name}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                              <div className="bg-gray-900 rounded-lg p-2">
                                <div className="text-gray-400 mb-1">タイプ</div>
                                <div className="text-white font-semibold">
                                  {getWeaponTypeLabel(player.weapon.type)}
                                </div>
                              </div>
                              <div className="bg-gray-900 rounded-lg p-2">
                                <div className="text-gray-400 mb-1">サブ</div>
                                <div className="text-white font-semibold">
                                  {getSubWeaponLabel(player.weapon.subWeapon)}
                                </div>
                              </div>
                              <div className="bg-gray-900 rounded-lg p-2">
                                <div className="text-gray-400 mb-1">スペシャル</div>
                                <div className="text-white font-semibold">
                                  {getSpecialWeaponLabel(player.weapon.specialWeapon)}
                                </div>
                              </div>
                              <div className="bg-gray-900 rounded-lg p-2">
                                <div className="text-gray-400 mb-1">必要ポイント</div>
                                <div className="text-white font-semibold">
                                  {player.weapon.specialPoints}p
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {players.length > 0 && players.some(p => p.isSelected) && (
                    <button
                      onClick={() => handleRegacha()}
                      disabled={isSpinning}
                      className={`w-full text-lg ${
                        isSpinning
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed animate-pulse py-3 px-6 rounded-lg font-bold'
                          : 'regacha-button'
                      }`}
                    >
                      {isSpinning ? '再抽選中...' : `選択した${players.filter(p => p.isSelected).length}人で再ガチャ`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <div className="space-y-2">
            <p>OBS Browser Source: http://localhost:3000/overlay</p>
            <p className="text-xs">
              ガチャを回すと自動的にオーバーレイに結果が表示されます
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

function getWeaponTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
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
  return typeLabels[type] || type;
}

function getSubWeaponLabel(sub: string): string {
  const subLabels: Record<string, string> = {
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
  return subLabels[sub] || sub;
}

function getSpecialWeaponLabel(special: string): string {
  const specialLabels: Record<string, string> = {
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
  };
  return specialLabels[special] || special;
}