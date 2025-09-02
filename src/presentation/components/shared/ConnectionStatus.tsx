import React, { useState, useEffect } from 'react';
import { WebSocketService } from '@infrastructure/websocket/WebSocketService';

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState({
    server: false,
    overlay: false,
    connectedClients: 0,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const webSocketService = WebSocketService.getInstance();
      const result = await webSocketService.testConnection();
      setStatus(result);
    } catch (error) {
      console.error('Connection check failed:', error);
      setStatus({
        server: false,
        overlay: false,
        connectedClients: 0,
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // 10秒ごとにチェック
    return () => clearInterval(interval);
  }, []);

  const overlayUrl = WebSocketService.getInstance().getOverlayUrl();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">サーバー接続状況</h3>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                     text-white text-sm rounded transition-colors"
        >
          {isChecking ? '確認中...' : '再確認'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">WebSocket サーバー</span>
          <div className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                status.server ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm">
              {status.server ? '接続中' : '未接続'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">接続中のクライアント</span>
          <span className="text-sm text-white font-mono">
            {status.connectedClients}
          </span>
        </div>

        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">OBS Overlay URL</span>
            <button
              onClick={() => navigator.clipboard.writeText(overlayUrl)}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              コピー
            </button>
          </div>
          <div className="mt-1">
            <code className="text-xs bg-gray-900 px-2 py-1 rounded text-blue-300 block">
              {overlayUrl}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};