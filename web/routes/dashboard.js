const fs = require('fs');
const path = require('path');
const { getHtmlHead, getWeaponLabels } = require('../utils/html-builder');

function setupDashboardRoute(fastify) {
  fastify.get('/dashboard', async (request, reply) => {
    // dashboard-app.jsを読み込む
    const dashboardAppPath = path.join(__dirname, '../templates/dashboard-app.js');
    const dashboardAppCode = fs.readFileSync(dashboardAppPath, 'utf8');
    
    // 共通コンポーネントを読み込む
    const weaponSelectionModalPath = path.join(__dirname, '../components/WeaponSelectionModal.js');
    const weaponTypeSelectorPath = path.join(__dirname, '../components/WeaponTypeSelector.js');
    const subWeaponSelectorPath = path.join(__dirname, '../components/SubWeaponSelector.js');
    const specialWeaponSelectorPath = path.join(__dirname, '../components/SpecialWeaponSelector.js');
    const tunnelSettingsPath = path.join(__dirname, '../components/TunnelSettings.js');
    
    const weaponSelectionModalCode = fs.readFileSync(weaponSelectionModalPath, 'utf8');
    const weaponTypeSelectorCode = fs.readFileSync(weaponTypeSelectorPath, 'utf8');
    const subWeaponSelectorCode = fs.readFileSync(subWeaponSelectorPath, 'utf8');
    const specialWeaponSelectorCode = fs.readFileSync(specialWeaponSelectorPath, 'utf8');
    const tunnelSettingsCode = fs.readFileSync(tunnelSettingsPath, 'utf8');
    
    const html = `
${getHtmlHead('Splatoon Gacha - ダッシュボード')}
<body>
  <div id="root"></div>

  <script type="text/babel">
    ${getWeaponLabels()}
    
    // 共通コンポーネントを読み込み
    ${weaponSelectionModalCode}
    ${weaponTypeSelectorCode}
    ${subWeaponSelectorCode}
    ${specialWeaponSelectorCode}
    ${tunnelSettingsCode}
    
    ${dashboardAppCode}
    
    ReactDOM.render(<ControlApp />, document.getElementById('root'));
  </script>
</body>
</html>`;
    
    reply.type('text/html').send(html);
  });
}

module.exports = setupDashboardRoute;