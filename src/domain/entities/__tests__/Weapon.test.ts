import { describe, it, expect } from 'vitest';
import { Weapon } from '../Weapon';

describe('Weapon Entity', () => {
  describe('create', () => {
    it('武器エンティティを正しく作成できる', () => {
      const weapon = Weapon.create({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        specialPoints: 200,
      });

      expect(weapon.id).toBe('test_weapon');
      expect(weapon.name).toBe('テスト武器');
      expect(weapon.type).toBe('shooter');
      expect(weapon.subWeapon).toBe('splat_bomb');
      expect(weapon.specialWeapon).toBe('big_bubbler');
      expect(weapon.specialPoints).toBe(200);
    });

    it('アイコンURL付きで武器を作成できる', () => {
      const weapon = Weapon.create({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        iconUrl: 'https://example.com/icon.png',
      });

      expect(weapon.iconUrl).toBe('https://example.com/icon.png');
    });

    it('デフォルトのスペシャルポイントが設定される', () => {
      const weapon = new Weapon(
        'test_weapon',
        'テスト武器',
        'shooter',
        'splat_bomb',
        'big_bubbler',
      );

      expect(weapon.specialPoints).toBe(200);
    });
  });

  describe('toJSON', () => {
    it('JSONオブジェクトに変換できる', () => {
      const weapon = Weapon.create({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        specialPoints: 180,
      });

      const json = weapon.toJSON();

      expect(json).toEqual({
        id: 'test_weapon',
        name: 'テスト武器',
        type: 'shooter',
        subWeapon: 'splat_bomb',
        specialWeapon: 'big_bubbler',
        iconUrl: undefined,
        specialPoints: 180,
      });
    });
  });
});