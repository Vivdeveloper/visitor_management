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
define(['/assets/visitor_management/frontend/workbox-50bb6711'], (function (workbox) { 'use strict';

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
    "url": "/assets/visitor_management/frontend/vms-chunk-web8.js",
    "revision": "5a559c89230cd3a5777c90308e0985ce"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web7.js",
    "revision": "06465979837aef240e0229331b55f237"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web6.js",
    "revision": "1fa9c2f8cec750ec0f41f8973c6dba08"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web5.js",
    "revision": "bf853d15c2053097bb0577b072363a39"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web4.js",
    "revision": "223d421d43ddf169ffbe0fe4b4551b9b"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web3.js",
    "revision": "dc1cf54dba031e49d063cbccf2a3ed30"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web2.js",
    "revision": "a32da1010fbaaba9a03a9b8f8925abde"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-web.js",
    "revision": "996074863f389987d02c0064f77e664e"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-index.js",
    "revision": "f3a6f980d20ec5b05602d46f3b936ba4"
  }, {
    "url": "/assets/visitor_management/frontend/vms-chunk-capacitor-init.js",
    "revision": "c4ca906123f2dea7f7cd6fcc4755e3c9"
  }, {
    "url": "/assets/visitor_management/frontend/vms-asset-index.css",
    "revision": "81ac443b4c3b0c5a2e7bc68c849bc2b0"
  }, {
    "url": "/assets/visitor_management/frontend/vms-app.js",
    "revision": "862bc88242875e85dd796da10fa325de"
  }, {
    "url": "/assets/visitor_management/frontend/vite.svg",
    "revision": "e1b5a649812a3640929b2e2a896f7b9a"
  }, {
    "url": "/assets/visitor_management/frontend/index.html",
    "revision": "affb47d02cd042ad507fe9a007c76612"
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
    "url": "/assets/visitor_management/frontend/brand/om-symbol.png",
    "revision": "c20d5178bada101316834f6b8a030a76"
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
  }) => url.pathname.startsWith("/assets/visitor_management/frontend/") && !url.pathname.endsWith(".png") && !url.pathname.endsWith(".svg") && !url.pathname.endsWith(".woff2"), new workbox.NetworkFirst({
    "cacheName": "vms-shell",
    "networkTimeoutSeconds": 4,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 32,
      maxAgeSeconds: 86400
    })]
  }), 'GET');

}));


// GatePass Web Push (VAPID) — appended by copy-pwa
self.addEventListener("push", (event) => {
	let data = { title: "GatePass", body: "Visitor approval needed.", url: "/vms/approvals" };
	try {
		if (event.data) Object.assign(data, JSON.parse(event.data.text()));
	} catch {
		/* defaults */
	}
	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: data.icon || "/assets/visitor_management/frontend/icons/icon-192.png",
			badge: data.badge || "/assets/visitor_management/frontend/icons/icon-192.png",
			tag: data.tag || "vms-host-alert",
			renotify: true,
			requireInteraction: true,
			data: { url: data.url },
			vibrate: [280, 120, 280, 120, 420],
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const target = event.notification.data?.url || "/vms/approvals";
	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
			for (const client of windowClients) {
				if (client.url.includes("/vms") && "focus" in client) {
					client.navigate(target);
					return client.focus();
				}
			}
			if (clients.openWindow) return clients.openWindow(target);
		}),
	);
});
