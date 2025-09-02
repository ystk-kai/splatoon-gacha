const { spawn } = require('child_process');
const EventEmitter = require('events');

class LocalhostRunService extends EventEmitter {
  constructor() {
    super();
    this.sshProcess = null;
    this.url = null;
    this.status = 'disconnected';
    this.isRestarting = false;
    this.connectionId = null;
    this.additionalInfo = null;
  }

  async start(port = 3000) {
    if (this.sshProcess) {
      this.stop();
    }

    console.log('Starting localhost.run tunnel...');
    this.status = 'connecting';
    this.emit('status', this.status);

    return new Promise((resolve, reject) => {
      // SSH コマンドを実行: ssh -R 80:localhost:port localhost.run
      const sshArgs = [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=60',
        '-R', `80:localhost:${port}`,
        'localhost.run'
      ];
      
      console.log('SSH command:', 'ssh', sshArgs.join(' '));
      
      this.sshProcess = spawn('ssh', sshArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let urlReceived = false;
      let connectionEstablished = false;

      // 標準出力を監視してURLを取得
      this.sshProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('localhost.run SSH output:', output);
        
        // URLパターンを検出: https://xxxxx.lhr.life (localhost.runの新しい形式)
        const httpsUrlMatch = output.match(/https:\/\/[a-f0-9]+\.lhr\.life/);
        if (httpsUrlMatch && !urlReceived) {
          urlReceived = true;
          this.url = httpsUrlMatch[0];
          this.status = 'connected';
          console.log('localhost.run tunnel URL:', this.url);
          this.emit('connected', this.url);
          this.emit('status', this.status);
          resolve({ url: this.url });
        }

        // 接続確立メッセージを検出
        if (output.includes('tunneled') || output.includes('Connect to') || output.includes('forwarded')) {
          connectionEstablished = true;
          
          // 追加情報の収集
          const additionalInfo = [];
          if (output.includes('create an account')) {
            additionalInfo.push('永続的なドメイン名にはアカウント作成が必要です');
            additionalInfo.push('詳細: https://localhost.run/docs/forever-free/');
          }
          
          this.additionalInfo = additionalInfo.length > 0 ? additionalInfo : null;
        }
        
        // QR コード情報を検出
        if (output.includes('Open your tunnel address on your mobile with this QR')) {
          this.additionalInfo = this.additionalInfo || [];
          this.additionalInfo.push('モバイル用QRコードが利用可能です（コンソールログを確認）');
        }
      });

      // エラー出力を監視
      this.sshProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString().trim();
        console.error('localhost.run SSH error:', errorOutput);
        
        // 接続 ID を取得
        const connectionIdMatch = errorOutput.match(/your connection id is ([a-f0-9-]+)/);
        if (connectionIdMatch) {
          this.connectionId = connectionIdMatch[1];
          console.log('localhost.run connection ID:', this.connectionId);
        }
        
        // 接続エラーの検出
        if (errorOutput.includes('Connection refused') || 
            errorOutput.includes('Host key verification failed') ||
            errorOutput.includes('Permission denied') ||
            errorOutput.includes('Could not resolve hostname')) {
          if (!urlReceived) {
            reject(new Error(`SSH connection failed: ${errorOutput}`));
          }
        }
      });

      // プロセスエラー
      this.sshProcess.on('error', (error) => {
        console.error('Failed to start SSH process:', error);
        
        // SSHコマンドが見つからない場合の特別なメッセージ
        if (error.code === 'ENOENT') {
          const installError = new Error('SSH command not found. Please install OpenSSH client');
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
      this.sshProcess.on('close', (code) => {
        console.log(`SSH process exited with code ${code}`);
        this.sshProcess = null;
        this.url = null;
        this.connectionId = null;
        this.additionalInfo = null;
        
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
          reject(new Error('Timeout waiting for localhost.run tunnel URL'));
        }
      }, 30000);
    });
  }

  stop() {
    if (this.sshProcess) {
      console.log('Stopping localhost.run tunnel...');
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
      this.connectionId = null;
      this.additionalInfo = null;
      this.status = 'disconnected';
      this.emit('disconnected');
      this.emit('status', this.status);
    }
  }

  async restart(port = 3000) {
    console.log('Restarting localhost.run tunnel...');
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
      connectionId: this.connectionId,
      additionalInfo: this.additionalInfo
    };
  }
}

// シングルトンインスタンスを作成
const localhostRunService = new LocalhostRunService();

module.exports = localhostRunService;