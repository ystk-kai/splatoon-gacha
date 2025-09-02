const EventEmitter = require('events');
const boreService = require('./bore-service');
const localtunnelService = require('./tunnel');
const localhostRunService = require('./localhost-run-service');

class TunnelManager extends EventEmitter {
  constructor() {
    super();
    this.activeService = null;
    this.serviceType = 'localhost-run'; // デフォルトを最も安定したlocalhost.runに変更
    this.status = 'disconnected';
    this.url = null;
    this.publicIP = null;
    this.authInfo = null;
  }

  // サービスタイプを設定
  setServiceType(type) {
    if (['bore', 'localtunnel', 'localhost-run'].includes(type)) {
      this.serviceType = type;
      console.log('Tunnel service type set to:', type);
    } else {
      throw new Error('Unsupported tunnel service type: ' + type);
    }
  }

  // 現在のサービスを取得
  getActiveService() {
    switch (this.serviceType) {
      case 'bore':
        return boreService;
      case 'localtunnel':
        return localtunnelService;
      case 'localhost-run':
        return localhostRunService;
      default:
        throw new Error('Unknown service type: ' + this.serviceType);
    }
  }

  // トンネル開始
  async start(port = 3000) {
    try {
      this.activeService = this.getActiveService();
      
      // サービスのイベントリスナーを設定
      this.setupServiceListeners();
      
      const result = await this.activeService.start(port);
      
      this.status = 'connected';
      this.url = result.url;
      
      // サービスタイプに応じて認証情報を設定
      if (this.serviceType === 'bore') {
        this.authInfo = {
          type: 'none',
          value: null,
          instruction: '認証不要でアクセスできます'
        };
      } else if (this.serviceType === 'localtunnel') {
        this.publicIP = result.publicIP;
        this.authInfo = {
          type: 'ip',
          value: result.publicIP,
          instruction: 'URLアクセス時に「Tunnel Password:」欄にIPアドレスを入力してください'
        };
      } else if (this.serviceType === 'localhost-run') {
        this.authInfo = {
          type: 'none',
          value: null,
          instruction: '認証不要でアクセスできます'
        };
        
        // localhost.run の追加情報を取得
        const serviceStatus = this.activeService.getStatus();
        if (serviceStatus.connectionId) {
          this.authInfo.connectionId = serviceStatus.connectionId;
        }
        if (serviceStatus.additionalInfo) {
          this.authInfo.additionalInfo = serviceStatus.additionalInfo;
        }
      }
      
      this.emit('connected', { 
        url: this.url, 
        authInfo: this.authInfo,
        serviceType: this.serviceType 
      });
      
      return { 
        url: this.url, 
        authInfo: this.authInfo,
        serviceType: this.serviceType 
      };
      
    } catch (error) {
      this.status = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  // トンネル停止
  async stop() {
    if (this.activeService) {
      await this.activeService.stop();
      this.cleanup();
    }
  }

  // トンネル再接続
  async restart(port = 3000) {
    await this.stop();
    return this.start(port);
  }

  // 状態取得
  getStatus() {
    return {
      status: this.status,
      url: this.url,
      publicIP: this.publicIP,
      authInfo: this.authInfo,
      serviceType: this.serviceType
    };
  }

  // サービスのイベントリスナー設定
  setupServiceListeners() {
    if (this.activeService) {
      this.activeService.on('connected', (url) => {
        this.status = 'connected';
        this.url = url;
      });
      
      this.activeService.on('disconnected', () => {
        this.cleanup();
        this.emit('disconnected');
      });
      
      this.activeService.on('error', (error) => {
        this.status = 'error';
        this.emit('error', error);
      });
      
      this.activeService.on('status', (status) => {
        this.status = status;
        this.emit('status', status);
      });
    }
  }

  // クリーンアップ
  cleanup() {
    this.status = 'disconnected';
    this.url = null;
    this.publicIP = null;
    this.authInfo = null;
    this.activeService = null;
  }

  // 利用可能なサービス一覧
  getAvailableServices() {
    return [
      {
        type: 'localhost-run',
        name: 'Localhost.run',
        description: 'SSH ベースの無料外部公開サービス（推奨）',
        pros: ['無料', '認証不要', '安定', 'SSH設定不要', '時間制限なし'],
        cons: ['ランダムURL'],
        authType: 'none'
      },
      {
        type: 'bore',
        name: 'Bore.pub',
        description: '軽量で高速な外部公開サービス',
        pros: ['無料', '高速', '認証不要', '安定', 'Rust製で軽量'],
        cons: ['ランダムポート', 'cargo install bore-cli が必要'],
        authType: 'none'
      },
      {
        type: 'localtunnel',
        name: 'Localtunnel',
        description: '完全無料の外部公開サービス',
        pros: ['無料', '帯域制限なし', '時間制限なし'],
        cons: ['IPアドレス認証必要', 'ランダムURL', '表示が遅い'],
        authType: 'ip'
      }
    ];
  }
}

// シングルトンインスタンスを作成
const tunnelManager = new TunnelManager();

module.exports = tunnelManager;