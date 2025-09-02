import { WeaponType, SubWeapon, SpecialWeapon } from '../entities/Weapon';

export class WeaponFilter {
  constructor(
    public readonly types?: WeaponType[],
    public readonly subWeapons?: SubWeapon[],
    public readonly specialWeapons?: SpecialWeapon[],
    public readonly excludeTypes?: WeaponType[],
    public readonly excludeSubWeapons?: SubWeapon[],
    public readonly excludeSpecialWeapons?: SpecialWeapon[]
  ) {}

  static all(): WeaponFilter {
    return new WeaponFilter();
  }

  static byTypes(types: WeaponType[]): WeaponFilter {
    return new WeaponFilter(types);
  }

  static bySubWeapons(subWeapons: SubWeapon[]): WeaponFilter {
    return new WeaponFilter(undefined, subWeapons);
  }

  static bySpecialWeapons(specialWeapons: SpecialWeapon[]): WeaponFilter {
    return new WeaponFilter(undefined, undefined, specialWeapons);
  }

  withTypes(types: WeaponType[]): WeaponFilter {
    return new WeaponFilter(
      types,
      this.subWeapons,
      this.specialWeapons,
      this.excludeTypes,
      this.excludeSubWeapons,
      this.excludeSpecialWeapons
    );
  }

  excludingTypes(types: WeaponType[]): WeaponFilter {
    return new WeaponFilter(
      this.types,
      this.subWeapons,
      this.specialWeapons,
      types,
      this.excludeSubWeapons,
      this.excludeSpecialWeapons
    );
  }

  isEmpty(): boolean {
    return !this.types && !this.subWeapons && !this.specialWeapons &&
           !this.excludeTypes && !this.excludeSubWeapons && !this.excludeSpecialWeapons;
  }

  toJSON() {
    return {
      types: this.types,
      subWeapons: this.subWeapons,
      specialWeapons: this.specialWeapons,
      excludeTypes: this.excludeTypes,
      excludeSubWeapons: this.excludeSubWeapons,
      excludeSpecialWeapons: this.excludeSpecialWeapons,
    };
  }
}