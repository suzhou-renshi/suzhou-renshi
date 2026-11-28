/* 看板 Service Worker v2
   - 页面与数据（html/js/json）：网络优先（no-store 绕过浏览器 10 分钟缓存），永远最新；断网回退缓存
   - 图片/字体等静态资源：缓存优先 + 后台更新（秒开，换图自动刷新）
*/
var CACHE = 'renshi-cache-v2';
var BASE = new URL('./', self.registration.scope).pathname;
var CORE = [BASE, BASE + 'index.html', BASE + 'data.js', BASE + 'changji.html', BASE + 'biji.html', BASE + 'riji.html'];

function isContent(url) {
  return /\.(html?|js|json|webmanifest)(\?|#|$)/i.test(url);
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(CORE.map(function (u) {
        return fetch(u, { cache: 'no-store' }).then(function (res) {
          if (res && res.ok) return c.put(u, res);
        }).catch(function () {});
      }));
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

  var isDoc = req.destination === 'document' || isContent(req.url);

  if (isDoc) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(BASE + 'index.html');
        });
      })
    );
    return;
  }

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
