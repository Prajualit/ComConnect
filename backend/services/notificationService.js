const admin = require('firebase-admin');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const serviceAccount = require('../../comconnect-2b1d7-firebase-adminsdk-20r1n-c127902f6f.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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

    if (!fcmToken) return;

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
    };

    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  }

  async queueNotification(notification) {
    try {
      console.log('📤 Queuing notification:', notification);
  
      // Check if producer is connected by using the internal state or a try-catch approach
      try {
        // Attempt a small operation to check the connection
        await producer.send({
          topic: 'test-topic',
          messages: [{ value: 'test message' }],
        });
      } catch (error) {
        // If error occurs, producer is not connected; try connecting
        console.log('❌ Kafka producer not connected. Attempting to reconnect...');
        await producer.connect();
      }
  
      // Now that the producer is ensured to be connected, send the notification
      await producer.send({
        topic: 'chat-notifications',
        messages: [
          { value: JSON.stringify(notification) },
        ],
      });
  
      console.log('✅ Notification queued successfully');
    } catch (error) {
      console.error('❌ Failed to queue notification:', error);
      throw error;
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
