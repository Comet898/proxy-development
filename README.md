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

* Redesigned look: light/dark theme (Settings > Appearance), black and white only, new tab page with your most visited sites.
* History (Ctrl+H): grouped by day, searchable, per-item delete, clear all. Stored only in your browser.
* Bookmarks (star in the address bar, Ctrl+D, Ctrl+Shift+B) with an optional bookmarks bar and rename/remove.
* Address bar suggestions from bookmarks and history.
* Download manager (Ctrl+J): file downloads are caught, shown with progress, saved automatically and can be saved again or cancelled.
  It is off by default so the proxy path stays identical to version 10; turn it on in Settings > Downloads.
* Wisp server manager (click the status dot, or Alt+S): test every server with latency, set the preferred one, switch servers on/off,
  add your own (tested on add), "Use fastest", add the local server, reset to defaults.
* Tab favicons, loading spinner and progress line, middle-click to close, reopen closed tab (Ctrl+Shift+T).

Notes: downloads in the lite service-worker engine still use the browser's native handling. Keyboard shortcuts also work with Alt in place of Ctrl.

## Tabs, page tools, auto-switch

* Tabs: drag to reorder, right-click for the menu (duplicate, pin, groups, close others/right, reopen closed).
* Page tools (the dots button): find in page (Alt+F), reader view (Alt+R).
* Settings > Connection > "Switch Wisp server automatically": after 3 timeouts in a minute the fastest other server is tested and used.

## Build 16: liquid glass UI, coloured logs, Discord

* New look: floating glass tabs, toolbar and panels over a slowly moving gradient, spring animations, light and dark themes
  (Settings > Appearance). Date and time on the new tab page.
* Logs are coloured again: INFO / NET / WARN / ERR badges, coloured HTTP methods and status codes (2xx green, 3xx amber,
  4xx/5xx red), highlighted URLs, warning and error rows tinted.
* Contrast fixes: favicon letters and tab-group chips are now coloured with readable text instead of grey boxes with white text,
  and dropdown option lists follow the theme.
* Settings drawer is moved out of the toolbar on load so the glass blur does not trap it.
* discord.com, discordapp.com, discord.gg and hcaptcha now use your real browser identity (like Google), so the request
  headers, client hints and navigator all match the browser that is really making the request.

## Build 17: black and white, one menu

* Chrome is black and white again (glass kept). Only the log console stays coloured.
* One menu button replaces the separate history, downloads, logs, fullscreen and settings buttons. It holds find, reader,
  bookmark, History, Bookmarks, Downloads, Wisp servers, Logs, Fullscreen and Settings.
* Each panel opens on its own with a plain title. The inner tab bar is gone, and the status dot is only a status light.
* Everything animates out as well as in: panels, menus, suggestions, find bar, toasts and closing tabs.

## Build 18: sharper, slimmer, bookmarks first

* Corners are much less rounded everywhere. The toolbar and address bar are thinner, and tabs, toolbar, bookmarks bar and page are all
  the same 6px apart.
* The side "library" drawer is gone. History, Bookmarks, Downloads and Wisp servers open as pages in their own tab
  (browser://history, browser://bookmarks, ...).
* Bookmarks work like a real browser: bookmarks bar on by default (Ctrl+Shift+B toggles it), "All bookmarks" button, a double arrow for
  the ones that do not fit, drag to reorder, right-click to open / rename / delete, middle-click for a new tab. The star opens a small
  editor (name, Remove, Done). Bookmarks also show as tiles on the new tab page. Ctrl+Shift+O opens the bookmark manager.
* Zoom is removed (menu items, shortcuts, per-site zoom chip).
* Logs say what happened: JavaScript errors show the page, file and line, "Script error" is explained, HTTP errors say what the status
  means and what breaks, and errors/warnings get an indented "why" line with the likely cause.

## Build 20: classic layout, soft palette

* Layout like the original: tab strip, toolbar, bookmarks bar, full-width page. Warm off-white light theme and a soft charcoal dark theme.
* Downloads, History, Logs, Fullscreen and Settings are buttons beside the address bar; the Wisp dot opens the server list.
  Pressing a button again closes what it opened. Opening Settings closes Logs and vice versa.
* Find in page, reader view, the dots menu, private mode and zoom are removed.
* Site permissions (camera, microphone, location, autoplay, clipboard, fullscreen) per site: Settings > Site permissions.
* Browser identity now defaults to your real browser, so headers, client hints and navigator agree (what captcha widgets check).
  Cloudflare and other captcha hosts always use your real identity.
* Wisp servers: "Remove unreachable" in the server list deletes everything that failed the last Test all.

## Build 21: merged files from the v19 copy

* Added from the other person's v19 copy, unchanged: sj/scramjet.all.js, sj/scramjet.sync.js, sj/scramjet.wasm.wasm, sj/baremux/index.js,
  sj/baremux/worker.js (the older Scramjet v1 + bare-mux files).
* from-v19/index-1.html and from-v19/sw-1.js are their page and service worker for that older engine. They are kept apart so they do not
  replace index.html or sj/sw.js. Their index.html and single.html were identical to v19, so nothing from them needed merging.
