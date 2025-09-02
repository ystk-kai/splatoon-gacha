const fs = require('fs');
const path = require('path');
const { getHtmlHead, getWeaponLabels } = require('../utils/html-builder');
const { getImageUrl, getWeaponImageUrl, getLogoImageUrl, getCapsulesImageUrl } = require('../utils/cdn');

function setupViewerRoute(fastify) {
  fastify.get('/viewer', async (request, reply) => {
    // viewer-app.jsを読み込む
    const viewerAppPath = path.join(__dirname, '../templates/viewer-app.js');
    const viewerAppCode = fs.readFileSync(viewerAppPath, 'utf8');
    
    // 共通コンポーネントを読み込む
    const weaponSelectionModalPath = path.join(__dirname, '../components/WeaponSelectionModal.js');
    const weaponTypeSelectorPath = path.join(__dirname, '../components/WeaponTypeSelector.js');
    const subWeaponSelectorPath = path.join(__dirname, '../components/SubWeaponSelector.js');
    const specialWeaponSelectorPath = path.join(__dirname, '../components/SpecialWeaponSelector.js');
    
    const weaponSelectionModalCode = fs.readFileSync(weaponSelectionModalPath, 'utf8');
    const weaponTypeSelectorCode = fs.readFileSync(weaponTypeSelectorPath, 'utf8');
    const subWeaponSelectorCode = fs.readFileSync(subWeaponSelectorPath, 'utf8');
    const specialWeaponSelectorCode = fs.readFileSync(specialWeaponSelectorPath, 'utf8');
    
    const html = `
${getHtmlHead('Splatoon Gacha - 視聴者画面')}
<body>
  <div id="root"></div>

  <script type="text/babel">
    ${getWeaponLabels()}
    
    // CDN configuration
    const CDN_BASE_URL = '${process.env.CDN_BASE_URL || ''}';
    
    // Image URL helper functions
    const getImageUrl = (imagePath) => {
      if (!CDN_BASE_URL) return imagePath;
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      const cleanCdnUrl = CDN_BASE_URL.endsWith('/') ? CDN_BASE_URL.slice(0, -1) : CDN_BASE_URL;
      return \`\${cleanCdnUrl}/\${cleanPath}\`;
    };
    
    const getWeaponImageUrl = (weaponId) => getImageUrl(\`/images/weapons/\${weaponId}.png\`);
    const getLogoImageUrl = () => getImageUrl('/images/splatoon_gacha_logo.png');
    const getCapsulesImageUrl = () => getImageUrl('/images/multiple_capsules.png');
    
    // 共通コンポーネントを読み込み
    ${weaponSelectionModalCode}
    ${weaponTypeSelectorCode}
    ${subWeaponSelectorCode}
    ${specialWeaponSelectorCode}
    
    ${viewerAppCode}
    
    ReactDOM.render(<ViewerApp />, document.getElementById('root'));
  </script>
</body>
</html>`;
    
    reply.type('text/html').send(html);
  });
}

module.exports = setupViewerRoute;