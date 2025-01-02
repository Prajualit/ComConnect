const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const NotificationService = require('../services/notificationService');

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email fcmToken",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    // Send notifications to all users in the chat except sender
    message.chat.users.forEach(async (user) => {
      if (user._id.toString() !== req.user._id.toString()) {
        await NotificationService.queueNotification({
          userId: user._id.toString(),
          title: message.chat.isGroupChat ? message.chat.chatName : message.sender.name,
          body: content,
          data: {
            chatId: chatId,
            messageId: message._id.toString(),
            type: 'new_message'
          }
        });
      }
    });

    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const deleteAllMessages = asyncHandler(async (req, res) => {
  try {
    await Message.deleteMany({});
    res.status(200).json({ message: 'All messages have been deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete messages', error: error.message });
  }
});

module.exports = { allMessages, sendMessage, deleteAllMessages };
