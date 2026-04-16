// Scripts for firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBw-s1k1pYD_P4NwUDQtf3-7vVesgzNGtU",
  authDomain: "gen-lang-client-0405663991.firebaseapp.com",
  projectId: "gen-lang-client-0405663991",
  storageBucket: "gen-lang-client-0405663991.firebasestorage.app",
  messagingSenderId: "948218731980",
  appId: "1:948218731980:web:b9f949d01ea2082c631169"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/ghost.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
