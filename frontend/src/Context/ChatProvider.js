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

  const initializeFirebase = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    console.log('Current notification permission:', Notification.permission);

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
    
    try {
      // Check current permission status
      let permission = Notification.permission;
      
      // Force a permission request regardless of current status
      try {
        permission = await Notification.requestPermission();
        console.log('After request, permission is:', permission);
      } catch (permError) {
        console.log('Error requesting permission:', permError);
      }

      if (permission !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      const token = await getToken(messaging, {
        vapidKey: 'BG2WUN3-ZbSy5ZcsEA6Jz0A84aYStjpe59fwTTVNsCPF6zS9mNN4gGR7iHzw4EUfneHkAQektAhblloHt0_0Pb0'
      });

      if (token) {
        console.log('✅ Firebase and FCM are successfully initialized and ready to use!');
      }

      console.log("fcm token", token);

      // Send token to backend
      await axios.post('/api/notification/token', { fcmToken: token }, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });


      // Handle foreground messages
      onMessage(messaging, (payload) => {
        const { title, body } = payload.notification;
        // Update notification state
        setNotification(prev => [...prev, payload.data]);
      });
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
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
