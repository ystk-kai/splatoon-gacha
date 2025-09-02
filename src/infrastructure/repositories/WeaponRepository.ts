import { Weapon } from '@domain/entities/Weapon';
import { WeaponFilter } from '@domain/value-objects/WeaponFilter';
import weaponsData from '../data/weapons.json';

export interface IWeaponRepository {
  findAll(): Promise<Weapon[]>;
  findById(id: string): Promise<Weapon | undefined>;
  findByFilter(filter: WeaponFilter): Promise<Weapon[]>;
}

export class WeaponRepository implements IWeaponRepository {
  private weapons: Weapon[] = [];

  constructor() {
    this.loadWeapons();
  }

  private loadWeapons(): void {
    this.weapons = weaponsData.weapons.map((data: any) => 
      Weapon.create({
        id: data.id,
        name: data.name,
        type: data.type,
        subWeapon: data.subWeapon,
        specialWeapon: data.specialWeapon,
        iconUrl: data.iconUrl,
      })
    );
  }

  async findAll(): Promise<Weapon[]> {
    return [...this.weapons];
  }

  async findById(id: string): Promise<Weapon | undefined> {
    return this.weapons.find(w => w.id === id);
  }

  async findByFilter(filter: WeaponFilter): Promise<Weapon[]> {
    if (filter.isEmpty()) {
      return [...this.weapons];
    }

    return this.weapons.filter(weapon => {
      // タイプフィルター
      if (filter.types && !filter.types.includes(weapon.type)) {
        return false;
      }
      if (filter.excludeTypes && filter.excludeTypes.includes(weapon.type)) {
        return false;
      }

      // サブウェポンフィルター
      if (filter.subWeapons && !filter.subWeapons.includes(weapon.subWeapon)) {
        return false;
      }
      if (filter.excludeSubWeapons && filter.excludeSubWeapons.includes(weapon.subWeapon)) {
        return false;
      }

      // スペシャルウェポンフィルター
      if (filter.specialWeapons && !filter.specialWeapons.includes(weapon.specialWeapon)) {
        return false;
      }
      if (filter.excludeSpecialWeapons && filter.excludeSpecialWeapons.includes(weapon.specialWeapon)) {
        return false;
      }

      return true;
    });
  }

  async getWeaponsByType(type: string): Promise<Weapon[]> {
    return this.weapons.filter(w => w.type === type);
  }

  async getRandomWeapon(): Promise<Weapon | undefined> {
    if (this.weapons.length === 0) return undefined;
    const index = Math.floor(Math.random() * this.weapons.length);
    return this.weapons[index];
  }
}