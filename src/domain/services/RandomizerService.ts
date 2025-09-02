export class RandomizerService {
  private static instance: RandomizerService;

  private constructor() {}

  static getInstance(): RandomizerService {
    if (!RandomizerService.instance) {
      RandomizerService.instance = new RandomizerService();
    }
    return RandomizerService.instance;
  }

  selectRandom<T>(items: T[]): T | undefined {
    if (items.length === 0) return undefined;
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  selectMultipleRandom<T>(items: T[], count: number): T[] {
    if (count >= items.length) return [...items];
    if (count <= 0) return [];

    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  selectWeightedRandom<T>(items: Array<{ item: T; weight: number }>): T | undefined {
    if (items.length === 0) return undefined;

    const totalWeight = items.reduce((sum, { weight }) => sum + weight, 0);
    if (totalWeight === 0) return this.selectRandom(items.map(({ item }) => item));

    let random = Math.random() * totalWeight;
    
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }

    return items[items.length - 1].item;
  }

  shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateRandomId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  probability(chance: number): boolean {
    return Math.random() < chance;
  }
}