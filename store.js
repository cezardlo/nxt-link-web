/* NXT//LINK shared data store — connects all pages.
   One source of truth in localStorage, synchronized across pages and across
   browser tabs (via the 'storage' event). Status updates happen automatically
   as actions occur (a vendor quote advances the request to "collecting quotes").
   When the platform is wired to Supabase, swap these methods for API calls —
   the page code that calls NXT.* stays the same. */
(function (g) {
  var KEY = 'nxtlink_store_v1';
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function state() { var d = read(); if (!d.requests) d.requests = []; if (!d.quotes) d.quotes = []; return d; }

  var subs = [];
  function emit() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }
  // cross-tab sync: another tab wrote the store
  g.addEventListener('storage', function (e) { if (e.key === KEY) emit(); });

  // status auto-advance map
  var FLOW = ['request_received','reviewing_details','searching_vendors','contacting_vendors','collecting_quotes','comparing_options','options_ready','vendor_selected','closed'];

  g.NXT = {
    FLOW: FLOW,
    getRequests: function () { return state().requests; },
    getRequest: function (ref) { return state().requests.filter(function (r) { return r.ref === ref; })[0] || null; },
    addRequest: function (r) {
      var d = state();
      r.ref = r.ref || ('REQ-' + Math.random().toString(36).slice(2, 7).toUpperCase());
      r.created = r.created || Date.now();
      r.status = r.status || 'request_received';
      r.activity = r.activity || []; // activity timeline (separate from the deadline)
      r.activity.unshift({ at: Date.now(), what: 'Request submitted' });
      d.requests.unshift(r);
      write(d); emit(); return r;
    },
    updateRequest: function (ref, patch, note) {
      var d = state();
      d.requests = d.requests.map(function (x) {
        if (x.ref !== ref) return x;
        var merged = Object.assign({}, x, patch);
        if (note) { merged.activity = (merged.activity || []); merged.activity.unshift({ at: Date.now(), what: note }); }
        return merged;
      });
      write(d); emit();
    },
    advance: function (ref, status, note) { this.updateRequest(ref, { status: status }, note || ('Status → ' + status)); },
    getQuotes: function (ref) { var q = state().quotes; return ref ? q.filter(function (x) { return x.ref === ref; }) : q; },
    addQuote: function (q) {
      var d = state();
      q.id = 'Q-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      q.created = Date.now();
      d.quotes.unshift(q);
      // automation: a submitted quote moves the request forward
      d.requests = d.requests.map(function (x) {
        if (x.ref !== q.ref) return x;
        x.activity = (x.activity || []); x.activity.unshift({ at: Date.now(), what: 'Vendor quote received (' + (q.amount || 'quote') + ')' });
        x.status = 'collecting_quotes';
        return x;
      });
      write(d); emit(); return q;
    },
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    seedIfEmpty: function (reqs) { var d = state(); if (d.requests.length === 0 && reqs) { d.requests = reqs.slice(); write(d); } },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} emit(); }
  };
})(window);
