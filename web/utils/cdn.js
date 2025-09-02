/**
 * CDN utility functions for image URL generation
 */

/**
 * Generate image URL with optional CDN base path
 * @param {string} imagePath - Relative image path (e.g., '/images/weapons/splattershot.png')
 * @param {string} cdnBaseUrl - CDN base URL from environment variable
 * @returns {string} Full image URL
 */
function getImageUrl(imagePath, cdnBaseUrl = '') {
  // If no CDN URL is configured, return the original path
  if (!cdnBaseUrl) {
    return imagePath;
  }

  // Remove leading slash from image path if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Ensure CDN URL doesn't end with a slash
  const cleanCdnUrl = cdnBaseUrl.endsWith('/') ? cdnBaseUrl.slice(0, -1) : cdnBaseUrl;
  
  return `${cleanCdnUrl}/${cleanPath}`;
}

/**
 * Generate weapon image URL
 * @param {string} weaponId - Weapon ID
 * @param {string} cdnBaseUrl - CDN base URL from environment variable
 * @returns {string} Full weapon image URL
 */
function getWeaponImageUrl(weaponId, cdnBaseUrl = '') {
  return getImageUrl(`/images/weapons/${weaponId}.png`, cdnBaseUrl);
}

/**
 * Generate logo image URL
 * @param {string} cdnBaseUrl - CDN base URL from environment variable
 * @returns {string} Full logo image URL
 */
function getLogoImageUrl(cdnBaseUrl = '') {
  return getImageUrl('/images/splatoon_gacha_logo.png', cdnBaseUrl);
}

/**
 * Generate multiple capsules image URL
 * @param {string} cdnBaseUrl - CDN base URL from environment variable
 * @returns {string} Full capsules image URL
 */
function getCapsulesImageUrl(cdnBaseUrl = '') {
  return getImageUrl('/images/multiple_capsules.png', cdnBaseUrl);
}

module.exports = {
  getImageUrl,
  getWeaponImageUrl,
  getLogoImageUrl,
  getCapsulesImageUrl
};