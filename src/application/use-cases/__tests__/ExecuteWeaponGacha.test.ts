import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecuteWeaponGacha } from '../ExecuteWeaponGacha';
import { WeaponRepository } from '@infrastructure/repositories/WeaponRepository';
import { Weapon } from '@domain/entities/Weapon';
import { WeaponFilter } from '@domain/value-objects/WeaponFilter';

describe('ExecuteWeaponGacha', () => {
  let repository: WeaponRepository;
  let useCase: ExecuteWeaponGacha;

  const mockWeapons = [
    Weapon.create({
      id: 'weapon1',
      name: 'わかばシューター',
      type: 'shooter',
      subWeapon: 'splat_bomb',
      specialWeapon: 'big_bubbler',
      specialPoints: 180,
    }),
    Weapon.create({
      id: 'weapon2',
      name: 'スプラローラー',
      type: 'roller',
      subWeapon: 'curling_bomb',
      specialWeapon: 'big_bubbler',
      specialPoints: 200,
    }),
    Weapon.create({
      id: 'weapon3',
      name: 'スプラチャージャー',
      type: 'charger',
      subWeapon: 'splat_bomb',
      specialWeapon: 'ink_vac',
      specialPoints: 200,
    }),
  ];

  beforeEach(() => {
    repository = new WeaponRepository();
    useCase = new ExecuteWeaponGacha(repository);
  });

  describe('execute', () => {
    it('フィルターなしで武器を1つ取得できる', async () => {
      vi.spyOn(repository, 'findByFilter').mockResolvedValue(mockWeapons);

      const result = await useCase.execute();

      expect(result.weapons).toHaveLength(1);
      expect(mockWeapons).toContainEqual(result.weapons[0]);
      expect(result.result.type).toBe('weapon');
      expect(result.result.weapon).toBeDefined();
    });

    it('フィルター付きで武器を取得できる', async () => {
      const shooterWeapons = mockWeapons.filter(w => w.type === 'shooter');
      vi.spyOn(repository, 'findByFilter').mockResolvedValue(shooterWeapons);

      const filter = WeaponFilter.byTypes(['shooter']);
      const result = await useCase.execute({ filter });

      expect(result.weapons).toHaveLength(1);
      expect(result.weapons[0].type).toBe('shooter');
    });

    it('複数の武器を取得できる', async () => {
      vi.spyOn(repository, 'findByFilter').mockResolvedValue(mockWeapons);

      const result = await useCase.execute({ count: 2 });

      expect(result.weapons).toHaveLength(2);
      result.weapons.forEach(weapon => {
        expect(mockWeapons).toContainEqual(weapon);
      });
    });

    it('利用可能な武器がない場合はエラーを投げる', async () => {
      vi.spyOn(repository, 'findByFilter').mockResolvedValue([]);

      await expect(useCase.execute()).rejects.toThrow('指定された条件に合う武器が見つかりません');
    });
  });

  describe('executeRandomMainSub', () => {
    it('カスタム武器を生成できる', async () => {
      vi.spyOn(repository, 'findAll').mockResolvedValue(mockWeapons);

      const result = await useCase.executeRandomMainSub();

      expect(result.weapons).toHaveLength(1);
      const customWeapon = result.weapons[0];
      expect(customWeapon.id).toContain('custom_');
      expect(customWeapon.name).toContain('カスタム');
      
      // サブとスペシャルが存在するものから選ばれていることを確認
      const allSubs = mockWeapons.map(w => w.subWeapon);
      const allSpecials = mockWeapons.map(w => w.specialWeapon);
      expect(allSubs).toContain(customWeapon.subWeapon);
      expect(allSpecials).toContain(customWeapon.specialWeapon);
    });

    it('武器データがない場合はエラーを投げる', async () => {
      vi.spyOn(repository, 'findAll').mockResolvedValue([]);

      await expect(useCase.executeRandomMainSub()).rejects.toThrow('武器データが見つかりません');
    });
  });
});