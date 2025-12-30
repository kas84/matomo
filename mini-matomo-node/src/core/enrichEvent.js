const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { coerceTimestamp, normalizeUrl, isValidSiteId, sameHost } = require('./validation');

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

function extractCustomDimensions(query) {
  const entries = Object.entries(query).filter(([key]) => /^dimension\d+$/i.test(key));
  if (!entries.length) return undefined;

  return entries.reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});
}

function parseJsonSafe(raw) {
  if (typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return undefined;
  }
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function mapQueryToEventPayload(query) {
  const eventIsCustom = query.e_c || query.e_a || query.e_n;

  return compactObject({
    siteId: query.idsite || query.siteId,
    url: query.url || query.u,
    referrer: query.urlref || query.ref,
    eventType: eventIsCustom ? 'event' : query.ping === '1' ? 'heartbeat' : 'pageview',
    timestamp: query.cdt,
    actionName: query.action_name,
    visitorId: query.cid,
    userId: query.uid,
    metadata: compactObject({
      goalId: query.idgoal,
      search: query.search,
      searchCount: toNumber(query.search_count),
      ping: query.ping === '1',
      timeOnPage: toNumber(query.time_on_page),
      screen: compactObject({
        resolution: query.res || query.sr,
        colorDepth: toNumber(query.cd),
      }),
      campaign: compactObject({
        name: query.pk_campaign || query.utm_campaign,
        keyword: query.pk_kwd || query.utm_term,
        source: query.pk_source || query.utm_source,
        medium: query.pk_medium || query.utm_medium,
        content: query.pk_content || query.utm_content,
      }),
      ecommerce: compactObject({
        orderId: query.ec_id,
        revenue: toNumber(query.revenue),
        items: parseJsonSafe(query.ec_items),
      }),
      media: compactObject({
        id: query.ma_id,
        title: query.ma_ti,
        player: query.ma_ps,
        timePlayed: toNumber(query.ma_ttp),
        progress: toNumber(query.ma_pr),
      }),
      jsError: compactObject({
        name: query.error_name,
        message: query.error_message,
        stack: query.error_stack,
      }),
      plugins: query.plugins ? String(query.plugins).split(',').filter(Boolean) : undefined,
      customDimensions: extractCustomDimensions(query),
      event: eventIsCustom
        ? compactObject({
            category: query.e_c,
            action: query.e_a,
            name: query.e_n,
            value: toNumber(query.e_v),
          })
        : undefined,
    }),
  });
}

function deriveSession(visitorId, siteId, timestamp) {
  if (!visitorId || !siteId || !timestamp) return undefined;
  const windowMinutes = 30;
  const bucket = Math.floor(timestamp.getTime() / (windowMinutes * 60 * 1000));
  return crypto
    .createHash('sha1')
    .update(`${siteId}:${visitorId}:${bucket}`)
    .digest('hex')
    .slice(0, 16);
}

function inferAttribution(url, referrer, campaign) {
  const hasCampaign = campaign && Object.values(campaign).some(Boolean);
  if (hasCampaign) {
    return { channel: 'campaign', campaign };
  }

  if (!referrer) {
    return { channel: 'direct' };
  }

  const searchEngines = /(google|bing|yahoo|duckduckgo|yandex|baidu)\./i;
  try {
    const refHost = new URL(referrer).host;
    if (searchEngines.test(refHost)) {
      return { channel: 'organic', referrer };
    }
  } catch (_err) {
    // ignore parse errors
  }

  if (url && referrer && sameHost(url, referrer)) {
    return { channel: 'internal', referrer };
  }

  return { channel: 'referral', referrer };
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

  const derivedSession = deriveSession(payload.visitorId, siteId, timestamp);
  const attribution = inferAttribution(normalizedUrl, normalizedReferrer, metadata?.campaign);

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
      sessionId: derivedSession,
      attribution,
      metadata: metadata && typeof metadata === 'object' ? compactObject(metadata) : undefined,
    }),
  };
}

module.exports = { buildEvent, mapQueryToEventPayload };
