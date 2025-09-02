const { test, expect } = require('@playwright/test');

test('Simple checkbox test', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  
  const checkbox = page.locator('[data-testid="skip-animation-checkbox"]');
  
  // 初期状態は false
  await expect(checkbox).not.toBeChecked();
  console.log('Initial state: unchecked ✓');
  
  // チェックする
  await checkbox.check();
  console.log('After check() call');
  
  // 状態を確認
  const isChecked = await checkbox.isChecked();
  console.log('isChecked():', isChecked);
  
  // 要素の属性を直接確認
  const checkedAttribute = await checkbox.getAttribute('checked');
  console.log('checked attribute:', checkedAttribute);
  
  // expectで確認
  await expect(checkbox).toBeChecked();
  console.log('expect().toBeChecked() passed ✓');
});