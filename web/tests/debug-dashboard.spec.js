/**
 * デバッグ用のダッシュボードテスト
 * コンソールエラーとページ読み込み状況を確認
 */

const { test, expect } = require('@playwright/test');

test('ダッシュボードの読み込みデバッグ', async ({ page }) => {
  // コンソールログとエラーを監視
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`Page error: ${error.message}`);
  });

  // ダッシュボードページに移動
  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  
  // ページの読み込みを待つ
  await page.waitForTimeout(5000);
  
  // ページタイトルを確認
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // ページ内容の基本チェック
  const bodyText = await page.locator('body').textContent();
  console.log(`Body text length: ${bodyText?.length || 0}`);
  console.log(`Body text preview: ${bodyText?.slice(0, 200) || 'No text'}`);
  
  // WeaponUtilsが利用可能か確認
  const weaponUtilsAvailable = await page.evaluate(() => {
    return typeof window.WeaponUtils !== 'undefined';
  });
  console.log(`WeaponUtils available: ${weaponUtilsAvailable}`);
  
  // エラーがあれば報告
  if (errors.length > 0) {
    console.log('JavaScript errors found:');
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // 基本的な要素が存在するか確認
  const hasMainContent = await page.locator('body').count() > 0;
  expect(hasMainContent).toBeTruthy();
});