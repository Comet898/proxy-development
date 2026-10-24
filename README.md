# Browser (Scramjet v2)

Upload this whole folder to your host (GitHub Pages works). Keep the folder structure.

    index.html          the browser UI
    single.html         same UI with libcurl.js inlined, opens from file:// (no Scramjet, see below)
    sw.js               "lite" engine service worker (fallback)
    sj/sw.js            Scramjet v2 service worker
    sj/scramjet/        Scramjet 2.0.67-alpha.2 (scramjet.js + scramjet.wasm)
    sj/controller/      @mercuryworkshop/scramjet-controller 0.0.14
    sj/transport/       epoxy.mjs, libcurl.mjs
    sj/hz-transport.js  adapter + automatic epoxy -> libcurl fallback
    wisp-server/        your own Wisp server (public ones go offline a lot)

Old files from the v1 setup (sj/scramjet.all.js, sj/scramjet.sync.js, sj/scramjet.wasm.wasm, sj/baremux/)
are no longer used. Delete them from your host after uploading.

## Why not one single HTML file?

A service worker has to be loaded from its own .js file on the same origin. Browsers refuse to register
one from inline HTML, a blob: URL or file://. Scramjet cannot run without it. So:

* index.html + the sj folder, hosted over https (or http://localhost): full Scramjet v2.
* single.html opened from a file: runs the single-file libcurl engine, or opens your hosted copy
  (Settings > Hosted site) and drives it.

## Local test

    python3 -m http.server 8080      (in this folder)
    open http://localhost:8080

## What changed in this version

* Scramjet v1 -> v2 (the "last version of scramjet v1" warning is gone). v2 rewrites request headers
  (Origin, Referer, Sec-Fetch-*, SameSite cookies) much more faithfully, which login flows depend on.
* Transport "Auto" (default): epoxy first; if a site fails at connection level (for example
  "tls handshake eof" on tiktok.com) the same request is retried with libcurl, and that host keeps using
  libcurl for 10 minutes.
* Connection failures show a readable error page instead of a blank 500.
* Passkey prompts are switched off inside proxied pages. A passkey belongs to the real site's origin, so
  it can never work through a proxy; the browser used to throw "SecurityError: The operation is insecure"
  and some sites stalled on it. Sites now fall back to the password form.
* The Chrome identity setting now applies to request headers and to navigator in every proxied page
  (including iframes), so they always agree.
* Logs: failed API calls (HTTP 400 and up) also show the first 300 characters of the reply, which usually
  says why (captcha-required, invalid field, ...). Request bodies are never logged.

## New in this version (UI overhaul)

* Redesigned look: light/dark theme (Settings > Appearance), five accent colours, new tab page with your most visited sites.
* History (Ctrl+H): grouped by day, searchable, per-item delete, clear all. Stored only in your browser.
* Bookmarks (star in the address bar, Ctrl+D, Ctrl+Shift+B) with an optional bookmarks bar and rename/remove.
* Address bar suggestions from bookmarks and history.
* Download manager (Ctrl+J): file downloads are caught, shown with progress, saved automatically and can be saved again or cancelled.
  Turn it off in Settings > Downloads to use the browser's native handling.
* Wisp server manager (click the status dot, or Alt+S): test every server with latency, set the preferred one, switch servers on/off,
  add your own (tested on add), "Use fastest", add the local server, reset to defaults.
* Tab favicons, loading spinner and progress line, middle-click to close, reopen closed tab (Ctrl+Shift+T).

Notes: downloads in the lite service-worker engine still use the browser's native handling. Keyboard shortcuts also work with Alt in place of Ctrl.
