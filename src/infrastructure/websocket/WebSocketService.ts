import { GachaResult } from '@domain/value-objects/GachaResult';
import { Player } from '@domain/entities/Player';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private baseUrl = 'http://localhost:3000';

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async sendGachaResult(result: GachaResult): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/gacha-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: result.toJSON(),
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Failed to send gacha result:', error);
      return false;
    }
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  getOverlayUrl(): string {
    return `${this.baseUrl}/overlay`;
  }

  async sendRegachaResult(players: Player[], selectedPlayerIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/regacha-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: players.map(p => p.toJSON()),
          selectedPlayerIds,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Failed to send regacha result:', error);
      return false;
    }
  }

  async sendMultiplayerGachaResult(result: GachaResult): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/multiplayer-gacha-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: result.toJSON(),
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Failed to send multiplayer gacha result:', error);
      return false;
    }
  }

  async testConnection(): Promise<{
    server: boolean;
    overlay: boolean;
    connectedClients: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      
      return {
        server: data.status === 'ok',
        overlay: true, // オーバーレイページの存在確認は省略
        connectedClients: data.connectedClients || 0,
      };
    } catch (error) {
      return {
        server: false,
        overlay: false,
        connectedClients: 0,
      };
    }
  }
}