/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

// PWA Logic
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
self.skipWaiting();
clientsClaim();

// Monetag Configuration
(self as any).options = {
    "domain": "3nbf4.com",
    "zoneId": 10878846
};
(self as any).lary = "";
(self as any).importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw');

// Firebase Messaging Logic
// Use importScripts for compat SDK because it's easier in a service worker
(self as any).importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
(self as any).importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// @ts-ignore
const firebase = (self as any).firebase;

if (firebase) {
  firebase.initializeApp({
    apiKey: "AIzaSyBw-s1k1pYD_P4NwUDQtf3-7vVesgzNGtU",
    authDomain: "gen-lang-client-0405663991.firebaseapp.com",
    projectId: "gen-lang-client-0405663991",
    storageBucket: "gen-lang-client-0405663991.firebasestorage.app",
    messagingSenderId: "948218731980",
    appId: "1:948218731980:web:b9f949d01ea2082c631169"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload: any) => {
    console.log('[sw.ts] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Nova Notificação';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/ghost.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
