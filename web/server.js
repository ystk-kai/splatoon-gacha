const fastify = require('fastify')({ logger: true });
const path = require('path');
require('dotenv').config();

// サービスの初期化
const { setupWebSocket, initializeGachaState } = require('./services/websocket');
const { loadWeaponsData } = require('./services/weapons');

// ルートの読み込み
const setupApiRoutes = require('./routes/api');
const setupDashboardRoute = require('./routes/dashboard');
const setupViewerRoute = require('./routes/viewer');
const setupOverlayRoute = require('./routes/overlay');
const setupWidgetRoute = require('./routes/widget');

// CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: true,
});

// Static files plugin
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

// 武器データを読み込み
loadWeaponsData();

// ガチャ状態を初期化
initializeGachaState();

// WebSocket設定
setupWebSocket(fastify);

// APIルート設定
setupApiRoutes(fastify);

// ページルート設定
setupDashboardRoute(fastify);
setupViewerRoute(fastify);
setupOverlayRoute(fastify);
setupWidgetRoute(fastify);

// サーバー起動
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3000');
    console.log('Dashboard URL: http://localhost:3000/dashboard');
    console.log('Viewer URL: http://localhost:3000/viewer');
    console.log('OBS Overlay URL: http://localhost:3000/overlay');
    console.log('OBS Widget URL: http://localhost:3000/widget');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();