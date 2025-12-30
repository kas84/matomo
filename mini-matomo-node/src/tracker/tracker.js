(function () {
  var script = document.currentScript;
  var collector = (script && (script.dataset.collector || script.dataset.collectUrl)) || '/collect';
  var initialSiteId = (script && script.dataset.siteId) || 'demo';
  var storageKey = 'miniMatomoVisitorId';

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
  };

  function nowIso() {
    return new Date().toISOString();
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
    };

    var finalParams = Object.assign({}, baseParams, params);

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
    trackGoal: function (goalId) {
      return send({ idgoal: goalId });
    },
    trackSiteSearch: function (keyword, count) {
      return send({
        search: keyword,
        search_count: typeof count === 'number' ? count : undefined,
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

  if (!buffered.some(function (cmd) { return Array.isArray(cmd) && cmd[0] === 'trackPageView'; })) {
    api.trackPageView();
  }
})();
