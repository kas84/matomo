const { nanoid } = require('nanoid');
const { coerceTimestamp, normalizeUrl, isValidSiteId } = require('./validation');

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function mapQueryToEventPayload(query) {
  const eventIsCustom = query.e_c || query.e_a || query.e_n;

  return compactObject({
    siteId: query.idsite || query.siteId,
    url: query.url || query.u,
    referrer: query.urlref || query.ref,
    eventType: eventIsCustom ? 'event' : 'pageview',
    timestamp: query.cdt,
    actionName: query.action_name,
    visitorId: query.cid,
    userId: query.uid,
    metadata: compactObject({
      goalId: query.idgoal,
      search: query.search,
      searchCount: query.search_count ? Number(query.search_count) : undefined,
      ping: query.ping === '1',
      event: eventIsCustom
        ? compactObject({
            category: query.e_c,
            action: query.e_a,
            name: query.e_n,
            value: query.e_v ? Number(query.e_v) : undefined,
          })
        : undefined,
    }),
  });
}

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
    event: compactObject({
      _id: nanoid(12),
      siteId: siteId.trim(),
      url: normalizedUrl,
      referrer: normalizedReferrer,
      eventType: eventType && typeof eventType === 'string' ? eventType : 'pageview',
      timestamp,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      acceptLanguage: requestMeta.acceptLanguage,
      visitorId: payload.visitorId,
      userId: payload.userId,
      actionName: payload.actionName,
      metadata: metadata && typeof metadata === 'object' ? compactObject(metadata) : undefined,
    }),
  };
}

module.exports = { buildEvent, mapQueryToEventPayload };
