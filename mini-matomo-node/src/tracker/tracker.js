(function () {
  var script = document.currentScript;
  var collector = (script && (script.dataset.collector || script.dataset.collectUrl)) || '/collect';
  var initialSiteId = (script && script.dataset.siteId) || 'demo';
  var storageKey = 'miniMatomoVisitorId';
  var heartbeatIntervalMs = 15000;

  function randomId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }

    return Math.random().toString(36).slice(2, 18);
  }

  function getVisitorId() {
    try {
      var cached = localStorage.getItem(storageKey);
      if (cached) return cached;
      var generated = randomId();
      localStorage.setItem(storageKey, generated);
      return generated;
    } catch (_err) {
      return randomId();
    }
  }

  var state = {
    collector: collector,
    siteId: initialSiteId,
    visitorId: getVisitorId(),
    userId: null,
    customUrl: null,
    customTitle: null,
    referrer: null,
    customDimensions: {},
    campaign: null,
    plugins: null,
    startedAt: Date.now(),
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function detectCampaign() {
    var params = new URLSearchParams(window.location.search || '');
    var campaign = {
      utm_campaign: params.get('utm_campaign'),
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      pk_campaign: params.get('pk_campaign'),
      pk_source: params.get('pk_source'),
      pk_medium: params.get('pk_medium'),
      pk_kwd: params.get('pk_kwd'),
      pk_content: params.get('pk_content'),
    };

    var hasValue = Object.values(campaign).some(function (value) {
      return value !== null && value !== '';
    });

    state.campaign = hasValue ? campaign : null;
  }

  function detectPlugins() {
    try {
      var plugins = [];
      if (navigator.javaEnabled && navigator.javaEnabled()) plugins.push('java');
      if (navigator.pdfViewerEnabled) plugins.push('pdf');
      if (navigator.plugins && navigator.plugins.length) {
        Array.prototype.forEach.call(navigator.plugins, function (p) {
          plugins.push(p.name);
        });
      }
      state.plugins = plugins.length ? plugins.slice(0, 10) : null;
    } catch (_err) {
      state.plugins = null;
    }
  }

  function buildTarget(params) {
    var target = new URL(state.collector, window.location.origin);
    var baseParams = {
      idsite: state.siteId,
      cid: state.visitorId,
      uid: state.userId || undefined,
      url: state.customUrl || window.location.href,
      urlref: state.referrer || document.referrer || undefined,
      action_name: state.customTitle || document.title,
      cdt: nowIso(),
      rand: Math.random().toString(36).slice(2, 10),
      res: window.screen ? window.screen.width + 'x' + window.screen.height : undefined,
      cd: window.screen && window.screen.colorDepth ? window.screen.colorDepth : undefined,
    };

    var finalParams = Object.assign({}, baseParams, params);

    if (state.campaign) {
      Object.keys(state.campaign).forEach(function (key) {
        var value = state.campaign[key];
        if (value !== null && value !== undefined && value !== '') {
          finalParams[key] = value;
        }
      });
    }

    Object.keys(state.customDimensions).forEach(function (key) {
      finalParams['dimension' + key] = state.customDimensions[key];
    });

    if (state.plugins && state.plugins.length) {
      finalParams.plugins = state.plugins.join(',');
    }

    Object.keys(finalParams).forEach(function (key) {
      var value = finalParams[key];
      if (value !== undefined && value !== null && value !== '') {
        target.searchParams.append(key, value);
      }
    });

    return target.toString();
  }

  function send(params) {
    var url = buildTarget(params);

    try {
      return fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(function () {
        var img = new Image();
        img.src = url;
        return img;
      });
    } catch (_err) {
      var imgFallback = new Image();
      imgFallback.src = url;
      return imgFallback;
    }
  }

  var api = {
    setSiteId: function (siteId) {
      if (siteId) {
        state.siteId = siteId;
      }
    },
    setUserId: function (userId) {
      state.userId = userId || null;
    },
    setCustomUrl: function (url) {
      state.customUrl = url || null;
    },
    setDocumentTitle: function (title) {
      state.customTitle = title || null;
    },
    setReferrerUrl: function (ref) {
      state.referrer = ref || null;
    },
    setCustomDimension: function (index, value) {
      if (!index) return;
      state.customDimensions[index] = value;
    },
    trackScreenView: function (screenName) {
      return send({ action_name: screenName || state.customTitle || document.title });
    },
    trackPageView: function (title) {
      if (title) {
        state.customTitle = title;
      }
      return send({});
    },
    trackEvent: function (category, action, name, value) {
      return send({
        e_c: category,
        e_a: action,
        e_n: name,
        e_v: value,
      });
    },
    trackEcommerceOrder: function (orderId, revenue, items) {
      return send({
        ec_id: orderId,
        revenue: revenue,
        ec_items: items ? JSON.stringify(items) : undefined,
      });
    },
    trackGoal: function (goalId) {
      return send({ idgoal: goalId });
    },
    trackSiteSearch: function (keyword, count) {
      return send({
        search: keyword,
        search_count: typeof count === 'number' ? count : undefined,
      });
    },
    trackMediaEvent: function (mediaId, action, progress, duration, player) {
      return send({
        ma_id: mediaId,
        ma_ti: action,
        ma_pr: typeof progress === 'number' ? progress : undefined,
        ma_ttp: typeof duration === 'number' ? duration : undefined,
        ma_ps: player,
      });
    },
    trackJsError: function (name, message, stack) {
      return send({
        error_name: name,
        error_message: message,
        error_stack: stack,
      });
    },
    ping: function () {
      return send({ ping: 1, send_image: 0 });
    },
  };

  function processCommand(command) {
    if (!Array.isArray(command) || command.length === 0) return;
    var name = command[0];
    var args = command.slice(1);
    var method = api[name];
    if (typeof method === 'function') {
      method.apply(api, args);
    }
  }

  var queue = window._mmq || [];
  var buffered = queue.slice();
  queue.length = 0;
  queue.push = function (command) {
    var length = Array.prototype.push.call(queue, command);
    processCommand(command);
    return length;
  };

  buffered.forEach(processCommand);

  window._mmq = queue;
  window.miniMatomo = api;

  detectCampaign();
  detectPlugins();

  function heartbeat() {
    var elapsedSeconds = Math.round((Date.now() - state.startedAt) / 1000);
    send({ ping: 1, send_image: 0, time_on_page: elapsedSeconds });
  }

  var heartbeatTimer = setInterval(heartbeat, heartbeatIntervalMs);

  window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      heartbeat();
    }
  });

  window.addEventListener('beforeunload', function () {
    clearInterval(heartbeatTimer);
    heartbeat();
  });

  window.addEventListener('error', function (event) {
    if (!event) return;
    api.trackJsError(event.filename || event.type, event.message, event.error && event.error.stack);
  });

  window.addEventListener('unhandledrejection', function (event) {
    if (!event || !event.reason) return;
    var reason = event.reason;
    var message = typeof reason === 'string' ? reason : reason.message || 'unhandled rejection';
    var stack = reason && reason.stack;
    api.trackJsError('unhandledrejection', message, stack);
  });

  if (!buffered.some(function (cmd) { return Array.isArray(cmd) && cmd[0] === 'trackPageView'; })) {
    api.trackPageView();
  }
})();
