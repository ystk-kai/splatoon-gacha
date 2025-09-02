# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
Splatoon配信用ランダム武器選択ツール。OBSでのオーバーレイ表示とガチャ機能を提供するWebアプリケーション。

## アーキテクチャ
- **メインアプリケーション**: Tauriデスクトップアプリ（Rust + Web技術）
- **Webフロントエンド**: Vanilla JavaScript（React風の関数型コンポーネント）+ TailwindCSS
- **バックエンド**: Node.js + Fastify
- **リアルタイム通信**: WebSocket

## プロジェクト構造
```
splatoon-gacha/
├── web/                  # メインのWebアプリケーション（Fastifyサーバー + フロントエンド）
├── src-tauri/           # Tauriデスクトップアプリ
├── src/                 # 未使用のReact/TypeScriptファイル（将来の拡張用）
```

## 開発コマンド

### 依存関係インストール
```bash
npm install                 # メインプロジェクト
cd web && npm install       # Webプロジェクト
```

### アプリケーション起動（推奨順）
```bash
npm run tauri:dev          # Tauriデスクトップアプリで起動（推奨）
npm run start              # Webサーバーのみ起動
cd web && npm start        # 直接Webサーバー起動
```

### テスト実行
```bash
# ユニットテスト
npm test                   # メインプロジェクト（watch mode）
npm run test:run          # メインプロジェクト（一回実行）
cd web && npm test        # Webプロジェクト

# E2Eテスト
cd web && npm run test:e2e          # ヘッドレスモード
cd web && npm run test:e2e:headed   # ブラウザ表示モード
cd web && npm run install-playwright # 初回セットアップ
```

### ビルド
```bash
npm run tauri:build       # デスクトップアプリビルド
npm run build             # Vite（メインプロジェクト）
npm run dev               # Vite開発サーバー
```

## 主要エンドポイント
- `/dashboard` - ガチャ実行・管理画面
- `/overlay` - OBS用オーバーレイ画面
- `/viewer` - 視聴者画面
- `/widget` - ウィジェット画面
- `/health` - サーバー状態確認
- `/gacha-result` - ガチャ結果API（POST）
- `/ws` - WebSocket接続

## 技術仕様
- **Node.js**: v18以上推奨
- **Tauri**: v2.0.0-rc.18
- **Fastify**: v4.0.0 + WebSocket + CORS + Static
- **フロントエンド**: TailwindCSS v4.1.12 + PostCSS
- **テスト**: Playwright（E2E）+ Node.js native test（Unit）+ Vitest

## トラブルシューティング
```bash
# ポート3000使用プロセス確認・終了
lsof -ti:3000
lsof -ti:3000 | xargs kill -9

# サーバー状態確認
curl http://localhost:3000/health
```

## 外部公開機能
```bash
npm run dev:tunnel        # 開発サーバー + トンネル同時起動
npm run tunnel           # Localtunnel単体起動
```

## コミットルール
このプロジェクトは **Conventional Commits** に準拠します。

### コミットメッセージ形式
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Type一覧
- `feat`: 新機能の追加
- `fix`: バグ修正
- `docs`: ドキュメントの変更
- `style`: コードの意味に影響しない変更（フォーマット、セミコロン等）
- `refactor`: バグ修正でも新機能追加でもないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例
```
feat(dashboard): ガチャボタンにアニメーション効果を追加
fix(websocket): 接続エラー時の再接続処理を修正
docs: README.mdにセットアップ手順を追加
```

## 開発時の注意点
- WSL環境でも動作（Tauriデスクトップアプリ推奨）
- WebSocketでリアルタイム通信を行うため、サーバー起動が必須
- CDN設定可能（web/.env でCDN_BASE_URL設定）
- 各画面は独立したJavaScriptファイルで管理