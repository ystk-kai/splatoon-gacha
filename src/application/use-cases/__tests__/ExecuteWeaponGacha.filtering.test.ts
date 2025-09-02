import { ExecuteWeaponGacha, ExecuteFromWeaponsInput } from '../ExecuteWeaponGacha';
import { Weapon } from '../../../domain/entities/Weapon';
import { WeaponRepository } from '../../../infrastructure/repositories/WeaponRepository';

// モック武器データ
const mockWeapons: Weapon[] = [
  Weapon.create({
    id: 'splattershot',
    name: 'スプラシューター',
    type: 'shooter',
    subWeapon: 'キューバンボム',
    specialWeapon: 'ウルトラショット',
  }),
  Weapon.create({
    id: 'splat_roller',
    name: 'スプラローラー',
    type: 'roller',
    subWeapon: 'キューバンボム', 
    specialWeapon: 'グレートバリア',
  }),
  Weapon.create({
    id: 'tentatek_splattershot',
    name: 'スプラシューターコラボ',
    type: 'shooter',
    subWeapon: 'スプラッシュボム',
    specialWeapon: 'トリプルトルネード',
  }),
  Weapon.create({
    id: 'carbon_roller',
    name: 'カーボンローラー',
    type: 'roller',
    subWeapon: 'オートボム',
    specialWeapon: 'ジェットパック',
  }),
];

// WeaponRepositoryのモック
class MockWeaponRepository {
  async findAll(): Promise<Weapon[]> {
    return mockWeapons;
  }

  async findById(id: string): Promise<Weapon | undefined> {
    return mockWeapons.find(w => w.id === id);
  }

  async findByFilter(): Promise<Weapon[]> {
    return mockWeapons;
  }

  async getWeaponsByType(type: string): Promise<Weapon[]> {
    return mockWeapons.filter(w => w.type === type);
  }

  async getRandomWeapon(): Promise<Weapon | undefined> {
    return mockWeapons[0];
  }
}

describe('ExecuteWeaponGacha フィルタリング機能テスト', () => {
  let useCase: ExecuteWeaponGacha;
  let repository: MockWeaponRepository;

  beforeEach(() => {
    repository = new MockWeaponRepository();
    useCase = new ExecuteWeaponGacha(repository as any);
  });

  describe('executeFromWeapons - 基本フィルタリング', () => {
    test('指定された武器からランダム選択される', async () => {
      const targetWeapons = [mockWeapons[0], mockWeapons[1]]; // 2つの武器を指定
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: true,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(1);
      expect(targetWeapons.map(w => w.id)).toContain(result.weapons[0].id);
    });

    test('重複を許可しない場合、既存武器は除外される', async () => {
      const targetWeapons = [mockWeapons[0], mockWeapons[1]];
      const existingWeapons = [mockWeapons[0]]; // 最初の武器は既に選択済み
      
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: false,
        existingWeapons,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(1);
      expect(result.weapons[0].id).toBe(mockWeapons[1].id); // 2番目の武器のみ選択可能
    });

    test('選択可能な武器がない場合エラーが発生', async () => {
      const targetWeapons = [mockWeapons[0]];
      const existingWeapons = [mockWeapons[0]]; // 同じ武器が既に選択済み
      
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: false,
        existingWeapons,
        count: 1
      };

      await expect(useCase.executeFromWeapons(input)).rejects.toThrow(
        '選択可能な武器がありません（重複許可を有効にするか、対象武器を増やしてください）'
      );
    });
  });

  describe('executeFromWeapons - 複数プレイヤー対応', () => {
    test('重複許可で複数プレイヤー分の武器を選択', async () => {
      const targetWeapons = [mockWeapons[0]]; // 1つの武器のみ
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: true,
        count: 3 // 3人分
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(3);
      // 全て同じ武器が選択される
      result.weapons.forEach(weapon => {
        expect(weapon.id).toBe(mockWeapons[0].id);
      });
    });

    test('重複なしで複数プレイヤー分の武器を選択', async () => {
      const targetWeapons = mockWeapons; // 全武器
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: false,
        count: 3 // 3人分
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(3);
      
      // 全て異なる武器が選択される
      const weaponIds = result.weapons.map(w => w.id);
      const uniqueIds = [...new Set(weaponIds)];
      expect(uniqueIds).toHaveLength(3);
    });

    test('対象武器数より多いプレイヤー数で重複なしの場合', async () => {
      const targetWeapons = [mockWeapons[0], mockWeapons[1]]; // 2つの武器
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: false,
        count: 4 // 4人分（武器数を超える）
      };

      const result = await useCase.executeFromWeapons(input);

      // 利用可能な武器数まで（2個）しか返されない
      expect(result.weapons).toHaveLength(2);
      
      // 全て異なる武器
      const weaponIds = result.weapons.map(w => w.id);
      const uniqueIds = [...new Set(weaponIds)];
      expect(uniqueIds).toHaveLength(2);
    });
  });

  describe('サブウェポン・スペシャルウェポンフィルタリング', () => {
    test('特定のサブウェポンを持つ武器のみフィルタリング', async () => {
      // キューバンボムを持つ武器のみ
      const cubanBombWeapons = mockWeapons.filter(w => w.subWeapon === 'キューバンボム');
      
      const input: ExecuteFromWeaponsInput = {
        weapons: cubanBombWeapons,
        allowDuplicates: true,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(1);
      expect(result.weapons[0].subWeapon).toBe('キューバンボム');
    });

    test('特定のスペシャルウェポンを持つ武器のみフィルタリング', async () => {
      // ウルトラショットを持つ武器のみ
      const ultraShotWeapons = mockWeapons.filter(w => w.specialWeapon === 'ウルトラショット');
      
      const input: ExecuteFromWeaponsInput = {
        weapons: ultraShotWeapons,
        allowDuplicates: true,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(1);
      expect(result.weapons[0].specialWeapon).toBe('ウルトラショット');
    });

    test('特定の武器種のみフィルタリング', async () => {
      // シューター系のみ
      const shooterWeapons = mockWeapons.filter(w => w.type === 'shooter');
      
      const input: ExecuteFromWeaponsInput = {
        weapons: shooterWeapons,
        allowDuplicates: true,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      expect(result.weapons).toHaveLength(1);
      expect(result.weapons[0].type).toBe('shooter');
    });
  });

  describe('ガチャ結果メタデータ', () => {
    test('ガチャ結果に適切なメタデータが含まれる', async () => {
      const targetWeapons = [mockWeapons[0], mockWeapons[1]];
      const existingWeapons = [mockWeapons[2]];
      
      const input: ExecuteFromWeaponsInput = {
        weapons: targetWeapons,
        allowDuplicates: false,
        existingWeapons,
        count: 1
      };

      const result = await useCase.executeFromWeapons(input);

      // メタデータの確認
      expect(result.result).toBeDefined();
    });
  });
});