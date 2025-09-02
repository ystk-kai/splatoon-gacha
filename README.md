# Splatoon Gacha

Splatoon 配信用ランダム武器選択ツールです。  
OBS でのオーバーレイ表示とガチャ機能を提供します。

## 概要

このツールは以下の機能を提供します：

- 🎲 **武器ガチャ機能**: ランダムに武器を選択
- 🎥 **OBSオーバーレイ**: 配信画面にガチャ結果を表示
- 🖥️ **ダッシュボード**: ガチャの実行と管理を行うWeb画面
- 🔌 **WebSocket連携**: リアルタイムでの結果同期

## 必要な環境

- **Node.js** (推奨: v18以上)
- **Rust** (Tauriアプリのビルド用)
- **npm** または **yarn**

## セットアップ

### 1. 依存関係のインストール

```bash
# メインプロジェクトの依存関係
npm install

# Webサーバーの依存関係
cd web
npm install
cd ..
```

### 2. Tauri CLI のインストール（初回のみ）

```bash
npm install -g @tauri-apps/cli
```

## 起動方法

### 方法1: デスクトップアプリ（Tauri）で起動【推奨】

```bash
# 開発モード（.exe相当の動作）
npm run tauri:dev

# または直接
tauri dev
```

この方法では：
- 自動的にWebサーバーが起動（ポート3000）
- デスクトップアプリでダッシュボードが表示
- WSL環境でも動作確認可能

### 方法2: WSL/Linux環境での開発

```bash
# Webサーバーのみ起動
cd web
npm start

# または
node server.js
```

この場合、ブラウザで以下にアクセス：
- **ダッシュボード**: http://localhost:3000/dashboard
- **OBSオーバーレイ**: http://localhost:3000/overlay

## 使用方法

### 1. ダッシュボードでガチャを実行

- デスクトップアプリまたはブラウザでダッシュボードを開く
- 「ガチャを回す！」ボタンをクリック
- 武器情報が表示される

### 2. OBSでのオーバーレイ設定

1. OBSで「ソース」→「ブラウザ」を追加
2. URL欄に `http://localhost:3000/overlay` を入力
3. 幅: 1920、高さ: 1080 に設定
4. ガチャを実行すると自動的にオーバーレイに結果が表示

### 3. 配信での活用

1. ダッシュボードでガチャを回す
2. 結果がリアルタイムでOBSオーバーレイに表示
3. 視聴者と一緒に選ばれた武器でゲームプレイ

### 4. CDN設定（オプション）

視聴者画面の画像配信を高速化するためにCDNを利用できます。

#### 設定方法

1. `web/.env` ファイルを編集
2. `CDN_BASE_URL` に利用するCDNのURLを設定

#### 利用可能なCDNサービス（無料・認証不要）

| サービス | URL形式 | 特徴 |
|---------|---------|------|
| **jsDelivr（推奨）** | `https://cdn.jsdelivr.net/gh/[username]/[repo]@[branch]/web/public` | GitHub連携・高速・自動圧縮 |
| **Statically** | `https://cdn.statically.io/gh/[username]/[repo]/[branch]/web/public` | 画像最適化機能付き |

#### 設定例（jsDelivr）

```env
# web/.env
CDN_BASE_URL=https://cdn.jsdelivr.net/gh/yourusername/splatoon-gacha@main/web/public
```

#### メリット

- **高速化**: グローバルCDNによる高速画像配信
- **負荷軽減**: サーバーへの画像リクエストを削減
- **帯域節約**: オリジンサーバーの通信量を削減

#### 注意事項

- プライベートリポジトリではjsDelivrは利用不可
- 画像更新時はCDNキャッシュの反映に時間がかかる場合あり
- 開発環境では空欄にしてローカル画像を使用推奨

### 5. 外部公開機能

視聴者画面を外部に公開する機能を提供しています。

#### 方法1: コマンドで一括起動

```bash
# 開発サーバーと外部公開を同時起動
npm run dev:tunnel
```

#### 方法2: ダッシュボードから制御

1. ダッシュボードの「外部公開設定」パネルを開く
2. サービスを選択（Bore推奨 / Serveo / Localhost.run / Localtunnel）
3. 「接続開始」ボタンをクリック
4. 生成された外部URLを視聴者に共有

#### 対応サービス

| サービス | 認証 | 特徴 |
|---------|------|------|
| **Bore** | 不要 | 高速・安定（推奨） |
| **Serveo** | 不要 | SSH経由・高速 |  
| **Localhost.run** | 不要 | 簡単・QR対応 |
| **Localtunnel** | IP認証 | 完全無料・不安定 |

#### 再接続について

- ダッシュボードの「再接続」ボタンで新しいURLを生成
- 新しいURLを再度視聴者に共有（Localtunnelの場合はパスワードも）
- ダッシュボードの「📋 全文をコピー」ボタンで案内文を一括コピー可能

## エンドポイント

| パス | 説明 |
|------|------|
| `/dashboard` | ガチャ実行・管理画面 |
| `/overlay` | OBS用オーバーレイ画面 |
| `/viewer` | 視聴者画面 |
| `/widget` | ウィジェット画面 |
| `/health` | サーバー状態確認 |
| `/gacha-result` | ガチャ結果受信API（POST） |
| `/ws` | WebSocket接続 |

## ビルド

### デスクトップアプリのビルド

```bash
npm run tauri:build
```

ビルド後のファイル:
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/`

## トラブルシューティング

### ポート3000が使用中エラー

`EADDRINUSE: address already in use 0.0.0.0:3000` が表示される場合：

```bash
# 使用中のプロセスを確認
lsof -ti:3000

# プロセスを終了
lsof -ti:3000 | xargs kill -9

# 再起動
cd web
npm start
```

**注意**: サーバーが正常に動作している場合、タイムアウトメッセージが表示されることがありますが、実際には正常に稼働しています。ブラウザで `http://localhost:3000/dashboard` にアクセスして確認してください。

### WebSocket接続エラー

1. ファイアウォールの確認
2. サーバーが正常に起動しているか確認
3. ブラウザのデベロッパーツールでエラーログを確認
