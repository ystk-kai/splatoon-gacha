import { Weapon } from '@domain/entities/Weapon';
import { Player } from '@domain/entities/Player';
import { WeaponFilter } from '@domain/value-objects/WeaponFilter';
import { GachaResult } from '@domain/value-objects/GachaResult';
import { RandomizerService } from '@domain/services/RandomizerService';
import { IWeaponRepository } from '@infrastructure/repositories/WeaponRepository';

export interface ExecuteWeaponGachaInput {
  filter?: WeaponFilter;
  count?: number;
}

export interface ExecuteFromWeaponsInput {
  weapons: Weapon[];
  allowDuplicates?: boolean;
  existingWeapons?: Weapon[];
  count?: number;
}

export interface ExecuteWeaponGachaOutput {
  result: GachaResult;
  weapons: Weapon[];
}

export interface ExecuteMultiplayerGachaInput {
  players: Player[];
  filter?: WeaponFilter;
  isCustomMode?: boolean;
  selectedPlayerIds?: string[];
}

export interface ExecuteMultiplayerGachaOutput {
  result: GachaResult;
  players: Player[];
}

export class ExecuteWeaponGacha {
  private randomizer: RandomizerService;

  constructor(
    private weaponRepository: IWeaponRepository
  ) {
    this.randomizer = RandomizerService.getInstance();
  }

  async execute(input: ExecuteWeaponGachaInput = {}): Promise<ExecuteWeaponGachaOutput> {
    const { filter = WeaponFilter.all(), count = 1 } = input;

    // フィルターに基づいて武器を取得
    const availableWeapons = await this.weaponRepository.findByFilter(filter);

    if (availableWeapons.length === 0) {
      throw new Error('指定された条件に合う武器が見つかりません');
    }

    // ランダムに武器を選択
    const selectedWeapons = count === 1
      ? [this.randomizer.selectRandom(availableWeapons)!]
      : this.randomizer.selectMultipleRandom(availableWeapons, count);

    // ガチャ結果を作成
    const result = count === 1
      ? GachaResult.weapon(selectedWeapons[0], {
          totalWeapons: availableWeapons.length,
          filterApplied: !filter.isEmpty(),
        })
      : GachaResult.combined({
          weapon: selectedWeapons[0],
          metadata: {
            additionalWeapons: selectedWeapons.slice(1),
            totalWeapons: availableWeapons.length,
            filterApplied: !filter.isEmpty(),
            count,
          },
        });

    return {
      result,
      weapons: selectedWeapons,
    };
  }

  async executeFromWeapons(input: ExecuteFromWeaponsInput): Promise<ExecuteWeaponGachaOutput> {
    const { weapons, allowDuplicates = false, existingWeapons = [], count = 1 } = input;

    if (weapons.length === 0) {
      throw new Error('対象武器が指定されていません');
    }

    let availableWeapons = [...weapons];
    
    // 重複を許可しない場合、既に選ばれた武器を除外
    if (!allowDuplicates && existingWeapons.length > 0) {
      const existingIds = existingWeapons.map(w => w.id);
      availableWeapons = availableWeapons.filter(w => !existingIds.includes(w.id));
    }

    if (availableWeapons.length === 0) {
      throw new Error('選択可能な武器がありません（重複許可を有効にするか、対象武器を増やしてください）');
    }

    // ランダムに武器を選択
    let selectedWeapons: Weapon[];
    if (count === 1) {
      selectedWeapons = [this.randomizer.selectRandom(availableWeapons)!];
    } else if (allowDuplicates) {
      // 重複ありの場合、個別にランダム選択
      selectedWeapons = [];
      for (let i = 0; i < count; i++) {
        const weapon = this.randomizer.selectRandom(availableWeapons);
        if (weapon) {
          selectedWeapons.push(weapon);
        }
      }
    } else {
      // 重複なしの場合
      selectedWeapons = this.randomizer.selectMultipleRandom(availableWeapons, Math.min(count, availableWeapons.length));
    }

    // ガチャ結果を作成
    const result = count === 1
      ? GachaResult.weapon(selectedWeapons[0], {
          totalWeapons: weapons.length,
          availableWeapons: availableWeapons.length,
          allowDuplicates,
          existingCount: existingWeapons.length,
        })
      : GachaResult.combined({
          weapon: selectedWeapons[0],
          metadata: {
            additionalWeapons: selectedWeapons.slice(1),
            totalWeapons: weapons.length,
            availableWeapons: availableWeapons.length,
            allowDuplicates,
            existingCount: existingWeapons.length,
            count,
          },
        });

    return {
      result,
      weapons: selectedWeapons,
    };
  }

  async executeRandomMainSub(): Promise<ExecuteWeaponGachaOutput> {
    const allWeapons = await this.weaponRepository.findAll();
    
    if (allWeapons.length === 0) {
      throw new Error('武器データが見つかりません');
    }

    // ランダムにメイン武器を選択
    const mainWeapon = this.randomizer.selectRandom(allWeapons)!;
    
    // 全サブウェポンのリストを作成
    const allSubWeapons = [...new Set(allWeapons.map(w => w.subWeapon))];
    const randomSubWeapon = this.randomizer.selectRandom(allSubWeapons)!;
    
    // 全スペシャルウェポンのリストを作成
    const allSpecialWeapons = [...new Set(allWeapons.map(w => w.specialWeapon))];
    const randomSpecialWeapon = this.randomizer.selectRandom(allSpecialWeapons)!;
    
    // カスタム武器を作成
    const customWeapon = Weapon.create({
      id: `custom_${mainWeapon.id}`,
      name: `カスタム ${mainWeapon.name}`,
      type: mainWeapon.type,
      subWeapon: randomSubWeapon,
      specialWeapon: randomSpecialWeapon,
      iconUrl: mainWeapon.iconUrl,
      specialPoints: mainWeapon.specialPoints,
    });

    const result = GachaResult.weapon(customWeapon, {
      isCustom: true,
      baseWeapon: mainWeapon.name,
      originalSub: mainWeapon.subWeapon,
      originalSpecial: mainWeapon.specialWeapon,
    });

    return {
      result,
      weapons: [customWeapon],
    };
  }

  async executeForMultiplePlayers(input: ExecuteMultiplayerGachaInput): Promise<ExecuteMultiplayerGachaOutput> {
    const { players, filter = WeaponFilter.all(), isCustomMode = false, selectedPlayerIds } = input;

    // 対象プレイヤーを決定
    const targetPlayers = selectedPlayerIds 
      ? players.filter(p => selectedPlayerIds.includes(p.id))
      : players;

    if (targetPlayers.length === 0) {
      throw new Error('対象プレイヤーが指定されていません');
    }

    // 各プレイヤーに武器を割り当て
    const updatedPlayers = await Promise.all(
      players.map(async (player) => {
        // 選択されたプレイヤーのみ武器を更新
        if (!targetPlayers.some(tp => tp.id === player.id)) {
          return player;
        }

        let weapon: Weapon;
        if (isCustomMode) {
          const result = await this.executeRandomMainSub();
          weapon = result.weapons[0];
        } else {
          const availableWeapons = await this.weaponRepository.findByFilter(filter);
          if (availableWeapons.length === 0) {
            throw new Error('指定された条件に合う武器が見つかりません');
          }
          weapon = this.randomizer.selectRandom(availableWeapons)!;
        }

        return player.withWeapon(weapon);
      })
    );

    const result = GachaResult.multiplayer(updatedPlayers, {
      isRegacha: true,
      targetPlayerCount: targetPlayers.length,
      totalPlayerCount: players.length,
      filter: filter.isEmpty() ? null : filter.toString(),
      isCustomMode,
    });

    return {
      result,
      players: updatedPlayers,
    };
  }
}