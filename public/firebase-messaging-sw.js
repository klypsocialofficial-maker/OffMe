importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB6SFnoDrfcftQW1syPqOccgMUXQIf4wE8",
  authDomain: "gen-lang-client-0856411071.firebaseapp.com",
  projectId: "gen-lang-client-0856411071",
  storageBucket: "gen-lang-client-0856411071.firebasestorage.app",
  messagingSenderId: "721192609855",
  appId: "1:721192609855:web:2ddc5df6cab182965ff08a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
