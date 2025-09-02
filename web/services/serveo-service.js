const { spawn } = require('child_process');
const EventEmitter = require('events');

class ServeoService extends EventEmitter {
  constructor() {
    super();
    this.sshProcess = null;
    this.url = null;
    this.status = 'disconnected';
    this.isRestarting = false;
    this.subdomain = null;
  }

  // ランダムなサブドメインを生成
  generateSubdomain() {
    const adjectives = ['quick', 'bright', 'smooth', 'cool', 'fast', 'smart', 'neat', 'sharp'];
    const nouns = ['stream', 'wave', 'flow', 'link', 'hub', 'zone', 'spot', 'view'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}-${noun}-${num}`;
  }

  async start(port = 3000) {
    if (this.sshProcess) {
      this.stop();
    }

    console.log('Starting Serveo tunnel...');
    this.status = 'connecting';
    this.emit('status', this.status);

    // サブドメインを生成
    this.subdomain = this.generateSubdomain();

    return new Promise((resolve, reject) => {
      // SSH コマンドを実行: ssh -R subdomain:80:localhost:port serveo.net
      const sshArgs = ['-R', `${this.subdomain}:80:localhost:${port}`, 'serveo.net'];
      
      console.log('SSH command:', 'ssh', sshArgs.join(' '));
      
      this.sshProcess = spawn('ssh', sshArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let urlReceived = false;
      let connectionEstablished = false;

      // 標準出力を監視してURLを取得
      this.sshProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('Serveo SSH output:', output);
        
        // URLパターンを検出 (HTTPSのみ使用)
        const httpsUrlMatch = output.match(/https:\/\/[^\\s]+\\.serveo\\.net/);
        if (httpsUrlMatch && !urlReceived) {
          urlReceived = true;
          this.url = httpsUrlMatch[0];
          this.status = 'connected';
          console.log('Serveo tunnel URL:', this.url);
          this.emit('connected', this.url);
          this.emit('status', this.status);
          resolve({ url: this.url });
        }

        // 接続確立メッセージを検出
        if (output.includes('Forwarding HTTP traffic') || output.includes('tunneled')) {
          connectionEstablished = true;
        }
      });

      // エラー出力を監視
      this.sshProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString().trim();
        console.error('Serveo SSH error:', errorOutput);
        
        // 接続エラーの検出
        if (errorOutput.includes('Connection refused') || 
            errorOutput.includes('Host key verification failed') ||
            errorOutput.includes('Permission denied')) {
          if (!urlReceived) {
            reject(new Error(`SSH connection failed: ${errorOutput}`));
          }
        }
      });

      // プロセスエラー
      this.sshProcess.on('error', (error) => {
        console.error('Failed to start SSH process:', error);
        this.status = 'error';
        this.emit('error', error);
        this.emit('status', this.status);
        if (!urlReceived) {
          reject(error);
        }
      });

      // プロセス終了
      this.sshProcess.on('close', (code) => {
        console.log(`SSH process exited with code ${code}`);
        this.sshProcess = null;
        this.url = null;
        this.subdomain = null;
        
        if (!this.isRestarting) {
          this.status = 'disconnected';
          this.emit('disconnected');
          this.emit('status', this.status);
        }
        
        if (!urlReceived) {
          reject(new Error(`SSH process exited with code ${code}`));
        }
      });

      // タイムアウト処理 (30秒でタイムアウト)
      setTimeout(() => {
        if (!urlReceived) {
          this.stop();
          reject(new Error('Timeout waiting for Serveo tunnel URL'));
        }
      }, 30000);
    });
  }

  stop() {
    if (this.sshProcess) {
      console.log('Stopping Serveo tunnel...');
      this.sshProcess.kill('SIGTERM');
      
      // 強制終了のためのタイムアウト
      setTimeout(() => {
        if (this.sshProcess) {
          console.log('Force killing SSH process...');
          this.sshProcess.kill('SIGKILL');
        }
      }, 5000);
      
      this.sshProcess = null;
      this.url = null;
      this.subdomain = null;
      this.status = 'disconnected';
      this.emit('disconnected');
      this.emit('status', this.status);
    }
  }

  async restart(port = 3000) {
    console.log('Restarting Serveo tunnel...');
    this.isRestarting = true;
    this.stop();
    
    // 少し待ってから再開始
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.isRestarting = false;
    return this.start(port);
  }

  getStatus() {
    return {
      status: this.status,
      url: this.url,
      subdomain: this.subdomain
    };
  }
}

// シングルトンインスタンスを作成
const serveoService = new ServeoService();

module.exports = serveoService;