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
    
    // If the message has a notification property, the FCM SDK will 
    // automatically display a notification on most platforms.
    // We only need to show a manual notification if we want to customize it
    // or if it's a data-only message.
    if (payload.notification) {
      console.log('Notification already handled by FCM SDK');
      return;
    }

    const notificationTitle = 'Nova Notificação';
    const notificationOptions = {
      body: payload.data?.body || 'Você tem uma nova mensagem.',
      icon: '/ghost.svg',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
