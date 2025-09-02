export type GameRuleType = 
  | 'turf_war'        // ナワバリバトル
  | 'splat_zones'     // ガチエリア
  | 'tower_control'   // ガチヤグラ
  | 'rainmaker'       // ガチホコバトル
  | 'clam_blitz'      // ガチアサリ
  | 'salmon_run'      // サーモンラン
  | 'private_battle'  // プライベートバトル
  | 'tableturf'       // ナワバトラー
  | 'big_run'         // ビッグラン
  | 'eggstra_work';   // バイトチームコンテスト

export class GameRule {
  constructor(
    public readonly id: string,
    public readonly type: GameRuleType,
    public readonly name: string,
    public readonly description?: string,
    public readonly isRanked: boolean = false
  ) {}

  static create(params: {
    id: string;
    type: GameRuleType;
    name: string;
    description?: string;
    isRanked?: boolean;
  }): GameRule {
    return new GameRule(
      params.id,
      params.type,
      params.name,
      params.description,
      params.isRanked ?? false
    );
  }

  isGachiMatch(): boolean {
    return ['splat_zones', 'tower_control', 'rainmaker', 'clam_blitz'].includes(this.type);
  }

  isSalmonRun(): boolean {
    return ['salmon_run', 'big_run', 'eggstra_work'].includes(this.type);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      isRanked: this.isRanked,
    };
  }
}