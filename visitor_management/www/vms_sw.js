/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['/assets/visitor_management/frontend/workbox-60fee754'], (function (workbox) { 'use strict';

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "/assets/visitor_management/frontend/vms-asset-index.css",
    "revision": "ab1ace1aa689f0938a95e0e9868bd98d"
  }, {
    "url": "/assets/visitor_management/frontend/vms-app.js",
    "revision": "d9265c61fd3a228a4a58a19dd1d76ef4"
  }, {
    "url": "/assets/visitor_management/frontend/vite.svg",
    "revision": "e1b5a649812a3640929b2e2a896f7b9a"
  }, {
    "url": "/assets/visitor_management/frontend/index.html",
    "revision": "992a9ca0349095d600ca6c61898e5ed3"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-512.png",
    "revision": "f67769bff1d50a76100eb7c5293426e7"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-192.png",
    "revision": "ea4e2131b8c5a9f91ab20375cab9e98b"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-180.png",
    "revision": "3e9360f965ec3d675c7df53845607f15"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-logo.png",
    "revision": "32c6e8abef3acd93a63de637cf5c1a56"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-logo-light.png",
    "revision": "32c6e8abef3acd93a63de637cf5c1a56"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-logo-dark.png",
    "revision": "90ccaff41109b70a6cf0db578f7b3b6f"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-icon.png",
    "revision": "4d26597896513edf3995f965b8e3a697"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-icon-light.png",
    "revision": "4d26597896513edf3995f965b8e3a697"
  }, {
    "url": "/assets/visitor_management/frontend/brand/precious-alloys-icon-dark.png",
    "revision": "e2cb080af49198cc41d2489c77e17008"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-180.png",
    "revision": "3e9360f965ec3d675c7df53845607f15"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-192.png",
    "revision": "ea4e2131b8c5a9f91ab20375cab9e98b"
  }, {
    "url": "/assets/visitor_management/frontend/icons/icon-512.png",
    "revision": "f67769bff1d50a76100eb7c5293426e7"
  }, {
    "url": "/assets/visitor_management/frontend/manifest.webmanifest",
    "revision": "a4b3d0f24ef5d4aa39ca0cb3da824250"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkFirst({
    "cacheName": "vms-api",
    "networkTimeoutSeconds": 8,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 64,
      maxAgeSeconds: 3600
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/assets/visitor_management/frontend/"), new workbox.CacheFirst({
    "cacheName": "vms-shell",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 64,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
