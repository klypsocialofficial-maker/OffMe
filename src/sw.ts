/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import * as navigationPreload from 'workbox-navigation-preload';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

// PWA Logic
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Enable navigation preload
navigationPreload.enable();

// Register a route for navigation requests (HTML)
// Use NetworkFirst strategy which will use the preloaded response if available.
// We also add a plugin to fallback to index.html if the network is down or the request fails.
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      {
        // If the fetch fails (e.g., offline and not in cache), return the precached index.html
        handlerDidError: async () => {
          return await caches.match('/index.html') || Response.error();
        },
      },
    ],
  })
);

registerRoute(navigationRoute);

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
    
    const notificationTitle = payload.notification?.title || 'Nova Notificação';
    const notificationOptions: any = {
      body: payload.notification?.body || payload.data?.body || 'Você tem uma nova mensagem.',
      icon: '/logo.svg',
      data: payload.data,
      tag: payload.data?.conversationId || 'general',
      renotify: true,
      actions: []
    };

    // Add quick reply for chat messages
    if (payload.data?.type === 'chat') {
      notificationOptions.actions.push({
        action: 'reply',
        title: 'Responder',
        type: 'text',
        placeholder: 'Digite sua mensagem...'
      });
    }

    // Add open action
    notificationOptions.actions.push({
      action: 'open',
      title: 'Abrir'
    });

    // If it's a mention or post, we might want to show an image preview if available
    if (payload.data?.imageUrl) {
      notificationOptions.image = payload.data.imageUrl;
    }

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks and actions
self.addEventListener('notificationclick', (event: any) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  notification.close();

  if (action === 'reply' && event.reply) {
    // Handle quick reply
    const replyText = event.reply;
    const conversationId = data.conversationId;
    const senderId = data.senderId; // This is the ID of the person who sent the message to US

    // We need to send this reply back. 
    // Note: In a real app, we'd need the CURRENT user's ID. 
    // But since we are replying to a message sent TO us, 
    // the senderId in the data is actually the person we want to reply TO.
    // Wait, the senderId in the data is the person who sent the message.
    // So if I reply, I am the sender. 
    // This is tricky because the SW doesn't know the current user's UID easily 
    // unless we stored it or passed it in the data.
    
    // Let's assume we passed the RECIPIENT ID (our ID) in the data too.
    // I'll update the Chat.tsx to include recipientId.
    
    if (conversationId && data.recipientId && replyText) {
      event.waitUntil(
        fetch('/api/reply-to-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversationId,
            senderId: data.recipientId, // I am the sender now
            text: replyText
          })
        }).then(response => {
          if (!response.ok) throw new Error('Failed to send reply');
        }).catch(err => console.error('Error sending quick reply:', err))
      );
    }
  } else {
    // Default action: Open the app
    let url = '/';
    if (data?.type === 'chat' && data?.conversationId) {
      url = `/messages/${data.conversationId}`;
    } else if (data?.postId) {
      url = `/post/${data.postId}`;
    }

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
    );
  }
});
