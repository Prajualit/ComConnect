const admin = require('../config/firebase');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');

// Initialize Redis with proper authentication and error handling
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || 'mypassword', // Use the password from your .env file
  retryStrategy: (times) => {
    const maxRetryTime = 3000; // Maximum retry time in milliseconds
    const retryTime = Math.min(times * 500, maxRetryTime);
    return retryTime;
  },
  maxRetriesPerRequest: null, // Retry indefinitely
  enableOfflineQueue: true,
});

// Add connection event handlers
redis.on('connect', () => {
  console.log('Redis client connected');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

redis.on('error', (err) => {
  console.error('Redis Error:', err);
});

redis.on('end', () => {
  console.log('Redis connection ended');
});

// Test connection
const testRedisConnection = async () => {
  try {
    await redis.ping();
    console.log('Redis connection test successful');
  } catch (error) {
    console.error('Redis connection test failed:', error);
  }
};

testRedisConnection();

// Initialize Kafka with proper configuration and error handling
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: process.env.KAFKA_BROKER ? process.env.KAFKA_BROKER.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});


const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000
});

const consumer = kafka.consumer({ 
  groupId: 'chat-notification-group',
  sessionTimeout: 30000
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
  async initialize() {
    try {
      // Connect producer and consumer with proper error handling
      await Promise.all([
        producer.connect()
          .catch(error => {
            console.error('❌ Failed to connect Kafka producer:', error);
            throw error;
          }),
        consumer.connect()
          .catch(error => {
            console.error('❌ Failed to connect Kafka consumer:', error);
            throw error;
          })
      ]);

      console.log('✅ Kafka connections initialized successfully');
      await this.setupKafkaConsumer();
    } catch (error) {
      console.error('❌ Failed to initialize Kafka connections:', error);
      throw error;
    }
  }

  async setupKafkaConsumer() {
    try {
      await consumer.subscribe({ topic: 'chat-notifications', fromBeginning: true });
      console.log('✅ Consumer subscribed to chat-notifications topic');
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          console.log('📨 Received message:', {
            topic,
            partition,
            value: message.value.toString(),
            timestamp: message.timestamp
          });
          
          const notification = JSON.parse(message.value.toString());
          await this.sendNotification(notification);
        },
      });
    } catch (error) {
      console.error('❌ Consumer setup error:', error);
      throw error;
    }
  }

  async cacheUserToken(userId, fcmToken) {
    await redis.set(`user:${userId}:fcmToken`, fcmToken);
  }

  async getFCMToken(userId) {
    return await redis.get(`user:${userId}:fcmToken`);
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
        await redis.del(`user:${userId}:fcmToken`);
      }
      throw error;
    }
  }

  async queueNotification(notification) {
    try {
      console.log('📤 Queuing notification:', notification);

      // Verify Kafka connection first
      try {
        await producer.send({
          topic: 'test-topic',
          messages: [{ value: 'test message' }],
        });
      } catch (error) {
        console.log('❌ Kafka producer not connected. Reconnecting...');
        await producer.connect();
      }

      // Send notification to Kafka
      await producer.send({
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
  

  async testKafkaConnection() {
    try {
      // Test producer
      await producer.send({
        topic: 'test-topic',
        messages: [{ value: 'test message' }]
      });
      console.log('✅ Kafka producer test successful');

      // Test consumer
      await consumer.subscribe({ topic: 'test-topic' });
      console.log('✅ Kafka consumer subscription test successful');

      return true;
    } catch (error) {
      console.error('❌ Kafka connection test failed:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
