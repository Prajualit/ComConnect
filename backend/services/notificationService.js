const admin = require('../config/firebase');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

console.log('🔄 Initializing Redis with config:', {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  tls: true
});

// Redis Configuration - Connect through EC2
const redis = new Redis({
  host: process.env.REDIS_HOST || 'ec2-3-6-113-80.ap-south-1.compute.amazonaws.com', // EC2 public DNS
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryStrategy(times) {
    const delay = Math.min(times * 2000, 10000);
    console.log(`⏳ Redis connection attempt ${times}, retrying in ${delay}ms`);
    return delay;
  }
});

// Enhanced Redis event listeners
redis.on('connect', () => {
  console.log('✅ Redis connecting through EC2:', process.env.REDIS_HOST);
});

redis.on('ready', () => {
  console.log('✅ Redis connection established and ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  console.log('Error details:', {
    code: err.code,
    syscall: err.syscall,
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  });
});

redis.on('close', () => {
  console.log('❌ Redis connection closed');
});

redis.on('reconnecting', (ms) => {
  console.log(`🔄 Redis reconnecting in ${ms}ms`);
});

// Test connection function
async function testRedisConnection() {
  try {
    console.log('🔄 Testing Redis connection...');
    const result = await redis.ping();
    console.log('Redis ping result:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    return false;
  }
}

// Kafka Configuration
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'ec2-3-6-113-80.ap-south-1.compute.amazonaws.com:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'notification-group' 
});

// Enhanced error handling for producer
producer.on('producer.disconnect', (error) => {
  console.error('❌ Kafka producer disconnected:', error);
});

producer.on('producer.network.request_timeout', (error) => {
  console.error('❌ Kafka producer network timeout:', error);
});

// Enhanced error handling for consumer
consumer.on('consumer.disconnect', (error) => {
  console.error('❌ Kafka consumer disconnected:', error);
});

consumer.on('consumer.network.request_timeout', (error) => {
  console.error('❌ Kafka consumer network timeout:', error);
});

class NotificationService {
  constructor() {
    this.redis = redis;
    this.producer = producer;
    this.consumer = consumer;
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🔄 Initializing NotificationService...');
      console.log('Kafka Broker:', process.env.KAFKA_BROKER);
      
      // Connect to Kafka
      await this.producer.connect();
      console.log('✅ Kafka Producer connected');
      
      await this.consumer.connect();
      console.log('✅ Kafka Consumer connected');
      
      // Subscribe to topics
      await this.consumer.subscribe({ 
        topics: ['notifications'] 
      });
      console.log('✅ Subscribed to Kafka topics');

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log('Received message:', {
            topic,
            value: message.value.toString()
          });
        },
      });

      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
      // Don't throw error, let service retry
    }
  }

  async testConnections() {
    try {
      const redisPing = await this.redis.ping();
      const kafkaConnected = this.producer.isConnected();
      
      return {
        redis: redisPing === 'PONG',
        kafka: kafkaConnected,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        redis: false,
        kafka: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendNotification(notification) {
    const { userId, title, body, data } = notification;
    const fcmToken = await this.getFCMToken(userId);

    console.log('📤 Sending notification to user:', userId);
    console.log('📱 FCM Token:', fcmToken);

    if (!fcmToken) {
      console.log('❌ No FCM token found for user:', userId);
      return;
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        // Ensure all values are strings
        chatId: (data?.chatId || '').toString(),
        messageId: (data?.messageId || '').toString(),
        type: (data?.type || 'message').toString(),
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title,
          body,
          icon: '/icon.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open Chat'
            }
          ]
        },
        fcm_options: {
          link: data?.chatId ? `/chat/${data.chatId}` : '/'
        }
      },
      android: {
        priority: 'high'
      },
    };

    try {
      console.log('📤 Sending FCM message:', message);
      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        console.log('🔄 Removing invalid token for user:', userId);
        await this.redis.del(`user:${userId}:fcmToken`);
      }
      throw error;
    }
  }

  async queueNotification(notification) {
    try {
      console.log('📤 Queuing notification:', notification);

      // Verify Kafka connection first
      try {
        await this.producer.send({
          topic: 'test-topic',
          messages: [{ value: 'test message' }],
        });
      } catch (error) {
        console.log('❌ Kafka producer not connected. Reconnecting...');
        await this.producer.connect();
      }

      // Send notification to Kafka
      await this.producer.send({
        topic: 'chat-notifications',
        messages: [
          {
            key: notification.userId,
            value: JSON.stringify(notification),
            headers: {
              timestamp: Date.now().toString()
            }
          },
        ],
      });

      console.log('✅ Notification queued successfully');
    } catch (error) {
      console.error('❌ Failed to queue notification:', error);
      // If Kafka fails, try sending directly
      await this.sendNotification(notification);
    }
  }

  async cacheUserToken(userId, fcmToken) {
    await this.redis.set(`user:${userId}:fcmToken`, fcmToken);
  }

  async getFCMToken(userId) {
    return await this.redis.get(`user:${userId}:fcmToken`);
  }
}

// Export a single instance
const notificationService = new NotificationService();
module.exports = notificationService;
