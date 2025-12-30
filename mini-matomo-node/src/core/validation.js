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

module.exports = {
  isValidSiteId,
  normalizeUrl,
  coerceTimestamp,
};
