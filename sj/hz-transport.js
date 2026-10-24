/*
 * Transport adapters for Scramjet v2.
 *
 * epoxy.mjs and libcurl.mjs are "bare-mux style" transports: request headers go in as a plain
 * object and come back as an object (libcurl: name -> [values]). Scramjet v2 talks to its
 * transport with raw header lists ([[name, value], ...]) and needs the response headers in the
 * same shape, one pair per Set-Cookie. AdapterTransport converts between the two.
 *
 * FallbackTransport tries a primary transport and, when the connection itself fails (for example
 * epoxy's "tls handshake eof", which some sites such as TikTok trigger), retries on a second one
 * and remembers which transport works for that host.
 */
(function (root) {
  "use strict";

  const errText = (e) => String((e && (e.message || e.reason)) || e || "");

  /* any header container -> [[name, value], ...] (one pair per value, Set-Cookie split) */
  function toPairs(h) {
    const out = [];
    const push = (k, v) => {
      k = String(k); v = String(v);
      if (k.toLowerCase() === "set-cookie" && v.indexOf(",") >= 0) {
        for (const c of v.split(/,(?=\s*[^;,=\s]+=)/)) out.push([k, c.trim()]);
      } else out.push([k, v]);
    };
    if (!h) return out;
    if (Array.isArray(h)) { for (const p of h) if (p && p.length >= 2) push(p[0], p[1]); return out; }
    if (typeof h.entries === "function" && typeof h.get === "function") { for (const p of h.entries()) push(p[0], p[1]); return out; }
    for (const k of Object.keys(h)) {
      const v = h[k];
      if (Array.isArray(v)) v.forEach((x) => push(k, x)); else if (v != null) push(k, v);
    }
    return out;
  }

  /* [[name, value], ...] -> { name: value } (repeated names are joined) */
  function toObj(h) {
    const o = {}, seen = {};
    for (const [k, v] of toPairs(h)) {
      const l = k.toLowerCase();
      if (seen[l] === undefined) { seen[l] = k; o[k] = v; }
      else o[seen[l]] += (l === "cookie" ? "; " : ", ") + v;
    }
    return o;
  }

  /* streamed request bodies are buffered so a failed request can be retried */
  async function normBody(body) {
    if (body == null) return body;
    if (typeof body.getReader === "function") return await new Response(body).arrayBuffer();
    if (typeof Blob !== "undefined" && body instanceof Blob) return await body.arrayBuffer();
    return body;
  }

  class AdapterTransport {
    constructor(inner, label) {
      this.inner = inner;
      this.label = label || "transport";
      this.ready = false;
    }
    async init() {
      if (!this.inner.ready) await this.inner.init();
      this.ready = true;
    }
    async meta() {}
    async request(remote, method, body, headers, signal) {
      body = await normBody(body);
      const r = await this.inner.request(remote, method, body, toObj(headers), signal);
      return { body: r.body, headers: toPairs(r.headers), status: r.status, statusText: r.statusText };
    }
    connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
      return this.inner.connect(
        url, protocols, toObj(requestHeaders),
        (protocol, extensions) => onopen(protocol || "", extensions || ""),
        onmessage, onclose, onerror
      );
    }
  }

  const SAFE = /^(GET|HEAD|OPTIONS)$/i;
  function retryable(method, err) {
    if (err && err.name === "AbortError") return false;
    if (SAFE.test(method || "GET")) return true;
    /* never replay a POST unless the failure happened while connecting */
    return /handshake|\btls\b|certificate|\bConnect\b|dns|resolve|refused|unreachable/i.test(errText(err));
  }

  class FallbackTransport {
    /* primary: AdapterTransport, secondaryFactory: () => Promise<AdapterTransport> */
    constructor(primary, secondaryFactory, log) {
      this.primary = primary;
      this.secondaryFactory = secondaryFactory;
      this.secondary = null;
      this.log = log || function () {};
      this.ready = false;
      this.prefs = new Map();
      this.label = "auto";
    }
    async init() {
      try { await this.primary.init(); }
      catch (e) {
        this.log("warn", "transport", this.primary.label + " could not start (" + errText(e).slice(0, 160) + "), using the other transport");
        await this.getSecondary();
        this.primaryDown = true;
      }
      this.ready = true;
    }
    async meta() {}
    async getSecondary() {
      if (!this.secondary) this.secondary = await this.secondaryFactory();
      if (!this.secondary.ready) await this.secondary.init();
      return this.secondary;
    }
    prefers(host) {
      if (this.primaryDown) return "secondary";
      const p = this.prefs.get(host);
      if (!p) return "primary";
      if (p.until < Date.now()) { this.prefs.delete(host); return "primary"; }
      return p.which;
    }
    async get(which) {
      return which === "primary" ? (this.primaryDown ? null : this.primary) : await this.getSecondary();
    }
    async request(remote, method, body, headers, signal) {
      const host = remote.hostname;
      body = await normBody(body);
      const first = this.prefers(host);
      const order = first === "primary" ? ["primary", "secondary"] : ["secondary", "primary"];
      let lastErr = null;
      for (let i = 0; i < order.length; i++) {
        let t;
        try { t = await this.get(order[i]); } catch (e) { lastErr = e; continue; }
        if (!t) continue;
        try {
          const r = await t.request(remote, method, body, headers, signal);
          if (i > 0) {
            this.prefs.set(host, { which: order[i], until: Date.now() + 10 * 60 * 1000 });
            this.log("info", "transport", host + " loaded through " + t.label + " after " + order[0] + " failed");
          }
          return r;
        } catch (e) {
          lastErr = e;
          const more = i < order.length - 1;
          this.log("warn", "transport", t.label + " failed for " + host + ": " + errText(e).slice(0, 220) + (more && retryable(method, e) ? " (retrying with the other transport)" : ""));
          if (!more || !retryable(method, e)) break;
        }
      }
      throw lastErr || new Error("No transport available");
    }
    connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
      const wantSecondary = this.prefers(url.hostname) === "secondary" && this.secondary && this.secondary.ready;
      const t = wantSecondary ? this.secondary : (this.primaryDown && this.secondary ? this.secondary : this.primary);
      return t.connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror);
    }
  }

  const api = { toPairs, toObj, normBody, retryable, AdapterTransport, FallbackTransport };
  root.HZTransport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
