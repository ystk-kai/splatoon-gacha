const { spawn } = require('child_process');
const EventEmitter = require('events');

class BoreService extends EventEmitter {
  constructor() {
    super();
    this.boreProcess = null;
    this.url = null;
    this.status = 'disconnected';
    this.isRestarting = false;
  }

  async start(port = 3000) {
    if (this.boreProcess) {
      this.stop();
    }

    console.log('Starting bore tunnel...');
    this.status = 'connecting';
    this.emit('status', this.status);

    return new Promise((resolve, reject) => {
      // bore local <port> --to bore.pub を実行
      const boreArgs = ['local', port.toString(), '--to', 'bore.pub'];
      
      console.log('Bore command:', 'bore', boreArgs.join(' '));
      
      this.boreProcess = spawn('bore', boreArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let urlReceived = false;

      // 標準出力を監視してURLを取得
      this.boreProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('Bore output:', output);
        
        // URLパターンを検出: listening at bore.pub:xxxxx
        const urlMatch = output.match(/listening at bore\.pub:(\d+)/);
        if (urlMatch && !urlReceived) {
          urlReceived = true;
          const port = urlMatch[1];
          this.url = `http://bore.pub:${port}`;
          this.status = 'connected';
          console.log('Bore tunnel URL:', this.url);
          this.emit('connected', this.url);
          this.emit('status', this.status);
          resolve({ url: this.url });
        }
      });

      // エラー出力を監視
      this.boreProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString().trim();
        console.error('Bore error:', errorOutput);
        
        // エラーパターンの検出
        if (errorOutput.includes('connection refused') || 
            errorOutput.includes('failed to connect') ||
            errorOutput.includes('network unreachable')) {
          if (!urlReceived) {
            reject(new Error(`Bore connection failed: ${errorOutput}`));
          }
        }
      });

      // プロセスエラー
      this.boreProcess.on('error', (error) => {
        console.error('Failed to start bore process:', error);
        
        // boreコマンドが見つからない場合の特別なメッセージ
        if (error.code === 'ENOENT') {
          const installError = new Error('bore コマンドが見つかりません。\n\nインストール方法：\n1. Rust をインストール: curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\n2. bore をインストール: cargo install bore-cli\n3. パスを更新: source ~/.bashrc\n\n詳細: https://github.com/ekzhang/bore');
          this.status = 'error';
          this.emit('error', installError);
          this.emit('status', this.status);
          if (!urlReceived) {
            reject(installError);
          }
          return;
        }
        
        this.status = 'error';
        this.emit('error', error);
        this.emit('status', this.status);
        if (!urlReceived) {
          reject(error);
        }
      });

      // プロセス終了
      this.boreProcess.on('close', (code) => {
        console.log(`Bore process exited with code ${code}`);
        this.boreProcess = null;
        this.url = null;
        
        if (!this.isRestarting) {
          this.status = 'disconnected';
          this.emit('disconnected');
          this.emit('status', this.status);
        }
        
        if (!urlReceived) {
          reject(new Error(`Bore process exited with code ${code}`));
        }
      });

      // タイムアウト処理 (20秒でタイムアウト)
      setTimeout(() => {
        if (!urlReceived) {
          this.stop();
          reject(new Error('Timeout waiting for bore tunnel URL'));
        }
      }, 20000);
    });
  }

  stop() {
    if (this.boreProcess) {
      console.log('Stopping bore tunnel...');
      this.boreProcess.kill('SIGTERM');
      
      // 強制終了のためのタイムアウト
      setTimeout(() => {
        if (this.boreProcess) {
          console.log('Force killing bore process...');
          this.boreProcess.kill('SIGKILL');
        }
      }, 3000);
      
      this.boreProcess = null;
      this.url = null;
      this.status = 'disconnected';
      this.emit('disconnected');
      this.emit('status', this.status);
    }
  }

  async restart(port = 3000) {
    console.log('Restarting bore tunnel...');
    this.isRestarting = true;
    this.stop();
    
    // 少し待ってから再開始
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.isRestarting = false;
    return this.start(port);
  }

  getStatus() {
    return {
      status: this.status,
      url: this.url
    };
  }
}

// シングルトンインスタンスを作成
const boreService = new BoreService();

module.exports = boreService;