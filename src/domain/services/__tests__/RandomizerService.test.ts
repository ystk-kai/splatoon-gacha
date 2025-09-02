import { describe, it, expect } from 'vitest';
import { RandomizerService } from '../RandomizerService';

describe('RandomizerService', () => {
  const service = RandomizerService.getInstance();

  describe('getInstance', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = RandomizerService.getInstance();
      const instance2 = RandomizerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('selectRandom', () => {
    it('配列から1つの要素をランダムに選択する', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const result = service.selectRandom(items);
      
      expect(result).toBeDefined();
      expect(items).toContain(result);
    });

    it('空配列の場合はundefinedを返す', () => {
      const result = service.selectRandom([]);
      expect(result).toBeUndefined();
    });
  });

  describe('selectMultipleRandom', () => {
    it('指定された数の要素をランダムに選択する', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const result = service.selectMultipleRandom(items, 3);
      
      expect(result).toHaveLength(3);
      result.forEach(item => {
        expect(items).toContain(item);
      });
      
      // 重複がないことを確認
      const uniqueItems = new Set(result);
      expect(uniqueItems.size).toBe(3);
    });

    it('要素数より多く要求した場合は全要素を返す', () => {
      const items = ['a', 'b', 'c'];
      const result = service.selectMultipleRandom(items, 5);
      
      expect(result).toHaveLength(3);
      expect(result.sort()).toEqual(items.sort());
    });

    it('0以下の数を要求した場合は空配列を返す', () => {
      const items = ['a', 'b', 'c'];
      const result = service.selectMultipleRandom(items, 0);
      
      expect(result).toEqual([]);
    });
  });

  describe('selectWeightedRandom', () => {
    it('重み付きランダム選択ができる', () => {
      const items = [
        { item: 'a', weight: 10 },
        { item: 'b', weight: 5 },
        { item: 'c', weight: 1 },
      ];
      
      const result = service.selectWeightedRandom(items);
      expect(result).toBeDefined();
      expect(['a', 'b', 'c']).toContain(result);
    });

    it('空配列の場合はundefinedを返す', () => {
      const result = service.selectWeightedRandom([]);
      expect(result).toBeUndefined();
    });

    it('全ての重みが0の場合は均等にランダム選択する', () => {
      const items = [
        { item: 'a', weight: 0 },
        { item: 'b', weight: 0 },
        { item: 'c', weight: 0 },
      ];
      
      const result = service.selectWeightedRandom(items);
      expect(result).toBeDefined();
      expect(['a', 'b', 'c']).toContain(result);
    });
  });

  describe('shuffle', () => {
    it('配列をシャッフルする', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = service.shuffle(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
      expect(shuffled).not.toBe(original); // 新しい配列であること
    });
  });

  describe('generateRandomId', () => {
    it('指定された長さのランダムIDを生成する', () => {
      const id = service.generateRandomId(10);
      expect(id).toHaveLength(10);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('デフォルトで8文字のIDを生成する', () => {
      const id = service.generateRandomId();
      expect(id).toHaveLength(8);
    });
  });

  describe('randomBetween', () => {
    it('指定範囲内の整数を返す', () => {
      const result = service.randomBetween(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('randomFloat', () => {
    it('指定範囲内の浮動小数点数を返す', () => {
      const result = service.randomFloat(0, 1);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('probability', () => {
    it('確率に基づいてブール値を返す', () => {
      const result1 = service.probability(0);
      expect(result1).toBe(false);
      
      const result2 = service.probability(1);
      expect(result2).toBe(true);
      
      const result3 = service.probability(0.5);
      expect(typeof result3).toBe('boolean');
    });
  });
});