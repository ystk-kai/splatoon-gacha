export type RestrictionType = 
  | 'no_main_weapon'      // メイン武器禁止
  | 'no_sub_weapon'       // サブ武器禁止
  | 'no_special_weapon'   // スペシャル武器禁止
  | 'no_squid_form'       // イカ移動禁止
  | 'no_walking'          // 歩き移動禁止
  | 'no_jumping'          // ジャンプ禁止
  | 'no_super_jumping'    // スーパージャンプ禁止
  | 'ink_only_forward'    // 前方のみ塗り可能
  | 'one_hand_play'       // 片手プレイ
  | 'reverse_controls'    // 操作反転
  | 'no_map'              // マップ非表示
  | 'pacifist'            // 相手を倒さない
  | 'limited_ink'         // インク残量制限
  | 'speed_run'           // タイムアタック
  | 'no_respawn';         // リスポーン禁止

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'extreme';

export class PlayRestriction {
  constructor(
    public readonly id: string,
    public readonly type: RestrictionType,
    public readonly name: string,
    public readonly description: string,
    public readonly difficulty: DifficultyLevel = 'normal',
    public readonly incompatibleWith: RestrictionType[] = []
  ) {}

  static create(params: {
    id: string;
    type: RestrictionType;
    name: string;
    description: string;
    difficulty?: DifficultyLevel;
    incompatibleWith?: RestrictionType[];
  }): PlayRestriction {
    return new PlayRestriction(
      params.id,
      params.type,
      params.name,
      params.description,
      params.difficulty ?? 'normal',
      params.incompatibleWith ?? []
    );
  }

  isCompatibleWith(other: PlayRestriction): boolean {
    return !this.incompatibleWith.includes(other.type) &&
           !other.incompatibleWith.includes(this.type);
  }

  canCombineWith(restrictions: PlayRestriction[]): boolean {
    return restrictions.every(r => this.isCompatibleWith(r));
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      difficulty: this.difficulty,
      incompatibleWith: this.incompatibleWith,
    };
  }
}