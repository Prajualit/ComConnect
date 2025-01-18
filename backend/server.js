const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const Connection = require("./config/db");
const cors = require("cors");

// Add process error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Configure CORS with more detailed options
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Import routes
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const taskRoutes = require("./routes/taskAllocatorRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// API routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notification", notificationRoutes);

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

// Deployment routes
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// Connect to database and start server with retry mechanism
const startServer = async () => {
  try {
    // Try to connect to MongoDB first
    console.log('📡 Attempting to connect to MongoDB...');
    await Connection();
    
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Initialize Socket.IO after server is created
    console.log('🔌 Initializing Socket.IO...');
    const io = require("socket.io")(server, {
      pingTimeout: 60000,
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    io.on("connection", (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      
      socket.on("setup", (userData) => {
        try {
          socket.join(userData._id);
          socket.emit("connected");
          console.log(`👤 User ${userData._id} setup complete`);
        } catch (error) {
          console.error('❌ Setup error:', error);
        }
      });

      socket.on("join chat", (room) => {
        try {
          socket.join(room);
          console.log(`👤 User joined room: ${room}`);
        } catch (error) {
          console.error('❌ Join chat error:', error);
        }
      });

      socket.on("typing", (room) => socket.in(room).emit("typing"));
      socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

      socket.on("new message", (newMessageRecieved) => {
        try {
          var chat = newMessageRecieved.chat;
          if (!chat.users) {
            console.log("❌ chat.users not defined");
            return;
          }

          chat.users.forEach((user) => {
            if (user._id == newMessageRecieved.sender._id) return;
            socket.in(user._id).emit("message recieved", newMessageRecieved);
          });
        } catch (error) {
          console.error('❌ New message error:', error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });

      socket.on("error", (error) => {
        console.error('❌ Socket error:', error);
      });
    });

    // Error handling for Socket.IO server
    io.on("error", (error) => {
      console.error('❌ Socket.IO server error:', error);
    });

    // Error handling for HTTP server
    server.on('error', (error) => {
      console.error('❌ HTTP server error:', error);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // Don't exit immediately on error
    console.log('⏳ Waiting before retry...');
    setTimeout(() => {
      console.log('🔄 Retrying server start...');
      startServer();
    }, 5000);
  }
};

// Start the server
console.log('🚀 Starting server...');
startServer();
