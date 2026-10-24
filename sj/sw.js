/* Scramjet v2 service worker.
   controller.sw.js registers the install/activate handlers and exposes
   $scramjetController.shouldRoute(event) / route(event). */
importScripts("controller/controller.sw.js");

/* tell open pages that this worker just (re)started, so they can hand it their message port again */
try { new BroadcastChannel("hz-sj").postMessage({ type: "sw-start" }); } catch (e) {}

/* the page sends {type:"hz-ping"} now and then; any event resets the browser's idle timer */
addEventListener("message", () => {});

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
