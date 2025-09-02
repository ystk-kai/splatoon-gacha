// HTML共通部分を生成するユーティリティ

function getHtmlHead(title) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  ${getSplatoonStyles()}
  ${getTailwindConfig()}
</head>`;
}

function getSplatoonStyles() {
  return `
  <style>
    @font-face {
      font-family: 'Splatoon';
      src: url('/fonts/Splatoon1.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      unicode-range: U+0000-303F, U+3100-4DFF;
    }
    
    @font-face {
      font-family: 'SplatoonKana';
      src: url('/fonts/Splatoon2.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
      unicode-range: U+3040-309F, U+30A0-30FF;
    }
    
    @font-face {
      font-family: 'RowdyStd';
      src: url('/fonts/RowdyStd-EB.ttf') format('truetype');
      font-weight: bold;
      font-style: normal;
      unicode-range: U+4E00-9FAF, U+3400-4DBF;
    }
    
    .splatoon-font {
      font-family: 'RowdyStd', 'SplatoonKana', 'Splatoon', Arial, sans-serif;
    }
    
    .splatoon-title {
      font-family: 'Splatoon', 'SplatoonKana', 'RowdyStd', Arial, sans-serif;
      letter-spacing: 2px;
    }
  </style>`;
}

function getTailwindConfig() {
  return `
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'splatoon-orange': '#ff6600',
            'splatoon-purple': '#ff00ff',
            'splatoon-cyan': '#00ccff',
          },
          fontFamily: {
            'splatoon': ['Splatoon', 'SplatoonKana', 'RowdyStd', 'Arial', 'sans-serif'],
            'rowdy': ['RowdyStd', 'SplatoonKana', 'Splatoon', 'Arial', 'sans-serif'],
          }
        }
      }
    }
  </script>`;
}

function getWeaponLabels() {
  return `
    function getWeaponTypeLabel(type) {
      const typeLabels = {
        shooter: 'シューター',
        roller: 'ローラー',
        charger: 'チャージャー',
        slosher: 'スロッシャー',
        splatling: 'スピナー',
        dualies: 'マニューバー',
        brella: 'シェルター',
        blaster: 'ブラスター',
        brush: 'フデ',
        stringer: 'ストリンガー',
        splatana: 'ワイパー',
      };
      return typeLabels[type] || type;
    }

    function getSubWeaponLabel(sub) {
      const subLabels = {
        splat_bomb: 'スプラッシュボム',
        suction_bomb: 'キューバンボム',
        burst_bomb: 'クイックボム',
        curling_bomb: 'カーリングボム',
        autobomb: 'ロボットボム',
        ink_mine: 'トラップ',
        toxic_mist: 'ポイズンミスト',
        point_sensor: 'ポイントセンサー',
        splash_wall: 'スプラッシュシールド',
        sprinkler: 'スプリンクラー',
        squid_beakon: 'ジャンプビーコン',
        fizzy_bomb: 'タンサンボム',
        torpedo: 'トーピード',
        angle_shooter: 'ラインマーカー',
      };
      return subLabels[sub] || sub;
    }

    function getSpecialWeaponLabel(special) {
      const specialLabels = {
        trizooka: 'ウルトラショット',
        big_bubbler: 'グレートバリア',
        zipcaster: 'ショクワンダー',
        tenta_missiles: 'マルチミサイル',
        ink_storm: 'アメフラシ',
        booyah_bomb: 'ナイスダマ',
        wave_breaker: 'ホップソナー',
        ink_vac: 'キューインキ',
        killer_wail_5_1: 'メガホンレーザー5.1ch',
        inkjet: 'ジェットパック',
        ultra_stamp: 'ウルトラハンコ',
        crab_tank: 'カニタンク',
        reefslider: 'サメライド',
        triple_inkstrike: 'トリプルトルネード',
        tacticooler: 'エナジースタンド',
        splattercolor_screen: 'スミナガシート',
        triple_splashdown: 'ウルトラチャクチ',
        super_chump: 'デコイチラシ',
      };
      return specialLabels[special] || special;
    }`;
}

module.exports = {
  getHtmlHead,
  getSplatoonStyles,
  getTailwindConfig,
  getWeaponLabels
};