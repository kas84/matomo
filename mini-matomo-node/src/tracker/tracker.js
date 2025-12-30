(function () {
  const endpoint = '/collect';
  const siteId = document.currentScript?.dataset?.siteId || 'demo';

  function nowIso() {
    return new Date().toISOString();
  }

  function send(payload) {
    const body = JSON.stringify(payload);
    navigator.sendBeacon(endpoint, body) || fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  }

  function trackPageview() {
    send({
      siteId,
      url: window.location.href,
      referrer: document.referrer,
      eventType: 'pageview',
      timestamp: nowIso(),
    });
  }

  function trackCustom(eventType, metadata) {
    send({
      siteId,
      url: window.location.href,
      referrer: document.referrer,
      eventType,
      timestamp: nowIso(),
      metadata,
    });
  }

  window.miniMatomo = {
    trackPageview,
    trackEvent: trackCustom,
  };

  trackPageview();
})();
