/**
 * 高エントロピーなID生成ユーティリティ
 * 時間ベースの偏りを避け、予測不可能なランダムIDを生成
 */

/**
 * 高品質なランダムID生成
 * @param {number} length - 生成するIDの長さ（デフォルト: 12）
 * @returns {string} 高エントロピーなランダムID
 */
function generateSecureRandomId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // 複数のエントロピー源を組み合わせ
  for (let i = 0; i < length; i++) {
    // Performance.now()を使って高精度時間 + Math.random()の組み合わせ
    const entropy = (performance.now() * Math.random() * Math.random()) % chars.length;
    const randomIndex = Math.floor(entropy);
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

/**
 * ガチャ専用のユニークID生成
 * プレフィックス付きで識別しやすく、かつ高エントロピー
 * @returns {string} ガチャID（形式: gacha_xxxxxxxxxxxxxx）
 */
function generateGachaId() {
  // タイムスタンプを直接使わず、ランダム文字列のみで構成
  const randomPart = generateSecureRandomId(14);
  return `gacha_${randomPart}`;
}

/**
 * クライアント専用のユニークID生成
 * @param {string} clientType - クライアントタイプ（dashboard, viewer等）
 * @returns {string} クライアントID
 */
function generateClientId(clientType = 'client') {
  const randomPart = generateSecureRandomId(9);
  return `${clientType}_${randomPart}`;
}

// Node.js環境（CommonJS）での場合
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateSecureRandomId,
    generateGachaId,
    generateClientId
  };
}

// ブラウザ環境での場合
if (typeof window !== 'undefined') {
  window.IdGenerator = {
    generateSecureRandomId,
    generateGachaId,
    generateClientId
  };
}