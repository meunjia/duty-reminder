importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCIQE5yjkU7n6uKzzDUzmv1EhWLDtgFvtc',
  authDomain: 'shift-calendar-6945f.firebaseapp.com',
  projectId: 'shift-calendar-6945f',
  storageBucket: 'shift-calendar-6945f.firebasestorage.app',
  messagingSenderId: '955894621154',
  appId: '1:955894621154:web:0fee36ebbd4478e6044fbb',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (!title) return
  self.registration.showNotification(title, {
    body: body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
})
