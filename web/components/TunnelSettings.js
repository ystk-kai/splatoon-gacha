// 外部公開設定コンポーネント
const TunnelSettings = ({ 
  tunnelStatus,
  tunnelUrl,
  tunnelAuthInfo,
  tunnelServiceType,
  availableServices,
  isConnectingTunnel,
  onStartTunnel,
  onStopTunnel,
  onRestartTunnel,
  onServiceChange
}) => {
  // サービス別の案内文を生成
  const generateServiceSpecificMessage = () => {
    let message = `🎲 視聴者画面にアクセスできます！\n\n1. URL: ${tunnelUrl}/viewer\n`;
    
    if (tunnelAuthInfo.type === 'ip') {
      // Localtunnel の場合
      message += `2. パスワード: ${tunnelAuthInfo.value}\n\n【アクセス方法】\n① 上記URLをクリックしてアクセス\n② 「Tunnel Password:」の入力欄にパスワードを入力\n③ 「Click to Submit」をクリック\n④ 視聴者画面が表示されます`;
    } else if (tunnelAuthInfo.type === 'none') {
      // localhost.run または bore.pub の場合
      message += `\n【アクセス方法】\n① 上記URLをクリック\n② 直接視聴者画面が表示されます`;
      
      // bore 固有の情報
      if (tunnelServiceType === 'bore') {
        message += `\n\n【サービス情報】\nBore.pub を使用しています（高速・軽量）`;
      }
    }
    
    return message;
  };

  const getServiceSpecificInstructions = () => {
    if (tunnelUrl && tunnelAuthInfo) {
      // 接続中の場合：認証情報に基づく詳細な説明
      if (tunnelAuthInfo.type === 'ip') {
        return (
          <div className="text-xs text-blue-200 mt-3 space-y-1">
            <p>【アクセス方法】</p>
            <p>① 上記URLをクリックしてアクセス</p>
            <p>② 「Tunnel Password:」の入力欄にパスワードを入力</p>
            <p>③ 「Click to Submit」をクリック</p>
            <p>④ 視聴者画面が表示されます</p>
          </div>
        );
      } else {
        return (
          <div className="text-xs text-blue-200 mt-3 space-y-1">
            <p>【アクセス方法】</p>
            <p>① 上記URLをクリック</p>
            <p>② 直接視聴者画面が表示されます</p>
          </div>
        );
      }
    }
    return null;
  };

  // サービス別の使用方法説明を生成（切断時でも表示）
  const getServiceSpecificUsageInstructions = () => {
    const baseSteps = ['「接続開始」ボタンをクリックして外部公開を開始', '自動取得されたURLを視聴者に共有'];
    
    switch (tunnelServiceType) {
      case 'localhost-run':
        return [
          ...baseSteps,
          '視聴者は共有されたURL（/viewer）に直接アクセスして視聴者画面を利用可能',
          '接続が切れた場合は「再接続」ボタンで再接続（URLが変わります）'
        ];
      case 'bore':
        return [
          ...baseSteps,
          '視聴者は共有されたURL（/viewer）に直接アクセスして視聴者画面を利用可能',
          'Bore.pub：高速で軽量なサービスを使用（認証不要）',
          '接続が切れた場合は「再接続」ボタンで再接続（URLが変わります）'
        ];
      case 'localtunnel':
        return [
          ...baseSteps,
          '自動取得されたパスワード（IPアドレス）も視聴者に共有',
          '視聴者はURLアクセス後、「Tunnel Password:」欄にパスワード入力で視聴者画面にアクセス可能',
          '接続が切れた場合は「再接続」ボタンで再接続（URL・パスワードが変わります）'
        ];
      default:
        return baseSteps;
    }
  };
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-4 text-splatoon-purple splatoon-font">外部公開設定</h2>
      
      <div className="space-y-4">
        {/* サービス選択 */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-400 mb-3">サービス選択:</p>
          <div className="space-y-2">
            {availableServices.map(service => (
              <label key={service.type} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="tunnelService"
                  value={service.type}
                  checked={tunnelServiceType === service.type}
                  onChange={(e) => onServiceChange(e.target.value)}
                  disabled={tunnelStatus === 'connected' || tunnelStatus === 'connecting'}
                  className="text-splatoon-purple focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-white font-medium">{service.name}</span>
                  <p className="text-sm text-gray-400">{service.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    <span className="text-green-400">利点:</span> {service.pros.join(', ')} |{' '}
                    <span className="text-yellow-400">制限:</span> {service.cons.join(', ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {tunnelStatus === 'connected' && (
            <p className="text-xs text-yellow-400 mt-2">
              ※サービスを変更するには、まず現在の接続を停止してください
            </p>
          )}
        </div>
        
        {/* 接続状態表示 */}
        <div className="flex items-center gap-3">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            tunnelStatus === 'connected' ? 'bg-green-600 text-white' :
            tunnelStatus === 'error' ? 'bg-red-600 text-white' :
            'bg-gray-600 text-gray-300'
          }`}>
            {tunnelStatus === 'connected' ? '🌐 接続中' : 
             tunnelStatus === 'connecting' ? '⏳ 接続中...' : '⭕ 未接続'}
          </span>
          
          {tunnelStatus === 'disconnected' && (
            <button
              onClick={onStartTunnel}
              disabled={isConnectingTunnel}
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isConnectingTunnel 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-splatoon-purple hover:bg-purple-600 text-white'
              }`}
            >
              {isConnectingTunnel ? '接続中...' : '接続開始'}
            </button>
          )}
          
          {tunnelStatus === 'connected' && (
            <>
              <button
                onClick={onRestartTunnel}
                disabled={isConnectingTunnel}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  isConnectingTunnel 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {isConnectingTunnel ? '再接続中...' : '再接続'}
              </button>
              <button
                onClick={onStopTunnel}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all duration-200"
              >
                停止
              </button>
            </>
          )}
        </div>
        
        {/* URL・パスワード表示 */}
        {tunnelUrl && (
          <div className="space-y-4">
            {/* URL表示 */}
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">外部公開URL:</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-splatoon-purple font-mono text-sm bg-gray-800 px-3 py-2 rounded">
                  {tunnelUrl}/viewer
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${tunnelUrl}/viewer`);
                    alert('URLをコピーしました');
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  📋 コピー
                </button>
              </div>
            </div>
            
            {/* 認証情報表示 */}
            {tunnelAuthInfo && (
              <div className="p-4 bg-amber-900 rounded-lg border border-amber-700">
                <p className="text-sm text-amber-200 mb-2 font-semibold">
                  🔑 {tunnelAuthInfo.type === 'ip' ? 'アクセス用パスワード:' : '認証情報:'}
                </p>
                {tunnelAuthInfo.type === 'ip' && (
                  <>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-amber-100 font-mono text-lg bg-amber-800 px-3 py-2 rounded font-bold">
                        {tunnelAuthInfo.value}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tunnelAuthInfo.value);
                          alert('パスワードをコピーしました');
                        }}
                        className="px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm"
                      >
                        📋 コピー
                      </button>
                    </div>
                    <p className="text-xs text-amber-300 mt-2">
                      ※{tunnelAuthInfo.instruction}
                    </p>
                  </>
                )}
                {tunnelAuthInfo.type === 'none' && (
                  <>
                    <p className="text-amber-100 text-sm">
                      {tunnelAuthInfo.instruction}
                    </p>
                    {tunnelAuthInfo.connectionId && (
                      <div className="mt-3 p-2 bg-amber-800 rounded border border-amber-600">
                        <p className="text-xs text-amber-200 font-semibold">🆔 接続ID:</p>
                        <code className="text-amber-100 font-mono text-xs">
                          {tunnelAuthInfo.connectionId}
                        </code>
                        <p className="text-xs text-amber-300 mt-1">
                          ※問題が発生した場合は、この接続IDを添えてお問い合わせください
                        </p>
                      </div>
                    )}
                    {tunnelAuthInfo.additionalInfo && tunnelAuthInfo.additionalInfo.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-800 rounded border border-blue-600">
                        <p className="text-xs text-blue-200 font-semibold">💡 追加情報:</p>
                        {tunnelAuthInfo.additionalInfo.map((info, index) => (
                          <p key={index} className="text-xs text-blue-100 mt-1">
                            • {info}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 視聴者への案内 */}
        {tunnelUrl && tunnelAuthInfo && (
          <div className="p-4 bg-blue-900 rounded-lg border border-blue-700">
            <h4 className="text-sm font-semibold text-blue-200 mb-3">📢 視聴者への案内文（コピーして共有してください）</h4>
            <div className="bg-blue-800 p-3 rounded border border-blue-600">
              <div className="text-sm text-blue-100 leading-relaxed">
                <p className="font-semibold mb-2">🎲 視聴者画面にアクセスできます！</p>
                <p className="mb-2">
                  <strong>1. URL:</strong> {tunnelUrl}/viewer
                </p>
                {tunnelAuthInfo.type === 'ip' && (
                  <p className="mb-2">
                    <strong>2. パスワード:</strong> {tunnelAuthInfo.value}
                  </p>
                )}
                {getServiceSpecificInstructions()}
              </div>
            </div>
            
            <button
              onClick={() => {
                const message = generateServiceSpecificMessage();
                navigator.clipboard.writeText(message);
                alert('案内文を全てコピーしました！チャットやDiscordに貼り付けて使用してください。');
              }}
              className="mt-3 w-full px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              📋 全文をコピー
            </button>
          </div>
        )}
        
        {/* 使用方法（サービス別に動的表示） */}
        <div className="p-3 bg-gray-900 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">使用方法 ({availableServices.find(s => s.type === tunnelServiceType)?.name}):</h4>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            {getServiceSpecificUsageInstructions().map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

// グローバルスコープで使用できるように
window.TunnelSettings = TunnelSettings;