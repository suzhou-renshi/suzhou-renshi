/* 看板 Service Worker：本地缓存 + 后台更新（打开秒出，换图自动更新）
   - 首次打开后所有页面与已看过的头像进入本地缓存
   - 之后每次打开立即用缓存渲染，同时后台拉取最新版本；下次打开即自动更新
*/
var CACHE = 'renshi-cache-v1';
var BASE = new URL('./', self.registration.scope).pathname;
var CORE = [BASE, BASE + 'index.html', BASE + 'data.js', BASE + 'changji.html', BASE + 'biji.html', BASE + 'riji.html', BASE + 'hub.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  try { if (new URL(req.url).origin !== location.origin) return; } catch (err) { return; }
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
