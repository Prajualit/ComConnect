import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import axios from 'axios';

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState();

  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    setUser(userInfo);

    if (!userInfo) navigate("/");
  }, [navigate]);

  useEffect(() => {
    if (user) {
      initializeFirebase();
    }
  }, [user]);

  useEffect(() => {
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'OPEN_CHAT' && event.data.chatId) {
        setSelectedChat(event.data.chatId);
      }
    });
  }, []);

  const initializeFirebase = async () => {
    console.log('🔥 Starting Firebase initialization...');

    if (!('Notification' in window)) {
      console.error('❌ Notifications not supported in this browser');
      return;
    }

    // Force permission request even if already granted
    try {
      console.log('Current permission status:', Notification.permission);
      
      // Test if notifications work directly
      if (Notification.permission === 'granted') {
        // Create a direct browser notification (not FCM)
        const testNotif = new Notification('Permission Test', {
          body: 'Testing if browser notifications work',
          icon: '/icon.png'
        });
        console.log('Test notification created:', testNotif);
      } else {
        // Request permission again
        const permission = await Notification.requestPermission();
        console.log('New permission status:', permission);
        
        if (permission === 'granted') {
          const testNotif = new Notification('Permission Granted', {
            body: 'Notifications are now enabled!',
            icon: '/icon.png'
          });
          console.log('Test notification created:', testNotif);
        }
      }
    } catch (error) {
      console.error('Error handling notifications:', error);
    }

    try {
      const app = initializeApp({
        apiKey: "AIzaSyC2ZYTLEBAcMvmYa5fhQdDoUrcWa9YzdTA",
        authDomain: "comconnect-2b1d7.firebaseapp.com",
        projectId: "comconnect-2b1d7",
        storageBucket: "comconnect-2b1d7.firebasestorage.app",
        messagingSenderId: "854170103458",
        appId: "1:854170103458:web:9661dd687bcdf4e12db1fb",
        measurementId: "G-EHQ1LTCGJS"
      });
      const messaging = getMessaging(app);

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BG2WUN3-ZbSy5ZcsEA6Jz0A84aYStjpe59fwTTVNsCPF6zS9mNN4gGR7iHzw4EUfneHkAQektAhblloHt0_0Pb0'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        
        // Save token to backend
        await axios.post('/api/notification/token', { fcmToken: token }, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
      }

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log('Received foreground message:', payload);

        // Always create a notification for foreground messages
        if (Notification.permission === 'granted') {
          // Try both notification methods
          try {
            // Method 1: Using Notification API directly
            const notification = new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/icon.png',
              tag: 'foreground-notification',
              requireInteraction: true
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            // Method 2: Using ServiceWorkerRegistration
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/icon.png',
                tag: 'foreground-notification-sw',
                requireInteraction: true
              });
            });

          } catch (error) {
            console.error('Error showing notification:', error);
          }
        }

        // Update notification count
        setNotification(prev => [...prev, payload.data]);
      });

    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
