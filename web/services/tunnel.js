const { spawn } = require('child_process');
const EventEmitter = require('events');
const https = require('https');

class TunnelService extends EventEmitter {
  constructor() {
    super();
    this.tunnel = null;
    this.url = null;
    this.publicIP = null;
    this.status = 'disconnected';
    this.isRestarting = false;
  }

  // パブリックIPアドレスを取得（複数のサービスでフォールバック）
  async fetchPublicIP() {
    const ipServices = [
      { hostname: 'ipv4.icanhazip.com', port: 443, path: '/' },
      { hostname: 'api.ipify.org', port: 443, path: '/' },
      { hostname: 'checkip.amazonaws.com', port: 443, path: '/' }
    ];

    for (const service of ipServices) {
      try {
        const ip = await this.tryFetchIP(service);
        this.publicIP = ip;
        console.log('Public IP fetched from', service.hostname + ':', ip);
        return ip;
      } catch (error) {
        console.warn(`Failed to fetch IP from ${service.hostname}:`, error.message);
        continue;
      }
    }

    // すべてのサービスで失敗した場合
    const fallbackMessage = 'パブリックIPの自動取得に失敗しました。手動で確認してください： https://loca.lt/mytunnelpassword';
    console.error(fallbackMessage);
    this.publicIP = null;
    throw new Error(fallbackMessage);
  }

  // 個別のIPサービスを試行
  async tryFetchIP(options) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        ...options,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const ip = data.trim();
          if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            resolve(ip);
          } else {
            reject(new Error('Invalid IP address format'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async start(port = 3000) {
    if (this.tunnel) {
      this.stop();
    }

    console.log('Starting Localtunnel...');
    this.status = 'connecting';
    this.emit('status', this.status);

    // パブリックIPを取得
    try {
      await this.fetchPublicIP();
      console.log('Public IP obtained for tunnel:', this.publicIP);
    } catch (ipError) {
      console.warn('Could not fetch public IP:', ipError.message);
      // IPが取得できなくてもトンネルは開始する
    }

    return new Promise((resolve, reject) => {
      // npx localtunnel コマンドを実行
      this.tunnel = spawn('npx', ['localtunnel', '--port', port.toString()], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let urlReceived = false;

      // 標準出力を監視してURLを取得
      this.tunnel.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('Localtunnel output:', output);
        
        // URLパターンを検出
        const urlMatch = output.match(/https:\/\/[^\s]+\.loca\.lt/);
        if (urlMatch && !urlReceived) {
          urlReceived = true;
          this.url = urlMatch[0];
          this.status = 'connected';
          console.log('Tunnel URL:', this.url);
          this.emit('connected', this.url);
          this.emit('status', this.status);
          resolve({ url: this.url, publicIP: this.publicIP });
        }
      });

      // エラー出力を監視
      this.tunnel.stderr.on('data', (data) => {
        console.error('Localtunnel error:', data.toString());
      });

      // プロセスエラー
      this.tunnel.on('error', (error) => {
        console.error('Failed to start Localtunnel:', error);
        this.status = 'error';
        this.emit('error', error);
        this.emit('status', this.status);
        if (!urlReceived) {
          reject(error);
        }
      });

      // プロセス終了
      this.tunnel.on('close', (code) => {
        console.log(`Localtunnel process exited with code ${code}`);
        this.tunnel = null;
        this.url = null;
        
        if (!this.isRestarting) {
          this.status = 'disconnected';
          this.emit('disconnected');
          this.emit('status', this.status);
        }
        
        if (!urlReceived) {
          reject(new Error(`Localtunnel exited with code ${code}`));
        }
      });

      // タイムアウト処理
      setTimeout(() => {
        if (!urlReceived) {
          this.stop();
          reject(new Error('Timeout waiting for Localtunnel URL'));
        }
      }, 30000); // 30秒でタイムアウト
    });
  }

  stop() {
    if (this.tunnel) {
      console.log('Stopping Localtunnel...');
      this.tunnel.kill();
      this.tunnel = null;
      this.url = null;
      this.publicIP = null;
      this.status = 'disconnected';
      this.emit('disconnected');
      this.emit('status', this.status);
    }
  }

  async restart(port = 3000) {
    console.log('Restarting Localtunnel...');
    this.isRestarting = true;
    this.stop();
    this.isRestarting = false;
    return this.start(port);
  }

  getStatus() {
    return {
      status: this.status,
      url: this.url,
      publicIP: this.publicIP
    };
  }
}

// シングルトンインスタンスを作成
const tunnelService = new TunnelService();

module.exports = tunnelService;