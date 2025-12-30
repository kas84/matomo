const { nanoid } = require('nanoid');
const { coerceTimestamp, normalizeUrl, isValidSiteId } = require('./validation');

function buildEvent(payload, requestMeta) {
  const { siteId, url, referrer, eventType, metadata } = payload;
  const timestamp = coerceTimestamp(payload.timestamp);
  const normalizedUrl = normalizeUrl(url);
  const normalizedReferrer = referrer ? normalizeUrl(referrer) : null;

  if (!isValidSiteId(siteId)) {
    return { error: 'Invalid siteId' };
  }

  if (!normalizedUrl) {
    return { error: 'Invalid url' };
  }

  if (!timestamp) {
    return { error: 'Invalid timestamp' };
  }

  return {
    event: {
      _id: nanoid(12),
      siteId: siteId.trim(),
      url: normalizedUrl,
      referrer: normalizedReferrer,
      eventType: eventType && typeof eventType === 'string' ? eventType : 'pageview',
      timestamp,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    },
  };
}

module.exports = { buildEvent };
