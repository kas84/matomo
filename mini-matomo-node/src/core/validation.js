const { URL } = require('url');

function isValidSiteId(siteId) {
  return typeof siteId === 'string' && siteId.trim().length > 0 && siteId.length <= 64;
}

function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

function coerceTimestamp(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isLikelyBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return /bot|crawl|slurp|spider|headless|phantom|selenium/i.test(userAgent);
}

function sameHost(urlA, urlB) {
  try {
    const hostA = new URL(urlA).host;
    const hostB = new URL(urlB).host;
    return hostA === hostB;
  } catch (_err) {
    return false;
  }
}

module.exports = {
  isValidSiteId,
  normalizeUrl,
  coerceTimestamp,
  isLikelyBot,
  sameHost,
};
