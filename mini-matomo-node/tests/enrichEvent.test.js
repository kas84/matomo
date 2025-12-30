const { describe, it, expect, vi } = require('vitest');
const { mapQueryToEventPayload, buildEvent } = require('../src/core/enrichEvent');

describe('mapQueryToEventPayload', () => {
  it('maps Matomo query parameters into an event payload', () => {
    const payload = mapQueryToEventPayload({
      idsite: '1',
      url: 'https://example.com/home',
      urlref: 'https://ref.example.com',
      cdt: '2024-01-01T00:00:00Z',
      action_name: 'Home',
      cid: 'visitor-123',
      uid: 'user-9',
      e_c: 'video',
      e_a: 'play',
      e_n: 'trailer',
      e_v: '3',
      idgoal: '5',
      search: 'docs',
      search_count: '2',
      ping: '1',
      res: '1024x768',
      cd: '24',
      utm_campaign: 'spring',
      utm_medium: 'cpc',
      utm_source: 'adwords',
      ec_id: 'order-1',
      revenue: '19.9',
      ec_items: JSON.stringify([{ sku: 'sku-1', price: 9.9 }]),
      dimension1: 'vip',
      plugins: 'java,pdf',
    });

    expect(payload).toMatchObject({
      siteId: '1',
      url: 'https://example.com/home',
      referrer: 'https://ref.example.com',
      eventType: 'event',
      actionName: 'Home',
      visitorId: 'visitor-123',
      userId: 'user-9',
      metadata: {
        goalId: '5',
        search: 'docs',
        searchCount: 2,
        ping: true,
        screen: { resolution: '1024x768', colorDepth: 24 },
        campaign: { name: 'spring', medium: 'cpc', source: 'adwords' },
        ecommerce: { orderId: 'order-1', revenue: 19.9, items: [{ sku: 'sku-1', price: 9.9 }] },
        customDimensions: { dimension1: 'vip' },
        plugins: ['java', 'pdf'],
        event: {
          category: 'video',
          action: 'play',
          name: 'trailer',
          value: 3,
        },
      },
    });
  });
});

describe('buildEvent', () => {
  it('builds a normalized event with defaults', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-02T12:00:00Z'));

    const { event, error } = buildEvent(
      {
        siteId: '99',
        url: 'https://example.com',
        referrer: 'https://ref.example.com',
        eventType: 'pageview',
        visitorId: 'cid',
        userId: 'uid',
        actionName: 'Landing',
        metadata: { extra: 'ok', empty: undefined },
      },
      {
        ip: '1.1.1.1',
        userAgent: 'UA',
        acceptLanguage: 'es',
      },
    );

    expect(error).toBeUndefined();
    expect(event).toMatchObject({
      siteId: '99',
      url: 'https://example.com/',
      referrer: 'https://ref.example.com/',
      eventType: 'pageview',
      visitorId: 'cid',
      userId: 'uid',
      actionName: 'Landing',
      metadata: { extra: 'ok' },
      ip: '1.1.1.1',
      userAgent: 'UA',
      acceptLanguage: 'es',
    });
    expect(event.timestamp.toISOString()).toBe('2024-02-02T12:00:00.000Z');
    expect(event._id).toHaveLength(12);
    expect(event.sessionId).toHaveLength(16);
    expect(event.attribution).toEqual({ channel: 'referral', referrer: 'https://ref.example.com/' });

    vi.useRealTimers();
  });

  it('fails when siteId, url or timestamp are invalid', () => {
    expect(buildEvent({ siteId: '', url: 'https://ok', timestamp: new Date() }, {})).toEqual({
      error: 'Invalid siteId',
    });

    expect(buildEvent({ siteId: '1', url: 'notaurl', timestamp: new Date() }, {})).toEqual({
      error: 'Invalid url',
    });

    expect(buildEvent({ siteId: '1', url: 'https://ok', timestamp: 'bad-date' }, {})).toEqual({
      error: 'Invalid timestamp',
    });
  });
});
