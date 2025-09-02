import { Weapon } from '../entities/Weapon';
import { GameRule } from '../entities/GameRule';
import { PlayRestriction } from '../entities/PlayRestriction';
import { Player } from '../entities/Player';

export type GachaType = 'weapon' | 'rule' | 'restriction' | 'combined' | 'multiplayer';

export class GachaResult {
  constructor(
    public readonly type: GachaType,
    public readonly timestamp: Date,
    public readonly weapon?: Weapon,
    public readonly rule?: GameRule,
    public readonly restrictions?: PlayRestriction[],
    public readonly players?: Player[],
    public readonly metadata?: Record<string, any>
  ) {}

  static weapon(weapon: Weapon, metadata?: Record<string, any>): GachaResult {
    return new GachaResult(
      'weapon',
      new Date(),
      weapon,
      undefined,
      undefined,
      undefined,
      metadata
    );
  }

  static rule(rule: GameRule, metadata?: Record<string, any>): GachaResult {
    return new GachaResult(
      'rule',
      new Date(),
      undefined,
      rule,
      undefined,
      undefined,
      metadata
    );
  }

  static restriction(restrictions: PlayRestriction[], metadata?: Record<string, any>): GachaResult {
    return new GachaResult(
      'restriction',
      new Date(),
      undefined,
      undefined,
      restrictions,
      undefined,
      metadata
    );
  }

  static combined(params: {
    weapon?: Weapon;
    rule?: GameRule;
    restrictions?: PlayRestriction[];
    metadata?: Record<string, any>;
  }): GachaResult {
    return new GachaResult(
      'combined',
      new Date(),
      params.weapon,
      params.rule,
      params.restrictions,
      undefined,
      params.metadata
    );
  }

  static multiplayer(players: Player[], metadata?: Record<string, any>): GachaResult {
    return new GachaResult(
      'multiplayer',
      new Date(),
      undefined,
      undefined,
      undefined,
      players,
      metadata
    );
  }

  hasWeapon(): boolean {
    return !!this.weapon;
  }

  hasRule(): boolean {
    return !!this.rule;
  }

  hasRestrictions(): boolean {
    return !!this.restrictions && this.restrictions.length > 0;
  }

  hasPlayers(): boolean {
    return !!this.players && this.players.length > 0;
  }

  getTotalDifficulty(): number {
    if (!this.restrictions) return 0;
    
    const difficultyMap = {
      easy: 1,
      normal: 2,
      hard: 3,
      extreme: 5
    };
    
    return this.restrictions.reduce((sum, r) => sum + difficultyMap[r.difficulty], 0);
  }

  toJSON() {
    return {
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      weapon: this.weapon?.toJSON(),
      rule: this.rule?.toJSON(),
      restrictions: this.restrictions?.map(r => r.toJSON()),
      players: this.players?.map(p => p.toJSON()),
      metadata: this.metadata,
    };
  }
}