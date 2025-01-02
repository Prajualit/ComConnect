const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const NotificationService = require('../services/notificationService');
const User = require('../models/userModel');

const router = express.Router();

router.post('/token', protect, async (req, res) => {
  const { fcmToken } = req.body;
  
  try {
    // Update user's FCM token in MongoDB
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    
    // Cache token in Redis
    await NotificationService.cacheUserToken(req.user._id, fcmToken);
    
    res.status(200).json({ message: 'Token updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update token' });
  }
});

router.post('/test-kafka', protect, async (req, res) => {
  try {
    const testNotification = {
      userId: req.user._id,
      title: "Test Notification",
      body: "This is a test notification via Kafka",
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    await NotificationService.queueNotification(testNotification);
    res.status(200).json({ message: 'Test notification queued successfully' });
  } catch (error) {
    console.error('Kafka test error:', error);
    res.status(500).json({ error: 'Failed to queue test notification' });
  }
});

router.get('/test-kafka-connection', protect, async (req, res) => {
  try {
    const isConnected = await NotificationService.testKafkaConnection();
    if (isConnected) {
      res.status(200).json({ message: 'Kafka connection test successful' });
    } else {
      res.status(500).json({ message: 'Kafka connection test failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 