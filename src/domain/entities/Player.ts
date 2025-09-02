import { Weapon } from './Weapon';

export interface PlayerData {
  id: string;
  name: string;
  weapon?: Weapon;
  isSelected?: boolean;
}

export class Player {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly weapon?: Weapon,
    public readonly isSelected: boolean = false
  ) {}

  static create(data: PlayerData): Player {
    return new Player(
      data.id,
      data.name,
      data.weapon,
      data.isSelected || false
    );
  }

  withWeapon(weapon: Weapon): Player {
    return new Player(this.id, this.name, weapon, this.isSelected);
  }

  withSelection(selected: boolean): Player {
    return new Player(this.id, this.name, this.weapon, selected);
  }

  hasWeapon(): boolean {
    return !!this.weapon;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      weapon: this.weapon?.toJSON(),
      isSelected: this.isSelected,
    };
  }
}