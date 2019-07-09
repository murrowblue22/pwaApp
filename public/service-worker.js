importScripts('workbox-sw.prod.v2.1.3.js');
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

const workboxSW = new self.WorkboxSW();

workboxSW.router.registerRoute(
    /.*(?:googleapis|gstatic)\.com.*$/, 
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'google-fonts', 
        cacheExpiration: {
            maxEntries: 3, 
            maxAgeSeconds: 60 * 60 * 24 * 30
        }
    }
));

workboxSW.router.registerRoute(
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css', 
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'material-css'
    }
));

workboxSW.router.registerRoute(/.*(?:firebasestorage\.googleapis)\.com.*$/, 
    workboxSW.strategies.staleWhileRevalidate({
        cacheName: 'post-images'
    }
));

workboxSW.router.registerRoute(
    'https://pwagram-1c0ae.firebaseio.com/posts.json',
    function(args) {
        return fetch(args.event.request)
            .then(function(res) {
                var cloneRes = res.clone();
                clearallData('posts')
                    .then(function() { 
                        return cloneRes.json()
                    })
                    .then(function(data) {
                        for(var key in data) {
                            writeData('posts', data[key]); 
                        }
                        return; 
                    });
                return res;
            })  
    }
);

workboxSW.router.registerRoute(
    function(routeData) {
        return (routeData.event.request.headers.get('accept').includes('text/html')); 
    },
    function(args) {
        return caches.match(args.event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                else {
                    return fetch(args.event.request)
                        .then(function(res) {
                            return caches.open('dynamic')
                            .then(function(cache) {
                                cache.put(args.event.request.url, res.clone());
                                return res; 
                            })
                        })
                        .catch(function(err) {
                            return caches.open('/offline.html')
                                .then(function(res) {
                                   return res; 
                                }); 
                        });
                }
            })
    }
);

workboxSW.precache([
  {
    "url": "404.html",
    "revision": "0a27a4163254fc8fce870c8cc3a3f94f"
  },
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "c3330f705bf0f82cc5506ef1c4319f5d"
  },
  {
    "url": "manifest.json",
    "revision": "6243fb8636a805d0ecde8c61f942e908"
  },
  {
    "url": "offline.html",
    "revision": "a97ffcdec492f88c955d65a7dc0b29cb"
  },
  {
    "url": "src/css/app.css",
    "revision": "3e67807e43f32ee385c7b59136082688"
  },
  {
    "url": "src/css/feed.css",
    "revision": "6db8b04ef7c834064132c990d7487472"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  },
  {
    "url": "src/js/app.min.js",
    "revision": "3367e736ba06e97428321f6ce75ca3ed"
  },
  {
    "url": "src/js/feed.min.js",
    "revision": "b46af906e7de0e95507d1ad66f5a059d"
  },
  {
    "url": "src/js/fetch.min.js",
    "revision": "da0035b7db774e210d1b88a158df1ac4"
  },
  {
    "url": "src/js/idb.min.js",
    "revision": "525b2810c73987682842ad098fdfcc84"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.min.js",
    "revision": "37da1a68333a79c65219e459e74ea5e0"
  },
  {
    "url": "src/js/utility.min.js",
    "revision": "0afbbd5d159e3bb44669a7b6cda10508"
  }
]);


self.addEventListener('sync', function(event) {
    console.log('[Service Worker] Background syncing', event); 
    if (event.tag === 'sync-new-posts') {
        console.log('[Service Worker] Syncing new Posts');
        event.waitUntil(
            readAllData('sync-posts') 
                .then(function(data) {
                    for (var dt of data) {
                        console.log(dt);
                        var postData = new FormData(); 
                        postData.append('id', dt.id);
                        postData.append('title', dt.title);
                        postData.append('location', dt.location);
                        postData.append('rawLocationLat', dt.rawLocation.lat);
                        postData.append('rawLocationLng', dt.rawLocation.lng);
                        postData.append('file', dt.picture, dt.id + '.png'); 

                        fetch('https://us-central1-pwagram-1c0ae.cloudfunctions.net/storePostData', {
                        method: 'POST',
                        body: postData
                        })
                        .then(function(res) {
                            console.log('Sent data', res); 
                                if (res.ok) {
                                    res.json()
                                    .then(function(resData) {
                                        deleteItemFromData('sync-posts', resData.id);
                                    }); 
                                }
                            return; 
                        })   
                        .catch(function(err) {
                            console.log('Error while sending data', err);
                        }); 
                    }   
                })
        )
    }
})

self.addEventListener('notificationclick', function(event) {
    var notification = event.notification;
    var action = event.action; 

    console.log(notification);

    if(action === 'confirm') {
        console.log('Confirm was chosen');
        notification.close(); 
    } 
    else {
        console.log(action);
        event.waitUntil(
             clients.matchAll()
                .then(function(clis) {
                    var client = clis.find(function(c) {
                        return c.visibilityState === 'visible';
                    });

                    if (client !== undefined) {
                        client.navigate(notification.data.url);
                        client.focus();
                    }else {
                        clients.openWindow(notification.data.url); 
                    }
                    notification.close(); 

                    return; 
                })   
        );
    }
}); 

self.addEventListener('notificationclose', function(event) {
    console.log('Notification was closed', event);
});

self.addEventListener('push', function(event) {
    console.log('Push Notification received', event);

    var data = {
        title: 'New!', 
        content: 'Something new happened!',
        openUrl: '/'
    };

    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    var options = {
        body: data.content,
        icon: '/src/images/icons/app-icon-96x96.png', 
        badge: '/src/images/icons/app-icon-96x96.png',
        data: {
            url: data.openUrl
        }

    }; 

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );

});