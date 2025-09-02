export type WeaponType = 
  | 'shooter'      // シューター
  | 'roller'       // ローラー
  | 'charger'      // チャージャー
  | 'slosher'      // スロッシャー
  | 'splatling'    // スピナー
  | 'dualies'      // マニューバー
  | 'brella'       // シェルター
  | 'blaster'      // ブラスター
  | 'brush'        // フデ
  | 'stringer'     // ストリンガー
  | 'splatana'     // ワイパー;

export type SubWeapon = 
  | 'splat_bomb'       // スプラッシュボム
  | 'suction_bomb'     // キューバンボム
  | 'burst_bomb'       // クイックボム
  | 'curling_bomb'     // カーリングボム
  | 'autobomb'         // ロボットボム
  | 'ink_mine'         // トラップ
  | 'toxic_mist'       // ポイズンミスト
  | 'point_sensor'     // ポイントセンサー
  | 'splash_wall'      // スプラッシュシールド
  | 'sprinkler'        // スプリンクラー
  | 'squid_beakon'     // ジャンプビーコン
  | 'fizzy_bomb'       // タンサンボム
  | 'torpedo'          // トーピード
  | 'angle_shooter'    // ラインマーカー;

export type SpecialWeapon = 
  | 'trizooka'             // ウルトラショット
  | 'big_bubbler'          // グレートバリア
  | 'zipcaster'            // ショクワンダー
  | 'tenta_missiles'       // マルチミサイル（前作から継続）
  | 'ink_storm'            // アメフラシ（前作から継続）
  | 'booyah_bomb'          // ナイスダマ（前作から継続）
  | 'wave_breaker'         // ホップソナー
  | 'ink_vac'              // キューインキ
  | 'killer_wail_5_1'      // メガホンレーザー5.1ch
  | 'inkjet'               // ジェットパック（前作から継続）
  | 'ultra_stamp'          // ウルトラハンコ（前作から継続）
  | 'crab_tank'            // カニタンク
  | 'reefslider'           // サメライド
  | 'triple_inkstrike'     // トリプルトルネード
  | 'tacticooler'          // エナジースタンド
  | 'splattercolor_screen' // スミナガシート
  | 'triple_splashdown'    // ウルトラチャクチ
  | 'super_chump'          // デコイチラシ
  | 'kraken_royale'        // テイオウイカ（スプラ3新スペシャル）;

export class Weapon {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: WeaponType,
    public readonly subWeapon: SubWeapon,
    public readonly specialWeapon: SpecialWeapon,
    public readonly specialPoints: number = 200,
    public readonly iconUrl?: string
  ) {}

  static create(params: {
    id: string;
    name: string;
    type: WeaponType;
    subWeapon: SubWeapon;
    specialWeapon: SpecialWeapon;
    specialPoints?: number;
    iconUrl?: string;
  }): Weapon {
    return new Weapon(
      params.id,
      params.name,
      params.type,
      params.subWeapon,
      params.specialWeapon,
      params.specialPoints || 200,
      params.iconUrl
    );
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      subWeapon: this.subWeapon,
      specialWeapon: this.specialWeapon,
      specialPoints: this.specialPoints,
      iconUrl: this.iconUrl,
    };
  }
}